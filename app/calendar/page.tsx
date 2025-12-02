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
            const { data } = await supabase
                .from('project_tasks')
                .select('title, due_date, status')
                .not('due_date', 'is', null);
            
            if (data) setTasks(data);
        };
        fetchTasks();
    }, []);

    return (
        <div className="p-8 text-white min-h-screen flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-6xl flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                        📅 تقویم کاری من
                    </h1>
                    <p className="text-white/50 text-sm mt-1">نمای کلی تمام تسک‌ها و سررسیدها</p>
                </div>
                <Link href="/">
                    <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm transition">
                        <FiChevronLeft /> بازگشت به میز کار
                    </button>
                </Link>
            </div>

            {/* Calendar Container */}
            {/* استایل‌ها به کلاس‌های تیلویند و CSS منتقل شدند تا ارور تایپ‌اسکریپت رفع شود */}
            <div className="glass p-10 rounded-[3rem] bg-white/5 border border-white/10 shadow-2xl w-full max-w-6xl flex justify-center items-start min-h-[700px]">
                <Calendar
                    calendar={persian}
                    locale={persian_fa}
                    fullYear={false}
                    className="custom-calendar-large" // استایل‌ها از globals.css خوانده می‌شوند
                    weekDays={["ش", "ی", "د", "س", "چ", "پ", "ج"]}
                    
                    // نمایش تسک‌ها روی روزها
                    mapDays={({ date }) => {
                        const dateStr = date.toString();
                        const tasksOnDay = tasks.filter(t => t.due_date && t.due_date.includes(dateStr));
                        
                        if (tasksOnDay.length > 0) {
                            return {
                                children: (
                                    <div className="relative flex flex-col items-center justify-start h-full w-full pt-2 group cursor-pointer hover:bg-white/5 transition rounded-lg">
                                        <span className="text-xl font-bold z-10 mb-1">{date.day}</span>
                                        
                                        <div className="flex flex-col gap-1 w-full px-1 mt-1 overflow-y-auto max-h-[60px] custom-scrollbar">
                                            {tasksOnDay.map((task, idx) => (
                                                <div key={idx} className={`text-[10px] px-2 py-1 rounded truncate w-full text-center shadow-sm ${
                                                    task.status === 'completed' ? 'bg-green-500/40 text-green-100' :
                                                    task.status === 'in_progress' ? 'bg-yellow-500/40 text-yellow-100' :
                                                    'bg-blue-500/40 text-blue-100'
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
                />
            </div>
        </div>
    );
}