"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation'; // برای هدایت کاربر بعد از ثبت

// تعریف ساختار یک مرحله
type Stage = {
  title: string;
  role_responsible: string;
};

export default function ProcessBuilder() {
  const router = useRouter();
  const [processTitle, setProcessTitle] = useState('');
  const [stages, setStages] = useState<Stage[]>([
    { title: '', role_responsible: '' } // یک مرحله خالی برای شروع
  ]);
  const [loading, setLoading] = useState(false);

  // اضافه کردن یک مرحله خالی جدید به لیست
  const addStage = () => {
    setStages([...stages, { title: '', role_responsible: '' }]);
  };

  // حذف یک مرحله
  const removeStage = (index: number) => {
    const newStages = [...stages];
    newStages.splice(index, 1);
    setStages(newStages);
  };

  // آپدیت کردن متن مرحله‌ها وقتی تایپ می‌کنی
  const updateStage = (index: number, field: keyof Stage, value: string) => {
    const newStages = [...stages];
    newStages[index][field] = value;
    setStages(newStages);
  };

  // تابع اصلی ذخیره‌سازی در دیتابیس
  const saveAll = async () => {
    if (!processTitle) return alert("لطفاً نام فرآیند را بنویسید");
    // چک کنیم مرحله خالی نداشته باشیم
    if (stages.some(s => !s.title || !s.role_responsible)) {
      return alert("لطفاً تمام فیلدهای مراحل را پر کنید");
    }

    setLoading(true);

    try {
      // 1. اول خود فرآیند رو می‌سازیم
      const { data: processData, error: processError } = await supabase
        .from('processes')
        .insert([{ title: processTitle }])
        .select()
        .single(); // single یعنی فقط یک رکورد برگردون

      if (processError) throw processError;

      const processId = processData.id; // آیدی فرآیند ساخته شده رو می‌گیریم

      // 2. حالا مراحل رو با اون آیدی ذخیره می‌کنیم
      const stagesToSave = stages.map((stage, index) => ({
        process_id: processId,
        title: stage.title,
        role_responsible: stage.role_responsible,
        order_index: index + 1, // ترتیب مرحله (1, 2, 3...)
        checklist: [] // فعلاً چک‌لیست خالی
      }));

      const { error: stagesError } = await supabase
        .from('stages')
        .insert(stagesToSave);

      if (stagesError) throw stagesError;

      alert("فرآیند و مراحل با موفقیت ذخیره شدند! 🎉");
      router.push('/'); // برمی‌گردیم صفحه اصلی

    } catch (error) {
      console.error(error);
      alert("مشکلی پیش آمد! لطفاً کنسول را چک کنید.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold mb-8 text-gray-800 border-b pb-4">
          🛠 طراحی فرآیند جدید
        </h1>
        
        {/* بخش نام فرآیند */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            عنوان کلی فرآیند
          </label>
          <input 
            type="text" 
            value={processTitle}
            onChange={(e) => setProcessTitle(e.target.value)}
            placeholder="مثلاً: طراحی سایت شرکتی"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg"
          />
        </div>

        {/* بخش مراحل */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-4">
            مراحل انجام کار (به ترتیب)
          </label>
          
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div key={index} className="flex gap-3 items-end bg-gray-50 p-4 rounded-lg border">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">نام مرحله {index + 1}</label>
                  <input
                    type="text"
                    value={stage.title}
                    onChange={(e) => updateStage(index, 'title', e.target.value)}
                    placeholder="مثلاً: طراحی UI"
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div className="w-1/3">
                  <label className="text-xs text-gray-500 mb-1 block">نقش مسئول</label>
                  <input
                    type="text"
                    value={stage.role_responsible}
                    onChange={(e) => updateStage(index, 'role_responsible', e.target.value)}
                    placeholder="مثلاً: گرافیست"
                    className="w-full p-2 border rounded"
                  />
                </div>

                {stages.length > 1 && (
                  <button 
                    onClick={() => removeStage(index)}
                    className="bg-red-100 text-red-600 p-2 rounded hover:bg-red-200 transition h-[42px]"
                  >
                    🗑
                  </button>
                )}
              </div>
            ))}
          </div>

          <button 
            onClick={addStage}
            className="mt-4 text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center gap-1"
          >
            + افزودن مرحله جدید
          </button>
        </div>

        {/* دکمه ذخیره نهایی */}
        <button 
          onClick={saveAll}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-bold text-lg disabled:bg-gray-400"
        >
          {loading ? 'در حال ذخیره در دیتابیس...' : 'ثبت نهایی فرآیند'}
        </button>
      </div>
    </div>
  );
}