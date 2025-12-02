"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FiMessageSquare, FiFileText, FiDownload, FiUpload, 
  FiUsers, FiClock, FiPlus, FiX, FiCheckSquare, FiActivity, FiChevronDown 
} from 'react-icons/fi';

// --- Types ---
type Project = {
    id: number;
    title: string;
    description: string | null;
    status: 'Active' | 'Completed' | 'Pending';
    created_at: string;
    process_id: number;
};

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
    checklist?: { id: number; title: string; is_checked: boolean }[]; // اضافه شده برای چک‌لیست
};

type RawTask = {
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    stage_id: number | null;
    assigned_to: string | null; 
    due_date: string | null;
};

type Comment = { id: number; text: string; user_name: string; created_at: string; };
type Attachment = { id: number; name: string; size: string; type: string; url: string; };

// --- Cache ---
let stageTitleCache: Record<number, string> = {}; 

export default function ProjectDetails() {
    const router = useRouter();
    const params = useParams();
    
    const projectIdString = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const projectId = projectIdString ? parseInt(projectIdString) : NaN;
    const isValidId = !isNaN(projectId);

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const fetchData = useCallback(async () => {
        if (!isValidId) return;
        setLoading(true);
        setError(null);
        try {
            // 1. پروژه
            const { data: projectData, error: projError } = await supabase
                .from('projects').select('*').eq('id', projectId).single();
            if (projError || !projectData) throw new Error('پروژه پیدا نشد.');
            setProject(projectData);

            // 2. مراحل
            const { data: stagesData } = await supabase
                .from('stages').select('id, title').eq('process_id', projectData.process_id);
            if (stagesData) stagesData.forEach(s => stageTitleCache[s.id] = s.title);

            // 3. تسک‌ها
            const { data: rawTasks, error: taskError } = await supabase
                .from('project_tasks').select('*').eq('project_id', projectId);
            if (taskError) throw taskError;

            // تبدیل و افزودن چک‌لیست‌های تستی (بعداً از DB می‌آید)
            const finalTasks: Task[] = (rawTasks || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                assigned_to: t.assigned_to,
                due_date: t.due_date,
                stage_id: t.stage_id,
                stage_title: t.stage_id ? (stageTitleCache[t.stage_id] || 'سایر') : 'بدون مرحله',
                checklist: [ // دیتای فیک برای تست چک‌لیست
                    { id: 1, title: 'بررسی اولیه فایل‌ها', is_checked: false },
                    { id: 2, title: 'تایید نهایی مشتری', is_checked: true }
                ]
            }));
            setTasks(finalTasks);

        } catch (err: any) {
            console.error("Fetch Error:", err);
            setError(err.message || "خطا در دریافت اطلاعات.");
        } finally {
            setLoading(false);
        }
    }, [projectId, isValidId]);

    useEffect(() => { if (isValidId) fetchData(); }, [isValidId, fetchData]);

    // --- هندلرهای آپدیت ---
    const updateTaskStatus = (taskId: number, newStatus: TaskStatus) => {
        // آپدیت لوکال
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        if (selectedTask?.id === taskId) {
            setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
        }
        // TODO: آپدیت در Supabase
    };

    const toggleChecklistItem = (taskId: number, itemId: number) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId || !t.checklist) return t;
            return {
                ...t,
                checklist: t.checklist.map(item => 
                    item.id === itemId ? { ...item, is_checked: !item.is_checked } : item
                )
            };
        }));
        
        // آپدیت همزمان مودال اگر باز است
        if (selectedTask?.id === taskId && selectedTask.checklist) {
            setSelectedTask({
                ...selectedTask,
                checklist: selectedTask.checklist.map(item => 
                    item.id === itemId ? { ...item, is_checked: !item.is_checked } : item
                )
            });
        }
    };

    if (loading) return <LoadingState />;
    if (error) return <ErrorState message={error} />;
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
                                        onClick={() => setSelectedTask(task)}
                                        className="glass glass-hover p-4 rounded-xl border border-white/5 cursor-pointer group hover:border-blue-500/30 transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium text-sm text-white group-hover:text-blue-200">{task.title}</h4>
                                        </div>
                                        <StatusBadge status={task.status} />
                                    </div>
                                ))}
                                <button className="w-full py-2 rounded-lg border border-dashed border-white/20 text-white/40 text-sm hover:text-white hover:border-white/40 transition flex items-center justify-center gap-2">
                                    <FiPlus /> افزودن تسک
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODAL: Task Details --- */}
            {selectedTask && (
                <TaskDetailModal 
                    task={selectedTask} 
                    onClose={() => setSelectedTask(null)}
                    onUpdateStatus={updateTaskStatus}
                    onToggleCheck={toggleChecklistItem}
                />
            )}
        </div>
    );
}

