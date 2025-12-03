"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { FiChevronRight, FiChevronLeft, FiFilter, FiChevronDown, FiX } from 'react-icons/fi';
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
    assigned_to?: string; // آیدی کاربر
    assigned_email?: string; // ایمیل یا نام کاربر برای نمایش
    project_id?: number;
};

type ViewMode = 'month' | 'week' | 'day';

// --- Custom Dropdown Component ---
const CustomDropdown = ({ label, options, value, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<any>(null);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedLabel = options.find((o: any) => o.value === value)?.label || label;

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-[#1a1a2e] border border-white/10 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/5 transition min-w-[140px] justify-between"
            >
                <span className="truncate">{value === 'all' ? label : selectedLabel}</span>
                <FiChevronDown className={`transition ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#0D0D15] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
                    <div 
                        onClick={() => { onChange('all'); setIsOpen(false); }}
                        className="px-4 py-3 hover:bg-white/5 cursor-pointer text-xs text-white/70 border-b border-white/5"
                    >
                        همه موارد
                    </div>
                    {options.map((opt: any) => (
                        <div 
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setIsOpen(false); }}
                            className={`px-4 py-3 hover:bg-white/5 cursor-pointer text-xs flex justify-between items-center ${value === opt.value ? 'text-blue-400 bg-blue-500/10' : 'text-white'}`}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function CalendarPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new DateObject({ calendar: persian, locale: persian_fa }));
    const [view, setView] = useState<ViewMode>('month');

    // Filters State
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [selectedMember, setSelectedMember] = useState<string>('all');
    
    // Lists for Dropdowns
    const [projectOptions, setProjectOptions] = useState<{label: string, value: string}[]>([]);
    const [memberOptions, setMemberOptions] = useState<{label: string, value: string}[]>([]);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            // 1. دریافت تسک‌ها به همراه اطلاعات پروژه
            const { data: tasksData, error } = await supabase
                .from('project_tasks')
                .select(`
                    id, title, due_date, status, assigned_to, project_id,
                    projects ( title )
                `);

            if (error) throw error;

            // 2. دریافت پروفایل‌ها برای نمایش نام اعضا
            const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');

            const formattedTasks = tasksData.map((t: any) => {
                const user = profiles?.find(p => p.id === t.assigned_to);
                return {
                    id: t.id,
                    title: t.title,
                    due_date: t.due_date,
                    status: t.status,
                    project_title: t.projects?.title || 'بدون پروژه',
                    project_id: t.project_id,
                    assigned_to: t.assigned_to,
                    assigned_email: user ? (user.full_name || user.email) : 'ناشناس'
                };
            });

            setTasks(formattedTasks);

            // استخراج لیست‌ها برای فیلتر (Unique Values)
            const uniqueProjects = Array.from(new Set(formattedTasks.map(t => t.project_title)))
                .map(title => ({ label: title, value: title }));
            
            const uniqueMembers = Array.from(new Set(formattedTasks.filter(t => t.assigned_to).map(t => JSON.stringify({ id: t.assigned_to, name: t.assigned_email }))))
                .map((str: string) => {
                    const obj = JSON.parse(str);
                    return { label: obj.name, value: obj.id };
                });

            setProjectOptions(uniqueProjects);
            setMemberOptions(uniqueMembers);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isTaskInDay = (task: Task, dayDateObj: DateObject) => {
        if (!task.due_date) return false;
        const dayString = dayDateObj.format("YYYY/MM/DD");
        if (!task.due_date.includes('-')) return task.due_date === dayString;
        const [startStr, endStr] = task.due_date.split(' - ').map(s => s.trim());
        if (!startStr || !endStr) return false;
        return dayString >= startStr && dayString <= endStr;
    };

    // Filter Logic
    const filteredTasks = tasks.filter(t => {
        const matchProject = selectedProject === 'all' || t.project_title === selectedProject;
        const matchMember = selectedMember === 'all' || t.assigned_to === selectedMember;
        return matchProject && matchMember;
    });

    const next = () => {
        if(view === 'month') setCurrentDate(new DateObject(currentDate).add(1, "month"));
        if(view === 'week') setCurrentDate(new DateObject(currentDate).add(7, "day"));
        if(view === 'day') setCurrentDate(new DateObject(currentDate).add(1, "day"));
    };
    const prev = () => {
        if(view === 'month') setCurrentDate(new DateObject(currentDate).subtract(1, "month"));
        if(view === 'week') setCurrentDate(new DateObject(currentDate).subtract(7, "day"));
        if(view === 'day') setCurrentDate(new DateObject(currentDate).subtract(1, "day"));
    };
    const goToday = () => setCurrentDate(new DateObject({ calendar: persian, locale: persian_fa }));

    // Handlers
    const handleDayDoubleClick = (day: number) => {
        const newDate = new DateObject(currentDate).set("day", day);
        setCurrentDate(newDate);
        setView('week');
    };
    const handleWeekDayDoubleClick = (dateObj: DateObject) => {
        setCurrentDate(dateObj);
        setView('day');
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'in_progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'blocked': return 'bg-red-500/20 text-red-300 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    // View Renders
    const renderMonthView = () => {
        const year = currentDate.year;
        const month = currentDate.month.number;
        const firstDayOfMonth = new DateObject({ year, month, day: 1, calendar: persian, locale: persian_fa });
        const startDayOfWeek = firstDayOfMonth.weekDay.index; 
        const daysCount = firstDayOfMonth.month.length;
        const days = [];
        for (let i = 0; i < startDayOfWeek; i++) days.push(null);
        for (let i = 1; i <= daysCount; i++) days.push(i);

        return (
            <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-[#121212]/60 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden">
                {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(d => (
                    <div key={d} className="py-3 text-center text-white/40 text-xs border-b border-white/10">{d}</div>
                ))}
                {days.map((day, idx) => {
                    if (!day) return <div key={idx} className="bg-white/[0.02] border-b border-l border-white/5 min-h-[100px]"></div>;
                    const thisDate = new DateObject({ year, month, day, calendar: persian, locale: persian_fa });
                    const dayTasks = filteredTasks.filter(t => isTaskInDay(t, thisDate));
                    const isToday = thisDate.format("YYYY/MM/DD") === new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD");

                    return (
                        <div key={idx} onDoubleClick={() => handleDayDoubleClick(day)} className={`border-b border-l border-white/5 p-2 min-h-[100px] relative transition hover:bg-white/[0.04] cursor-pointer ${isToday ? 'bg-blue-500/5' : ''}`}>
                            <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-500 text-white' : 'text-white/60'}`}>{day}</span>
                            <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                {dayTasks.map(task => (
                                    <div key={task.id} className={`text-[9px] px-1.5 py-1 rounded truncate border ${getStatusColor(task.status)}`}>{task.title}</div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderWeekView = () => {
        const startOfWeek = new DateObject(currentDate).toFirstOfWeek(); 
        const weekDays = [];
        for(let i=0; i<7; i++) weekDays.push(new DateObject(startOfWeek).add(i, "day"));

        return (
            <div className="grid grid-cols-7 flex-1 h-full bg-[#121212]/60 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden">
                {weekDays.map((dateObj, idx) => {
                    const dayTasks = filteredTasks.filter(t => isTaskInDay(t, dateObj));
                    const isToday = dateObj.format("YYYY/MM/DD") === new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD");
                    
                    return (
                        <div key={idx} onDoubleClick={() => handleWeekDayDoubleClick(dateObj)} className={`border-l border-white/5 flex flex-col h-full hover:bg-white/[0.02] transition cursor-pointer ${isToday ? 'bg-blue-500/5' : ''}`}>
                            <div className="p-3 text-center border-b border-white/10">
                                <div className="text-white/50 text-xs mb-1">{dateObj.weekDay.name}</div>
                                <div className={`text-lg font-bold ${isToday ? 'text-blue-400' : 'text-white'}`}>{dateObj.day}</div>
                            </div>
                            <div className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                                {dayTasks.map(task => (
                                    <div key={task.id} className={`p-3 rounded-xl border ${getStatusColor(task.status)}`}>
                                        <div className="font-bold text-xs mb-1">{task.title}</div>
                                        <div className="text-[10px] opacity-70">{task.project_title}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const dayTasks = filteredTasks.filter(t => isTaskInDay(t, currentDate));
        return (
            <div className="flex-1 bg-[#121212]/60 backdrop-blur-sm rounded-3xl border border-white/5 p-6 overflow-y-auto">
                 <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white">{currentDate.weekDay.name}</h2>
                    <p className="text-blue-400">{currentDate.day} {currentDate.month.name} {currentDate.year}</p>
                 </div>
                 {dayTasks.length === 0 ? (
                     <div className="text-center text-white/30 py-20">هیچ تسکی برای امروز نیست 🎉</div>
                 ) : (
                     <div className="space-y-3 max-w-3xl mx-auto">
                         {dayTasks.map(task => (
                             <div key={task.id} className={`p-4 rounded-2xl border flex justify-between items-center ${getStatusColor(task.status)}`}>
                                 <div>
                                     <h3 className="font-bold text-lg">{task.title}</h3>
                                     <p className="text-sm opacity-70 mt-1">پروژه: {task.project_title}</p>
                                 </div>
                                 <div className="text-right">
                                     <div className="text-xs bg-black/20 px-2 py-1 rounded mb-1">{task.status}</div>
                                     <div className="text-xs opacity-60">{task.assigned_email || 'بدون مسئول'}</div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
            </div>
        );
    };

    if (loading) return <div className="flex justify-center items-center h-screen text-white">در حال بارگذاری...</div>;

    return (
        <div className="p-6 md:p-10 text-white min-h-screen flex flex-col h-screen overflow-hidden">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 cursor-pointer" onClick={() => setView('month')}>تقویم کاری</h1>
                    <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1">
                        <button onClick={next} className="p-2 hover:bg-white/10 rounded-lg transition"><FiChevronRight /></button>
                        <span className="px-4 font-bold min-w-[140px] text-center text-sm">
                            {view === 'month' && `${currentDate.month.name} ${currentDate.year}`}
                            {view === 'week' && `هفته ${(currentDate as any).weekNumber} - ${currentDate.month.name}`}
                            {view === 'day' && `${currentDate.day} ${currentDate.month.name}`}
                        </span>
                        <button onClick={prev} className="p-2 hover:bg-white/10 rounded-lg transition"><FiChevronLeft /></button>
                    </div>
                    <button onClick={goToday} className="text-sm bg-blue-500/20 text-blue-300 px-3 py-2 rounded-xl border border-blue-500/30">امروز</button>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                        <button onClick={() => setView('month')} className={`px-3 py-1.5 rounded-lg text-xs transition ${view === 'month' ? 'bg-white/10 text-white' : 'text-white/50'}`}>ماه</button>
                        <button onClick={() => setView('week')} className={`px-3 py-1.5 rounded-lg text-xs transition ${view === 'week' ? 'bg-white/10 text-white' : 'text-white/50'}`}>هفته</button>
                        <button onClick={() => setView('day')} className={`px-3 py-1.5 rounded-lg text-xs transition ${view === 'day' ? 'bg-white/10 text-white' : 'text-white/50'}`}>روز</button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                        <FiFilter className="text-white/40" size={14} />
                        <CustomDropdown label="همه پروژه‌ها" options={projectOptions} value={selectedProject} onChange={setSelectedProject} />
                        <div className="w-[1px] h-4 bg-white/10"></div>
                        <CustomDropdown label="همه اعضا" options={memberOptions} value={selectedMember} onChange={setSelectedMember} />
                    </div>
                    <Link href="/"><button className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition">بازگشت</button></Link>
                </div>
            </div>
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
        </div>
    );
}