"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { FiChevronRight, FiChevronLeft, FiClock, FiCalendar } from 'react-icons/fi';
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

// --- Types ---
type Task = {
    id: number;
    title: string;
    due_date: string | null;
    status: string;
    project_title?: string;
    assigned_to?: string;
};

export default function CalendarPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    
    // مدیریت تاریخ فعلی تقویم (چه ماهی را نشان دهیم)
    const [currentDate, setCurrentDate] = useState(new DateObject({ calendar: persian, locale: persian_fa }));

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            // دریافت تمام تسک‌ها + نام پروژه مربوطه
            const { data, error } = await supabase
                .from('project_tasks')
                .select(`
                    id, title, due_date, status, assigned_to,
                    projects ( title )
                `);

            if (error) throw error;

            const formattedTasks = data.map((t: any) => ({
                id: t.id,
                title: t.title,
                due_date: t.due_date, // فرمت: "1402/09/10" یا "1402/09/10 - 1402/09/12"
                status: t.status,
                project_title: t.projects?.title,
                assigned_to: t.assigned_to
            }));

            setTasks(formattedTasks);
        } catch (err) {
            console.error("Error fetching tasks:", err);
        } finally {
            setLoading(false);
        }
    };

    // --- منطق ساخت تقویم ---
    const daysInMonth = useMemo(() => {
        const year = currentDate.year;
        const month = currentDate.month.number;
        
        // روز اول ماه
        const firstDayOfMonth = new DateObject({ year, month, day: 1, calendar: persian, locale: persian_fa });
        const startDayOfWeek = firstDayOfMonth.weekDay.index; // 0 (شنبه) تا 6 (جمعه)

        // تعداد روزهای ماه
        const daysCount = firstDayOfMonth.month.length;

        const days = [];
        
        // خانه‌های خالی قبل از شروع ماه
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ day: null, fullDate: null });
        }

        // روزهای اصلی
        for (let i = 1; i <= daysCount; i++) {
            // ساخت رشته تاریخ مثل: 1402/09/05 (با صفر قبل از اعداد تک رقمی)
            const d = new DateObject({ year, month, day: i, calendar: persian, locale: persian_fa });
            days.push({ 
                day: i, 
                fullDate: d.format("YYYY/MM/DD") 
            });
        }

        return days;
    }, [currentDate]);

    // توابع تغییر ماه
    const nextMonth = () => setCurrentDate(new DateObject(currentDate).add(1, "month"));
    const prevMonth = () => setCurrentDate(new DateObject(currentDate).subtract(1, "month"));
    const goToday = () => setCurrentDate(new DateObject({ calendar: persian, locale: persian_fa }));

    // رنگ‌بندی وضعیت‌ها
    const getStatusColor = (status: string) => {
        switch(status) {
            case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'in_progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'blocked': return 'bg-red-500/20 text-red-300 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen text-white">در حال بارگذاری تقویم...</div>;

    return (
        <div className="p-6 md:p-10 text-white min-h-screen flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                        تقویم کاری
                    </h1>
                    <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1">
                        <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition"><FiChevronRight /></button>
                        <span className="px-4 font-bold min-w-[120px] text-center">{currentDate.month.name} {currentDate.year}</span>
                        <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition"><FiChevronLeft /></button>
                    </div>
                    <button onClick={goToday} className="text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-2 rounded-xl transition border border-blue-500/30">
                        امروز
                    </button>
                </div>
                <Link href="/">
                    <button className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition">
                        بازگشت به میز کار
                    </button>
                </Link>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 bg-[#121212]/60 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden shadow-2xl flex flex-col">
                {/* Days Header */}
                <div className="grid grid-cols-7 bg-white/5 border-b border-white/10">
                    {['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'].map(d => (
                        <div key={d} className="py-4 text-center text-white/50 text-sm font-medium">{d}</div>
                    ))}
                </div>

                {/* Days Cells */}
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                    {daysInMonth.map((dateItem, idx) => {
                        if (!dateItem.day) return <div key={idx} className="bg-white/[0.02] border-b border-l border-white/5 min-h-[120px]"></div>;

                        // پیدا کردن تسک‌های این روز
                        // نکته: بررسی می‌کنیم آیا تاریخ این روز در رشته "due_date" تسک وجود دارد یا خیر
                        // این روش ساده برای بازه‌های زمانی هم کار می‌کند (چون رشته تاریخ شامل بازه است)
                        const daysTasks = tasks.filter(t => t.due_date && t.due_date.includes(dateItem.fullDate!));

                        const isToday = dateItem.fullDate === new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD");

                        return (
                            <div key={idx} className={`border-b border-l border-white/5 p-2 min-h-[120px] relative transition hover:bg-white/[0.02] ${isToday ? 'bg-blue-500/5' : ''}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40' : 'text-white/60'}`}>
                                        {dateItem.day}
                                    </span>
                                </div>
                                
                                <div className="space-y-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                                    {daysTasks.map(task => (
                                        <div key={task.id} className={`text-[10px] p-1.5 rounded border truncate cursor-pointer hover:scale-[1.02] transition ${getStatusColor(task.status)}`}>
                                            <div className="font-bold truncate">{task.title}</div>
                                            {task.project_title && <div className="text-[9px] opacity-70 truncate">{task.project_title}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}