"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FiMessageSquare, FiFileText, FiDownload, FiUpload, 
  FiUsers, FiClock, FiPlus, FiX, FiCheckSquare, FiActivity, FiChevronDown, FiCalendar, FiTrash2
} from 'react-icons/fi';

// تقویم شمسی
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

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

type ChecklistItem = { id: number; title: string; is_checked: boolean };
type AttachmentItem = { name: string; url: string; type: string };

type Task = {
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    stage_title: string;
    stage_id: number | null;
    assigned_to: string | null;
    due_date: string | null;
    checklist?: ChecklistItem[];
    attachments?: AttachmentItem[];
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

// --- Cache ---
let stageTitleCache: Record<number, string> = {}; 

export default function ProjectDetails() {
    const params = useParams();
    const projectIdString = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const projectId = projectIdString ? parseInt(projectIdString) : NaN;
    const isValidId = !isNaN(projectId);

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // دریافت داده‌ها
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

            // تبدیل داده‌ها
            const finalTasks: Task[] = (rawTasks || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                assigned_to: t.assigned_to,
                due_date: t.due_date,
                stage_id: t.stage_id,
                stage_title: t.stage_id ? (stageTitleCache[t.stage_id] || 'سایر') : 'بدون مرحله',
                checklist: [], // در فاز بعد از جدول جداگانه لود می‌شود
                attachments: [] 
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

    // --- هندلر آپدیت تسک ---
    const updateTask = async (taskId: number, updates: Partial<Task>) => {
        // 1. آپدیت لوکال
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
        
        // اگر مودال باز است، آن را هم آپدیت کن
        if (selectedTask?.id === taskId) {
            setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
        }

        // 2. آپدیت دیتابیس
        try {
            // حذف فیلدهایی که در جدول project_tasks نیستند (مثل checklist که شاید بعدا جدول جدا شود)
            // فعلا فرض می‌کنیم checklist و attachments در دیتابیس نیستند یا json هستند.
            // برای سادگی فقط فیلدهای استاندارد را می‌فرستیم.
            const { checklist, attachments, stage_title, ...dbUpdates } = updates as any;
            
            if (Object.keys(dbUpdates).length > 0) {
                await supabase.from('project_tasks').update(dbUpdates).eq('id', taskId);
            }
        } catch (err) {
            console.error("Error updating task:", err);
        }
    };

    // --- هندلر حذف تسک ---
    const handleDeleteTask = async (taskId: number) => {
        if (!confirm("آیا از حذف این تسک مطمئن هستید؟")) return;
        
        // حذف از UI
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setSelectedTask(null);

        // حذف از DB
        await supabase.from('project_tasks').delete().eq('id', taskId);
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
                <div className="flex gap-3">
                    <Link href="/calendar">
                        <button className="flex items-center gap-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-4 py-2 rounded-xl transition text-sm border border-blue-500/30">
                            <FiCalendar /> تقویم کلی
                        </button>
                    </Link>
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
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5 h-full flex flex-col">
                            <h3 className="font-bold mb-4 text-blue-300 flex justify-between items-center">
                                {stage}
                                <span className="bg-black/20 text-xs px-2 py-1 rounded-full text-white/60">{stageTasks.length}</span>
                            </h3>
                            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[60vh]">
                                {stageTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        onClick={() => setSelectedTask(task)}
                                        className="glass glass-hover p-4 rounded-xl border border-white/5 cursor-pointer group hover:border-blue-500/30 transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium text-sm text-white group-hover:text-blue-200">{task.title}</h4>
                                        </div>
                                        
                                        {/* نمایش چکیده وضعیت */}
                                        <div className="flex justify-between items-center mt-3">
                                            <StatusBadge status={task.status} />
                                            <div className="flex items-center gap-2">
                                                {task.attachments && task.attachments.length > 0 && <FiDownload className="text-white/30 text-[10px]" />}
                                                {task.due_date && <span className="text-[10px] text-white/40 flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded"><FiClock/> {task.due_date}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full mt-3 py-2 rounded-lg border border-dashed border-white/20 text-white/40 text-sm hover:text-white hover:border-white/40 transition flex items-center justify-center gap-2">
                                <FiPlus /> افزودن تسک
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODAL: Task Details --- */}
            {selectedTask && (
                <TaskDetailModal 
                    task={selectedTask} 
                    onClose={() => setSelectedTask(null)}
                    onUpdate={(updates) => updateTask(selectedTask.id, updates)}
                    onDelete={() => handleDeleteTask(selectedTask.id)}
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

// --- MODAL (Full Logic) ---
const TaskDetailModal = ({ task, onClose, onUpdate, onDelete }: 
    { task: Task; onClose: () => void; onUpdate: (u: Partial<Task>) => void; onDelete: () => void }) => {
    
    const [description, setDescription] = useState(task.description || "");
    const [newChecklistTitle, setNewChecklistTitle] = useState("");
    const [commentText, setCommentText] = useState('');
    const [mockComments, setMockComments] = useState<Comment[]>([{ id: 1, text: "تسک ایجاد شد.", user_name: "سیستم", created_at: "شروع" }]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showUsers, setShowUsers] = useState(false);

    // Mock Users
    const users = ["علی رضایی", "مریم کاویانی", "حسین محمدی", "سارا راد"];

    // Update Description on Blur
    const handleDescriptionBlur = () => {
        if (description !== task.description) onUpdate({ description });
    };

    // Checklist Logic
    const handleAddChecklist = () => {
        if (!newChecklistTitle.trim()) return;
        const newItem = { id: Date.now(), title: newChecklistTitle, is_checked: false };
        const newChecklist = [...(task.checklist || []), newItem];
        onUpdate({ checklist: newChecklist });
        setNewChecklistTitle("");
    };

    const toggleChecklist = (itemId: number) => {
        const newChecklist = task.checklist?.map(item => 
            item.id === itemId ? { ...item, is_checked: !item.is_checked } : item
        );
        onUpdate({ checklist: newChecklist });
    };

    // File Upload (Local Simulation)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        // شبیه‌سازی نوع فایل
        const type = file.name.split('.').pop() || 'file';
        const newAttachment = { name: file.name, url: '#', type };
        
        const newAttachments = [...(task.attachments || []), newAttachment];
        onUpdate({ attachments: newAttachments });
        alert("فایل به لیست اضافه شد (آپلود واقعی نیاز به Storage دارد)");
    };

    // Comments
    const handleSendComment = () => {
        if(!commentText.trim()) return;
        setMockComments([...mockComments, { id: Date.now(), text: commentText, user_name: "شما", created_at: "الان" }]);
        setCommentText('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in" onClick={onClose}>
            <div 
                className="glass w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl relative animate-scale-up custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Banner */}
                <div className="h-28 bg-gradient-to-r from-blue-900/40 to-purple-900/40 w-full relative">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 hover:bg-red-500/80 text-white p-2 rounded-full transition backdrop-blur-md z-20">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-6 md:p-10 space-y-8 -mt-14 relative z-10">
                    
                    {/* Title & Status */}
                    <div className="space-y-4">
                        <div className="flex gap-2 mb-2 items-center">
                            <span className="bg-black/60 backdrop-blur-md text-xs px-3 py-1 rounded-full text-blue-300 border border-white/10">
                                {task.stage_title}
                            </span>
                            
                            {/* Status Dropdown */}
                            <select 
                                value={task.status}
                                onChange={(e) => onUpdate({ status: e.target.value as TaskStatus })}
                                className="bg-black/60 backdrop-blur-md text-xs px-2 py-1 rounded-full border border-white/10 text-white focus:outline-none cursor-pointer"
                            >
                                <option value="pending">شروع نشده</option>
                                <option value="in_progress">در حال انجام</option>
                                <option value="completed">تکمیل شده</option>
                                <option value="blocked">متوقف شده</option>
                            </select>
                        </div>
                        <input 
                            value={task.title}
                            onChange={(e) => onUpdate({ title: e.target.value })}
                            className="text-3xl font-extrabold text-white drop-shadow-md bg-transparent border-none focus:ring-0 w-full p-0 block mt-2"
                        />
                    </div>

                    <div className="flex flex-col md:flex-row gap-10">
                        {/* Left Column (Content) */}
                        <div className="flex-1 space-y-8">
                            
                            {/* Description */}
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white/90"><FiFileText /> توضیحات</h3>
                                <textarea 
                                    className="w-full bg-white/5 p-4 rounded-xl text-sm text-white/90 leading-relaxed border border-white/10 min-h-[120px] resize-none focus:bg-white/10 focus:border-blue-500/50 focus:outline-none transition placeholder:text-white/30"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={handleDescriptionBlur}
                                    placeholder="توضیحاتی برای این تسک بنویسید..."
                                />
                            </div>

                            {/* Checklist */}
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white/90"><FiCheckSquare /> چک‌لیست</h3>
                                <div className="space-y-2">
                                    {task.checklist && task.checklist.length > 0 && (
                                        <div className="w-full bg-white/10 rounded-full h-1.5 mb-3">
                                            <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.round((task.checklist.filter(i => i.is_checked).length / task.checklist.length) * 100)}%` }} />
                                        </div>
                                    )}

                                    {task.checklist?.map((item) => (
                                        <div key={item.id} onClick={() => toggleChecklist(item.id)} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition group">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${item.is_checked ? 'bg-green-500 border-green-500' : 'border-white/30 group-hover:border-white/60'}`}>
                                                {item.is_checked && <FiCheckSquare className="text-white text-xs" />}
                                            </div>
                                            <span className={`text-sm transition ${item.is_checked ? 'text-white/40 line-through' : 'text-white/90'}`}>{item.title}</span>
                                        </div>
                                    ))}
                                    
                                    <div className="flex gap-2 mt-2">
                                        <input 
                                            className="bg-transparent border-b border-white/20 text-sm text-white px-2 py-1 flex-1 focus:outline-none focus:border-blue-500 placeholder:text-white/30"
                                            placeholder="آیتم جدید..."
                                            value={newChecklistTitle}
                                            onChange={(e) => setNewChecklistTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                                        />
                                        <button onClick={handleAddChecklist} className="text-blue-400 text-sm font-bold px-2 hover:bg-white/10 rounded">افزودن</button>
                                    </div>
                                </div>
                            </div>

                            {/* Attachments */}
                            {task.attachments && task.attachments.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="flex items-center gap-2 text-lg font-bold text-white/90"><FiDownload /> فایل‌های پیوست</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {task.attachments.map((file, idx) => (
                                            <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3 hover:bg-white/10 transition cursor-pointer">
                                                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-300"><FiFileText /></div>
                                                <div className="truncate text-sm text-white/80">{file.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Comments */}
                            <div className="space-y-4 pt-6 border-t border-white/10">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white/90"><FiActivity /> فعالیت‌ها</h3>
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
                                                <div className="text-sm text-white/80 bg-white/5 p-3 rounded-xl rounded-tl-none border border-white/5 w-fit">{c.text}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="w-full md:w-60 space-y-6 flex-shrink-0">
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-white/50 uppercase tracking-wider px-1">افزودن به کارت</span>
                                
                                {/* 1. Members Dropdown */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowUsers(!showUsers)}
                                        className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition border border-white/5"
                                    >
                                        <div className="flex items-center gap-3"><FiUsers className="text-blue-400" /> {task.assigned_to || "تخصیص به عضو"}</div>
                                        <FiChevronDown />
                                    </button>
                                    {showUsers && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 animate-fade-in-up">
                                            {users.map(u => (
                                                <div key={u} onClick={() => { onUpdate({ assigned_to: u }); setShowUsers(false); }} className="px-4 py-2 hover:bg-white/10 cursor-pointer text-sm text-white/80">
                                                    {u}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 2. Solar Date Picker (Improved) */}
                                <div className="relative group w-full">
                                    <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition border border-white/5 cursor-pointer relative overflow-hidden">
                                        <div className="flex items-center gap-3 z-0">
                                            <FiClock className="text-yellow-400" />
                                            {task.due_date ? task.due_date : 'تاریخ سررسید'}
                                        </div>
                                        {/* دیت‌پیکر روی کل دکمه قرار می‌گیرد */}
                                        <div className="absolute inset-0 z-10 opacity-0 cursor-pointer">
                                            <DatePicker 
                                                calendar={persian}
                                                locale={persian_fa}
                                                calendarPosition="bottom-right"
                                                onChange={(date: DateObject | null) => {
                                                    if (date) onUpdate({ due_date: date.toString() });
                                                }}
                                                containerStyle={{ width: '100%', height: '100%' }}
                                                style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. File Upload */}
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition text-right group border border-white/5 hover:border-white/20"
                                >
                                    <FiUpload className="text-purple-400" /> پیوست فایل
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            </div>

                            <div className="space-y-2 pt-4 border-t border-white/10">
                                <span className="text-xs font-bold text-white/50 uppercase tracking-wider px-1">عملیات</span>
                                <button onClick={onDelete} className="w-full flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 py-3 px-4 rounded-lg text-sm transition text-right border border-red-500/10 hover:border-red-500/30">
                                    <FiTrash2 /> حذف تسک
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};