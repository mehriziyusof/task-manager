"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FiMessageSquare, FiFileText, FiDownload, FiUpload, 
  FiUsers, FiClock, FiPlus, FiX, FiCheckSquare, FiActivity, FiChevronDown, FiCalendar
} from 'react-icons/fi';

// تقویم شمسی
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

// --- Types ---
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

type Task = {
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    stage_title: string;
    stage_id: number | null;
    assigned_to: string | null;
    due_date: string | null;
    checklist?: { id: number; title: string; is_checked: boolean }[];
    attachments?: { name: string; url: string }[];
};

type Project = { id: number; title: string; created_at: string; process_id: number; status: string; };
type Comment = { id: number; text: string; user_name: string; created_at: string; };

let stageTitleCache: Record<number, string> = {}; 

export default function ProjectDetails() {
    const params = useParams();
    const projectIdString = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const projectId = projectIdString ? parseInt(projectIdString) : NaN;
    const isValidId = !isNaN(projectId);

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // دریافت داده‌ها
    const fetchData = useCallback(async () => {
        if (!isValidId) return;
        setLoading(true);
        try {
            const { data: projectData, error: projError } = await supabase
                .from('projects').select('*').eq('id', projectId).single();
            if (projError || !projectData) throw new Error('پروژه پیدا نشد.');
            setProject(projectData);

            const { data: stagesData } = await supabase
                .from('stages').select('id, title').eq('process_id', projectData.process_id);
            if (stagesData) stagesData.forEach(s => stageTitleCache[s.id] = s.title);

            const { data: rawTasks, error: taskError } = await supabase
                .from('project_tasks').select('*').eq('project_id', projectId);
            if (taskError) throw taskError;

            const finalTasks: Task[] = (rawTasks || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                assigned_to: t.assigned_to,
                due_date: t.due_date,
                stage_id: t.stage_id,
                stage_title: t.stage_id ? (stageTitleCache[t.stage_id] || 'سایر') : 'بدون مرحله',
                checklist: [], 
                attachments: [] 
            }));
            setTasks(finalTasks);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [projectId, isValidId]);

    useEffect(() => { if (isValidId) fetchData(); }, [isValidId, fetchData]);

    // آپدیت تسک
    const updateTask = async (taskId: number, updates: Partial<Task>) => {
        // آپدیت لوکال
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
        if (selectedTask?.id === taskId) {
            setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
        }

        // آپدیت دیتابیس
        try {
            // حذف فیلدهای اضافی
            const { checklist, attachments, stage_title, ...dbUpdates } = updates as any;
            await supabase.from('project_tasks').update(dbUpdates).eq('id', taskId);
        } catch (err) {
            console.error("Error updating task:", err);
        }
    };

    if (loading) return <div className="flex w-full h-[80vh] items-center justify-center text-white/70"><p>در حال بارگذاری...</p></div>;
    if (!project) return null;

    const groupedTasks = tasks.reduce((acc, task) => {
        const key = task.stage_title;
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    return (
        <div className="p-6 md:p-10 text-white pb-20 relative min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-1">
                        {project.title}
                    </h1>
                    <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded-lg">
                        {new Date(project.created_at).toLocaleDateString('fa-IR')}
                    </span>
                </div>
                <div className="flex gap-3">
                    <Link href="/">
                        <button className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition">
                            بازگشت
                        </button>
                    </Link>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex overflow-x-auto pb-8 gap-6 scrollbar-hide">
                {Object.entries(groupedTasks).map(([stage, stageTasks]) => (
                    <div key={stage} className="min-w-[300px] w-[300px] flex-shrink-0">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5 h-full">
                            <h3 className="font-bold mb-4 text-blue-300 flex justify-between items-center">
                                {stage}
                                <span className="bg-black/20 text-xs px-2 py-1 rounded-full text-white/60">{stageTasks.length}</span>
                            </h3>
                            <div className="space-y-3">
                                {stageTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        onClick={() => setSelectedTask(task)}
                                        className="glass glass-hover p-4 rounded-xl border border-white/5 cursor-pointer group hover:border-blue-500/30 transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium text-sm text-white group-hover:text-blue-200">{task.title}</h4>
                                        </div>
                                        <div className="flex justify-between items-center mt-3">
                                            <StatusBadge status={task.status} />
                                            {task.due_date && <span className="text-[10px] text-white/40 flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded"><FiClock/> {task.due_date}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {selectedTask && (
                <TaskDetailModal 
                    task={selectedTask} 
                    onClose={() => setSelectedTask(null)}
                    onUpdate={(updates) => updateTask(selectedTask.id, updates)}
                />
            )}
        </div>
    );
}

// --- Components ---

const StatusBadge = ({ status }: { status: TaskStatus }) => {
    const map = {
        'pending': { color: 'bg-gray-500/20 text-gray-400', label: 'شروع نشده' },
        'in_progress': { color: 'bg-yellow-500/20 text-yellow-400', label: 'در حال انجام' },
        'completed': { color: 'bg-green-500/20 text-green-400', label: 'تکمیل شده' },
        'blocked': { color: 'bg-red-500/20 text-red-400', label: 'متوقف شده' },
    };
    const { color, label } = map[status] || map['pending'];
    return <span className={`text-[10px] px-2 py-0.5 rounded-md ${color}`}>{label}</span>;
};

// --- MODAL (اصلاح شده) ---
const TaskDetailModal = ({ task, onClose, onUpdate }: 
    { task: Task; onClose: () => void; onUpdate: (u: Partial<Task>) => void }) => {
    
    const [description, setDescription] = useState(task.description || "");
    const [showUsers, setShowUsers] = useState(false);
    
    // MOCK USERS (بعداً از profiles لود می‌شود)
    const users = ["علی", "سارا", "محمد", "مینا"];

    // هندلر توضیحات
    const handleDescriptionBlur = () => {
        if (description !== task.description) onUpdate({ description });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in" onClick={onClose}>
            <div 
                className="glass w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl relative animate-scale-up custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-28 bg-gradient-to-r from-blue-900/40 to-purple-900/40 w-full relative">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 hover:bg-red-500/80 text-white p-2 rounded-full transition backdrop-blur-md z-20">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-6 md:p-10 space-y-8 -mt-12 relative z-10">
                    {/* Title */}
                    <div className="space-y-2">
                        <span className="bg-black/60 backdrop-blur-md text-xs px-3 py-1 rounded-full text-blue-300 border border-white/10">{task.stage_title}</span>
                        <input 
                            value={task.title}
                            onChange={(e) => onUpdate({ title: e.target.value })}
                            className="text-3xl font-extrabold text-white drop-shadow-md bg-transparent border-none focus:ring-0 w-full p-0 block mt-2"
                        />
                    </div>

                    <div className="flex flex-col md:flex-row gap-10">
                        {/* Left */}
                        <div className="flex-1 space-y-8">
                            {/* Description */}
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white/90"><FiFileText /> توضیحات</h3>
                                <textarea 
                                    className="w-full bg-white/5 p-4 rounded-xl text-sm text-white/90 leading-relaxed border border-white/10 min-h-[120px] resize-none focus:bg-white/10 focus:border-blue-500/50 focus:outline-none transition placeholder:text-white/30"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={handleDescriptionBlur}
                                    placeholder="توضیحاتی بنویسید..."
                                />
                            </div>
                            
                            {/* Comments & Checklist place holders */}
                            {/* ... (کدهای چک‌لیست و کامنت که داشتید را می‌توانید اینجا نگه دارید) */}
                        </div>

                        {/* Right Sidebar */}
                        <div className="w-full md:w-60 space-y-6 flex-shrink-0">
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-white/50 uppercase tracking-wider px-1">تنظیمات کارت</span>
                                
                                {/* 1. انتخاب عضو (Members) */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowUsers(!showUsers)}
                                        className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition border border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FiUsers className="text-blue-400" /> 
                                            {task.assigned_to || "تخصیص به عضو"}
                                        </div>
                                        <FiChevronDown />
                                    </button>
                                    
                                    {showUsers && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 animate-fade-in-up">
                                            {users.map(u => (
                                                <div 
                                                    key={u} 
                                                    onClick={() => { onUpdate({ assigned_to: u }); setShowUsers(false); }}
                                                    className="px-4 py-2 hover:bg-white/10 cursor-pointer text-sm text-white/80"
                                                >
                                                    {u}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 2. تقویم شمسی (Date Picker) */}
                                <div className="relative group w-full">
                                    <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition border border-white/5 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <FiClock className="text-yellow-400" />
                                            {task.due_date ? task.due_date : 'تاریخ سررسید'}
                                        </div>
                                        {/* اینپوت مخفی تقویم روی کل دکمه */}
                                        <div className="absolute inset-0 opacity-0 z-10">
                                            <DatePicker 
                                                calendar={persian}
                                                locale={persian_fa}
                                                onChange={(date: DateObject) => {
                                                    if (date) onUpdate({ due_date: date.toString() });
                                                }}
                                                containerStyle={{ width: '100%', height: '100%' }}
                                                style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. پیوست فایل (File Upload) */}
                                <label className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition cursor-pointer border border-white/5">
                                    <FiUpload className="text-purple-400" /> پیوست فایل
                                    <input type="file" className="hidden" onChange={(e) => alert('فایل انتخاب شد (فعلاً تستی)')} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};