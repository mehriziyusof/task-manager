"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation'; // ✅ استفاده از useParams برای Next.js 16
import Link from 'next/link';
import { FiMessageSquare, FiFileText, FiDownload, FiUpload, FiUsers, FiClock, FiCheckSquare, FiPlus } from 'react-icons/fi';

// --- Types ---
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
    assigned_to: string | null;
    due_date: string | null;
};

// --- MOCK Data Types ---
type Comment = { id: number; text: string; user_name: string; created_at: string; };
type Attachment = { id: number; name: string; size: string; type: string; url: string; };

// --- Cache ---
let stageTitleCache: Record<number, string> = {}; 

export default function ProjectDetails() {
    const router = useRouter();
    const params = useParams(); // ✅ روش صحیح دریافت ID در کلاینت
    
    // تبدیل ایمن ID
    const projectIdString = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const projectId = projectIdString ? parseInt(projectIdString) : NaN;
    const isValidId = !isNaN(projectId);

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- MOCK States ---
    const [comments] = useState<Comment[]>([
        { id: 1, text: "بررسی اولیه انجام شد.", user_name: "مدیر", created_at: "10:30" }
    ]);
    const [attachments] = useState<Attachment[]>([
        { id: 1, name: "مستندات.pdf", size: "2 MB", type: "pdf", url: "#" }
    ]);
    const [newCommentText, setNewCommentText] = useState('');

    const fetchData = useCallback(async () => {
        if (!isValidId) return;

        setLoading(true);
        setError(null);
        console.log("🚀 شروع دریافت اطلاعات برای پروژه:", projectId);

        try {
            // 0. بررسی نشست کاربر (Session Check)
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            if (authError || !session) {
                console.error("Auth Error:", authError);
                throw new Error("لطفاً مجدداً وارد سیستم شوید.");
            }

            // 1. دریافت پروژه
            const { data: projectData, error: projError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projError) throw new Error(`خطا در دریافت پروژه: ${projError.message}`);
            if (!projectData) throw new Error('پروژه پیدا نشد.');
            
            setProject(projectData);
            console.log("✅ پروژه دریافت شد:", projectData.title);

            // 2. دریافت نام مراحل (برای نمایش در کانبان)
            const { data: stagesData } = await supabase
                .from('stages')
                .select('id, title')
                .eq('process_id', projectData.process_id);
            
            if (stagesData) {
                stagesData.forEach(s => stageTitleCache[s.id] = s.title);
            }

            // 3. دریافت تسک‌ها (ساده و بدون Join)
            const { data: rawTasks, error: taskError } = await supabase
                .from('project_tasks')
                .select('*')
                .eq('project_id', projectId);

            if (taskError) throw new Error(`خطا در دریافت تسک‌ها: ${taskError.message}`);

            // 4. ترکیب داده‌ها (Manual Join)
            const finalTasks: Task[] = (rawTasks || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                assigned_to: t.assigned_to,
                due_date: t.due_date,
                stage_title: t.stage_id ? (stageTitleCache[t.stage_id] || 'سایر') : 'بدون مرحله'
            }));

            setTasks(finalTasks);
            console.log("✅ تسک‌ها دریافت شدند:", finalTasks.length);

        } catch (err: any) {
            console.error("❌ Critical Error:", err);
            setError(err.message || "خطای ناشناخته در ارتباط با سرور");
        } finally {
            setLoading(false);
        }
    }, [projectId, isValidId]);

    useEffect(() => {
        if (isValidId) {
            fetchData();
        } else if (params?.id) {
            // اگر ID وجود دارد اما عدد نیست
            setLoading(false);
            setError("شناسه پروژه نامعتبر است.");
        }
    }, [isValidId, params?.id, fetchData]);

    // --- Render Helpers ---
    
    if (loading) {
        return (
            <div className="flex w-full h-[80vh] items-center justify-center text-white/70">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p>در حال دریافت اطلاعات پروژه {isValidId ? projectId : ''}...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 flex justify-center">
                <div className="glass p-8 rounded-3xl border border-red-500/30 max-w-md text-center">
                    <h2 className="text-xl text-red-400 font-bold mb-2">خطا در بارگذاری</h2>
                    <p className="text-white/70 mb-6">{error}</p>
                    <Link href="/">
                        <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition">
                            بازگشت به داشبورد
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!project) return null;

    // گروه‌بندی تسک‌ها برای نمایش
    const groupedTasks = tasks.reduce((acc, task) => {
        const key = task.stage_title;
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    return (
        <div className="p-6 md:p-10 text-white pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-1">
                        {project.title}
                    </h1>
                    <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                        {new Date(project.created_at).toLocaleDateString('fa-IR')}
                    </span>
                </div>
                <Link href="/">
                    <button className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition">
                        بازگشت
                    </button>
                </Link>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* ستون اصلی: تسک‌ها */}
                <div className="flex-1 space-y-6">
                    {Object.keys(groupedTasks).length === 0 ? (
                        <div className="glass p-8 text-center text-white/50 rounded-2xl border-dashed border-2 border-white/10">
                            هنوز هیچ تسکی برای این پروژه تعریف نشده است.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(groupedTasks).map(([stage, stageTasks]) => (
                                <div key={stage} className="space-y-3">
                                    <h3 className="text-blue-300 font-bold px-2 border-r-2 border-blue-500">{stage}</h3>
                                    <div className="space-y-3">
                                        {stageTasks.map(task => (
                                            <div key={task.id} className="glass glass-hover p-4 rounded-2xl border border-white/5 cursor-pointer group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-medium text-sm">{task.title}</h4>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                                                        task.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                                                        task.status === 'blocked' ? 'bg-red-500/20 text-red-400' : 
                                                        'bg-yellow-500/10 text-yellow-300'
                                                    }`}>
                                                        {task.status}
                                                    </span>
                                                </div>
                                                {task.description && <p className="text-xs text-white/50 line-clamp-2">{task.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* سایدبار: اطلاعات و امکانات */}
                <div className="w-full lg:w-80 space-y-6 flex-shrink-0">
                    {/* اطلاعات پروژه */}
                    <div className="glass p-5 rounded-3xl border border-white/10">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><FiFileText className="text-blue-400"/> وضعیت کلی</h3>
                        <div className="space-y-3 text-sm text-white/70">
                            <div className="flex justify-between">
                                <span>وضعیت:</span>
                                <span className="text-white">{project.status}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>تعداد تسک‌ها:</span>
                                <span className="text-white">{tasks.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* نظرات (UI Only) */}
                    <div className="glass p-5 rounded-3xl border border-white/10">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><FiMessageSquare className="text-pink-400"/> نظرات</h3>
                        <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                            {comments.map(c => (
                                <div key={c.id} className="bg-white/5 p-3 rounded-xl text-xs">
                                    <p className="mb-1">{c.text}</p>
                                    <span className="text-white/30 block text-left">{c.created_at}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                            <input 
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs focus:outline-none focus:border-pink-500" 
                                placeholder="نظر جدید..."
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                            />
                            <button className="bg-pink-500/20 text-pink-400 p-2 rounded-lg hover:bg-pink-500 hover:text-white transition">
                                <FiPlus />
                            </button>
                        </div>
                    </div>

                    {/* پیوست‌ها (UI Only) */}
                    <div className="glass p-5 rounded-3xl border border-white/10">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><FiDownload className="text-emerald-400"/> فایل‌ها</h3>
                        <div className="space-y-2">
                            {attachments.map(f => (
                                <div key={f.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-xs hover:bg-white/10 cursor-pointer transition">
                                    <span className="truncate max-w-[150px]">{f.name}</span>
                                    <span className="text-white/40">{f.type}</span>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 border border-dashed border-white/20 text-white/50 py-2 rounded-xl text-xs hover:border-emerald-400 hover:text-emerald-400 transition">
                            + آپلود فایل
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}