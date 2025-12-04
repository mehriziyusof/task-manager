"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiPlus, FiTrash2, FiInstagram, FiGlobe, FiYoutube, FiLayout, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

// تنظیمات رنگ‌بندی پروژه‌ها
const CATEGORIES: any = {
    web: { color: 'bg-blue-600', icon: FiGlobe, label: 'وب‌سایت' },
    instagram: { color: 'bg-pink-600', icon: FiInstagram, label: 'اینستاگرام' },
    youtube: { color: 'bg-red-600', icon: FiYoutube, label: 'یوتیوب' },
    other: { color: 'bg-gray-600', icon: FiLayout, label: 'سایر' }
};

export default function ClientProjects() {
    const params = useParams();
    const router = useRouter();
    const clientId = params?.id;

    const [client, setClient] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("web");

    useEffect(() => {
        if(clientId) fetchData();
    }, [clientId]);

    const fetchData = async () => {
        // دریافت اطلاعات مشتری
        const { data: clientData } = await supabase.from('clients').select('*').eq('id', clientId).single();
        setClient(clientData);

        // دریافت پروژه‌های این مشتری
        const { data: projectsData } = await supabase.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
        setProjects(projectsData || []);
    };

    const createProject = async () => {
        if (!newTitle.trim()) return;
        try {
            // 1. ساخت پروسه (اختیاری)
            const { data: process } = await supabase.from('processes').insert({ title: newTitle }).select().single();
            
            // 2. ساخت پروژه متصل به مشتری
            const { data: project, error } = await supabase.from('projects').insert({
                title: newTitle,
                client_id: clientId,
                process_id: process.id,
                category: selectedCategory, // ذخیره دسته‌بندی رنگی
                status: 'active'
            }).select().single();

            if (error) throw error;
            
            setProjects([project, ...projects]);
            setNewTitle("");
            setIsCreating(false);
            toast.success("پروژه ایجاد شد");
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const deleteProject = async (id: number) => {
        if(!confirm("پروژه حذف شود؟")) return;
        await supabase.from('projects').delete().eq('id', id);
        setProjects(projects.filter(p => p.id !== id));
        toast.success("حذف شد");
    };

    if (!client) return <div className="flex h-screen items-center justify-center text-white">در حال بارگذاری...</div>;

    return (
        <div className="p-6 md:p-10 text-white min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="bg-white/5 hover:bg-white/10 p-3 rounded-xl transition border border-white/10"><FiArrowRight/></button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-white mb-1">پروژه‌های {client.title}</h1>
                        <p className="text-white/50 text-sm">لیست پروژه‌های اختصاصی این مشتری</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                
                {/* Create Card */}
                <div className="glass p-1 rounded-3xl border border-dashed border-white/20 hover:border-blue-500/50 transition group cursor-pointer h-64 flex flex-col items-center justify-center relative">
                    {!isCreating ? (
                        <div onClick={() => setIsCreating(true)} className="flex flex-col items-center justify-center w-full h-full">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-blue-500 group-hover:text-white transition"><FiPlus size={24} /></div>
                            <span className="text-white/60 text-sm font-medium group-hover:text-white transition">پروژه جدید برای {client.title}</span>
                        </div>
                    ) : (
                        <div className="p-4 w-full flex flex-col gap-3 animate-fade-in h-full justify-center">
                            <input autoFocus className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none" placeholder="نام پروژه..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                            
                            {/* انتخاب رنگ/دسته‌بندی */}
                            <p className="text-xs text-white/50 mt-1">دسته‌بندی:</p>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.entries(CATEGORIES).map(([key, style]: any) => (
                                    <button 
                                        key={key} 
                                        onClick={() => setSelectedCategory(key)}
                                        className={`h-8 rounded-lg flex items-center justify-center transition ${selectedCategory === key ? style.color + ' ring-2 ring-white scale-110' : 'bg-white/5 hover:bg-white/10'}`}
                                        title={style.label}
                                    >
                                        <style.icon size={14} />
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2 w-full mt-2">
                                <button onClick={createProject} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded-lg">ساختن</button>
                                <button onClick={() => setIsCreating(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2 rounded-lg">لغو</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Project Cards */}
                {projects.map(project => {
                    const style = CATEGORIES[project.category || 'other'];
                    return (
                        <div key={project.id} className="glass p-6 rounded-3xl border border-white/5 hover:border-white/10 transition relative group h-64 flex flex-col justify-between overflow-hidden">
                            {/* افکت نوری رنگی */}
                            <div className={`absolute top-0 right-0 w-32 h-32 ${style.color} blur-[60px] opacity-20 -mr-10 -mt-10 rounded-full pointer-events-none`}></div>

                            <div className="flex justify-between items-start relative z-10">
                                <div className={`p-3 ${style.color}/20 ${style.color.replace('bg-', 'text-')} rounded-xl border border-white/5`}>
                                    <style.icon size={20} />
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} className="text-white/20 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition"><FiTrash2 /></button>
                            </div>
                            
                            <Link href={`/project/${project.id}`} className="absolute inset-0 z-0" />

                            <div className="relative z-10 mt-4">
                                <h3 className="text-lg font-bold text-white mb-2 truncate">{project.title}</h3>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded border border-white/5 ${style.color}/20 ${style.color.replace('bg-', 'text-')}`}>
                                        {style.label}
                                    </span>
                                </div>
                                <p className="text-[10px] text-white/40 mt-2">{new Date(project.created_at).toLocaleDateString('fa-IR')}</p>
                            </div>

                            <div className="w-full bg-white/5 rounded-full h-1.5 mt-auto overflow-hidden relative z-10">
                                <div className={`${style.color} h-full w-1/3 rounded-full shadow-[0_0_10px_currentColor]`}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}