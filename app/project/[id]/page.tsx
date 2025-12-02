"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// برای استفاده از آیکون‌های ساده
import { FiMessageSquare, FiFileText, FiDownload, FiUpload, FiUsers, FiClock, FiCheckSquare, FiPlus, FiTrash } from 'react-icons/fi';


// --- تعاریف نوع داده ---
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
    status: 'pending' | 'in_progress' | 'completed';
    stage_title: string; // عنوان مرحله
    assigned_to: string | null; // نام یا ID کاربر
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
    size: string; // "1.2 MB"
    type: 'pdf' | 'jpg' | 'doc';
    url: string;
};


export default function ProjectDetails({ params }: { params: { id: string } }) {
    const router = useRouter();
    const projectId = parseInt(params.id);

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- MOCK DATA برای UI جدید (در فاز بعدی با Supabase ادغام می‌شوند) ---
    const [comments, setComments] = useState<Comment[]>([
        { id: 1, text: "به نظر می‌رسد تسک‌های مرحله اول باید زودتر تخصیص داده شوند.", user_name: "مدیر تیم (شما)", created_at: "دیروز، 10:30" },
        { id: 2, text: "مرحله طراحی گرافیکی به تأخیر افتاد. نیاز به پیگیری داریم.", user_name: "پشتیبان", created_at: "امروز، 09:00" },
    ]);
    const [attachments, setAttachments] = useState<Attachment[]>([
        { id: 1, name: "برندبوک_2025.pdf", size: "3.5 MB", type: 'pdf', url: '#' },
        { id: 2, name: "طرح_اولیه_UI.jpg", size: "1.2 MB", type: 'jpg', url: '#' },
    ]);
    const [newCommentText, setNewCommentText] = useState('');
    // --- پایان MOCK DATA ---
    

    useEffect(() => {
        if (!projectId) return;
        fetchData();
    }, [projectId]);
// ... (کدهای قبلی)

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // 1. دریافت جزئیات پروژه
            const { data: projectData, error: projError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projError || !projectData) throw new Error('پروژه پیدا نشد.');
            setProject(projectData);

            // 2. دریافت تسک‌ها و گروه بندی بر اساس مراحل
            // ⚠️ فرض بر این است که نام کلید خارجی در project_tasks، به stages، همان 'stages' است.
            const query = supabase
                .from('project_tasks')
                .select(`
                    id, 
                    title, 
                    description, 
                    status, 
                    assigned_to, 
                    due_date,
                    stages(title) // فرض بر stages بودن کلید خارجی است
                `) 
                .eq('project_id', projectId);
            
            // 💡 استفاده از Type Assertion بر روی خروجی نهایی
            const { data: tasksData, error: tasksError } = await query as any;

            if (tasksError) throw tasksError;

            // تبدیل داده‌های خام (any) به ساختار Task
            const rawTasks: any[] = tasksData; 

            const structuredTasks: Task[] = rawTasks.map((task: any) => ({
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                assigned_to: task.assigned_to,
                due_date: task.due_date,
                // دسترسی ایمن به عنوان مرحله: اگر stages نال باشد، از 'بدون مرحله' استفاده می‌شود.
                stage_title: (task.stages as any)?.title || 'بدون مرحله', 
            }));

            setTasks(structuredTasks);

        } catch (err: any) {
            console.error("Fetch Data Error:", err);
            setError(err.message || 'خطا در بارگذاری اطلاعات پروژه. احتمالاً خطای کوئری یا اتصال.');
        } finally {
            setLoading(false);
        }
    };
    
