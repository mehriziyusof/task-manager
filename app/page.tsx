"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiPlus, FiTrash2, FiActivity, FiFolder, FiLoader } from 'react-icons/fi';

// نوع داده پروژه
type ProjectWithStats = {
  id: number;
  title: string;
  status: string;
  created_at: string;
  project_tasks: { status: string; }[]; 
};

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    // دریافت لیست پروژه‌ها
    const { data: projData, error } = await supabase
      .from('projects')
      .select(`
        id, title, status, created_at,
        project_tasks (status)
      `)
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching projects:", error);
    } else if (projData) {
      setProjects(projData as any);
    }
    setLoading(false);
  };

  // --- هندلر ایجاد پروژه جدید (Fix شده) ---
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);

    try {
        // 1. ساخت فرآیند (Process)
        // نکته: طبق عکس ارور شما، دیتابیس روی جدول processes حساس بود که با SQL جدید حل شد.
        const { data: proc, error: procError } = await supabase
            .from('processes')
            .insert({ title: newProjectName })
            .select()
            .single();

        if (procError) throw new Error(`خطا در ساخت پروسه: ${procError.message}`);
        
        // 2. ساخت پروژه
        const { data: newProj, error: projError } = await supabase
            .from('projects')
            .insert({ 
                title: newProjectName, 
                status: 'Active', 
                process_id: proc.id 
            })
            .select()
            .single();

        if (projError) throw new Error(`خطا در ساخت پروژه: ${projError.message}`);

        // 3. ساخت مراحل پیش‌فرض (Stages)
        const defaultStages = [
            { process_id: proc.id, title: 'برای انجام (To Do)', order_index: 1 },
            { process_id: proc.id, title: 'در حال انجام (Doing)', order_index: 2 },
            { process_id: proc.id, title: 'تکمیل شده (Done)', order_index: 3 }
        ];
        
        const { error: stagesError } = await supabase.from('stages').insert(defaultStages);
        if (stagesError) throw new Error(`خطا در ساخت مراحل: ${stagesError.message}`);

        // موفقیت
        setShowModal(false);
        setNewProjectName('');
        fetchData(); // رفرش لیست پروژه‌ها

    } catch (error: any) {
        alert(error.message);
        console.error(error);
    } finally {
        setCreating(false);
    }
  };

  // --- هندلر حذف پروژه ---
  const handleDeleteProject = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    if (!confirm("آیا از حذف این پروژه مطمئن هستید؟")) return;

    // حذف از دیتابیس (به دلیل Cascade در دیتابیس، تسک‌ها هم پاک می‌شوند)
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (!error) {
        setProjects(projects.filter(p => p.id !== id));
    } else {
        alert("خطا در حذف پروژه: " + error.message);
    }
  };

  // محاسبه درصد پیشرفت
  const calculateProgress = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  };

  if (loading) {
      return (
        <div className="flex w-full h-screen items-center justify-center text-white/50">
            <div className="flex flex-col items-center gap-4">
                <FiLoader className="animate-spin text-4xl text-blue-500" />
                <p>در حال بارگذاری میز کار...</p>
            </div>
        </div>
      );
  }

  return (
    <div className="p-8 text-white min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                میز کار من
            </h1>
            <p className="text-sm text-white/50 mt-2">مدیریت پروژه‌ها و تسک‌های روزانه</p>
        </div>
        <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl transition shadow-lg shadow-blue-600/20 font-bold backdrop-blur-md"
        >
            <FiPlus size={20} /> پروژه جدید
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* دکمه بزرگ ایجاد پروژه */}
        <button 
            onClick={() => setShowModal(true)}
            className="border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-white/30 hover:text-white/60 hover:border-white/20 hover:bg-white/5 transition min-h-[200px] gap-4 group"
        >
            <div className="p-4 rounded-full bg-white/5 group-hover:scale-110 transition">
                <FiPlus size={32} />
            </div>
            <span className="font-bold">ایجاد پروژه جدید</span>
        </button>

        {/* کارت‌های پروژه */}
        {projects.map((project) => {
          const progress = calculateProgress(project.project_tasks);
          
          return (
            <div 
              key={project.id} 
              onClick={() => router.push(`/project/${project.id}`)}
              className="glass glass-hover p-6 rounded-[2rem] border border-white/5 cursor-pointer relative group overflow-hidden"
            >
                {/* افکت پس‌زمینه */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full -mr-10 -mt-10 pointer-events-none" />

                {/* هدر کارت */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-blue-400 shadow-inner">
                        <FiFolder size={24} />
                    </div>
                    {/* دکمه حذف */}
                    <button 
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        className="p-2 rounded-xl hover:bg-red-500/20 text-white/20 hover:text-red-400 transition z-20"
                        title="حذف پروژه"
                    >
                        <FiTrash2 size={18} />
                    </button>
                </div>

                {/* اطلاعات */}
                <div className="mb-6 relative z-10">
                    <h3 className="text-xl font-bold text-white mb-1 truncate">{project.title}</h3>
                    <p className="text-xs text-white/40">{new Date(project.created_at).toLocaleDateString('fa-IR')}</p>
                </div>

                {/* پروگرس بار */}
                <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-xs text-white/60">
                        <span>پیشرفت</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden border border-white/5">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000" 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* فوتر */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-white/50 relative z-10">
                    <FiActivity />
                    <span>{project.project_tasks?.length || 0} تسک فعال</span>
                </div>
            </div>
          );
        })}
      </div>

      {/* مودال ساخت پروژه */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="glass p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-2">نام پروژه جدید</h3>
                <p className="text-sm text-white/50 mb-6">نام پروژه یا بورد خود را وارد کنید (مثلاً: کمپین تبلیغاتی)</p>
                
                <input 
                    autoFocus
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:bg-white/10 transition mb-6 placeholder:text-white/20"
                    placeholder="نام پروژه..."
                />
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowModal(false)} 
                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition font-medium"
                    >
                        انصراف
                    </button>
                    <button 
                        onClick={handleCreateProject}
                        disabled={!newProjectName.trim() || creating}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-600/20 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {creating && <FiLoader className="animate-spin" />}
                        ساختن
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}