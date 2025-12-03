"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FiCheckCircle, FiClock, FiAlertCircle, FiActivity, FiUser, FiX, FiPlus } from 'react-icons/fi';
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import toast from 'react-hot-toast';

export default function Dashboard() {
    const [stats, setStats] = useState<any>({ today: [], delayed: [], inProgress: [], doneCount: 0, totalCount: 0 });
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [modalType, setModalType] = useState<'today' | 'delayed' | 'inProgress' | null>(null);
    const [chartFilter, setChartFilter] = useState<'week' | 'month'>('week');
    
    // Quick Task State
    const [showQuickTask, setShowQuickTask] = useState(false);
    const [quickTaskTitle, setQuickTaskTitle] = useState("");

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // دریافت پروفایل (شامل عکس avatar_url)
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setUser({ ...user, ...profile });
            }

            const { data: tasks } = await supabase.from('project_tasks').select('*').eq('assigned_to', user?.id);
            if (!tasks) return;

            const today = new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD");
            
            const todayTasks = tasks.filter((t: any) => t.due_date && t.due_date.includes(today) && t.status !== 'completed');
            const delayedTasks = tasks.filter((t: any) => t.due_date && t.due_date.split(' - ')[0] < today && t.status !== 'completed');
            const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress');
            
            setStats({
                today: todayTasks,
                delayed: delayedTasks,
                inProgress: inProgressTasks,
                doneCount: tasks.filter((t: any) => t.status === 'completed').length,
                totalCount: tasks.length
            });

        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleCreateQuickTask = async () => {
        if(!quickTaskTitle.trim() || !user) return;
        try {
            // پیدا کردن اولین پروژه کاربر برای درج تسک
            const { data: project } = await supabase.from('projects').select('id').limit(1).single();
            if(!project) { toast.error("ابتدا یک پروژه بسازید!"); return; }

            await supabase.from('project_tasks').insert({
                title: quickTaskTitle,
                project_id: project.id,
                assigned_to: user.id,
                status: 'pending'
            });
            toast.success("تسک فوری ایجاد شد");
            setQuickTaskTitle("");
            setShowQuickTask(false);
            fetchDashboardData(); // رفرش دیتا
        } catch(e) { toast.error("خطا در ساخت"); }
    };

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "صبح بخیر";
        if (h < 17) return "ظهر بخیر";
        if (h < 20) return "عصر بخیر";
        return "شب بخیر";
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white">در حال بارگذاری...</div>;

    return (
        <div className="p-6 md:p-10 text-white min-h-screen space-y-8 animate-fade-in relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-white/10 pb-6">
                <div className="flex items-center gap-4">
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" className="w-16 h-16 rounded-2xl object-cover shadow-lg border border-white/10" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold">
                            {user?.full_name?.charAt(0) || <FiUser />}
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold mb-1">{user?.full_name || 'کاربر عزیز'}، {getGreeting()}! 👋</h1>
                        <p className="text-white/50 text-sm">{new DateObject({ calendar: persian, locale: persian_fa }).format("dddd DD MMMM YYYY")}</p>
                    </div>
                </div>
                <button onClick={() => setShowQuickTask(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-500/20">
                    <FiPlus /> ایجاد تسک فوری
                </button>
            </div>

            {/* Quick Task Modal */}
            {showQuickTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowQuickTask(false)}>
                    <div className="bg-[#1a1a2e] border border-white/10 p-6 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold mb-4">تسک فوری جدید</h3>
                        <input autoFocus value={quickTaskTitle} onChange={e => setQuickTaskTitle(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 mb-4 focus:border-blue-500 outline-none" placeholder="عنوان تسک..." onKeyDown={e => e.key === 'Enter' && handleCreateQuickTask()} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowQuickTask(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-white/5">لغو</button>
                            <button onClick={handleCreateQuickTask} className="px-4 py-2 text-sm bg-blue-600 rounded-lg text-white">ساختن</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Interactive Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card 
                    title="کارهای امروز من" count={stats.today.length} color="green" icon={<FiCheckCircle size={24} />} 
                    sub="تسک‌هایی که باید امروز تکمیل شوند" onClick={() => setModalType('today')} 
                />
                <Card 
                    title="دارای تاخیر" count={stats.delayed.length} color="red" icon={<FiAlertCircle size={24} />} 
                    sub="نیاز به پیگیری فوری دارند" onClick={() => setModalType('delayed')} 
                />
                <Card 
                    title="در حال انجام" count={stats.inProgress.length} color="blue" icon={<FiActivity size={24} />} 
                    sub="پروژه‌های فعال فعلی" onClick={() => setModalType('inProgress')} 
                />
            </div>

            {/* Chart & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Custom CSS Chart */}
                <div className="glass p-6 rounded-3xl border border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold flex items-center gap-2"><span className="w-1 h-6 bg-purple-500 rounded-full"></span> نمودار فعالیت</h3>
                        <div className="flex bg-white/5 rounded-lg p-1">
                            <button onClick={() => setChartFilter('week')} className={`px-3 py-1 text-xs rounded-md transition ${chartFilter === 'week' ? 'bg-white/10 text-white' : 'text-white/40'}`}>هفتگی</button>
                            <button onClick={() => setChartFilter('month')} className={`px-3 py-1 text-xs rounded-md transition ${chartFilter === 'month' ? 'bg-white/10 text-white' : 'text-white/40'}`}>ماهانه</button>
                        </div>
                    </div>
                    
                    {/* Mock Chart Visualization based on stats */}
                    <div className="flex items-end justify-between h-40 gap-2">
                        {[40, 70, 30, 85, 50, 60, stats.totalCount > 0 ? (stats.doneCount/stats.totalCount)*100 : 20].map((h, i) => (
                            <div key={i} className="w-full bg-white/5 rounded-t-xl relative group">
                                <div 
                                    className="absolute bottom-0 w-full bg-gradient-to-t from-purple-900 to-blue-500 rounded-t-xl transition-all duration-1000 hover:opacity-80"
                                    style={{ height: `${h}%` }}
                                ></div>
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs bg-black px-2 py-1 rounded transition">{Math.floor(h)}%</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-white/30">
                        <span>شنبه</span><span>یک</span><span>دو</span><span>سه</span><span>چهار</span><span>پنج</span><span>جمعه</span>
                    </div>
                </div>

                {/* Progress Stats */}
                <div className="glass p-6 rounded-3xl border border-white/5">
                    <h3 className="font-bold mb-6">وضعیت کلی کارها</h3>
                    <div className="space-y-6">
                        <StatBar label="تکمیل شده" value={stats.doneCount} total={stats.totalCount} color="bg-emerald-500" />
                        <StatBar label="در انتظار (To Do)" value={stats.totalCount - stats.doneCount - stats.inProgress.length} total={stats.totalCount} color="bg-gray-500" />
                        <StatBar label="در حال انجام" value={stats.inProgress.length} total={stats.totalCount} color="bg-blue-500" />
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {modalType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setModalType(null)}>
                    <div className="bg-[#1a1a2e] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="font-bold">
                                {modalType === 'today' && 'کارهای امروز'}
                                {modalType === 'delayed' && 'کارهای دارای تاخیر'}
                                {modalType === 'inProgress' && 'کارهای در حال انجام'}
                            </h3>
                            <button onClick={() => setModalType(null)}><FiX /></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {stats[modalType].length === 0 ? <p className="text-center text-white/40 py-4">موردی یافت نشد 🎉</p> : 
                                stats[modalType].map((t: any) => (
                                    <div key={t.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                                        <span className="text-sm">{t.title}</span>
                                        <span className="text-xs text-white/40">{t.due_date}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Components
const Card = ({ title, count, sub, color, icon, onClick }: any) => {
    const colors: any = {
        green: 'text-green-400 bg-green-500/20 hover:border-green-500/30',
        red: 'text-red-400 bg-red-500/20 hover:border-red-500/30',
        blue: 'text-blue-400 bg-blue-500/20 hover:border-blue-500/30'
    };
    return (
        <div onClick={onClick} className={`glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group transition cursor-pointer ${colors[color].split(' ')[2]}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colors[color].split(' hover')[0]}`}>{icon}</div>
                <span className="text-4xl font-extrabold text-white">{count}</span>
            </div>
            <h3 className="text-lg font-bold text-white/90">{title}</h3>
            <p className="text-xs text-white/50 mt-1">{sub}</p>
        </div>
    );
};

const StatBar = ({ label, value, total, color }: any) => (
    <div className="space-y-1">
        <div className="flex justify-between text-xs text-white/70">
            <span>{label}</span>
            <span>{value} از {total}</span>
        </div>
        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}></div>
        </div>
    </div>
);