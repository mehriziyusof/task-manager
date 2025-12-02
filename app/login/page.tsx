"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { FiLoader } from 'react-icons/fi';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // حالت ثبت نام
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
        // ثبت نام
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert("لینک تایید به ایمیل شما ارسال شد!");
    } else {
        // ورود
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(error.message);
        } else {
            router.push('/');
            router.refresh();
        }
    }
    setLoading(false);
  };

  return (
    // z-index بالا برای اینکه روی لی‌اوت اصلی قرار بگیرد و سایدبار را بپوشاند (اگر لازم باشد)
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0D0D15] bg-cover bg-center" 
         style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')" }}>
      
      {/* لایه تاریک روی عکس */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <div className="glass w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-2xl relative z-10 m-4 animate-fade-in-up">
        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-3xl mx-auto flex items-center justify-center text-3xl font-bold text-white mb-6 shadow-lg shadow-blue-600/30">
                DT
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2">
                {isSignUp ? 'ثبت‌نام در دیجی‌تسک' : 'خوش آمدید'}
            </h1>
            <p className="text-white/50 text-sm">
                {isSignUp ? 'اطلاعات خود را برای ساخت حساب وارد کنید' : 'برای ورود به حساب ایمیل خود را وارد کنید'}
            </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-white/60 mb-2 mr-1">ایمیل</label>
                <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition text-left ltr placeholder:text-white/20"
                    placeholder="name@example.com"
                    required
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-white/60 mb-2 mr-1">رمز عبور</label>
                <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition text-left ltr placeholder:text-white/20"
                    placeholder="••••••••"
                    required
                />
            </div>
            
            <button 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-2xl hover:shadow-lg hover:shadow-blue-600/20 transition transform hover:-translate-y-1 flex justify-center items-center gap-2 mt-2"
            >
                {loading && <FiLoader className="animate-spin" />}
                {isSignUp ? 'ساخت حساب کاربری' : 'ورود به حساب'}
            </button>
        </form>
        
        <p className="text-center mt-8 text-sm text-white/40">
            {isSignUp ? 'حساب دارید؟ ' : 'هنوز حساب ندارید؟ '}
            <span 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-400 cursor-pointer hover:underline font-bold transition hover:text-blue-300"
            >
                {isSignUp ? 'وارد شوید' : 'ثبت‌نام کنید'}
            </span>
        </p>
      </div>
    </div>
  );
}