// --- Components ---

const LoadingState = () => (
    <div className="flex w-full h-[80vh] items-center justify-center text-white/70">
        <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="animate-pulse">در حال دریافت اطلاعات...</p>
        </div>
    </div>
);

const ErrorState = ({ message }: { message: string }) => (
    <div className="p-10 flex justify-center">
        <div className="glass p-8 rounded-3xl border border-red-500/30 max-w-md text-center">
            <h2 className="text-xl text-red-400 font-bold mb-2">خطا</h2>
            <p className="text-white/70 mb-6">{message}</p>
            <Link href="/">
                <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition">بازگشت</button>
            </Link>
        </div>
    </div>
);

const StatusBadge = ({ status, onClick }: { status: TaskStatus, onClick?: () => void }) => {
    const map = {
        'pending': { color: 'bg-gray-500/20 text-gray-400', label: 'شروع نشده' },
        'in_progress': { color: 'bg-yellow-500/20 text-yellow-400', label: 'در حال انجام' },
        'completed': { color: 'bg-green-500/20 text-green-400', label: 'تکمیل شده' },
        'blocked': { color: 'bg-red-500/20 text-red-400', label: 'متوقف شده' },
    };
    const { color, label } = map[status] || map['pending'];

    return (
        <span 
            onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
            className={`text-[10px] px-2 py-0.5 rounded-md cursor-pointer ${color} ${onClick ? 'hover:brightness-125 transition' : ''}`}
        >
            {label}
        </span>
    );
};

