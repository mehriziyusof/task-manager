"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FiMessageSquare, FiFileText, FiDownload, FiUpload, 
  FiUsers, FiClock, FiPlus, FiX, FiCheckSquare, FiActivity 
} from 'react-icons/fi';

// --- تعاریف نوع داده (Types) ---
type Project = {
    id: number;
    title: string;
    description: string | null;
    status: 'Active' | 'Completed' | 'Pending';
    created_at: string;
    process_id: number;
};

type Task = {
    id: number;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    stage_title: string;
    stage_id: number | null;
    assigned_to: string | null;
    due_date: string | null;
};

// نوع داده برای دریافت از دیتابیس (قبل از تبدیل)
type RawTask = {
    id: number;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    stage_id: number | null;
    assigned_to: string | null; 
    due_date: string | null;
};

type Comment = {
    id: number;
    text: string;
    user_name: string;
    created_at: string;
};

type Attachment = {
    id: number;
    name: string;
    size: string;
    type: string;
    url: string;
};

// --- Cache ---
let stageTitleCache: Record<number, string> = {}; 

export default function ProjectDetails() {
    const router = useRouter();
    const params = useParams();
    
    // تبدیل ایمن ID
    const projectIdString = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const projectId = projectIdString ? parseInt(projectIdString) : NaN;
    const isValidId = !isNaN(projectId);

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- State برای مودال تسک ---
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // دریافت داده‌ها
    const fetchData = useCallback(async () => {
        if (!isValidId) return;

        setLoading(true);
        setError(null);
        
        try {
            // 1. دریافت پروژه
            const { data: projectData, error: projError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projError || !projectData) throw new Error('پروژه پیدا نشد.');
            setProject(projectData);

            // 2. دریافت مراحل
            const { data: stagesData } = await supabase
                .from('stages')
                .select('id, title')
                .eq('process_id', projectData.process_id);
            
            if (stagesData) {
                stagesData.forEach(s => stageTitleCache[s.id] = s.title);
            }

            // 3. دریافت تسک‌ها
            const { data: rawTasks, error: taskError } = await supabase
                .from('project_tasks')
                .select('*')
                .eq('project_id', projectId);

            if (taskError) throw taskError;

            const finalTasks: Task[] = (rawTasks || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                assigned_to: t.assigned_to,
                due_date: t.due_date,
                stage_id: t.stage_id,
                stage_title: t.stage_id ? (stageTitleCache[t.stage_id] || 'سایر') : 'بدون مرحله'
            }));

            setTasks(finalTasks);

        } catch (err: any) {
            console.error("Fetch Error:", err);
            setError(err.message || "خطا در دریافت اطلاعات.");
        } finally {
            setLoading(false);
        }
    }, [projectId, isValidId]);

    useEffect(() => {
        if (isValidId) fetchData();
    }, [isValidId, fetchData]);

    // --- توابع هندلر ---
    const openTaskModal = (task: Task) => {
        setSelectedTask(task);
    };

    const closeTaskModal = () => {
        setSelectedTask(null);
    };

    // --- رندرینگ ---
    if (loading) return <LoadingState />;
    if (error) return <ErrorState message={error} />;
    if (!project) return null;

    // گروه‌بندی تسک‌ها
    const groupedTasks = tasks.reduce((acc, task) => {
        const key = task.stage_title;
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    return (
        <div className="p-6 md:p-10 text-white pb-20 relative">
            
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
                <Link href="/">
                    <button className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition">
                        بازگشت
                    </button>
                </Link>
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
                                        onClick={() => openTaskModal(task)}
                                        className="glass glass-hover p-4 rounded-xl border border-white/5 cursor-pointer group hover:border-blue-500/30 transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium text-sm text-white group-hover:text-blue-200">{task.title}</h4>
                                        </div>
                                        {task.status && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                                                task.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                                                task.status === 'blocked' ? 'bg-red-500/20 text-red-400' : 
                                                'bg-yellow-500/10 text-yellow-300'
                                            }`}>
                                                {task.status}
                                            </span>
                                        )}
                                        <div className="mt-3 flex items-center justify-between text-white/40 text-xs">
                                            <div className="flex -space-x-2 space-x-reverse">
                                                {/* آواتار کاربر (فعلا خالی) */}
                                                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">👤</div>
                                            </div>
                                            {task.due_date && <span className="flex items-center gap-1"><FiClock/> {task.due_date}</span>}
                                        </div>
                                    </div>
                                ))}
                                <button className="w-full py-2 rounded-lg border border-dashed border-white/20 text-white/40 text-sm hover:text-white hover:border-white/40 transition flex items-center justify-center gap-2">
                                    <FiPlus /> افزودن تسک
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* دکمه افزودن ستون جدید (نمایشی) */}
                <div className="min-w-[300px] flex items-start justify-center">
                    <button className="bg-white/5 hover:bg-white/10 text-white/50 py-3 px-6 rounded-xl transition flex items-center gap-2">
                        <FiPlus /> مرحله جدید
                    </button>
                </div>
            </div>

            {/* --- MODAL: Task Details --- */}
            {selectedTask && (
                <TaskDetailModal 
                    task={selectedTask} 
                    onClose={closeTaskModal} 
                />
            )}

        </div>
    );
}

// --- کامپوننت‌های کمکی (Components) ---

// 1. کامپوننت لودینگ
const LoadingState = () => (
    <div className="flex w-full h-[80vh] items-center justify-center text-white/70">
        <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="animate-pulse">در حال دریافت اطلاعات...</p>
        </div>
    </div>
);

// 2. کامپوننت خطا
const ErrorState = ({ message }: { message: string }) => (
    <div className="p-10 flex justify-center">
        <div className="glass p-8 rounded-3xl border border-red-500/30 max-w-md text-center">
            <h2 className="text-xl text-red-400 font-bold mb-2">خطا</h2>
            <p className="text-white/70 mb-6">{message}</p>
            <Link href="/">
                <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition">
                    بازگشت
                </button>
            </Link>
        </div>
    </div>
);

// 3. کامپوننت مودال جزئیات تسک (قلب تپنده جدید)
const TaskDetailModal = ({ task, onClose }: { task: Task; onClose: () => void }) => {
    // استیت‌های داخلی مودال (کامنت و فایل موقت)
    const [commentText, setCommentText] = useState('');
    const [mockComments, setMockComments] = useState<Comment[]>([
        { id: 1, text: "نیاز به بررسی بیشتر دارد.", user_name: "مدیر", created_at: "10:00" }
    ]);

    const handleSendComment = () => {
        if(!commentText.trim()) return;
        setMockComments([...mockComments, {
            id: Date.now(),
            text: commentText,
            user_name: "شما",
            created_at: "الان"
        }]);
        setCommentText('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            {/* Modal Content */}
            <div 
                className="glass w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl relative animate-fade-in-up"
                onClick={(e) => e.stopPropagation()} // جلوگیری از بسته شدن با کلیک روی مودال
            >
                {/* Header Image / Banner (Optional) */}
                <div className="h-32 bg-gradient-to-r from-blue-900/40 to-purple-900/40 w-full relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/20 hover:bg-red-500/80 text-white p-2 rounded-full transition backdrop-blur-md"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-8 -mt-12 relative z-10">
                    
                    {/* Title & Meta */}
                    <div className="space-y-4">
                        <div className="flex gap-2 mb-2">
                            <span className="bg-black/40 backdrop-blur-md text-xs px-3 py-1 rounded-full text-blue-300 border border-white/10">
                                {task.stage_title}
                            </span>
                            <span className={`text-xs px-3 py-1 rounded-full border border-white/10 backdrop-blur-md ${
                                task.status === 'completed' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-200'
                            }`}>
                                {task.status}
                            </span>
                        </div>
                        <h2 className="text-3xl font-bold text-white drop-shadow-md">{task.title}</h2>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Main Content (Left) */}
                        <div className="flex-1 space-y-8">
                            
                            {/* Description */}
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white/90">
                                    <FiFileText /> توضیحات
                                </h3>
                                <div className="bg-white/5 p-4 rounded-xl text-sm text-white/80 leading-relaxed border border-white/5 min-h-[100px]">
                                    {task.description || "توضیحاتی برای این تسک ثبت نشده است."}
                                </div>
                            </div>

                            {/* Checklist (Mock) */}
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white/90">
                                    <FiCheckSquare /> چک‌لیست
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <input type="checkbox" className="w-4 h-4 rounded border-white/30 bg-transparent accent-blue-500" />
                                        <span className="text-sm text-white/80 line-through opacity-50">بررسی اولیه فایل‌ها</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <input type="checkbox" className="w-4 h-4 rounded border-white/30 bg-transparent accent-blue-500" />
                                        <span className="text-sm text-white/80">تایید نهایی مشتری</span>
                                    </div>
                                    <button className="text-xs text-white/50 hover:text-white flex items-center gap-1 mt-2">
                                        <FiPlus /> افزودن آیتم
                                    </button>
                                </div>
                            </div>

                            {/* Comments */}
                            <div className="space-y-4 pt-6 border-t border-white/10">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white/90">
                                    <FiActivity /> فعالیت‌ها و نظرات
                                </h3>
                                
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">ME</div>
                                    <div className="flex-1 space-y-2">
                                        <input 
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-white/30"
                                            placeholder="نوشتن نظر..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 mt-4">
                                    {mockComments.map(c => (
                                        <div key={c.id} className="flex gap-3 animate-fade-in-up">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 text-xs">👤</div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white">{c.user_name}</span>
                                                    <span className="text-xs text-white/30">{c.created_at}</span>
                                                </div>
                                                <p className="text-sm text-white/80 bg-white/5 p-3 rounded-xl rounded-tl-none border border-white/5">
                                                    {c.text}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar (Right) - Actions */}
                        <div className="w-full md:w-48 space-y-6 flex-shrink-0">
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-white/50 uppercase">افزودن به کارت</span>
                                <button className="w-full flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 py-2 px-3 rounded-lg text-sm transition text-right">
                                    <FiUsers size={14} /> اعضا
                                </button>
                                <button className="w-full flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 py-2 px-3 rounded-lg text-sm transition text-right">
                                    <FiCheckSquare size={14} /> چک‌لیست
                                </button>
                                <button className="w-full flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 py-2 px-3 rounded-lg text-sm transition text-right">
                                    <FiClock size={14} /> تاریخ سررسید
                                </button>
                                <button className="w-full flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 py-2 px-3 rounded-lg text-sm transition text-right">
                                    <FiUpload size={14} /> پیوست فایل
                                </button>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-bold text-white/50 uppercase">عملیات</span>
                                <button className="w-full flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 px-3 rounded-lg text-sm transition text-right">
                                    <FiX size={14} /> حذف تسک
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};