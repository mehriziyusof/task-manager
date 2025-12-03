"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { FiPlus, FiFolder, FiTrash2, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Home() {
    const [projects, setProjects] = useState<any[]>([]);
    const [newProjectTitle, setNewProjectTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    // استیت جستجو
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => { fetchProjects(); }, []);

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setProjects(data || []);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createNewProject = async () => {
        if (!newProjectTitle.trim()) return;
        setIsCreating(true);
        try {
            const { data: process, error: procError } = await supabase.from('processes').insert({ title: newProjectTitle }).select().single();
            if (procError) throw procError;
            const { data: project, error: projError } = await supabase.from('projects').insert({
                title: newProjectTitle,
                process_id: process.id,
                status: 'active'
            }).select().single();
            if (projError) throw projError;
            setProjects([project, ...projects]);
            setNewProjectTitle("");
            toast.success("پروژه جدید ساخته شد");
        } catch (err: any) {
            toast.error("خطا: " + err.message);
        } finally {
            setIsCreating(false);
        }
    };

    const deleteProject = async (id: number) => {
        toast((t) => (
            <div className="flex flex-col gap-2">
                <span>آیا از حذف این پروژه مطمئن هستید؟</span>
                <div className="flex gap-2 justify-end">
                    <button onClick={() => toast.dismiss(t.id)} className="px-2 py-1 text-xs bg-white/10 rounded">لغو</button>
                    <button onClick={async () => {
                        toast.dismiss(t.id);
                        await performDelete(id);
                    }} className="px-2 py-1 text-xs bg-red-500 rounded text-white">حذف</button>
                </div>
            </div>
        ), { duration: 5000 });
    };

    const performDelete = async (id: number) => {
        try {
            await supabase.from('projects').delete().eq('id', id);
            setProjects(projects.filter(p => p.id !== id));
            toast.success("پروژه حذف شد");
        } catch (err: any) { toast.error(err.message); }
    };

    // فیلتر کردن پروژه‌ها بر اساس جستجو
    const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) return <div className="flex h-screen items-center justify-center text-white">در حال بارگذاری...</div>;

    return (
        <div className="p-6 md:p-10 text-white min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-1">
                        میز کار من
                    </h1>
                    <p className="text-white/50 text-sm">مدیریت پروژه‌ها و تسک‌های روزانه</p>
                </div>
                
                {/* Search Input Real */}
                <div className="relative w-full md:w-64">
                    <FiSearch className="absolute right-3 top-3 text-white/30" />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:border-blue-500/50 transition" 
                        placeholder="جستجو در پروژه‌ها..." 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <div className="glass p-1 rounded-3xl border border-dashed border-white/20 hover:border-blue-500/50 transition group cursor-pointer h-48 flex flex-col items-center justify-center relative">
                    {!isCreating ? (
                        <div onClick={() => setIsCreating(true)} className="flex flex-col items-center justify-center w-full h-full">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-blue-500 group-hover:text-white transition"><FiPlus size={24} /></div>
                            <span className="text-white/60 text-sm font-medium group-hover:text-white transition">ایجاد پروژه جدید</span>
                        </div>
                    ) : (
                        <div className="p-4 w-full flex flex-col items-center gap-3 animate-fade-in">
                            <input autoFocus className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-center text-sm text-white focus:border-blue-500 outline-none" placeholder="نام پروژه..." value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createNewProject()} />
                            <div className="flex gap-2 w-full">
                                <button onClick={createNewProject} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded-lg">ساختن</button>
                                <button onClick={() => setIsCreating(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2 rounded-lg">لغو</button>
                            </div>
                        </div>
                    )}
                </div>

                {filteredProjects.map(project => (
                    <div key={project.id} className="glass p-6 rounded-3xl border border-white/5 hover:border-white/10 transition relative group h-48 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl"><FiFolder size={20} /></div>
                            <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} className="text-white/20 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition"><FiTrash2 /></button>
                        </div>
                        <Link href={`/project/${project.id}`} className="absolute inset-0 z-0" />
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1 truncate">{project.title}</h3>
                            <p className="text-xs text-white/40">{new Date(project.created_at).toLocaleDateString('fa-IR')}</p>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5 mt-4 overflow-hidden"><div className="bg-blue-500 h-full w-1/3 rounded-full"></div></div>
                    </div>
                ))}
            </div>
        </div>
    );
}