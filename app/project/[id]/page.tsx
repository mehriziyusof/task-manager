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

// انواع داده‌ها
type ChecklistItem = { id: number; title: string; is_checked: boolean; };
type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'blocked';

type Task = { 
  id: number; 
  title: string; 
  status: TaskStatus; 
  description: string;
  start_date: string;
  end_date: string;
  assigned_to: string;
  blocked_reason: string; // دلیل توقف
};

type Profile = { id: string; full_name: string; role: string; };

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id;
  const router = useRouter();
  const pdfRef = useRef<HTMLDivElement>(null);

  const [projectTitle, setProjectTitle] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [role, setRole] = useState<string>('staff');
  
  // استیت‌های ویرایش
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]); // چک‌لیست تسک انتخاب شده
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  // محاسبه پیشرفت (فقط تسک‌های Done حساب میشن)
  const completedCount = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) setRole(profile.role);

    const { data: allUsers } = await supabase.from('profiles').select('*');
    if (allUsers) setUsers(allUsers);

    const { data: project } = await supabase.from('projects').select('title').eq('id', projectId).single();
    if (project) setProjectTitle(project.title);

    const { data: taskList } = await supabase.from('project_tasks').select('*').eq('project_id', projectId).order('id', { ascending: true });
    
    // تبدیل وضعیت‌های قدیمی (pending) به استاندارد جدید
    const normalizedTasks = taskList?.map(t => ({
      ...t,
      status: (t.status === 'pending' ? 'not_started' : t.status) as TaskStatus
    })) || [];

    setTasks(normalizedTasks);
    setLoading(false);
  };

  // دریافت چک‌لیست‌های یک تسک خاص
  const fetchChecklists = async (taskId: number) => {
    const { data } = await supabase.from('task_checklists').select('*').eq('task_id', taskId).order('id', { ascending: true });
    setChecklists(data || []);
  };

  // باز کردن مودال ویرایش
  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    fetchChecklists(task.id);
  };

  // تغییر سریع وضعیت (تیک زدن ساده) -> میره روی Done یا Not Started
  const toggleQuickStatus = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'not_started' : 'done';
    const { error } = await supabase.from('project_tasks').update({ status: newStatus }).eq('id', taskId);
    if (!error) setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  // ذخیره تغییرات کلی تسک
  const saveTaskDetails = async () => {
    if (!selectedTask) return;
    
    const { error } = await supabase
      .from('project_tasks')
      .update({
        description: selectedTask.description,
        start_date: selectedTask.start_date,
        end_date: selectedTask.end_date,
        assigned_to: selectedTask.assigned_to,
        status: selectedTask.status,
        blocked_reason: selectedTask.status === 'blocked' ? selectedTask.blocked_reason : null // فقط اگه بلاک بود دلیل رو نگه دار
      })
      .eq('id', selectedTask.id);

    if (error) alert("خطا در ذخیره!");
    else {
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? selectedTask : t));
      setSelectedTask(null);
    }
  };

  // --- مدیریت چک‌لیست ---
  const addChecklistItem = async () => {
    if (!newChecklistTitle.trim() || !selectedTask) return;
    const { data, error } = await supabase
      .from('task_checklists')
      .insert([{ task_id: selectedTask.id, title: newChecklistTitle }])
      .select()
      .single();
    
    if (!error && data) {
      setChecklists([...checklists, data]);
      setNewChecklistTitle('');
    }
  };

  const toggleChecklist = async (itemId: number, currentVal: boolean) => {
    const { error } = await supabase.from('task_checklists').update({ is_checked: !currentVal }).eq('id', itemId);
    if (!error) {
      setChecklists(checklists.map(c => c.id === itemId ? { ...c, is_checked: !currentVal } : c));
    }
  };

  const deleteChecklist = async (itemId: number) => {
    await supabase.from('task_checklists').delete().eq('id', itemId);
    setChecklists(checklists.filter(c => c.id !== itemId));
  };

  // هلپر برای گرفتن نام کاربر
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.full_name || '...';

  // هلپر رنگ وضعیت
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'done': return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', label: 'انجام شد' };
      case 'in_progress': return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe', label: 'در حال انجام' };
      case 'blocked': return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', label: 'متوقف شده' };
      default: return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb', label: 'شروع نشده' };
    }
  };

  const downloadPDF = async () => {
    if (!pdfRef.current) return;
    setExporting(true);
    try {
      await new Promise(r => setTimeout(r, 100));
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg my-8">
            <h3 className="text-xl font-bold mb-4 border-b pb-2">تنظیمات: {selectedTask.title}</h3>
            
            <div className="space-y-4">
              {/* انتخاب وضعیت (Status) */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <label className="block text-sm font-bold text-gray-700 mb-2">وضعیت فعلی</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'not_started', label: '⚪ شروع نشده' },
                    { val: 'in_progress', label: '🔵 در حال انجام' },
                    { val: 'done', label: '🟢 انجام شد' },
                    { val: 'blocked', label: '🔴 متوقف (Blocked)' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setSelectedTask({...selectedTask, status: opt.val as TaskStatus})}
                      className={`py-2 px-3 rounded-md text-sm transition border ${selectedTask.status === opt.val ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500 font-bold' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* اگر وضعیت Blocked بود، دلیل بخواد */}
                {selectedTask.status === 'blocked' && (
                  <div className="mt-3 animate-pulse-once">
                    <label className="block text-xs text-red-600 mb-1 font-bold">دلیل توقف (اجباری):</label>
                    <input 
                      type="text" 
                      className="w-full border border-red-300 bg-red-50 rounded p-2 text-sm focus:ring-red-500"
                      placeholder="مثلاً: منتظر تایید مشتری..."
                      value={selectedTask.blocked_reason || ''}
                      onChange={e => setSelectedTask({...selectedTask, blocked_reason: e.target.value})}
                    />
                  </div>
                )}
              </div>

              {/* مسئول انجام */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">مسئول انجام کار</label>
                <select 
                  className="w-full border p-2 rounded-lg bg-white"
                  value={selectedTask.assigned_to || ''}
                  onChange={e => setSelectedTask({...selectedTask, assigned_to: e.target.value})}
                >
                  <option value="">-- انتخاب کنید --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>

              {/* چک‌لیست */}
              <div className="border-t pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">📋 چک‌لیست / زیرمجموعه‌ها</label>
                <div className="space-y-2 mb-3">
                  {checklists.map(item => (
                    <div key={item.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded hover:bg-gray-100">
                      <input 
                        type="checkbox" 
                        checked={item.is_checked}
                        onChange={() => toggleChecklist(item.id, item.is_checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className={`flex-1 text-sm ${item.is_checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.title}</span>
                      <button onClick={() => deleteChecklist(item.id)} className="text-red-400 hover:text-red-600 text-xs px-2">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newChecklistTitle}
                    onChange={e => setNewChecklistTitle(e.target.value)}
                    placeholder="آیتم جدید..."
                    className="flex-1 border p-1.5 rounded text-sm"
                    onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                  />
                  <button onClick={addChecklistItem} className="bg-green-600 text-white px-3 rounded text-sm hover:bg-green-700">+</button>
                </div>
              </div>

              {/* توضیحات و تاریخ */}
              <div className="border-t pt-4">
                  <div className="mb-3">
                    <label className="block text-sm text-gray-500 mb-1">توضیحات کلی</label>
                    <textarea 
                      className="w-full border p-2 rounded-lg text-sm" rows={2}
                      value={selectedTask.description || ''}
                      onChange={e => setSelectedTask({...selectedTask, description: e.target.value})}
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">شروع</label>
                      <DatePicker calendar={persian} locale={persian_fa} value={selectedTask.start_date} onChange={(date) => setSelectedTask({...selectedTask, start_date: date?.toString() || ''})} inputClass="w-full border p-2 rounded-lg text-center text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">پایان</label>
                      <DatePicker calendar={persian} locale={persian_fa} value={selectedTask.end_date} onChange={(date) => setSelectedTask({...selectedTask, end_date: date?.toString() || ''})} inputClass="w-full border p-2 rounded-lg text-center text-sm" />
                    </div>
                  </div>
              </div>

            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t sticky bottom-0 bg-white">
              <button onClick={saveTaskDetails} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 shadow-md">ذخیره نهایی</button>
              <button onClick={() => setSelectedTask(null)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">لغو</button>
            </div>
          </div>
        </div>
      )}

      {/* --- هدر --- */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <div>
           <Link href="/" className="text-gray-500 text-sm hover:text-blue-600 mb-2 block">← بازگشت</Link>
           <h1 className="text-3xl font-bold text-gray-900">🗂 {projectTitle}</h1>
           <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded mt-1 inline-block">نقش: {role === 'manager' ? 'مدیر' : 'پرسنل'}</span>
        </div>
        <button onClick={downloadPDF} disabled={exporting} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
            {exporting ? '...' : '📥 گزارش PDF'}
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-gray-200 rounded-full h-2.5 mb-10 overflow-hidden">
        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      <div ref={pdfRef} className="max-w-4xl mx-auto rounded-2xl overflow-hidden p-1 bg-white border border-gray-200 shadow-sm">
        <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="font-bold text-gray-700">لیست وظایف اجرایی</h2>
            <div className="flex gap-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> جاری</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> متوقف</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> انجام شده</span>
            </div>
        </div>
        <div>
          {tasks.map((task) => {
            const style = getStatusColor(task.status);
            return (
            <div key={task.id} className="p-5 flex flex-col gap-3 border-b last:border-0 hover:bg-gray-50 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* دکمه تیک سریع */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleQuickStatus(task.id, task.status); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 cursor-pointer transition active:scale-95"
                    style={{ backgroundColor: task.status === 'done' ? '#22c55e' : 'white', borderColor: task.status === 'done' ? '#22c55e' : '#d1d5db' }}
                  >
                    {task.status === 'done' && <span className="text-white">✓</span>}
                  </button>
                  
                  <div>
                    <p 
                        className="font-bold text-lg cursor-pointer hover:text-blue-600 transition" 
                        onClick={() => openEditModal(task)}
                        style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? '#9ca3af' : '#1f2937' }}
                    >
                        {task.title}
                    </p>
                    
                    <div className="flex gap-2 mt-1">
                        {/* برچسب وضعیت */}
                        <span className="text-[10px] px-2 py-0.5 rounded border" style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}>
                            {style.label}
                        </span>
                        {/* مسئول */}
                        {task.assigned_to && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                                👤 {getUserName(task.assigned_to)}
                            </span>
                        )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => openEditModal(task)}
                  className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 shadow-sm"
                >
                  ⚙️ مدیریت
                </button>
              </div>

              {/* نمایش اطلاعات اضافی (دلیل توقف، تاریخ و...) */}
              {(task.blocked_reason || task.description || task.start_date) && (
                <div className="mr-12 text-sm bg-gray-50/50 p-3 rounded-lg border border-dashed border-gray-200 text-gray-600">
                   {task.status === 'blocked' && task.blocked_reason && (
                       <div className="text-red-600 font-bold mb-1 flex items-center gap-1">
                           ⛔ دلیل توقف: {task.blocked_reason}
                       </div>
                   )}
                   {task.start_date && <div className="text-xs mb-1">📅 {task.start_date} تا {task.end_date}</div>}
                   {task.description && <p className="text-xs text-gray-500">{task.description}</p>}
                </div>
              )}
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}