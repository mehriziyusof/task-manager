"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import Link from 'next/link';

export default function CalendarPage() {
    const [tasks, setTasks] = useState<any[]>([]);

    useEffect(() => {
        const fetchTasks = async () => {
            const { data } = await supabase.from('project_tasks').select('title, due_date, status');
            if (data) setTasks(data);
        };
        fetchTasks();
    }, []);

    return (
        <div className="p-8 text-white min-h-screen">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <h1 className="text-2xl font-bold">📅 تقویم کاری من</h1>
                <Link href="/">
                    <button className="bg-white/10 px-4 py-2 rounded-xl text-sm">بازگشت</button>
                </Link>
            </div>

            <div className="glass p-8 rounded-3xl flex justify-center items-center bg-white/5">
                <Calendar
                    calendar={persian}
                    locale={persian_fa}
                    className="custom-calendar" // می‌توانید در CSS به این کلاس استایل بدهید
                    // نمایش تسک‌ها روی تقویم (نیاز به لاجیک map کردن تسک‌ها به تاریخ دارد)
                    mapDays={({ date }) => {
                        const taskOnDay = tasks.find(t => t.due_date === date.toString());
                        if (taskOnDay) {
                            return {
                                children: (
                                    <div className="relative flex flex-col items-center">
                                        <span>{date.day}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1"></span>
                                        <span className="text-[8px] absolute -bottom-4 w-16 truncate text-center text-blue-300">{taskOnDay.title}</span>
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