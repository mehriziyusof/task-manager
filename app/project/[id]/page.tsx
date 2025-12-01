"use client";
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

type Task = { 
  id: number; 
  title: string; 
  status: 'pending' | 'done'; 
  description: string;
  start_date: string;
  end_date: string;
  assigned_to: string; // آیدی کسی که مسئول کاره
};

type Profile = {
  id: string;
  full_name: string; // یا ایمیل
  role: string;
};

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id;
  const router = useRouter();
  const pdfRef = useRef<HTMLDivElement>(null);

  const [projectTitle, setProjectTitle] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]); // لیست کارمندان
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [role, setRole] = useState<string>('staff');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const completedCount = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const fetchData = async () => {
    // 1. چک کردن کاربر
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) setRole(profile.role);

    // 2. گرفتن لیست تمام کاربران (برای نمایش در منوی کشویی)
    const { data: allUsers } = await supabase.from('profiles').select('*');
    if (allUsers) setUsers(allUsers);

    // 3. اطلاعات پروژه
    const { data: project } = await supabase.from('projects').select('title').eq('id', projectId).single();
    if (project) setProjectTitle(project.title);

    // 4. تسک‌ها
    const { data: taskList } = await supabase.from('project_tasks').select('*').eq('project_id', projectId).order('id', { ascending: true });
    if (taskList) setTasks(taskList);
    
    setLoading(false);
  };

  const toggleTask = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'done' : 'pending';
    const { error } = await supabase.from('project_tasks').update({ status: newStatus }).eq('id', taskId);
    if (!error) setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const saveTaskDetails = async () => {
    if (!selectedTask) return;
    
    const { error } = await supabase
      .from('project_tasks')
      .update({
        description: selectedTask.description,
        start_date: selectedTask.start_date,
        end_date: selectedTask.end_date,
        assigned_to: selectedTask.assigned_to // ذخیره مسئول
      })
      .eq('id', selectedTask.id);

    if (error) {
      alert("خطا در ذخیره!");
    } else {
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? selectedTask : t));
      setSelectedTask(null);
    }
  };

  // تابعی برای پیدا کردن نام کاربر از روی آیدی
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'تعیین نشده';
  };

  const downloadPDF = async () => {
    if (!pdfRef.current) return;
    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${projectTitle}-report.pdf`);
    } catch (err) { alert("خطا در PDF"); }
    setExporting(false);
  };

  if (loading) return <div className="p-10 text-center">در حال بارگذاری...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12" dir="rtl">
      
      {/* --- Modal ویرایش --- */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 border-b pb-2">تنظیمات: {selectedTask.title}</h3>
            
            <div className="space-y-4">
              {/* انتخاب مسئول انجام کار (فقط برای مدیر فعال باشه بهتره، ولی فعلا برای همه بازه) */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">مسئول انجام کار</label>
                <select 
                  className="w-full border p-2 rounded-lg bg-white"
                  value={selectedTask.assigned_to || ''}
                  onChange={e => setSelectedTask({...selectedTask, assigned_to: e.target.value})}
                >
                  <option value="">-- انتخاب کنید --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role === 'manager' ? 'مدیر' : 'پرسنل'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">توضیحات</label>
                <textarea 
                  className="w-full border p-2 rounded-lg" rows={3}
                  value={selectedTask.description || ''}
                  onChange={e => setSelectedTask({...selectedTask, description: e.target.value})}
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">تاریخ شروع</label>
                  <DatePicker calendar={persian} locale={persian_fa} value={selectedTask.start_date} onChange={(date) => setSelectedTask({...selectedTask, start_date: date?.toString() || ''})} inputClass="w-full border p-2 rounded-lg text-center" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">تاریخ پایان</label>
                  <DatePicker calendar={persian} locale={persian_fa} value={selectedTask.end_date} onChange={(date) => setSelectedTask({...selectedTask, end_date: date?.toString() || ''})} inputClass="w-full border p-2 rounded-lg text-center" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={saveTaskDetails} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">ذخیره</button>
              <button onClick={() => setSelectedTask(null)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">لغو</button>
            </div>
          </div>
        </div>
      )}

      {/* --- هدر --- */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <div>
           <Link href="/" className="text-gray-500 text-sm hover:text-blue-600 mb-2 block">← بازگشت</Link>
           <h1 className="text-3xl font-bold text-gray-900">🗂 {projectTitle}</h1>
           <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded mt-1 inline-block">نقش شما: {role === 'manager' ? 'مدیر' : 'پرسنل'}</span>
        </div>
        <button onClick={downloadPDF} disabled={exporting} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
            {exporting ? '...' : '📥 گزارش PDF'}
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-gray-200 rounded-full h-2.5 mb-10 overflow-hidden">
        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      <div ref={pdfRef} className="max-w-4xl mx-auto rounded-2xl overflow-hidden p-1 bg-white border border-gray-200">
        <div className="p-6 bg-gray-50 border-b"><h2 className="font-bold text-gray-700">لیست وظایف</h2></div>
        <div>
          {tasks.map((task) => (
            <div key={task.id} className="p-5 flex flex-col gap-2 border-b last:border-0" style={{ backgroundColor: task.status === 'done' ? '#eff6ff' : '#ffffff' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.status); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 cursor-pointer z-10"
                    style={{ backgroundColor: task.status === 'done' ? '#22c55e' : 'white', borderColor: task.status === 'done' ? '#22c55e' : '#d1d5db', color: '#ffffff' }}
                  >
                    {task.status === 'done' && '✓'}
                  </button>
                  <div>
                    <p className="font-medium text-lg cursor-pointer" onClick={() => setSelectedTask(task)}>
                        {task.title}
                    </p>
                    {/* نمایش مسئول انجام کار زیر اسم تسک */}
                    {task.assigned_to && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1 w-fit mt-1">
                            👤 مسئول: {getUserName(task.assigned_to)}
                        </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTask(task)}
                  className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"
                >
                  ⚙️ جزئیات
                </button>
              </div>

              {(task.description || task.start_date) && (
                <div className="mr-12 text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 mt-1">
                   {task.start_date && <div className="font-bold text-gray-800 mb-1">📅 {task.start_date} <span className="text-gray-400 mx-1">تا</span> {task.end_date}</div>}
                   {task.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}