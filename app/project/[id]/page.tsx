"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// نوع داده برای الگوها
type Process = {
  id: number;
  title: string;
  created_at: string;
};

// نوع داده پروژه که شامل لیست خلاصه تسک‌ها هم هست (برای محاسبه وضعیت)
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

  const fetchData = async () => {
    // 1. بررسی لاگین
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    // 2. دریافت نقش کاربر
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const userRole = profile?.role || 'staff';
    setRole(userRole);

    // 3. دریافت الگوها (جدیدترین اول)
    const { data: procData } = await supabase.from('processes').select('*').order('created_at', { ascending: false });
    if (procData) setProcesses(procData);

    // 4. دریافت پروژه‌ها به همراه وضعیت تسک‌ها (Relational Query)
    // این قسمت خیلی مهمه: ما تسک‌های هر پروژه رو هم میگیریم تا بتونیم درصد پیشرفت رو حساب کنیم
    const { data: projData } = await supabase
      .from('projects')
      .select('*, project_tasks(status, title, assigned_to)')
      .order('created_at', { ascending: false });

    if (projData) {
        // *** فیلتر هوشمند ***
        if (userRole === 'manager') {
            // مدیر همه چیز را می‌بیند
            // @ts-ignore
            setProjects(projData);
        } else {
            // پرسنل فقط پروژه‌هایی را می‌بینند که در آن تسک دارند
            const myProjects = projData.filter((p: any) => 
                p.project_tasks.some((t: any) => t.assigned_to === user.id)
            );
            // @ts-ignore
            setProjects(myProjects);
        }
    }
    
    setLoading(false);
  };

  const startNewProject = async (processId: number, processTitle: string) => {
    if (role !== 'manager') return alert("فقط مدیر می‌تواند پروژه جدید تعریف کند.");
    const projectName = prompt(`نام پروژه جدید برای "${processTitle}" را وارد کنید:`);
    if (!projectName) return;

    try {
      // الف) ساخت خود پروژه
      const { data: projectData, error: projectError } = await supabase
        .from('projects').insert([{ title: projectName, process_id: processId }]).select().single();
      if (projectError) throw projectError;
      
      const newProjectId = projectData.id;

      // ب) دریافت مراحلِ الگو (شامل توضیحات و...)
      const { data: stagesData } = await supabase.from('stages').select('*').eq('process_id', processId);

      if (stagesData && stagesData.length > 0) {
        
        // ج) دریافت تمام چک‌لیست‌های مربوط به این مراحل (یکجا)
        const stageIds = stagesData.map(s => s.id);
        const { data: checklistData } = await supabase.from('stage_checklists').select('*').in('stage_id', stageIds);

        // د) حلقه برای ساخت تسک‌ها و کپی چک‌لیست‌ها
        for (const stage of stagesData) {
            // 1. ساخت تسک
            const { data: taskData, error: taskError } = await supabase
                .from('project_tasks')
                .insert([{
                    project_id: newProjectId,
                    stage_id: stage.id,
                    title: stage.title,
                    status: 'not_started',
                    // انتقال توضیحات الگو به تسک
                    description: stage.description ? `(توضیحات فرآیند: ${stage.description})` : '',
                }])
                .select()
                .single();
            
            if (taskError) throw taskError;

            // 2. پیدا کردن چک‌لیست‌های این مرحله و کپی کردنشون
            const relatedChecklists = checklistData?.filter(c => c.stage_id === stage.id) || [];
            if (relatedChecklists.length > 0) {
                const checklistsToCreate = relatedChecklists.map(c => ({
                    task_id: taskData.id,
                    title: c.title
                }));
                await supabase.from('task_checklists').insert(checklistsToCreate);
            }
        }
      }
      router.push(`/project/${newProjectId}`);
    } catch (error) { console.error(error); alert("خطا در ساخت پروژه!"); }
  };

  const deleteProject = async (id: number) => {
    if (role !== 'manager') return;
    if(!confirm("آیا از حذف این پروژه اطمینان دارید؟")) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) setProjects(projects.filter(p => p.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- تابع محاسبات هوشمند داشبورد ---
  const getProjectStats = (tasks: { status: string, title: string }[]) => {
    const total = tasks.length;
    if (total === 0) return { progress: 0, currentStage: 'تعریف نشده', blockedCount: 0 };

    const done = tasks.filter(t => t.status === 'done').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    
    // محاسبه درصد
    const progress = Math.round((done / total) * 100);

    // پیدا کردن مرحله فعلی (اولین تسکی که انجام نشده)
    const currentTask = tasks.find(t => t.status !== 'done');
    const currentStage = currentTask ? currentTask.title : 'تکمیل شده ✅';

    return { progress, currentStage, blockedCount: blocked };
  };

  if (loading) return <div className="p-10 text-center text-gray-500">در حال دریافت اطلاعات...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      
      {/* نوار وضعیت کاربر */}
      <div className="max-w-6xl mx-auto bg-white p-4 rounded-xl shadow-sm mb-8 flex flex-wrap gap-4 justify-between items-center border border-blue-100">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${role === 'manager' ? 'bg-purple-500' : 'bg-gray-400'}`}></span>
                <span className="text-sm font-bold text-gray-700">
                    {role === 'manager' ? 'مدیر سیستم 👑' : 'پرسنل اجرایی 👤'}
                </span>
            </div>
            
            <Link href="/profile" className="text-sm text-blue-600 hover:underline bg-blue-50 px-3 py-1 rounded">
                ⚙️ تنظیمات پروفایل
            </Link>

            {role === 'manager' && (
                <Link href="/team" className="text-sm text-purple-600 hover:underline bg-purple-50 px-3 py-1 rounded">
                    👥 مدیریت تیم
                </Link>
            )}
        </div>

        <button 
          onClick={handleLogout} 
          className="text-red-500 text-sm hover:bg-red-50 px-3 py-1 rounded transition border border-transparent hover:border-red-100"
        >
            خروج
        </button>
      </div>

      {/* هدر */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">داشبورد دیجی‌نامه</h1>
          <p className="text-gray-500 mt-1">مانیتورینگ هوشمند فرآیندها</p>
        </div>
        {role === 'manager' && (
            <Link href="/builder">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-lg font-bold flex items-center gap-2">
                <span>+</span> تعریف الگوی جدید
            </button>
            </Link>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ستون راست: پروژه‌های جاری (هوشمند) */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-700 mb-6 border-r-4 border-green-500 pr-2 flex items-center gap-2">
            پروژه‌های جاری
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{projects.length}</span>
          </h2>
          
          {projects.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
              <p className="text-gray-400">
                {role === 'manager' ? 'هنوز هیچ پروژه‌ای شروع نشده است.' : 'هیچ پروژه‌ای به شما اختصاص داده نشده است.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((proj) => {
                const stats = getProjectStats(proj.project_tasks);
                const isBlocked = stats.blockedCount > 0;

                return (
                  <div key={proj.id} className={`bg-white p-5 rounded-xl shadow-sm border-2 transition hover:shadow-md ${isBlocked ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                    
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl shadow-inner ${isBlocked ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-50 text-green-600'}`}>
                                {isBlocked ? '⛔' : '📂'}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">{proj.title}</h3>
                                {isBlocked ? (
                                    <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                                        ⚠️ {stats.blockedCount} مرحله متوقف شده!
                                    </span>
                                ) : (
                                    <p className="text-xs text-gray-400">مرحله فعلی: <span className="text-blue-600 font-bold">{stats.currentStage}</span></p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Link href={`/project/${proj.id}`}>
                            <button className={`px-4 py-2 rounded-lg text-sm transition font-medium ${isBlocked ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                {isBlocked ? 'بررسی مشکل' : 'مدیریت'}
                            </button>
                            </Link>
                            {role === 'manager' && (
                                <button onClick={() => deleteProject(proj.id)} className="text-gray-300 hover:text-red-600 px-2">✕</button>
                            )}
                        </div>
                    </div>

                    {/* نوار پیشرفت */}
                    <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>پیشرفت کلی</span>
                            <span>{stats.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                                className={`h-2 rounded-full transition-all duration-1000 ${isBlocked ? 'bg-red-500' : (stats.progress === 100 ? 'bg-green-500' : 'bg-blue-600')}`} 
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

        {/* ستون چپ: الگوها */}
        <div>
          <h2 className="text-xl font-bold text-gray-700 mb-6 border-r-4 border-blue-500 pr-2">الگوهای فرآیند</h2>
          <div className="space-y-4">
            {processes.map((proc) => (
              <div key={proc.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition">
                <h3 className="font-bold text-gray-700 mb-3">{proc.title}</h3>
                {role === 'manager' ? (
                    <button onClick={() => startNewProject(proc.id, proc.title)} className="w-full bg-blue-50 text-blue-600 py-2.5 rounded-lg text-sm hover:bg-blue-600 hover:text-white transition font-medium border border-blue-100">
                    + شروع پروژه جدید
                    </button>
                ) : (
                    <div className="w-full bg-gray-50 text-gray-400 py-2.5 rounded-lg text-sm text-center border cursor-not-allowed">مخصوص مدیران</div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}