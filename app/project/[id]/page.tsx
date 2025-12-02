"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FiMessageSquare, FiFileText, FiDownload, FiUpload, 
  FiUsers, FiClock, FiPlus, FiX, FiCheckSquare, FiActivity, FiChevronDown, FiCalendar, FiTrash2
} from 'react-icons/fi';

import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

// --- Types ---
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

type UserProfile = {
    id: string;
    email: string;
    full_name?: string; 
    role: string;
};

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
    description: string | null; // اضافه شده برای سازگاری با نوع
};

let stageTitleCache: Record<number, string> = {}; 

export default function ProjectDetails() {
    const params = useParams();
    // مدیریت ایمن ID
    const idParam = params?.id;
    const projectIdString = Array.isArray(idParam) ? idParam[0] : idParam;
    const projectId = projectIdString ? parseInt(projectIdString) : NaN;
    const isValidId = !isNaN(projectId);

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
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

            // 3. اعضا
            const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, role');
            if (profiles) setTeamMembers(profiles);

            // 4. تسک‌ها
            const { data: rawTasks, error: taskError } = await supabase
                .from('project_tasks').select('*').eq('project_id', projectId);
            
            if (taskError) throw taskError;

            // تبدیل داده‌ها
            const finalTasks: Task[] = (rawTasks || []).map((t: any) => {
                const assignedUser = profiles?.find(p => p.id === t.assigned_to);
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
                    checklist: [], 
                    attachments: []
                };
            });
            setTasks(finalTasks);

        } catch (err: any) {
            console.error("Fetch Error:", err);
            setError(err.message || "خطا در دریافت اطلاعات.");
        } finally {
            setLoading(false);
        }
    }, [projectId, isValidId]);

    useEffect(() => { if (isValidId) fetchData(); }, [isValidId, fetchData]);

    const updateTask = async (taskId: number, updates: Partial<Task>) => {
        // آپدیت لوکال
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

        // آپدیت دیتابیس
        try {
            const { checklist, attachments, stage_title, assigned_user_email, ...dbUpdates } = updates as any;
            if (Object.keys(dbUpdates).length > 0) {
                await supabase.from('project_tasks').update(dbUpdates).eq('id', taskId);
            }
        } catch (err) {
            console.error("Error updating task:", err);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm("آیا از حذف این تسک مطمئن هستید؟")) return;
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setSelectedTask(null);
        await supabase.from('project_tasks').delete().eq('id', taskId);
    };

    if (loading) return <div className="flex w-full h-[80vh] items-center justify-center text-white/70"><p>در حال بارگذاری...</p></div>;
    if (error) return <div className="p-10 text-center text-red-400">{error}</div>;
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
                                        <div className="flex justify-between items-center mt-3">
                                            <StatusBadge status={task.status} />
                                            <div className="flex items-center gap-2">
                                                {task.assigned_user_email && (
                                                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[9px] text-white font-bold" title={task.assigned_user_email}>
                                                        {task.assigned_user_email.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                {task.due_date && <span className="text-[10px] text-white/40 flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded"><FiClock/></span>}
                                            </div>
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
                    teamMembers={teamMembers} 
                    onClose={() => setSelectedTask(null)}
                    onUpdate={(updates) => updateTask(selectedTask.id, updates)}
                    onDelete={() => handleDeleteTask(selectedTask.id)}
                />
            )}
        </div>
    );
}

// --- Helper Components ---

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

