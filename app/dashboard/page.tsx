"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FiCheckCircle, FiClock, FiAlertCircle, FiActivity, FiUser } from 'react-icons/fi';
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export default function Dashboard() {
    const [stats, setStats] = useState({
        todayTasks: 0,
        delayedTasks: 0,
        inProgressTasks: 0,
        totalTasks: 0,
        doneTasks: 0
    });
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // 1. گرفتن کاربر فعلی
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                setUser({ ...user, ...profile });
            }

            // 2. گرفتن تمام تسک‌های کاربر
            // نکته: اگر مدیر است و می‌خواهد همه را ببیند، شرط eq('assigned_to') را بردارید
            const { data: tasks, error } = await supabase
                .from('project_tasks')
                .select('*')
                .eq('assigned_to', user?.id); // فقط تسک‌های خود کاربر

            if (error || !tasks) throw error;

            const today = new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD");

            let todayCount = 0;
            let delayedCount = 0;
            let inProgressCount = 0;
            let doneCount = 0;

            tasks.forEach((t: any) => {
                // محاسبه کارهای امروز
                if (t.due_date && t.due_date.includes(today) && t.status !== 'completed') {
                    todayCount++;
                }
                
                // محاسبه تاخیر (ساده‌ترین روش: مقایسه رشته‌ای تاریخ)
                // اگر تاریخ سررسید کمتر از امروز بود و انجام نشده بود
                if (t.due_date && t.due_date.split(' - ')[0] < today && t.status !== 'completed') {
                    delayedCount++;
                }

                if (t.status === 'in_progress') inProgressCount++;
                if (t.status === 'completed') doneCount++;
            });

            setStats({
                todayTasks: todayCount,
                delayedTasks: delayedCount,
                inProgressTasks: inProgressCount,
                totalTasks: tasks.length,
                doneTasks: doneCount
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "صبح بخیر";
        if (hour < 18) return "ظهر بخیر";
        return "شب بخیر";
    };

    const todayDate = new DateObject({ calendar: persian, locale: persian_fa }).format("dddd DD MMMM YYYY");

    if (loading) return <div className="flex h-screen items-center justify-center text-white">در حال بارگذاری داشبورد...</div>;

    return (
        <div className="p-6 md:p-10 text-white min-h-screen space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-white/10 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-500/20">
                        {user?.full_name ? user.full_name.charAt(0) : <FiUser />}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold mb-1">
                            {user?.full_name || 'کاربر گرامی'}، {getGreeting()}! 👋
                        </h1>
                        <p className="text-white/50 text-sm">{todayDate}</p>
                    </div>
                </div>
                
                {/* دکمه‌های سریع (آپشنال) */}
                <div className="flex gap-2">
                    <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm transition">
                        ایجاد تسک فوری
                    </button>
                </div>
            </div>

            {/* Stats Cards (Reference: Mizito) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* کارهای امروز */}
                <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-green-500/30 transition">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 transition group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-500/20 text-green-400 rounded-xl">
                            <FiCheckCircle size={24} />
                        </div>
                        <span className="text-4xl font-extrabold text-white">{stats.todayTasks}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white/90">کارهای امروز من</h3>
                    <p className="text-xs text-white/50 mt-1">تسـک‌هایی که باید امروز تکمیل شوند</p>
                </div>

                {/* کارهای دارای تاخیر */}
                <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-red-500/30 transition">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-bl-full -mr-4 -mt-4 transition group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
                            <FiAlertCircle size={24} />
                        </div>
                        <span className="text-4xl font-extrabold text-white">{stats.delayedTasks}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white/90">دارای تاخیر</h3>
                    <p className="text-xs text-white/50 mt-1">نیاز به پیگیری فوری دارند</p>
                </div>

                {/* کارهای در جریان */}
                <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                            <FiActivity size={24} />
                        </div>
                        <span className="text-4xl font-extrabold text-white">{stats.inProgressTasks}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white/90">در حال انجام</h3>
                    <p className="text-xs text-white/50 mt-1">پروژه‌های فعال فعلی</p>
                </div>
            </div>

            {/* بخش دوم: نمودار یا لیست سریع */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-3xl border border-white/5">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                        وضعیت کلی کارها
                    </h3>
                    {/* Simple Progress Bar Chart */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-white/70">
                                <span>تکمیل شده</span>
                                <span>{stats.doneTasks} از {stats.totalTasks}</span>
                            </div>
                            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
                                    style={{ width: `${stats.totalTasks > 0 ? (stats.doneTasks / stats.totalTasks) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-white/70">
                                <span>در انتظار (To Do)</span>
                                <span>{stats.totalTasks - stats.doneTasks - stats.inProgressTasks} عدد</span>
                            </div>
                            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full transition-all duration-1000"
                                    style={{ width: `${stats.totalTasks > 0 ? ((stats.totalTasks - stats.doneTasks - stats.inProgressTasks) / stats.totalTasks) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-center text-white/30 text-sm">
                    نمودار فعالیت هفتگی (به زودی...)
                </div>
            </div>
        </div>
    );
}