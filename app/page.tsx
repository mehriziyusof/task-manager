"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiPlus, FiFolder, FiTrash2, FiSearch, FiBriefcase, FiInstagram, FiGlobe, FiYoutube, FiLayout } from 'react-icons/fi';
import toast from 'react-hot-toast';

// تعریف رنگ‌ها و آیکون‌ها برای دسته‌بندی
const CATEGORY_STYLES: any = {
    web: { color: 'bg-blue-600', icon: FiGlobe, label: 'وب‌سایت' },
    instagram: { color: 'bg-purple-600', icon: FiInstagram, label: 'اینستاگرام' },
    youtube: { color: 'bg-red-600', icon: FiYoutube, label: 'یوتیوب' },
    other: { color: 'bg-gray-600', icon: FiLayout, label: 'سایر' }
};

export default function Home() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'clients' | 'projects' | null>(null); // null = loading
    const [items, setItems] = useState<any[]>([]); // مشتریان یا پروژه‌ها
    const [newItemTitle, setNewItemTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // دریافت نقش کاربر
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        
        if (profile?.role === 'admin' || profile?.role === 'manager') {
            setIsAdmin(true);
            setViewMode('clients'); // مدیران اول مشتریان را می‌بینند
            fetchClients();
        } else {
            setIsAdmin(false);
            setViewMode('projects'); // کارمندان مستقیم پروژه‌ها را می‌بینند
            fetchProjects();
        }
    };

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
        setItems(data || []);
    };

    const fetchProjects = async () => {
        // برای کارمندان: فقط پروژه‌هایی که به آنها اختصاص داده شده یا همه پروژه‌ها (بسته به سیاست شما)
        const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        setItems(data || []);
    };

    const handleCreate = async () => {
        if (!newItemTitle.trim()) return;
        setIsCreating(true);
        try {
            if (viewMode === 'clients') {
                const { data, error } = await supabase.from('clients').insert({ title: newItemTitle }).select().single();
                if (error) throw error;
                setItems([data, ...items]);
                toast.success("مشتری جدید تعریف شد");
            } 
            // ساخت پروژه در اینجا برای کارمندان معمولی (اگر اجازه داشته باشند)
            // اما معمولاً پروژه داخل صفحه مشتری ساخته می‌شود
        } catch (err: any) {
            toast.error("خطا: " + err.message);
        } finally {
            setIsCreating(false);
            setNewItemTitle("");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("آیا اطمینان دارید؟")) return;
        const table = viewMode === 'clients' ? 'clients' : 'projects';
        await supabase.from(table).delete().eq('id', id);
        setItems(items.filter(i => i.id !== id));
        toast.success("حذف شد");
    };

    const filteredItems = items.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!viewMode) return <div className="flex h-screen items-center justify-center text-white">در حال احراز هویت...</div>;

    return (
        <div className="p-6 md:p-10 text-white min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-1">
                        {viewMode === 'clients' ? 'مدیریت مشتریان' : 'پروژه‌های من'}
                    </h1>
                    <p className="text-white/50 text-sm">
                        {viewMode === 'clients' ? 'برای مشاهده پروژه‌ها، روی کارت مشتری دابل‌کلیک کنید' : 'لیست کارهای محوله'}
                    </p>
                </div>
                
                <div className="relative w-full md:w-64">
                    <FiSearch className="absolute right-3 top-3 text-white/30" />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:border-blue-500/50 transition" 
                        placeholder="جستجو..." 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Create Card (Only if Admin or Allowed) */}
                {isAdmin && viewMode === 'clients' && (
                    <div className="glass p-1 rounded-3xl border border-dashed border-white/20 hover:border-blue-500/50 transition group cursor-pointer h-48 flex flex-col items-center justify-center relative">
                        {!isCreating ? (
                            <div onClick={() => setIsCreating(true)} className="flex flex-col items-center justify-center w-full h-full">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-blue-500 group-hover:text-white transition"><FiPlus size={24} /></div>
                                <span className="text-white/60 text-sm font-medium group-hover:text-white transition">تعریف مشتری جدید</span>
                            </div>
                        ) : (
                            <div className="p-4 w-full flex flex-col items-center gap-3 animate-fade-in">
                                <input autoFocus className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-center text-sm text-white focus:border-blue-500 outline-none" placeholder="نام مشتری..." value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
                                <div className="flex gap-2 w-full">
                                    <button onClick={handleCreate} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded-lg">ثبت</button>
                                    <button onClick={() => setIsCreating(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2 rounded-lg">لغو</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Items Grid */}
                {filteredItems.map(item => {
                    // تشخیص نوع آیتم برای رندر
                    if (viewMode === 'clients') {
                        return (
                            <div 
                                key={item.id} 
                                onDoubleClick={() => router.push(`/client/${item.id}`)} // دابل کلیک برای رفتن به پروژه‌ها
                                className="glass p-6 rounded-3xl border border-white/5 hover:border-blue-500/30 transition relative group h-48 flex flex-col justify-between cursor-pointer hover:bg-white/[0.02]"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl"><FiBriefcase size={20} /></div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-white/20 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition"><FiTrash2 /></button>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1 truncate">{item.title}</h3>
                                    <p className="text-xs text-white/40">مشتری ویژه</p>
                                </div>
                                <div className="text-[10px] text-white/30 text-left">دابل کلیک برای ورود ↵</div>
                            </div>
                        );
                    } else {
                        // Projects View (For Staff)
                        const catStyle = CATEGORY_STYLES[item.category || 'other'];
                        return (
                            <Link key={item.id} href={`/project/${item.id}`}>
                                <div className="glass p-6 rounded-3xl border border-white/5 hover:border-white/10 transition relative group h-48 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className={`p-3 ${catStyle.color}/10 ${catStyle.color.replace('bg-', 'text-')} rounded-xl`}>
                                            <catStyle.icon size={20} />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1 truncate">{item.title}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded ${catStyle.color}/20 ${catStyle.color.replace('bg-', 'text-')}`}>
                                            {catStyle.label}
                                        </span>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-1.5 mt-4 overflow-hidden"><div className="bg-blue-500 h-full w-1/3 rounded-full"></div></div>
                                </div>
                            </Link>
                        );
                    }
                })}
            </div>
        </div>
    );
}