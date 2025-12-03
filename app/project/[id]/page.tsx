"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FiFileText, FiDownload, FiUpload, FiUsers, FiClock, FiPlus, 
  FiX, FiCheckSquare, FiActivity, FiChevronDown, FiCalendar, FiTrash2
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

// --- Types ---
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
type UserProfile = { id: string; email: string; full_name?: string; role: string; };
type ChecklistItem = { id: number; title: string; is_checked: boolean };
type AttachmentItem = { name: string; url: string; type: string };
type Comment = { id: number; text: string; user_name: string; created_at: string; };

type Task = {
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    stage_title: string;
    stage_id: number | null;
    assigned_to: string | null;
    assigned_user_email?: string;
    due_date: string | null;
    checklist?: ChecklistItem[];
    attachments?: AttachmentItem[];
};

type Project = { 
    id: number; 
    title: string; 
    created_at: string; 
    process_id: number; 
    status: string; 
    description: string | null; 
};

type Stage = {
    id: number;
    title: string;
    sort_order?: number;
    process_id?: number;
};

let stageTitleCache: Record<number, string> = {}; 

export default function ProjectDetails() {
    const params = useParams();
    const projectId = params?.id ? parseInt(Array.isArray(params.id) ? params.id[0] : params.id) : NaN;
    const isValidId = !isNaN(projectId);

    const [project, setProject] = useState<Project | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // --- State for Add Stage ---
    const [isAddingStage, setIsAddingStage] = useState(false);
    const [newStageTitle, setNewStageTitle] = useState("");

    // --- Drag Scrolling State ---
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const fetchData = useCallback(async () => {
        if (!isValidId) return;
        setLoading(true);
        setError(null);
        try {
            // 1. Project
            const { data: projectData, error: projError } = await supabase.from('projects').select('*').eq('id', projectId).single();
            if (projError || !projectData) throw new Error('پروژه پیدا نشد.');
            setProject(projectData);

            // 2. Stages
            const { data: stagesData } = await supabase.from('stages').select('*').eq('process_id', projectData.process_id).order('sort_order', { ascending: true });
            if (stagesData) {
                setStages(stagesData);
                stagesData.forEach(s => stageTitleCache[s.id] = s.title);
            }

            // 3. Members
            const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, role');
            if (profiles) setTeamMembers(profiles);

            // 4. Tasks
            const { data: rawTasks, error: taskError } = await supabase.from('project_tasks').select('*').eq('project_id', projectId);
            if (taskError) throw taskError;

            const finalTasks: Task[] = (rawTasks || []).map((t: any) => {
                const assignedUser = profiles?.find(p => p.id === t.assigned_to);
                let parsedChecklist = [], parsedAttachments = [];
                try { parsedChecklist = typeof t.checklist === 'string' ? JSON.parse(t.checklist) : (t.checklist || []); } catch(e) {}
                try { parsedAttachments = typeof t.attachments === 'string' ? JSON.parse(t.attachments) : (t.attachments || []); } catch(e) {}

                return {
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    status: t.status,
                    assigned_to: t.assigned_to,
                    assigned_user_email: assignedUser ? (assignedUser.full_name || assignedUser.email) : null,
                    due_date: t.due_date,
                    stage_id: t.stage_id,
                    stage_title: t.stage_id ? (stageTitleCache[t.stage_id] || 'سایر') : 'بدون مرحله',
                    checklist: Array.isArray(parsedChecklist) ? parsedChecklist : [],
                    attachments: Array.isArray(parsedAttachments) ? parsedAttachments : []
                };
            });
            setTasks(finalTasks);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "خطا در دریافت اطلاعات.");
        } finally {
            setLoading(false);
        }
    }, [projectId, isValidId]);

    useEffect(() => { if (isValidId) fetchData(); }, [isValidId, fetchData]);

    // --- Handlers ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
    };
    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleAddTask = async (stageId: number, stageTitle: string) => {
        const tempTitle = "تسک جدید";
        try {
            const { data, error } = await supabase
                .from('project_tasks')
                .insert({ project_id: projectId, stage_id: stageId, title: tempTitle, status: 'pending', checklist: [], attachments: [] })
                .select().single();

            if (error) throw error;
            if (data) {
                const newTask: Task = {
                    id: data.id, title: data.title, description: null, status: 'pending', stage_id: stageId, stage_title: stageTitle,
                    assigned_to: null, due_date: null, checklist: [], attachments: []
                };
                setTasks(prev => [...prev, newTask]);
                setSelectedTask(newTask);
                toast.success('تسک جدید ایجاد شد');
            }
        } catch (err: any) {
            toast.error("خطا: " + err.message);
        }
    };

    // --- Add New Stage ---
    const handleAddStage = async () => {
        if (!newStageTitle.trim() || !project) return;
        try {
            const lastOrder = stages.length > 0 ? Math.max(...stages.map(s => s.sort_order || 0)) : 0;
            const { data, error } = await supabase.from('stages').insert({
                process_id: project.process_id,
                title: newStageTitle,
                sort_order: lastOrder + 1,
                order_index: lastOrder + 1 
            }).select().single();

            if (error) throw error;
            setStages(prev => [...prev, data]);
            setNewStageTitle("");
            setIsAddingStage(false);
            toast.success('ستون جدید اضافه شد');
        } catch (err: any) {
            toast.error("خطا در ساخت ستون: " + err.message);
        }
    };

    // --- Delete Stage ---
