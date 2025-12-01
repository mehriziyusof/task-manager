"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Process = { id: number; title: string; created_at: string; };
type Project = { id: number; title: string; status: string; created_at: string; };

export default function Dashboard() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [role, setRole] = useState<string>('staff'); // نقش کاربر (پیش‌فرض کارمند)
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. بررسی لاگین و دریافت نقش
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    // دریافت نقش از جدول profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    // اگر پروفایل داشت، نقش رو ست کن
    if (profile) setRole(profile.role);

    // 2. دریافت داده‌ها
    const { data: procData } = await supabase.from('processes').select('*').order('created_at', { ascending: false });
    if (procData) setProcesses(procData);

    const { data: projData } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (projData) setProjects(projData);
    
    setLoading(false);
  };

  const startNewProject = async (processId: number, processTitle: string) => {
    // فقط مدیر اجازه داره
    if (role !== 'manager') return alert("فقط مدیر می‌تواند پروژه جدید تعریف کند!");

    const projectName = prompt(`نام پروژه جدید برای "${processTitle}" را وارد کنید:`);
    if (!projectName) return;

    try {
      const { data: projectData, error } = await supabase
        .from('projects').insert([{ title: projectName, process_id: processId }]).select().single();
      if (error) throw error;
      
      const newProjectId = projectData.id;
      const { data: stagesData } = await supabase.from('stages').select('*').eq('process_id', processId);

      if (stagesData && stagesData.length > 0) {
        const tasksToCreate = stagesData.map(stage => ({
          project_id: newProjectId, stage_id: stage.id, title: stage.title, status: 'pending'
        }));
        await supabase.from('project_tasks').insert(tasksToCreate);
      }
      router.push(`/project/${newProjectId}`);
    } catch (error) { alert("خطا در ساخت پروژه!"); }
  };

  const deleteProject = async (id: number) => {
    if (role !== 'manager') return; // امنیت اضافه
    if(!confirm("حذف شود؟")) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) setProjects(projects.filter(p => p.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="p-10 text-center">در حال بارگذاری دسترسی‌ها...</div>;

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
        <button onClick={handleLogout} className="text-red-500 text-sm hover:bg-red-50 px-3 py-1 rounded transition">
            خروج
        </button>
      </div>

      <div className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">داشبورد دیجی‌نامه</h1>
          <p className="text-gray-500 mt-1">مدیریت هوشمند فرآیندها</p>
        </div>
        
        {/* این دکمه فقط برای مدیر نمایش داده میشه */}
        {role === 'manager' && (
            <Link href="/builder">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-lg">
                + تعریف الگوی جدید
            </button>
            </Link>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-700 mb-6 border-r-4 border-green-500 pr-2">پروژه‌های جاری</h2>
          {projects.length === 0 ? <p className="text-gray-400">پروژه‌ای نیست.</p> : (
            <div className="space-y-4">
              {projects.map((proj) => (
                <div key={proj.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-50 text-green-600 w-10 h-10 rounded-lg flex items-center justify-center">📂</div>
                    <h3 className="font-bold text-gray-800">{proj.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/project/${proj.id}`}><button className="bg-gray-100 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">مدیریت</button></Link>
                    
                    {/* دکمه حذف فقط برای مدیر */}
                    {role === 'manager' && (
                        <button onClick={() => deleteProject(proj.id)} className="text-red-400 hover:text-red-600 px-2" title="حذف پروژه">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-700 mb-6 border-r-4 border-blue-500 pr-2">الگوها</h2>
          <div className="space-y-4">
            {processes.map((proc) => (
              <div key={proc.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-2">{proc.title}</h3>
                
                {/* دکمه شروع پروژه: اگر مدیر باشه فعاله، اگر کارمند باشه غیرفعاله */}
                {role === 'manager' ? (
                    <button onClick={() => startNewProject(proc.id, proc.title)} className="w-full bg-blue-50 text-blue-600 py-2 rounded-lg text-sm hover:bg-blue-100 transition">
                    + شروع پروژه جدید
                    </button>
                ) : (
                    <div className="w-full bg-gray-50 text-gray-400 py-2 rounded-lg text-sm text-center border cursor-not-allowed">
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