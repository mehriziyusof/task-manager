"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Process = {
  id: number;
  title: string;
  created_at: string;
};

type Project = {
  id: number;
  title: string;
  status: string;
  created_at: string;
};

export default function Dashboard() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [role, setRole] = useState<string>('staff'); // پیش‌فرض کارمند
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. چک کردن وضعیت لاگین
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // 2. دریافت نقش کاربر
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile) setRole(profile.role);

    // 3. دریافت لیست الگوها
    const { data: procData } = await supabase
      .from('processes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (procData) setProcesses(procData);

    // 4. دریافت لیست پروژه‌های جاری
    const { data: projData } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projData) setProjects(projData);
    
    setLoading(false);
  };

  const startNewProject = async (processId: number, processTitle: string) => {
    if (role !== 'manager') return alert("فقط مدیر می‌تواند پروژه جدید تعریف کند.");

    const projectName = prompt(`نام پروژه جدید برای "${processTitle}" را وارد کنید:`);
    if (!projectName) return;

    try {
      // 1. ساخت پروژه
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([{ title: projectName, process_id: processId }])
        .select()
        .single();

      if (projectError) throw projectError;
      
      const newProjectId = projectData.id;

      // 2. دریافت مراحل الگو
      const { data: stagesData } = await supabase.from('stages').select('*').eq('process_id', processId);

      if (stagesData && stagesData.length > 0) {
        
        // 3. دریافت تمام آیتم‌های چک‌لیست مربوط به این مراحل
        // ما همه چک‌لیست‌های این مراحل رو یکجا میگیریم
        const stageIds = stagesData.map(s => s.id);
        const { data: checklistData } = await supabase
            .from('stage_checklists')
            .select('*')
            .in('stage_id', stageIds);

        // 4. ساخت تسک‌ها
        for (const stage of stagesData) {
            // الف) اول تسک رو می‌سازیم
            const { data: taskData, error: taskError } = await supabase
                .from('project_tasks')
                .insert([{
                    project_id: newProjectId,
                    stage_id: stage.id,
                    title: stage.title,
                    status: 'not_started',
                    description: stage.description ? `(توضیحات فرآیند: ${stage.description})` : '',
                }])
                .select()
                .single();
            
            if (taskError) throw taskError;

            // ب) حالا چک‌لیست‌های مربوط به این مرحله رو پیدا می‌کنیم و برای تسک جدید کپی می‌کنیم
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

    } catch (error) {
      console.error(error);
      alert("خطا در ساخت پروژه!");
    }
  };

  const deleteProject = async (id: number) => {
    if (role !== 'manager') return;
    if(!confirm("آیا از حذف این پروژه اطمینان دارید؟")) return;

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="p-10 text-center text-gray-500">در حال دریافت اطلاعات...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      
      {/* نوار وضعیت کاربر */}
      <div className="max-w-6xl mx-auto bg-white p-4 rounded-xl shadow-sm mb-8 flex justify-between items-center border border-blue-100">
        <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${role === 'manager' ? 'bg-purple-500' : 'bg-gray-400'}`}></span>
            <span className="text-sm font-bold text-gray-700">
                نقش شما: {role === 'manager' ? 'مدیر سیستم 👑' : 'پرسنل اجرایی 👤'}
            </span>
        </div>
        <button 
          onClick={handleLogout} 
          className="text-red-500 text-sm hover:bg-red-50 px-3 py-1 rounded transition border border-transparent hover:border-red-100"
        >
            خروج از حساب
        </button>
      </div>

      {/* هدر اصلی */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">داشبورد دیجی‌نامه</h1>
          <p className="text-gray-500 mt-1">مدیریت هوشمند فرآیندها و وظایف</p>
        </div>
        
        {/* دکمه تعریف الگو - فقط برای مدیر */}
        {role === 'manager' && (
            <Link href="/builder">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-lg font-bold flex items-center gap-2">
                <span>+</span> تعریف الگوی جدید
            </button>
            </Link>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ستون سمت راست: پروژه‌های جاری */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-700 mb-6 border-r-4 border-green-500 pr-2 flex items-center gap-2">
            پروژه‌های جاری
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{projects.length}</span>
          </h2>
          
          {projects.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
              <p className="text-gray-400">هنوز هیچ پروژه‌ای شروع نشده است.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((proj) => (
                <div key={proj.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-50 text-green-600 w-12 h-12 rounded-lg flex items-center justify-center text-xl shadow-inner">
                      📂
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{proj.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        تاریخ شروع: {new Date(proj.created_at).toLocaleDateString('fa-IR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link href={`/project/${proj.id}`}>
                      <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition font-medium">
                        مشاهده و مدیریت
                      </button>
                    </Link>
                    
                    {/* دکمه حذف فقط برای مدیر */}
                    {role === 'manager' && (
                        <button 
                          onClick={() => deleteProject(proj.id)} 
                          className="text-red-300 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded transition" 
                          title="حذف پروژه"
                        >
                          ✕
                        </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ستون سمت چپ: الگوها */}
        <div>
          <h2 className="text-xl font-bold text-gray-700 mb-6 border-r-4 border-blue-500 pr-2">الگوهای فرآیند</h2>
          <div className="space-y-4">
            {processes.map((proc) => (
              <div key={proc.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-700">{proc.title}</h3>
                    <span className="text-[10px] bg-gray-50 text-gray-400 px-2 py-1 rounded">ID: {proc.id}</span>
                </div>
                
                {role === 'manager' ? (
                    <button 
                      onClick={() => startNewProject(proc.id, proc.title)} 
                      className="w-full bg-blue-50 text-blue-600 py-2.5 rounded-lg text-sm hover:bg-blue-600 hover:text-white transition font-medium border border-blue-100"
                    >
                    + شروع پروژه جدید
                    </button>
                ) : (
                    <div className="w-full bg-gray-50 text-gray-400 py-2.5 rounded-lg text-sm text-center border cursor-not-allowed">
                        مخصوص مدیران
                    </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}