"use client";

import React from 'react';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FiHome, FiUsers, FiCalendar, FiUser, FiLogOut } from "react-icons/fi";

export default function MainSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      alert("خطا در خروج از حساب.");
    }
  };

  // تابع تشخیص لینک فعال
  const isActive = (path: string) => pathname === path;

  return (
    <aside className="hidden md:flex flex-col w-72 h-full flex-shrink-0">
      <div className="glass w-full h-full rounded-3xl p-6 flex flex-col justify-between">
        
        {/* بخش بالا: لوگو و منو */}
        <div>
          {/* لوگو */}
          <div className="flex items-center gap-4 mb-10 px-2">
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30 text-white font-bold text-xl">
              DT
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide text-white">دیجی‌تسک</h1>
              <span className="text-xs text-white/50">ورژن ۲.۰</span>
            </div>
          </div>

          {/* لینک‌های منو */}
          <nav className="space-y-3">
            <SidebarLink 
              href="/" 
              icon={<FiHome />} 
              label="میز کار من" 
              active={isActive('/')} 
            />
            <SidebarLink 
              href="/team" 
              icon={<FiUsers />} 
              label="اعضای تیم" 
              active={isActive('/team')} 
            />
            <SidebarLink 
              href="/calendar" 
              icon={<FiCalendar />} 
              label="تقویم" 
              active={isActive('/calendar')} 
            />
            <SidebarLink 
              href="/profile" 
              icon={<FiUser />} 
              label="پروفایل من" 
              active={isActive('/profile')} 
            />
          </nav>
        </div>

        {/* بخش پایین: خروج و اشتراک */}
        <div className="space-y-4">
            
            {/* دکمه خروج */}
            <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-3.5 rounded-2xl text-red-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group border border-transparent hover:border-red-500/20"
            >
                <span className="text-xl"><FiLogOut /></span>
                <span className="font-medium text-sm">خروج از حساب</span>
            </button>

            {/* کارت اشتراک */}
            <div className="glass-hover p-4 rounded-2xl border border-white/5 relative overflow-hidden group cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 blur-2xl -mr-10 -mt-10 group-hover:bg-purple-500/30 transition-all" />
                <p className="text-xs text-white/60 mb-1 relative z-10">پلن فعلی شما</p>
                <div className="flex items-center justify-between relative z-10">
                <span className="text-sm font-bold text-emerald-400">نسخه حرفه‌ای</span>
                <span className="text-lg drop-shadow-md">💎</span>
                </div>
            </div>
        </div>

      </div>
    </aside>
  );
}

// تعریف اینترفیس برای پراپ‌های کامپوننت لینک
interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode; // اصلاح تایپ آیکون
  label: string;
  active?: boolean;
}

// کامپوننت لینک
function SidebarLink({ href, icon, label, active = false }: SidebarLinkProps) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-200 group ${
        active 
          ? "bg-white/10 text-white border border-white/10 shadow-lg" 
          : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5"
      }`}
    >
      <span className={`text-xl transition-transform duration-300 ${!active && "group-hover:scale-110"}`}>
        {icon}
      </span>
      <span className="font-medium text-sm">{label}</span>
      
      {/* نشانگر فعال بودن (نقطه آبی) */}
      {active && (
        <div className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
      )}
    </Link>
  );
}