// ... (بقیه کدهای کامپوننت)
    // --- منطق گروه‌بندی تسک‌ها برای نمای کانبان (Grouping by Stage) ---
    const groupedTasks = useMemo(() => {
        if (!tasks.length) return {};
        return tasks.reduce((acc, task) => {
            const stage = task.stage_title || 'بدون مرحله';
            if (!acc[stage]) acc[stage] = [];
            acc[stage].push(task);
            return acc;
        }, {} as Record<string, Task[]>);
    }, [tasks]);
    // --- پایان منطق گروه‌بندی ---


    // --- منطق افزودن کامنت (MOCK) ---
    const handleAddComment = () => {
        if (!newCommentText.trim()) return;
        
        const newComment: Comment = {
            id: comments.length + 1,
            text: newCommentText,
            user_name: 'کاربر فعلی', // در فاز واقعی باید نام کاربر لاگین شده باشد
            created_at: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        };
        
        setComments([newComment, ...comments]); // اضافه کردن به ابتدای لیست
        setNewCommentText('');
        // در فاز بعدی: اتصال به Supabase
    };

    if (loading) {
        return (
            <div className="flex-1 w-full flex items-center justify-center">
                <div className="w-full glass p-5 rounded-3xl text-white/70 text-center">
                    <p className="animate-pulse">در حال بارگذاری پروژه {projectId}...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-red-400 font-bold glass rounded-3xl">{error}</div>;
    }

    if (!project) return <div className="p-8 text-white">پروژه موجود نیست.</div>;
    
    // --- رندر نهایی ---
    return (
        <div className="p-8 text-white">
            
            {/* هدر پروژه */}
            <div className="flex justify-between items-center mb-8 border-b border-white/20 pb-4">
                <h1 className="text-3xl font-extrabold text-white drop-shadow-lg">{project.title}</h1>
                <Link href="/">
                  <button className="glass-hover text-white/80 py-2 px-4 rounded-xl transition border border-white/10 text-sm">بازگشت به داشبورد</button>
                </Link>
            </div>

            {/* --- ساختار دو ستونی: تسک‌ها (70%) + جزئیات/کامنت‌ها (30%) --- */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* --- ستون چپ (Task Stages / Kanban) --- */}
                <div className="flex-1 min-w-0">
                    <TasksByStage groupedTasks={groupedTasks} />
                </div>

                {/* --- ستون راست (Details, Comments, Attachments) --- */}
                <div className="w-full lg:w-96 flex-shrink-0 space-y-6">
                    
                    <ProjectDetailsCard project={project} tasks={tasks} />
                    <CommentsSection 
                        comments={comments} 
                        newCommentText={newCommentText} 
                        setNewCommentText={setNewCommentText}
                        handleAddComment={handleAddComment}
                    />
                    <AttachmentsSection attachments={attachments} />
                </div>
            </div>
        </div>
    );
}


// --- کامپوننت‌های کمکی با استایل Glassmorphism ---

