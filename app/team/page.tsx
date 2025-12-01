"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type UserProfile = {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
};

export default function TeamManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: currentUser } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    // استفاده از any برای جلوگیری از خطای احتمالی تایپ‌اسکریپت
    const role = currentUser ? (currentUser as any).role : '';

    if (role !== 'manager') {
        alert("شما دسترسی به این صفحه ندارید!");
        router.push('/');
        return;
    }

    fetchUsers();
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    // اطمینان به سیستم که دیتا آرایه است
    if (data) {
        setUsers(data as any[]); 
    }
    setLoading(false);
  };

  const changeRole = async (userId: string, newRole: string) => {
    if(!window.confirm(`آیا مطمئن هستید که نقش کاربر تغییر کند به: ${newRole === 'manager' ? 'مدیر' : 'پرسنل'}؟`)) return;

    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    
    if (!error) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } else {
        alert("خطا در تغییر نقش");
    }
  };

  if (loading) return <div className="p-10 text-center">در حال بارگذاری...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">👥 مدیریت اعضای تیم</h1>
            <Link href="/"><button className="bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">بازگشت</button></Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-right">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="p-4 text-sm font-bold text-gray-600">نام کاربر</th>
                        <th className="p-4 text-sm font-bold text-gray-600">نقش فعلی</th>
                        <th className="p-4 text-sm font-bold text-gray-600">تاریخ عضویت</th>
                        <th className="p-4 text-sm font-bold text-gray-600">عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="p-4 font-medium">{user.full_name || 'بدون نام'}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs ${user.role === 'manager' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {user.role === 'manager' ? 'مدیر سیستم' : 'پرسنل'}
                                </span>
                            </td>
                            <td className="p-4 text-gray-500 text-sm">
                                {new Date(user.created_at).toLocaleDateString('fa-IR')}
                            </td>
                            <td className="p-4">
                                {user.role === 'staff' ? (
                                    <button onClick={() => changeRole(user.id, 'manager')} className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded border border-purple-200 hover:bg-purple-100">
                                        ارتقا به مدیر
                                    </button>
                                ) : (
                                    <button onClick={() => changeRole(user.id, 'staff')} className="text-xs bg-gray-50 text-gray-600 px-3 py-1 rounded border border-gray-200 hover:bg-gray-100">
                                        تغییر به پرسنل
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}