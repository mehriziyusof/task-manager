"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Profile() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    
    setEmail(user.email || '');

    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    if (data && (data as any).full_name) {
        setFullName((data as any).full_name);
    }
    
    setLoading(false);
  };

  const updateProfile = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', user.id);

        if (!error) alert("پروفایل با موفقیت آپدیت شد! ✅");
        else alert("خطا در ذخیره سازی!");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-10 text-center">در حال بارگذاری...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">👤 تنظیمات حساب کاربری</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">ایمیل (غیرقابل تغییر)</label>
            <input type="text" value={email} disabled className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 dir-ltr text-left" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نام و نام خانوادگی (فارسی)</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="مثلاً: علی رضایی"
            />
          </div>

          <button 
            onClick={updateProfile}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-bold"
          >
            {saving ? 'در حال ذخیره...' : 'ثبت تغییرات'}
          </button>

          <Link href="/" className="block text-center text-gray-500 text-sm hover:text-blue-600 mt-4">
            بازگشت به داشبورد
          </Link>
        </div>
      </div>
    </div>
  );
}