const TaskDetailModal = ({ task, teamMembers, onClose, onUpdate, onDelete }: 
    { task: Task; teamMembers: UserProfile[]; onClose: () => void; onUpdate: (u: Partial<Task>) => void; onDelete: () => void }) => {
    
    const [description, setDescription] = useState(task.description || "");
    const [newChecklistTitle, setNewChecklistTitle] = useState("");
    const [commentText, setCommentText] = useState('');
    const [showUsers, setShowUsers] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Mock Comments
    const [mockComments, setMockComments] = useState<Comment[]>([{ id: 1, text: "تسک ایجاد شد.", user_name: "سیستم", created_at: "شروع" }]);

    const handleDescriptionBlur = () => {
        if (description !== task.description) onUpdate({ description });
    };

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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const type = file.name.split('.').pop() || 'file';
        const newAttachment = { name: file.name, url: '#', type };
        const newAttachments = [...(task.attachments || []), newAttachment];
        onUpdate({ attachments: newAttachments });
        alert("فایل به لیست اضافه شد (نیاز به Storage دارد)");
    };

    const handleSendComment = () => {
        if(!commentText.trim()) return;
        setMockComments([...mockComments, { id: Date.now(), text: commentText, user_name: "شما", created_at: "الان" }]);
        setCommentText('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in" onClick={onClose}>
            <div className="glass w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl relative animate-scale-up custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="h-24 bg-gradient-to-r from-blue-900/40 to-purple-900/40 w-full relative">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 hover:bg-red-500/80 text-white p-2 rounded-full transition backdrop-blur-md z-20"><FiX size={20} /></button>
                </div>

                <div className="p-6 md:p-10 space-y-8 -mt-10 relative z-10">
                    {/* Title */}
                    <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                            <span className="bg-black/60 backdrop-blur-md text-xs px-3 py-1 rounded-full text-blue-300 border border-white/10">{task.stage_title}</span>
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
                        {/* Main Content */}
                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-white/90 flex items-center gap-2"><FiFileText/> توضیحات</h3>
                                <textarea 
                                    className="w-full bg-white/5 p-4 rounded-xl text-sm text-white/90 leading-relaxed border border-white/10 min-h-[100px] resize-none focus:outline-none focus:bg-white/10 transition"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={handleDescriptionBlur}
                                    placeholder="توضیحات تسک..."
                                />
                            </div>

                            {/* Checklist */}
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-white/90 flex items-center gap-2"><FiCheckSquare /> چک‌لیست</h3>
                                {task.checklist?.map((item) => (
                                    <div key={item.id} onClick={() => toggleChecklist(item.id)} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${item.is_checked ? 'bg-green-500 border-green-500' : 'border-white/30'}`}>
                                            {item.is_checked && <FiCheckSquare className="text-white text-xs" />}
                                        </div>
                                        <span className={`text-sm transition ${item.is_checked ? 'text-white/40 line-through' : 'text-white/90'}`}>{item.title}</span>
                                    </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                    <input className="bg-transparent border-b border-white/20 text-sm text-white px-2 py-1 flex-1 focus:outline-none" placeholder="آیتم جدید..." value={newChecklistTitle} onChange={(e) => setNewChecklistTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()} />
                                    <button onClick={handleAddChecklist} className="text-blue-400 text-sm font-bold px-2 hover:bg-white/10 rounded">افزودن</button>
                                </div>
                            </div>

                            {/* Attachments */}
                            {task.attachments && task.attachments.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-white/90 flex items-center gap-2"><FiDownload /> فایل‌ها</h3>
                                    <div className="grid grid-cols-2 gap-2">
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

                        {/* Right Sidebar */}
                        <div className="w-full md:w-64 space-y-4 flex-shrink-0">
                            {/* Members */}
                            <div className="relative">
                                <button onClick={() => setShowUsers(!showUsers)} className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition border border-white/5">
                                    <div className="flex items-center gap-3"><FiUsers className="text-blue-400" /> {task.assigned_user_email || "تخصیص به عضو"}</div>
                                    <FiChevronDown />
                                </button>
                                {showUsers && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 max-h-40 overflow-y-auto custom-scrollbar">
                                        {teamMembers.map(u => (
                                            <div key={u.id} onClick={() => { onUpdate({ assigned_to: u.id }); setShowUsers(false); }} className="px-4 py-2 hover:bg-white/10 cursor-pointer text-sm text-white/80 border-b border-white/5 last:border-0 truncate">
                                                {u.full_name || u.email}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Calendar */}
                            <div className="relative group w-full">
                                <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition border border-white/5 cursor-pointer relative overflow-hidden">
                                    <div className="flex items-center gap-3 z-0">
                                        <FiClock className="text-yellow-400" />
                                        <span className="truncate text-xs">{task.due_date ? task.due_date : 'تاریخ سررسید'}</span>
                                    </div>
                                    <div className="absolute inset-0 z-10 opacity-0 cursor-pointer">
                                        <DatePicker 
                                            calendar={persian}
                                            locale={persian_fa}
                                            calendarPosition="bottom-right"
                                            range 
                                            onChange={(dateObjects) => {
                                                if (Array.isArray(dateObjects)) {
                                                    const dateString = dateObjects.map(d => d.toString()).join(' - ');
                                                    onUpdate({ due_date: dateString });
                                                }
                                            }}
                                            containerStyle={{ width: '100%', height: '100%' }}
                                            style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* File Upload */}
                            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white/90 py-3 px-4 rounded-lg text-sm transition text-right group border border-white/5 hover:border-white/20">
                                <FiUpload className="text-purple-400" /> پیوست فایل
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

                            <div className="space-y-2 pt-4 border-t border-white/10">
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