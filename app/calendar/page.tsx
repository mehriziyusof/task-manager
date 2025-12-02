"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import Link from 'next/link';
import { FiChevronLeft } from 'react-icons/fi';

type CalendarTask = {
    title: string;
    due_date: string;
    status: string;
};

export default function CalendarPage() {
    const [tasks, setTasks] = useState<CalendarTask[]>([]);

    useEffect(() => {
        const fetchTasks = async () => {
            const { data } = await supabase.from('project_tasks').select('title, due_date, status');
            if (data) setTasks(data);
        };
        fetchTasks();
    }, []);

    return (
        <div className="p-8 text-white min-h-screen flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-5xl flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    📅 تقویم جامع تسک‌ها
                </h1>
                <Link href="/">
                    <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm transition">
                        <FiChevronLeft /> بازگشت به میز کار
                    </button>
                </Link>
            </div>

            {/* Calendar Container */}
            <div className="glass p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl w-full max-w-5xl flex justify-center">
                <Calendar
                    calendar={persian}
                    locale={persian_fa}
                    className="custom-calendar-large" // استایل‌ها از globals.css خوانده می‌شوند
                    fullYear={false}
                    weekDays={["ش", "ی", "د", "س", "چ", "پ", "ج"]}
                    
                    // نمایش تسک‌ها روی روزها
                    mapDays={({ date }) => {
                        const dateStr = date.toString();
                        // پیدا کردن تسک‌هایی که تاریخشان شامل امروز است
                        const tasksOnDay = tasks.filter(t => t.due_date && t.due_date.includes(dateStr));
                        
                        if (tasksOnDay.length > 0) {
                            return {
                                children: (
                                    <div className="relative flex flex-col items-center justify-start h-full w-full pt-1">
                                        <span className="text-lg font-bold z-10">{date.day}</span>
                                        <div className="flex flex-col gap-1 w-full px-1 mt-1 overflow-y-auto max-h-[60px] custom-scrollbar">
                                            {tasksOnDay.map((task, idx) => (
                                                <div key={idx} className={`text-[9px] px-1 py-0.5 rounded truncate w-full text-center ${
                                                    task.status === 'completed' ? 'bg-green-500/30 text-green-200' :
                                                    task.status === 'in_progress' ? 'bg-yellow-500/30 text-yellow-200' :
                                                    'bg-blue-500/30 text-blue-200'
                                                }`}>
                                                    {task.title}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            }
                        }
                    }}
                    // استایل‌های مستقیم را حذف کردیم و به کلاس CSS منتقل کردیم تا خطا ندهد
                />
            </div>
        </div>
    );
}