// 1. نمایش جزئیات پروژه (Project Details Card)
const ProjectDetailsCard = ({ project, tasks }: { project: Project, tasks: Task[] }) => {
    
    const stats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, progress };
    }, [tasks]);

    return (
        <div className="glass p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white border-r-4 border-purple-400 pr-2">
                <FiFileText className="text-purple-400" /> جزئیات پروژه
            </h2>
            
            <div className="space-y-2 text-sm">
                <p className="flex justify-between items-center"><span className="text-white/70">وضعیت:</span> 
                  <span className={`font-bold ${project.status === 'Completed' ? 'text-green-400' : 'text-blue-400'}`}>
                    {project.status === 'Completed' ? 'تکمیل شده' : 'فعال'}
                  </span>
                </p>
                <p className="flex justify-between items-center"><span className="text-white/70">تاریخ شروع:</span> 
                  <span className="font-medium">{new Date(project.created_at).toLocaleDateString('fa-IR')}</span>
                </p>
                <p className="flex justify-between items-center"><span className="text-white/70">تسک‌ها:</span> 
                  <span className="font-medium">{stats.total} تسک</span>
                </p>
            </div>

            {/* نوار پیشرفت */}
            <div className="pt-3 border-t border-white/10">
                <div className="flex justify-between text-xs text-white/70 mb-1">
                    <span>پیشرفت کلی:</span>
                    <span className="font-medium">{stats.progress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${stats.progress === 100 ? 'bg-green-500' : 'bg-blue-400'}`} 
                        style={{ width: `${stats.progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}

// 2. نمایش تسک‌ها بر اساس مرحله (Kanban/List View)
const TasksByStage = ({ groupedTasks }: { groupedTasks: Record<string, Task[]> }) => {
    const stageTitles = Object.keys(groupedTasks);
    
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white border-r-4 border-blue-400 pr-2">تسک‌ها بر اساس مراحل (کانبان)</h2>
            
            {stageTitles.length === 0 ? (
                <div className="glass p-5 rounded-xl text-white/60">هنوز تسکی به این پروژه تخصیص داده نشده است.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {stageTitles.map(stageTitle => (
                        // ستون هر مرحله
                        <div key={stageTitle} className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-lg">
                            <h3 className="font-bold text-lg mb-4 text-blue-300">{stageTitle} <span className="text-white/50 text-sm">({groupedTasks[stageTitle].length})</span></h3>
                            
                            <div className="space-y-3 min-h-[100px]">
                                {groupedTasks[stageTitle].map(task => (
                                    // کارت هر تسک
                                    <div key={task.id} className="glass-hover p-4 rounded-xl border border-white/10 cursor-pointer transition relative">
                                        
                                        <div className="flex justify-between items-start">
                                            <p className="font-medium text-white text-sm">{task.title}</p>
                                            <StatusBadge status={task.status} />
                                        </div>
                                        
                                        <div className="mt-2 flex items-center gap-4 text-xs text-white/60">
                                            {task.assigned_to && <p className="flex items-center gap-1"><FiUsers /> {task.assigned_to}</p>}
                                            {task.due_date && <p className="flex items-center gap-1"><FiClock /> {task.due_date}</p>}
                                        </div>
                                    </div>
                                ))}
                                {/* دکمه افزودن تسک جدید */}
                                <button className="w-full border-2 border-dashed border-white/30 text-white/70 py-2 rounded-lg text-sm hover:border-green-400 hover:text-green-400 transition flex items-center justify-center gap-2 mt-4">
                                    <FiPlus /> افزودن تسک
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// 3. بخش نظرات (Comments Section)
const CommentsSection = ({ comments, newCommentText, setNewCommentText, handleAddComment }: 
    { comments: Comment[], newCommentText: string, setNewCommentText: (text: string) => void, handleAddComment: () => void }) => {
    
    return (
        <div className="glass p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white border-r-4 border-pink-400 pr-2">
                <FiMessageSquare className="text-pink-400" /> نظرات ({comments.length})
            </h2>
            
            {/* Input جدید */}
            <div className="border-t border-white/10 pt-4">
                <textarea 
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="نوشتن نظر جدید..."
                    rows={3}
                    className="w-full p-3 border border-white/20 rounded-xl bg-white/5 text-sm placeholder:text-white/50 focus:ring-pink-500 focus:border-pink-500 mb-2 resize-none"
                />
                <button 
                    onClick={handleAddComment} 
                    className="w-full bg-pink-500/20 text-pink-400 py-2 rounded-xl text-sm font-bold hover:bg-pink-600/30 transition"
                >
                    ثبت نظر
                </button>
            </div>

            {/* لیست نظرات */}
            <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                {comments.map(comment => (
                    <div key={comment.id} className="glass-hover p-3 rounded-xl border border-white/10">
                        <p className="text-sm text-white">{comment.text}</p>
                        <p className="text-xs text-white/50 mt-1 flex justify-between">
                            <span>{comment.user_name}</span>
                            <span dir="ltr">{comment.created_at}</span>
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// 4. بخش پیوست‌ها (Attachments Section)
const AttachmentsSection = ({ attachments }: { attachments: Attachment[] }) => {

    const handleMockUpload = () => {
        alert("قابلیت آپلود در فاز بعدی فعال می‌شود!");
        // در فاز بعدی: پیاده‌سازی آپلود به Supabase Storage
    };

    return (
        <div className="glass p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white border-r-4 border-emerald-400 pr-2">
                <FiFileText className="text-emerald-400" /> پیوست‌ها ({attachments.length})
            </h2>
            
            {/* دکمه آپلود */}
            <button 
                onClick={handleMockUpload} 
                className="w-full bg-emerald-500/20 text-emerald-400 py-2 rounded-xl text-sm font-bold hover:bg-emerald-600/30 transition flex items-center justify-center gap-2"
            >
                <FiUpload /> آپلود فایل جدید
            </button>

            {/* لیست پیوست‌ها */}
            <div className="max-h-40 overflow-y-auto space-y-3 pr-1 border-t border-white/10 pt-4">
                {attachments.map(file => (
                    <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" className="glass-hover p-3 rounded-xl border border-white/10 flex justify-between items-center transition group">
                        
                        <div className="flex items-center gap-3">
                            <FiFileText className="text-white/60 text-lg" />
                            <div>
                                <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition">{file.name}</p>
                                <p className="text-xs text-white/50">{file.type.toUpperCase()}</p>
                            </div>
                        </div>
                        
                        <FiDownload className="text-white/40 group-hover:text-emerald-400 transition" />
                    </a>
                ))}
            </div>
        </div>
    );
}

// 5. کامپوننت وضعیت تسک
const StatusBadge = ({ status }: { status: Task['status'] }) => {
    let colorClass = 'bg-gray-500/20 text-gray-400';
    let label = 'در انتظار';

    if (status === 'in_progress') {
        colorClass = 'bg-yellow-500/20 text-yellow-400';
        label = 'در حال انجام';
    } else if (status === 'completed') {
        colorClass = 'bg-green-500/20 text-green-400';
        label = 'تکمیل شده';
    }

    return (
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${colorClass}`}>
            {label}
        </span>
    );
};