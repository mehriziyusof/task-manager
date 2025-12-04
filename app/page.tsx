"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiPlus, FiFolder, FiTrash2, FiSearch, FiBriefcase, FiGrid, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Home() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'clients' | 'projects' | null>(null);
    const [items, setItems] = useState<any[]>([]); 
    const [newItemTitle, setNewItemTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // دریافت نقش کاربر
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            // اگر نقش manager یا admin بود، حالت مشتریان فعال شود
            if (profile && (profile.role === 'manager' || profile.role === 'admin')) {
                setViewMode('clients');
                fetchClients();
            } else {
                setViewMode('projects');
                fetchProjects();
            }
        } catch (e) {
            console.error("Role Check Error:", e);
            // در صورت خطا، پیش‌فرض پروژه‌ها را نشان بده
            setViewMode('projects');
            fetchProjects();
        }
    };

    const fetchClients = async () => {
        setLoading(true);
        const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
        setItems(data || []);
        setLoading(false);
    };

    const fetchProjects = async () => {
        setLoading(true);
        const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        setItems(data || []);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!newItemTitle.trim()) return;
        setIsCreating(true);
        try {
            if (viewMode === 'clients') {
                const { data, error } = await supabase.from('clients').insert({ title: newItemTitle }).select().single();
                if (error) throw error;
                setItems([data, ...items]);
                toast.success("مشتری جدید اضافه شد");
            } else {
                // اگر کاربر عادی بخواهد پروژه بسازد (بدون مشتری)
                // اینجا یک پروژه آزاد می‌سازیم
                const { data: project, error } = await supabase.from('projects').insert({
                    title: newItemTitle,
                    status: 'active'
                }).select().single();
                if (error) throw error;
                setItems([project, ...items]);
                toast.success("پروژه ساخته شد");
            }
            setNewItemTitle("");
            setIsCreating(false);
        } catch (err: any) {
            toast.error("خطا: " + err.message);
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

    if (loading && !viewMode) return <div className="flex h-screen items-center justify-center text-white">در حال بارگذاری میز کار...</div>;

    return (
        <div className="p-6 md:p-10 text-white min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-1">
                        {viewMode === 'clients' ? 'مدیریت مشتریان' : 'میز کار من'}
                    </h1>
                    <p className="text-white/50 text-sm">
                        {viewMode === 'clients' ? 'برای دیدن پروژه‌ها روی مشتری دابل کلیک کنید' : 'لیست پروژه‌های فعال شما'}
                    </p>
                </div>
                
                {/* Search */}
                <div className="relative w-full md:w-64">
                    <FiSearch className="absolute right-3 top-3 text-white/30" />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:border-blue-500/50 transition" 
                        placeholder={viewMode === 'clients' ? "جستجوی مشتری..." : "جستجوی پروژه..."} 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                
                {/* Create Card */}
                <div className="glass p-1 rounded-3xl border border-dashed border-white/20 hover:border-blue-500/50 transition group cursor-pointer h-48 flex flex-col items-center justify-center relative">
                    {!isCreating ? (
                        <div onClick={() => setIsCreating(true)} className="flex flex-col items-center justify-center w-full h-full">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-blue-500 group-hover:text-white transition"><FiPlus size={24} /></div>
                            <span className="text-white/60 text-sm font-medium group-hover:text-white transition">
                                {viewMode === 'clients' ? 'تعریف مشتری جدید' : 'ایجاد پروژه جدید'}
                            </span>
                        </div>
                    ) : (
                        <div className="p-4 w-full flex flex-col items-center gap-3 animate-fade-in">
                            <input autoFocus className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-center text-sm text-white focus:border-blue-500 outline-none" 
                                placeholder={viewMode === 'clients' ? "نام مشتری..." : "نام پروژه..."}
                                value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
                            <div className="flex gap-2 w-full">
                                <button onClick={handleCreate} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded-lg">ساختن</button>
                                <button onClick={() => setIsCreating(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2 rounded-lg">لغو</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Items List */}
                {filteredItems.map(item => {
                    if (viewMode === 'clients') {
                        // --- حالت مدیر (نمایش مشتریان) ---
                        return (
                            <div 
                                key={item.id} 
                                onDoubleClick={() => router.push(`/client/${item.id}`)}
                                className="glass p-6 rounded-3xl border border-white/5 hover:border-purple-500/30 transition relative group h-48 flex flex-col justify-between cursor-pointer hover:bg-white/[0.02]"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl"><FiBriefcase size={20} /></div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-white/20 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition"><FiTrash2 /></button>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1 truncate">{item.title}</h3>
                                    <p className="text-xs text-white/40">مشتری ویژه</p>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-1.5 mt-4 overflow-hidden"><div className="bg-purple-500 h-full w-full rounded-full"></div></div>
                            </div>
                        );
                    } else {
                        // --- حالت کارمند (نمایش پروژه‌ها) ---
                        return (
                            <Link key={item.id} href={`/project/${item.id}`}>
                                <div className="glass p-6 rounded-3xl border border-white/5 hover:border-blue-500/30 transition relative group h-48 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl"><FiFolder size={20} /></div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1 truncate">{item.title}</h3>
                                        <p className="text-xs text-white/40">{new Date(item.created_at).toLocaleDateString('fa-IR')}</p>
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