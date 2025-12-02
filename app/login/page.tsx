"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else router.push('/');
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-[#0D0D15] relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[150px]" />

      <div className="glass w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-2xl relative z-10 m-4">
        <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-lg shadow-blue-500/30">DT</div>
            <h1 className="text-3xl font-extrabold text-white">خوش آمدید</h1>
            <p className="text-white/50 mt-2 text-sm">سیستم مدیریت پروژه هوشمند</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-white/60 mb-2 mr-1">ایمیل</label>
                <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition text-left ltr placeholder:text-white/20"
                    placeholder="name@example.com"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-white/60 mb-2 mr-1">رمز عبور</label>
                <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition text-left ltr placeholder:text-white/20"
                    placeholder="••••••••"
                />
            </div>
            <button 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-blue-600/20 transition transform hover:-translate-y-1 mt-4"
            >
                {loading ? 'در حال ورود...' : 'ورود به حساب'}
            </button>
        </form>
    </div>
    </div>
  );
}