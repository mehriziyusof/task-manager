"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // حالت ثبت نام یا ورود

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // --- حالت ثبت نام ---
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        alert("خطا در ثبت نام: " + error.message);
      } else {
        alert("ثبت نام موفقیت‌آمیز بود! وارد شدید.");
        router.push('/'); // رفتن به داشبورد
      }
    } else {
      // --- حالت ورود ---
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert("ایمیل یا رمز عبور اشتباه است!");
      } else {
        router.push('/'); // رفتن به داشبورد
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600 mb-2">سیستم مدیریت تسک</h1>
          <p className="text-gray-500">
            {isSignUp ? 'ساخت حساب کاربری جدید' : 'ورود به حساب کاربری'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ایمیل</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="example@mail.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رمز عبور</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="حداقل ۶ کاراکتر"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-bold"
          >
            {loading ? 'در حال پردازش...' : (isSignUp ? 'ثبت نام' : 'ورود')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:underline"
          >
            {isSignUp 
              ? 'قبلاً ثبت نام کرده‌اید؟ ورود' 
              : 'حساب کاربری ندارید؟ ثبت نام'}
          </button>
        </div>
      </div>
    </div>
  );
}