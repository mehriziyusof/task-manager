"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// تعریف ساختار یک مرحله
type Stage = {
  title: string;
  role_responsible: string;
  description: string; // جدید
  estimated_duration: string; // جدید
};

export default function ProcessBuilder() {
  const router = useRouter();
  const [processTitle, setProcessTitle] = useState('');
  const [stages, setStages] = useState<Stage[]>([
    { title: '', role_responsible: '', description: '', estimated_duration: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('staff');

  // چک کردن دسترسی مدیر
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
    setStages([...stages, { title: '', role_responsible: '', description: '', estimated_duration: '' }]);
  };

  const removeStage = (index: number) => {
    const newStages = [...stages];
    newStages.splice(index, 1);
    setStages(newStages);
  };

  const updateStage = (index: number, field: keyof Stage, value: string) => {
    const newStages = [...stages];
    newStages[index][field] = value;
    setStages(newStages);
  };

  const saveAll = async () => {
    if (!processTitle) return alert("نام فرآیند الزامی است");
    if (stages.some(s => !s.title || !s.role_responsible)) {
      return alert("عنوان و نقش مسئول برای همه مراحل الزامی است");
    }

    setLoading(true);
    try {
      // 1. ذخیره فرآیند
      const { data: processData, error: processError } = await supabase
        .from('processes')
        .insert([{ title: processTitle }])
        .select()
        .single();

      if (processError) throw processError;

      // 2. ذخیره مراحل با اطلاعات کامل
      const stagesToSave = stages.map((stage, index) => ({
        process_id: processData.id,
        title: stage.title,
        role_responsible: stage.role_responsible,
        description: stage.description, // ذخیره توضیحات
        estimated_duration: stage.estimated_duration, // ذخیره زمان
        order_index: index + 1,
      }));

      const { error: stagesError } = await supabase.from('stages').insert(stagesToSave);
      if (stagesError) throw stagesError;

      alert("الگوی فرآیند با موفقیت ذخیره شد! 🎉");
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
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-8">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h1 className="text-2xl font-bold text-gray-800">🛠 طراحی فرآیند (الگو)</h1>
            <Link href="/"><button className="text-gray-500 hover:text-blue-600">بازگشت</button></Link>
        </div>
        
        <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <label className="block text-sm font-bold text-gray-700 mb-2">نام فرآیند جدید</label>
          <input 
            type="text" 
            value={processTitle}
            onChange={(e) => setProcessTitle(e.target.value)}
            placeholder="مثلاً: تولید محتوا اینستاگرام"
            className="w-full p-3 border border-gray-300 rounded-lg text-lg font-bold"
          />
        </div>

        <div className="space-y-6">
          {stages.map((stage, index) => (
            <div key={index} className="bg-gray-50 p-5 rounded-xl border border-gray-200 relative">
              <span className="absolute -top-3 -right-3 bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-md">
                {index + 1}
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-bold">نام مرحله</label>
                  <input
                    type="text"
                    value={stage.title}
                    onChange={(e) => updateStage(index, 'title', e.target.value)}
                    placeholder="عنوان کار..."
                    className="w-full p-2 border rounded focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-bold">نقش مسئول</label>
                  <input
                    type="text"
                    value={stage.role_responsible}
                    onChange={(e) => updateStage(index, 'role_responsible', e.target.value)}
                    placeholder="مثلاً: گرافیست"
                    className="w-full p-2 border rounded focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="md:col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">شرح کار (توضیحات برای پرسنل)</label>
                    <input
                        type="text"
                        value={stage.description}
                        onChange={(e) => updateStage(index, 'description', e.target.value)}
                        placeholder="توضیح دهید در این مرحله چه کاری باید انجام شود..."
                        className="w-full p-2 border rounded text-sm text-gray-600"
                    />
                 </div>
                 <div>
                    <label className="text-xs text-gray-500 mb-1 block">مدت زمان استاندارد</label>
                    <input
                        type="text"
                        value={stage.estimated_duration}
                        onChange={(e) => updateStage(index, 'estimated_duration', e.target.value)}
                        placeholder="مثلاً: 2 روز"
                        className="w-full p-2 border rounded text-sm text-center"
                    />
                 </div>
              </div>

              {stages.length > 1 && (
                <button onClick={() => removeStage(index)} className="absolute top-4 left-4 text-red-400 hover:text-red-600 text-sm">
                  حذف مرحله 🗑
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-4">
            <button onClick={addStage} className="flex-1 border-2 border-dashed border-gray-300 text-gray-500 py-3 rounded-lg hover:border-blue-400 hover:text-blue-500 transition font-bold">
                + افزودن مرحله بعدی
            </button>
        </div>

        <button 
          onClick={saveAll}
          disabled={loading}
          className="w-full mt-8 bg-green-600 text-white py-4 rounded-xl hover:bg-green-700 transition font-bold text-lg shadow-lg shadow-green-200"
        >
          {loading ? 'در حال پردازش...' : '✔ ذخیره نهایی الگو'}
        </button>
      </div>
    </div>
  );
}