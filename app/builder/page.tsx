"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ساختار مرحله در الگو
type Stage = {
  title: string;
  role_responsible: string;
  description: string;
  estimated_duration: string;
  checklistItems: string[]; // لیست آیتم‌های چک‌لیست (متنی)
};

export default function ProcessBuilder() {
  const router = useRouter();
  const [processTitle, setProcessTitle] = useState('');
  
  // استیت مراحل
  const [stages, setStages] = useState<Stage[]>([
    { title: '', role_responsible: '', description: '', estimated_duration: '', checklistItems: [] }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('staff');

  // استیت‌های موقت برای اضافه کردن آیتم جدید به چک‌لیست
  const [tempInputs, setTempInputs] = useState<{[key: number]: string}>({});

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/login');
      const { data } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
      if (data?.role !== 'manager') {
        alert("دسترسی ندارید!");
        router.push('/');
      } else {
        setRole('manager');
      }
    };
    checkRole();
  }, []);

  const addStage = () => {
    setStages([...stages, { title: '', role_responsible: '', description: '', estimated_duration: '', checklistItems: [] }]);
  };

  const removeStage = (index: number) => {
    const newStages = [...stages];
    newStages.splice(index, 1);
    setStages(newStages);
  };

  const updateStage = (index: number, field: keyof Stage, value: any) => {
    const newStages = [...stages];
    // @ts-ignore
    newStages[index][field] = value;
    setStages(newStages);
  };

  // --- مدیریت چک‌لیست ---
  const addChecklistItem = (stageIndex: number) => {
    const text = tempInputs[stageIndex];
    if (!text || !text.trim()) return;

    const newStages = [...stages];
    newStages[stageIndex].checklistItems.push(text);
    setStages(newStages);
    
    // پاک کردن اینپوت
    setTempInputs({...tempInputs, [stageIndex]: ''});
  };

  const removeChecklistItem = (stageIndex: number, itemIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].checklistItems.splice(itemIndex, 1);
    setStages(newStages);
  };

  const saveAll = async () => {
    if (!processTitle) return alert("نام فرآیند الزامی است");
    if (stages.some(s => !s.title || !s.role_responsible)) {
      return alert("عنوان و نقش برای همه مراحل الزامی است");
    }

    setLoading(true);
    try {
      // 1. ذخیره فرآیند
      const { data: processData, error: processError } = await supabase
        .from('processes').insert([{ title: processTitle }]).select().single();
      if (processError) throw processError;

      // 2. ذخیره مراحل و چک‌لیست‌ها
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        
        // الف) ذخیره خود مرحله
        const { data: stageData, error: stageError } = await supabase
          .from('stages')
          .insert([{
            process_id: processData.id,
            title: stage.title,
            role_responsible: stage.role_responsible,
            description: stage.description,
            estimated_duration: stage.estimated_duration,
            order_index: i + 1,
          }])
          .select()
          .single();
        
        if (stageError) throw stageError;

        // ب) ذخیره چک‌لیست‌های این مرحله (اگر دارد)
        if (stage.checklistItems.length > 0) {
          const checklistsToSave = stage.checklistItems.map(itemTitle => ({
            stage_id: stageData.id,
            title: itemTitle
          }));
          
          await supabase.from('stage_checklists').insert(checklistsToSave);
        }
      }

      alert("الگو با تمام جزئیات ذخیره شد! 🎉");
      router.push('/');

    } catch (error) {
      alert("خطا در ذخیره سازی");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (role !== 'manager') return null;

  return (
    // حذف پس‌زمینه سفید از کانتینر اصلی صفحه و استفاده از فضای گلس والد (از layout.tsx)
    <div className="p-8 text-white"> 
      <div className="max-w-4xl mx-auto space-y-8">

        {/* هدر صفحه */}
        <div className="flex justify-between items-center mb-8 border-b border-white/20 pb-4">
            <h1 className="text-2xl font-bold">🛠 طراحی فرآیند (الگو)</h1>
            <Link href="/">
              <button className="text-white/70 hover:text-blue-400 transition">بازگشت</button>
            </Link>
        </div>
        
        {/* باکس نام فرآیند */}
        <div className="glass-hover p-5 rounded-xl border border-white/10">
          <label className="block text-sm font-bold text-white/80 mb-2">نام فرآیند جدید</label>
          <input 
            type="text" value={processTitle} onChange={(e) => setProcessTitle(e.target.value)}
            placeholder="مثلاً: تولید محتوا"
            // ✅ استایل دارک برای Input
            className="w-full p-3 border border-white/20 rounded-xl bg-white/5 text-lg font-bold placeholder:text-white/50 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* لیست مراحل */}
        <div className="space-y-8">
          {stages.map((stage, index) => (
            // ✅ اعمال کلاس glass-hover و اصلاح رنگ پس‌زمینه
            <div key={index} className="glass-hover p-6 rounded-3xl border border-white/10 relative shadow-lg">
              
              <span className="absolute -top-3 -right-3 bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-xl">{index + 1}</span>
              
              {/* ردیف اول: نام و نقش */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-white/70 mb-1 block font-bold">نام مرحله</label>
                  <input type="text" value={stage.title} onChange={(e) => updateStage(index, 'title', e.target.value)} placeholder="عنوان..." 
                    // ✅ استایل دارک برای Input
                    className="w-full p-2 border border-white/20 rounded-lg bg-white/5 placeholder:text-white/50 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-white/70 mb-1 block font-bold">نقش مسئول</label>
                  <input type="text" value={stage.role_responsible} onChange={(e) => updateStage(index, 'role_responsible', e.target.value)} placeholder="مثلاً: گرافیست" 
                    // ✅ استایل دارک برای Input
                    className="w-full p-2 border border-white/20 rounded-lg bg-white/5 placeholder:text-white/50 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>

              {/* ردیف دوم: توضیحات و زمان */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                 <div className="md:col-span-2">
                    <label className="text-xs text-white/70 mb-1 block">شرح کار</label>
                    <input type="text" value={stage.description} onChange={(e) => updateStage(index, 'description', e.target.value)} placeholder="توضیحات..." 
                        // ✅ استایل دارک برای Input
                        className="w-full p-2 border border-white/20 rounded-lg bg-white/5 placeholder:text-white/50 text-sm focus:ring-blue-500 focus:border-blue-500" />
                 </div>
                 <div>
                    <label className="text-xs text-white/70 mb-1 block">مدت استاندارد</label>
                    <input type="text" value={stage.estimated_duration} onChange={(e) => updateStage(index, 'estimated_duration', e.target.value)} placeholder="مثلاً: 2 روز" 
                        // ✅ استایل دارک برای Input
                        className="w-full p-2 border border-white/20 rounded-lg bg-white/5 placeholder:text-white/50 text-sm text-center focus:ring-blue-500 focus:border-blue-500" />
                 </div>
              </div>

              {/* ردیف سوم: چک‌لیست‌ها */}
              {/* ✅ باکس چک‌لیست را به glass-hover تبدیل می‌کنیم */}
              <div className="glass-hover p-4 rounded-xl border border-white/10 mt-4">
                <label className="text-xs font-bold text-white mb-2 block">📋 چک‌لیست‌های پیش‌فرض این مرحله:</label>
                
                <div className="space-y-2 mb-2">
                    {stage.checklistItems.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg text-sm text-white/80">
                            <span>• {item}</span>
                            <button onClick={() => removeChecklistItem(index, itemIndex)} className="text-red-400 hover:text-red-600 text-xs transition">حذف</button>
                        </div>
                    ))}
                    {stage.checklistItems.length === 0 && <span className="text-xs text-white/40 italic">هنوز آیتمی اضافه نشده</span>}
                </div>

                <div className="flex gap-2 mt-3">
                    <input 
                        type="text" 
                        value={tempInputs[index] || ''} 
                        onChange={(e) => setTempInputs({...tempInputs, [index]: e.target.value})}
                        onKeyDown={(e) => e.key === 'Enter' && addChecklistItem(index)}
                        placeholder="آیتم جدید (مثلاً: بررسی رنگ‌بندی)..."
                        // ✅ استایل دارک برای Input
                        className="flex-1 border border-white/20 p-2 rounded-lg bg-white/5 text-sm placeholder:text-white/50"
                    />
                    <button 
                        onClick={() => addChecklistItem(index)} 
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs hover:bg-blue-700 transition font-bold"
                    >
                        +
                    </button>
                </div>
              </div>

              {stages.length > 1 && (
                <button 
                  onClick={() => removeStage(index)} 
                  className="absolute top-4 left-4 text-red-400 hover:text-red-600 text-sm bg-white/10 p-2 rounded-full transition"
                >
                  🗑 حذف کل مرحله
                </button>
              )}
            </div>
          ))}
        </div>

        {/* دکمه افزودن مرحله */}
        <div className="mt-6">
            <button 
              onClick={addStage} 
              className="w-full border-2 border-dashed border-white/30 text-white/70 py-4 rounded-xl hover:border-blue-400 hover:text-blue-400 transition font-bold"
            >
              + افزودن مرحله بعدی
            </button>
        </div>

        {/* دکمه ثبت نهایی */}
        <button 
          onClick={saveAll} 
          disabled={loading} 
          className="w-full mt-8 bg-gradient-to-r from-green-600 to-emerald-700 text-white py-4 rounded-xl hover:from-green-700 hover:to-emerald-800 transition font-bold text-lg shadow-xl shadow-green-600/30"
        >
          {loading ? 'در حال ذخیره...' : '✔ ثبت نهایی الگو'}
        </button>
      </div>
    </div>
  );
}