const handleDeleteStage = (stageId: number) => {
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[250px]">
                <p className="font-bold text-sm">حذف ستون؟</p>
                <span className="text-xs text-white/70">تمام تسک‌های داخل این ستون هم پاک می‌شوند!</span>
                <div className="flex gap-2 justify-end mt-1">
                    <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded transition">لغو</button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t.id);
                            await performStageDelete(stageId);
                        }} 
                        className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 rounded text-white transition"
                    >
                        حذف کن
                    </button>
                </div>
            </div>
        ), { duration: 6000, style: { background: '#1a1a2e', color: '#fff', border: '1px solid #333' } });
    };

    const performStageDelete = async (stageId: number) => {
        try {
            await supabase.from('project_tasks').delete().eq('stage_id', stageId);
            const { error } = await supabase.from('stages').delete().eq('id', stageId);
            if (error) throw error;
            setStages(prev => prev.filter(s => s.id !== stageId));
            toast.success("ستون حذف شد");
        } catch (err: any) {
            toast.error("خطا: " + err.message);
        }
    };

    const updateTask = async (taskId: number, updates: Partial<Task>) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            let newUserEmail = t.assigned_user_email;
            if (updates.assigned_to) {
                const user = teamMembers.find(m => m.id === updates.assigned_to);
                newUserEmail = user?.full_name || user?.email;
            }
            return { ...t, ...updates, assigned_user_email: newUserEmail };
        }));

        if (selectedTask?.id === taskId) {
            setSelectedTask(prev => {
                if (!prev) return null;
                let newUserEmail = prev.assigned_user_email;
                if (updates.assigned_to) {
                    const user = teamMembers.find(m => m.id === updates.assigned_to);
                    newUserEmail = user?.full_name || user?.email;
                }
                return { ...prev, ...updates, assigned_user_email: newUserEmail };
            });
        }

        try {
            const { stage_title, assigned_user_email, ...dbUpdates } = updates as any;
            if (Object.keys(dbUpdates).length > 0) {
                const { error } = await supabase.from('project_tasks').update(dbUpdates).eq('id', taskId);
                if (error) throw error;
                if(updates.status) toast.success('وضعیت تغییر کرد');
                if(updates.due_date) toast.success('تاریخ ذخیره شد');
            }
        } catch (err: any) {
            toast.error("خطا در ذخیره سازی: " + err.message);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm("آیا از حذف این تسک مطمئن هستید؟")) return;
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setSelectedTask(null);
        await supabase.from('project_tasks').delete().eq('id', taskId);
        toast.success('تسک حذف شد');
    };

    if (loading) return <div className="flex w-full h-[80vh] items-center justify-center text-white/70"><p>در حال بارگذاری...</p></div>;
    if (error) return <div className="p-10 text-center text-red-400">{error}</div>;
    if (!project) return null;

    return (
        <div className="p-6 md:p-10 text-white pb-20 relative min-h-screen flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-1">{project.title}</h1>
                    <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded-lg">{new Date(project.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
                <div className="flex gap-3">
                    <Link href="/calendar"><button className="flex items-center gap-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-4 py-2 rounded-xl transition text-sm border border-blue-500/30"><FiCalendar /> تقویم کلی</button></Link>
                    <Link href="/"><button className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition">بازگشت</button></Link>
                </div>
            </div>

            {/* Kanban Board */}
            <div 
                ref={scrollContainerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={`flex overflow-x-auto pb-8 gap-6 scrollbar-hide flex-1 items-start select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
                {stages.map((stage) => {
                    const stageTasks = tasks.filter(t => t.stage_id === stage.id);
                    return (
                        <div key={stage.id} className="min-w-[300px] w-[300px] flex-shrink-0 h-full max-h-[calc(100vh-220px)] flex flex-col">
                            <div className="bg-[#121212]/60 backdrop-blur-sm rounded-xl border border-white/5 h-full flex flex-col shadow-lg">
                                {/* Stage Header with Delete */}
                                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-xl group">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-blue-100 text-sm">{stage.title}</h3>
                                        <span className="bg-black/40 text-xs px-2 py-1 rounded-full text-white/60 font-mono">{stageTasks.length}</span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteStage(stage.id); }}
                                        className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1"
                                        title="حذف ستون"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                                    {stageTasks.map(task => (
                                        <div 
                                            key={task.id} 
                                            onClick={() => !isDragging && setSelectedTask(task)}
                                            className="glass glass-hover p-4 rounded-xl border border-white/5 cursor-pointer group hover:border-blue-500/30 transition-all bg-[#1e1e2e]/80 hover:bg-[#252538]"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-medium text-sm text-white group-hover:text-blue-200 leading-snug">{task.title}</h4>
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                                                <StatusBadge status={task.status} />
                                                <div className="flex items-center gap-2">
                                                    {task.assigned_user_email && (
                                                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white font-bold ring-1 ring-white/10">{task.assigned_user_email.charAt(0).toUpperCase()}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 pt-2">
                                    <button onClick={() => handleAddTask(stage.id, stage.title)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-white/10 text-white/40 hover:text-white hover:bg-white/5 hover:border-white/30 transition text-sm"><FiPlus /> افزودن تسک</button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Add New Stage Column */}
                <div className="min-w-[300px] w-[300px] flex-shrink-0 h-full max-h-[calc(100vh-220px)] flex flex-col justify-start">
                    {!isAddingStage ? (
                        <button onClick={() => setIsAddingStage(true)} className="bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-xl h-14 flex items-center justify-center gap-2 text-white/50 transition"><FiPlus /> افزودن ستون جدید</button>
                    ) : (
                        <div className="bg-[#121212]/90 border border-white/10 rounded-xl p-3 animate-fade-in">
                            <input 
                                autoFocus
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white mb-2 focus:border-blue-500 outline-none"
                                placeholder="نام ستون..."
                                value={newStageTitle}
                                onChange={(e) => setNewStageTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleAddStage} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded-lg">ساختن</button>
                                <button onClick={() => setIsAddingStage(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-1.5 rounded-lg">لغو</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selectedTask && (
                <TaskDetailModal 
                    task={selectedTask} 
                    teamMembers={teamMembers} 
                    onClose={() => setSelectedTask(null)}
                    onUpdate={(updates: any) => selectedTask && updateTask(selectedTask.id, updates)}
                    onDelete={() => selectedTask && handleDeleteTask(selectedTask.id)}
                />
            )}
        </div>
    );
}

const StatusBadge = ({ status }: { status: TaskStatus }) => {
    const map = {
        'pending': { color: 'bg-gray-500/20 text-gray-300', label: 'شروع نشده' },
        'in_progress': { color: 'bg-blue-500/20 text-blue-300', label: 'در حال انجام' },
        'completed': { color: 'bg-green-500/20 text-green-300', label: 'تکمیل شده' },
        'blocked': { color: 'bg-red-500/20 text-red-300', label: 'متوقف شده' },
    };
    const { color, label } = map[status] || map['pending'];
    return <span className={`text-[9px] px-2 py-0.5 rounded ${color}`}>{label}</span>;
};

const TaskDetailModal = ({ task, teamMembers, onClose, onUpdate, onDelete }: any) => {
    const [description, setDescription] = useState(task.description || "");
    const [newChecklistTitle, setNewChecklistTitle] = useState("");
    const [commentText, setCommentText] = useState('');
    const [showUsers, setShowUsers] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mockComments, setMockComments] = useState<Comment[]>([{ id: 1, text: "تسک ایجاد شد.", user_name: "سیستم", created_at: "شروع" }]);

    useEffect(() => { setDescription(task.description || "") }, [task.id]);

    const handleDescriptionBlur = () => { if (description !== task.description) onUpdate({ description }); };
    
    const handleAddChecklist = () => {
        if (!newChecklistTitle.trim()) return;
        const newItem = { id: Date.now(), title: newChecklistTitle, is_checked: false };
        const safeChecklist = Array.isArray(task.checklist) ? task.checklist : [];
        onUpdate({ checklist: [...safeChecklist, newItem] });
        setNewChecklistTitle("");
    };

    const toggleChecklist = (itemId: number) => {
        const safeChecklist = Array.isArray(task.checklist) ? task.checklist : [];
        const newChecklist = safeChecklist.map((item: any) => item.id === itemId ? { ...item, is_checked: !item.is_checked } : item);
        onUpdate({ checklist: newChecklist });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];
        const fileName = `${Date.now()}_${file.name}`;
        try {
            const { error: uploadError } = await supabase.storage.from('task-attachments').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('task-attachments').getPublicUrl(fileName);
            const newAttachment = { name: file.name, url: publicUrl, type: file.name.split('.').pop() || 'file' };
            const safeAttachments = Array.isArray(task.attachments) ? task.attachments : [];
            onUpdate({ attachments: [...safeAttachments, newAttachment] });
            toast.success('فایل آپلود شد');
        } catch (error: any) {
            toast.error('خطا در آپلود: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSendComment = () => {
        if(!commentText.trim()) return;
        setMockComments([...mockComments, { id: Date.now(), text: commentText, user_name: "شما", created_at: "الان" }]);
        setCommentText('');
    };

    const cycleStatus = () => {
        const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'blocked'];
        const nextStatus = statuses[(statuses.indexOf(task.status) + 1) % statuses.length];
        onUpdate({ status: nextStatus });
    };

    const statusMap = {
        'pending': { color: 'bg-gray-600/50 text-gray-200 border-gray-500', label: 'شروع نشده' },
        'in_progress': { color: 'bg-blue-600/50 text-blue-200 border-blue-500', label: 'در حال انجام' },
        'completed': { color: 'bg-green-600/50 text-green-200 border-green-500', label: 'تکمیل شده' },
        'blocked': { color: 'bg-red-600/50 text-red-200 border-red-500', label: 'متوقف شده' },
    };
    const currentStatusUI = statusMap[task.status as TaskStatus] || statusMap['pending'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in" onClick={onClose}>
            <div className="glass w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl relative animate-scale-up custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                <div className="h-24 bg-gradient-to-r from-blue-900/40 to-purple-900/40 w-full relative">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 hover:bg-red-500/80 text-white p-2 rounded-full transition backdrop-blur-md z-20"><FiX size={20} /></button>
                </div>
                <div className="p-6 md:p-10 space-y-8 -mt-10 relative z-10">
                    <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                            <span className="bg-black/60 backdrop-blur-md text-xs px-3 py-1 rounded-full text-blue-300 border border-white/10">{task.stage_title}</span>
                            <button onClick={cycleStatus} className={`backdrop-blur-md text-xs px-3 py-1 rounded-full border transition hover:scale-105 active:scale-95 ${currentStatusUI.color}`}>{currentStatusUI.label}</button>
                        </div>
                        <input value={task.title} onChange={(e) => onUpdate({ title: e.target.value })} className="text-3xl font-extrabold text-white drop-shadow-md bg-transparent border-none focus:ring-0 w-full p-0 block mt-2" />
                    </div>

                    <div className="flex flex-col md:flex-row gap-10">
                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-white/90 flex items-center gap-2"><FiFileText/> توضیحات</h3>
                                <textarea className="w-full bg-white/5 p-4 rounded-xl text-sm text-white/90 leading-relaxed border border-white/10 min-h-[100px] resize-none focus:outline-none focus:bg-white/10 transition" value={description} onChange={(e) => setDescription(e.target.value)} onBlur={handleDescriptionBlur} placeholder="توضیحات تسک را اینجا بنویسید..." />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-white/90 flex items-center gap-2"><FiCheckSquare /> چک‌لیست</h3>
                                {task.checklist?.map((item: any) => (
                                    <div key={item.id} onClick={() => toggleChecklist(item.id)} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${item.is_checked ? 'bg-green-500 border-green-500' : 'border-white/30'}`}>{item.is_checked && <FiCheckSquare className="text-white text-xs" />}</div>
                                        <span className={`text-sm transition ${item.is_checked ? 'text-white/40 line-through' : 'text-white/90'}`}>{item.title}</span>
                                    </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                    <input className="bg-transparent border-b border-white/20 text-sm text-white px-2 py-1 flex-1 focus:outline-none" placeholder="آیتم جدید..." value={newChecklistTitle} onChange={(e) => setNewChecklistTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()} />
                                    <button onClick={handleAddChecklist} className="text-blue-400 text-sm font-bold px-2 hover:bg-white/10 rounded">افزودن</button>
                                </div>
                            </div>
                            {task.attachments && task.attachments.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-white/90 flex items-center gap-2"><FiDownload /> فایل‌ها</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {task.attachments.map((file: any, idx: number) => (
                                            <a key={idx} href={file.url} target="_blank" rel="noreferrer" className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3 hover:bg-white/10 transition cursor-pointer group">
                                                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-300"><FiFileText /></div>
                                                <div className="truncate text-sm text-white/80 group-hover:text-white transition">{file.name}</div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-lg font-bold text-white/90 flex items-center gap-2"><FiActivity /> فعالیت‌ها</h3>
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">ME</div>
                                    <input className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:outline-none" placeholder="نوشتن نظر..." value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendComment()} />
                                </div>
                                <div className="space-y-3 mt-2">
                                    {mockComments.map(c => (
                                        <div key={c.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">👤</div>
                                            <div className="text-sm bg-white/5 p-3 rounded-xl rounded-tl-none text-white/80">{c.text}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-64 space-y-4 flex-shrink-0">
                            <div className="relative">
                                <button onClick={() => setShowUsers(!showUsers)} className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition border border-white/5">
                                    <div className="flex items-center gap-3"><FiUsers className="text-blue-400" /> {task.assigned_user_email || "تخصیص به عضو"}</div>
                                    <FiChevronDown />
                                </button>
                                {showUsers && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 max-h-40 overflow-y-auto custom-scrollbar">
                                        {teamMembers.map((u: any) => (
                                            <div key={u.id} onClick={() => { onUpdate({ assigned_to: u.id }); setShowUsers(false); }} className="px-4 py-2 hover:bg-white/10 cursor-pointer text-sm text-white/80 border-b border-white/5 last:border-0 truncate">
                                                {u.full_name || u.email}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative group w-full">
                                <DatePicker 
                                    value={task.due_date as any} 
                                    calendar={persian}
                                    locale={persian_fa}
                                    format="YYYY/MM/DD"
                                    range
                                    rangeHover
                                    onChange={(dateObjects: any) => {
                                        if (!dateObjects) {
                                            onUpdate({ due_date: null });
                                            return;
                                        }
                                        let finalDateString = "";
                                        if (Array.isArray(dateObjects)) {
                                            finalDateString = dateObjects.map((d: any) => d.format("YYYY/MM/DD")).join(' - ');
                                        } else {
                                            finalDateString = dateObjects.format("YYYY/MM/DD");
                                        }
                                        onUpdate({ due_date: finalDateString });
                                    }}
                                    render={(value: any, openCalendar: any) => (
                                        <button onClick={openCalendar} className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition border border-white/5 cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <FiClock className={`text-lg ${task.due_date ? 'text-blue-400' : 'text-white/40'}`} />
                                                <span className={`truncate ${task.due_date ? 'text-white' : 'text-white/40'}`}>{task.due_date ? task.due_date : 'انتخاب تاریخ...'}</span>
                                            </div>
                                        </button>
                                    )}
                                />
                            </div>

                            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition text-right group border border-white/5 hover:border-white/20">
                                <FiUpload className="text-purple-400" /> {uploading ? "در حال آپلود..." : "پیوست فایل"}
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            <div className="space-y-2 pt-4 border-t border-white/10">
                                <button onClick={onDelete} className="w-full flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 py-3 px-4 rounded-lg text-sm transition text-right border border-red-500/10 hover:border-red-500/30"><FiTrash2 /> حذف تسک</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};