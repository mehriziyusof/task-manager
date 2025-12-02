"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FiUser, FiMail, FiShield, FiTrash2, FiPlus } from 'react-icons/fi';

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
};

export default function TeamPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setMembers(data);
      setLoading(false);
    };
    fetchTeam();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen text-white/50">در حال بارگذاری...</div>;

  return (
    <div className="p-8 text-white min-h-screen">
      <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">مدیریت اعضای تیم</h1>
        <button className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition shadow-lg font-bold backdrop-blur-md">
            <FiPlus size={18} /> دعوت عضو جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <div key={member.id} className="glass glass-hover p-6 rounded-[2rem] border border-white/5 relative group transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-6 left-6 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
              {member.role}
            </div>

            <div className="flex flex-col items-center text-center mt-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border-4 border-white/5 flex items-center justify-center mb-4 shadow-2xl overflow-hidden">
                  {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" /> : <FiUser size={32} className="text-white/30" />}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{member.full_name || "کاربر ناشناس"}</h3>
              <p className="text-sm text-white/40 mb-6 font-mono">{member.email}</p>
            </div>

            <div className="border-t border-white/5 pt-4 flex justify-around opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-blue-400 transition" title="تغییر نقش"><FiShield /></button>
                <button className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-red-400 transition" title="حذف"><FiTrash2 /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}