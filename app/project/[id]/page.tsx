"use client";
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type Task = { id: number; title: string; status: 'pending' | 'done'; role_responsible: string; };

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id;
  const pdfRef = useRef<HTMLDivElement>(null);

  const [projectTitle, setProjectTitle] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const completedCount = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const fetchData = async () => {
    const { data: project } = await supabase.from('projects').select('title').eq('id', projectId).single();
    if (project) setProjectTitle(project.title);

    const { data: taskList } = await supabase.from('project_tasks').select('*').eq('project_id', projectId).order('id', { ascending: true });
    if (taskList) setTasks(taskList);
    setLoading(false);
  };

  const toggleTask = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'done' : 'pending';
    const { error } = await supabase.from('project_tasks').update({ status: newStatus }).eq('id', taskId);
    if (!error) setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const downloadPDF = async () => {
    if (!pdfRef.current) return;
    setExporting(true);

    try {
      // کمی صبر می‌کنیم تا مطمئن شویم استایل‌ها لود شده‌اند
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff', // پس‌زمینه سفید اجباری
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${projectTitle}-report.pdf`);
      
    } catch (err) {
      console.error(err);
      alert("خطا در ساخت PDF");
    }
    setExporting(false);
  };

  if (loading) return <div className="p-10 text-center">در حال بارگذاری...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12" dir="rtl">
      
      {/* هدر */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <div>
           <Link href="/" className="text-gray-500 text-sm hover:text-blue-600 mb-2 block">← بازگشت به داشبورد</Link>
           <h1 className="text-3xl font-bold text-gray-900">🗂 {projectTitle}</h1>
        </div>
        
        <div className="flex gap-4 items-center">
            <button 
                onClick={downloadPDF} 
                disabled={exporting}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition flex items-center gap-2 text-sm shadow-lg"
            >
                {exporting ? 'درحال ساخت...' : '📥 دانلود گزارش PDF'}
            </button>

            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-center">
                <span className="block text-xl font-bold text-blue-600">{progress}%</span>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-gray-200 rounded-full h-2.5 mb-10 overflow-hidden">
        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      {/* *** نکته مهم ***
         در بخش زیر من از استایل‌های inline (دستی) استفاده کردم 
         تا html2canvas با رنگ‌های مدرن Tailwind به مشکل نخورد.
      */}
      <div 
        ref={pdfRef} 
        className="max-w-4xl mx-auto rounded-2xl overflow-hidden p-1"
        style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }} // رنگ سفید و حاشیه طوسی
      >
        <div 
          className="p-6 flex justify-between items-center"
          style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }} // هدر طوسی کمرنگ
        >
          <h2 className="font-bold" style={{ color: '#374151' }}>لیست وظایف و مراحل</h2>
          <span className="text-xs" style={{ color: '#9ca3af' }}>تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</span>
        </div>

        <div>
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className="p-5 flex items-center justify-between"
              style={{ 
                borderBottom: '1px solid #f3f4f6',
                backgroundColor: task.status === 'done' ? '#eff6ff' : '#ffffff' // آبی کمرنگ برای انجام شده
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center border"
                  style={{
                    backgroundColor: task.status === 'done' ? '#22c55e' : 'transparent', // سبز برای تیک
                    borderColor: task.status === 'done' ? '#22c55e' : '#d1d5db',
                    color: '#ffffff'
                  }}
                >
                  {task.status === 'done' && '✓'}
                </div>
                
                <p 
                  className="font-medium"
                  style={{ 
                    color: task.status === 'done' ? '#9ca3af' : '#1f2937',
                    textDecoration: task.status === 'done' ? 'line-through' : 'none'
                  }}
                >
                  {task.title}
                </p>
              </div>

              <span 
                className="text-xs px-2 py-1 rounded border"
                style={{
                  backgroundColor: task.status === 'done' ? '#dcfce7' : '#fefce8',
                  color: task.status === 'done' ? '#15803d' : '#a16207',
                  borderColor: task.status === 'done' ? '#bbf7d0' : '#fef08a'
                }}
              >
                {task.status === 'done' ? 'تکمیل' : 'جاری'}
              </span>
            </div>
          ))}
        </div>
        
        <div 
          className="p-4 text-center text-xs mt-4 border-t"
          style={{ backgroundColor: '#f9fafb', color: '#9ca3af', borderColor: '#e5e7eb' }}
        >
            این گزارش توسط سیستم مدیریت تسک تولید شده است.
        </div>
      </div>

    </div>
  );
}