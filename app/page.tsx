"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// برای اینکه بتوانیم در Next.js از کامپوننت‌های فرعی استفاده کنیم، بهتر است آن‌ها را در یک فایل جداگانه (مثل components/ProjectCard) قرار دهیم، اما فعلاً در همین‌جا می‌آوریم.

type Process = {
  id: number;
  title: string;
  created_at: string;
};

type ProjectWithStats = {
  id: number;
  title: string;
  status: string;
  created_at: string;
  project_tasks: { status: string; title: string; assigned_to: string }[]; 
};

export default function Dashboard() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [role, setRole] = useState<string>('staff');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const calculateStats = (tasks: ProjectWithStats['project_tasks']) => {
    const total = tasks.length;
    if (total === 0) return { total, completed: 0, progress: 0, assigned: 0, isBlocked: false };

    const completed = tasks.filter(t => t.status === 'completed').length;
    const assigned = tasks.filter(t => t.assigned_to).length;
    const progress = Math.round((completed / total) * 100);
    
    // فرض می‌کنیم اگر هیچ تسکی تخصیص داده نشده باشد، پروژه بلاک است
    const isBlocked = assigned === 0 && total > 0; 

    return { total, completed, progress, assigned, isBlocked };
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const userRole = profile?.role || 'staff';
    setRole(userRole);

    const { data: procData } = await supabase.from('processes').select('*').order('created_at', { ascending: false });
    if (procData) setProcesses(procData);

    const { data: projData } = await supabase
      .from('projects')
      .select(`
        id, 
        title, 
        status, 
        created_at,
        project_tasks (status, title, assigned_to)
      `)
      .order('created_at', { ascending: false });

    if (projData) {
      const projectsWithStats = projData.map(proj => ({
        ...proj,
        stats: calculateStats(proj.project_tasks)
      }));
      setProjects(projectsWithStats);
    }
    
    setLoading(false);
  };

  const startNewProject = async (processId: number, processTitle: string) => {
    if (role !== 'manager') return;

    // 1. ایجاد یک پروژه جدید
    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({ title: processTitle, status: 'Active', process_id: processId })
      .select('id')
      .single();

    if (projectError || !newProject) {
      alert('خطا در شروع پروژه جدید: ' + (projectError?.message || 'نامشخص'));
      return;
    }

    const projectId = newProject.id;

    // 2. کپی کردن تسک‌ها از الگوی فرآیند
    const { data: templateTasks } = await supabase
      .from('process_tasks')
      .select('title, description')
      .eq('process_id', processId);

    if (templateTasks && templateTasks.length > 0) {
      const newTasks = templateTasks.map(task => ({
        project_id: projectId,
        title: task.title,
        description: task.description,
        status: 'pending', // وضعیت پیش‌فرض
      }));

      const { error: tasksError } = await supabase.from('project_tasks').insert(newTasks);
      if (tasksError) {
        alert('خطا در کپی تسک‌ها: ' + tasksError.message);
      }
    }
    
    // 3. ریدایرکت به صفحه پروژه
    router.push(`/project/${projectId}`);
  };

  if (loading) {
    return (
        <div className="flex-1 w-full flex items-center justify-center">
            {/* ✅ اعمال استایل گلس برای لودینگ */}
            <div className="w-full glass p-5 rounded-3xl text-white/70 text-center">
                <p className="animate-pulse">در حال بارگذاری اطلاعات...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-10">
      
      {/* --- بخش پروژه‌های جاری --- */}
      <div>
        {/* ✅ اصلاح رنگ برای پس‌زمینه دارک */}
        <h2 className="text-xl font-bold text-white mb-6 border-r-4 border-blue-400 pr-2 drop-shadow-md">پروژه‌های جاری</h2>
        
        {projects.length === 0 ? (
          <div className="w-full glass p-5 rounded-3xl text-white/70 text-center">
            پروژه فعالی وجود ندارد. از بخش الگوهای فرآیند یک پروژه جدید شروع کنید.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const stats = calculateStats(project.project_tasks);
              const isBlocked = stats.isBlocked;

              return (
                // ✅ اعمال کلاس‌های Glassmorphism و Hover
                <div 
                  key={project.id} 
                  className="glass glass-hover p-5 rounded-3xl transition duration-300 cursor-pointer"
                  onClick={() => router.push(`/project/${project.id}`)}
                >
                  
                  {/* عنوان و وضعیت */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-white text-lg">{project.title}</h3>
                    <span 
                      className={`text-xs font-medium px-3 py-1 rounded-full ${
                        isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {isBlocked ? 'بلاک شده' : project.status}
                    </span>
                  </div>

                  {/* آمار پروژه */}
                  <div className="grid grid-cols-3 gap-4 text-center border-t border-white/10 pt-4">
                    <div>
                      <p className="text-xs text-white/60">تسک‌ها</p>
                      <p className="font-bold text-white mt-1">{stats.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">انجام شده</p>
                      <p className="font-bold text-emerald-400 mt-1">{stats.completed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">تخصیص یافته</p>
                      <p className="font-bold text-white mt-1">{stats.assigned}</p>
                    </div>
                  </div>

                  {/* نوار پیشرفت */}
                  <div className="mt-5">
                    <div className="flex justify-between text-xs text-white/70 mb-1">
                        <span>پیشرفت:</span>
                        <span className="font-medium">{stats.progress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                            className={`h-2 rounded-full transition-all duration-1000 ${isBlocked ? 'bg-red-500' : (stats.progress === 100 ? 'bg-green-500' : 'bg-blue-400')}`} 
                            style={{ width: `${stats.progress}%` }}
                        ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- بخش الگوهای فرآیند --- */}
      <div>
        {/* ✅ اصلاح رنگ برای پس‌زمینه دارک */}
        <h2 className="text-xl font-bold text-white mb-6 border-r-4 border-purple-400 pr-2 drop-shadow-md">الگوهای فرآیند</h2>
        
        <div className="space-y-4">
          {processes.map((proc) => (
            // ✅ اعمال کلاس‌های Glassmorphism و Hover
            <div 
              key={proc.id} 
              className="glass-hover p-5 rounded-3xl transition duration-300 border border-white/5 cursor-pointer flex justify-between items-center"
            >
              <h3 className="font-bold text-white text-lg">{proc.title}</h3>
              
              {role === 'manager' ? (
                  <button 
                      onClick={() => startNewProject(proc.id, proc.title)} 
                      className="bg-blue-500/20 text-blue-400 py-2.5 px-6 rounded-xl text-sm hover:bg-blue-600 hover:text-white transition font-medium border border-blue-500/30"
                  >
                  + شروع پروژه جدید
                  </button>
              ) : (
                  <div className="bg-gray-700/30 text-white/60 py-2.5 px-6 rounded-xl text-sm text-center">
                  فقط مدیران می‌توانند شروع کنند
                  </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}