// --- مودال جزئیات تسک (اصلاح شده) ---
const TaskDetailModal = ({ task, onClose, onUpdateStatus, onToggleCheck }: 
    { task: Task; onClose: () => void; onUpdateStatus: (id: number, s: TaskStatus) => void; onToggleCheck: (tid: number, iid: number) => void }) => {
    
    const [commentText, setCommentText] = useState('');
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [mockComments, setMockComments] = useState<Comment[]>([
        { id: 1, text: "نیاز به بررسی بیشتر دارد.", user_name: "مدیر", created_at: "10:00" }
    ]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSendComment = () => {
        if(!commentText.trim()) return;
        setMockComments([...mockComments, { id: Date.now(), text: commentText, user_name: "شما", created_at: "الان" }]);
        setCommentText('');
    };

    const handleFileUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        // ✅ افزایش بلور پس‌زمینه (backdrop-blur-md -> lg)
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-lg animate-fade-in" onClick={onClose}>
            <div 
                className="glass w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl relative animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Banner */}
                <div className="h-32 bg-gradient-to-r from-blue-900/40 to-purple-900/40 w-full relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/20 hover:bg-red-500/80 text-white p-2 rounded-full transition backdrop-blur-md z-20"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-6 md:p-10 space-y-8 -mt-14 relative z-10">
                    
                    {/* Title & Status */}
                    <div className="space-y-4">
                        <div className="flex gap-2 mb-2 items-center">
                            <span className="bg-black/40 backdrop-blur-md text-xs px-3 py-1 rounded-full text-blue-300 border border-white/10">
                                {task.stage_title}
                            </span>
                            
                            {/* منوی تغییر وضعیت */}
                            <div className="relative">
                                <div 
                                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                                    className="flex items-center gap-1 cursor-pointer bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 hover:bg-white/10 transition"
                                >
                                    <StatusBadge status={task.status} />
                                    <FiChevronDown className="text-white/50 text-xs" />
                                </div>
                                
                                {showStatusMenu && (
                                    <div className="absolute top-full left-0 mt-2 w-40 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 animate-fade-in-up">
                                        {['pending', 'in_progress', 'completed', 'blocked'].map((s) => (
                                            <div 
                                                key={s}
                                                onClick={() => { onUpdateStatus(task.id, s as TaskStatus); setShowStatusMenu(false); }}
                                                className="px-4 py-2 hover:bg-white/10 cursor-pointer text-xs text-white/80 flex items-center gap-2"
                                            >
                                                <div className={`w-2 h-2 rounded-full ${
                                                    s === 'completed' ? 'bg-green-400' : s === 'in_progress' ? 'bg-yellow-400' : s === 'blocked' ? 'bg-red-400' : 'bg-gray-400'
                                                }`} />
                                                {s === 'pending' ? 'شروع نشده' : s === 'in_progress' ? 'در حال انجام' : s === 'completed' ? 'تکمیل شده' : 'متوقف'}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <h2 className="text-3xl font-extrabold text-white drop-shadow-md">{task.title}</h2>
                    </div>

                    <div className="flex flex-col md:flex-row gap-10">
                        {/* Left Column */}
                        <div className="flex-1 space-y-8">
                            
                            {/* Description */}
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white/90">
                                    <FiFileText /> توضیحات
                                </h3>
                                <textarea 
                                    className="w-full bg-white/5 p-4 rounded-xl text-sm text-white/80 leading-relaxed border border-white/5 min-h-[100px] resize-none focus:bg-white/10 focus:outline-none transition"
                                    defaultValue={task.description || ""}
                                    placeholder="توضیحاتی برای این تسک بنویسید..."
                                />
                            </div>

                            {/* Checklist */}
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white/90">
                                    <FiCheckSquare /> چک‌لیست
                                </h3>
                                <div className="space-y-2">
                                    {task.checklist?.map((item) => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => onToggleCheck(task.id, item.id)}
                                            className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition group"
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${item.is_checked ? 'bg-blue-500 border-blue-500' : 'border-white/30'}`}>
                                                {item.is_checked && <FiCheckSquare className="text-white text-xs" />}
                                            </div>
                                            {/* ✅ خط کشیدن روی متن در صورت تیک خوردن */}
                                            <span className={`text-sm transition ${item.is_checked ? 'text-white/40 line-through' : 'text-white/90'}`}>
                                                {item.title}
                                            </span>
                                        </div>
                                    ))}
                                    <button className="text-xs text-white/50 hover:text-blue-300 flex items-center gap-1 mt-2 transition">
                                        <FiPlus /> افزودن آیتم جدید
                                    </button>
                                </div>
                            </div>

                            {/* Comments */}
                            <div className="space-y-4 pt-6 border-t border-white/10">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white/90">
                                    <FiActivity /> فعالیت‌ها
                                </h3>
                                
                                <div className="flex gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">ME</div>
                                    <div className="flex-1">
                                        <input 
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition placeholder:text-white/30"
                                            placeholder="نوشتن نظر..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 mt-4">
                                    {mockComments.map(c => (
                                        <div key={c.id} className="flex gap-3 animate-fade-in">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 text-xs">👤</div>
                                            <div className="space-y-1 w-full">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white">{c.user_name}</span>
                                                    <span className="text-xs text-white/30">{c.created_at}</span>
                                                </div>
                                                <div className="text-sm text-white/80 bg-white/5 p-3 rounded-xl rounded-tl-none border border-white/5 w-fit">
                                                    {c.text}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar (Right) - Actions */}
                        <div className="w-full md:w-56 space-y-6 flex-shrink-0">
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-white/50 uppercase tracking-wider px-1">افزودن به کارت</span>
                                
                                <button className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white/90 py-2.5 px-4 rounded-lg text-sm transition text-right group">
                                    <FiUsers className="text-white/50 group-hover:text-blue-400 transition" /> اعضا
                                </button>
                                
                                <button className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white/90 py-2.5 px-4 rounded-lg text-sm transition text-right group">
                                    <FiCheckSquare className="text-white/50 group-hover:text-green-400 transition" /> چک‌لیست
                                </button>
                                
                                <div className="relative group w-full">
                                    <button className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white/90 py-2.5 px-4 rounded-lg text-sm transition text-right">
                                        <FiClock className="text-white/50 group-hover:text-yellow-400 transition" /> تاریخ سررسید
                                    </button>
                                    <input 
                                        type="date" 
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => alert(`تاریخ تنظیم شد: ${e.target.value}`)}
                                    />
                                </div>

                                <button 
                                    onClick={handleFileUpload}
                                    className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white/90 py-2.5 px-4 rounded-lg text-sm transition text-right group"
                                >
                                    <FiUpload className="text-white/50 group-hover:text-purple-400 transition" /> پیوست فایل
                                </button>
                                {/* Input مخفی فایل */}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={(e) => alert(`فایل انتخاب شد: ${e.target.files?.[0]?.name}`)} 
                                />
                            </div>

                            <div className="space-y-2 pt-4 border-t border-white/10">
                                <span className="text-xs font-bold text-white/50 uppercase tracking-wider px-1">عملیات</span>
                                <button className="w-full flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 py-2.5 px-4 rounded-lg text-sm transition text-right">
                                    <FiX /> حذف تسک
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};