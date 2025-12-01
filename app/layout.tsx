import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "دیجی‌تسک | مدیریت پروژه",
  description: "سیستم مدیریت پروژه هوشمند و چابک",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        {/* ✅ اصلاح مهم: بارگذاری فونت از اینجا انجام می‌شود تا بیلد سرور ارور ندهد */}
        <link 
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" 
          rel="stylesheet" 
          type="text/css" 
        />
      </head>
      
      <body className="flex h-screen w-screen overflow-hidden">
        
        {/* کانتینر اصلی که فاصله‌ها را تنظیم می‌کند */}
        <div className="relative z-10 flex w-full h-full p-4 gap-4 md:gap-6 md:p-6">
          
          {/* --- سایدبار (منوی سمت راست) --- */}
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
                  <SidebarLink href="/" icon="🏠" label="میز کار من" active />
                  <SidebarLink href="/team" icon="👥" label="اعضای تیم" />
                  <SidebarLink href="/profile" icon="⚙️" label="تنظیمات" />
                </nav>
              </div>

              {/* بخش پایین: وضعیت اشتراک */}
              <div className="glass-hover p-4 rounded-2xl border border-white/5 relative overflow-hidden group cursor-pointer">
                {/* افکت نوری پس‌زمینه کارت */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 blur-2xl -mr-10 -mt-10 group-hover:bg-purple-500/30 transition-all" />
                
                <p className="text-xs text-white/60 mb-1 relative z-10">پلن فعلی شما</p>
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-sm font-bold text-emerald-400">نسخه حرفه‌ای</span>
                  <span className="text-lg drop-shadow-md">💎</span>
                </div>
              </div>

            </div>
          </aside>

          {/* --- محتوای اصلی (وسط صفحه) --- */}
          <main className="flex-1 h-full min-w-0">
            {/* پنل شیشه‌ای اصلی */}
            <div className="glass w-full h-full rounded-3xl overflow-hidden flex flex-col">
               {/* ناحیه اسکرول‌خور محتوا */}
               <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide">
                  {children}
               </div>
            </div>
          </main>

        </div>
      </body>
    </html>
  );
}

// کامپوننت کمکی برای لینک‌های منو (تمیز کردن کد اصلی)
function SidebarLink({ href, icon, label, active = false }: { href: string; icon: string; label: string; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-200 group ${
        active 
          ? "bg-white/10 text-white border border-white/10 shadow-lg" 
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className={`text-xl transition-transform duration-300 ${!active && "group-hover:scale-110"}`}>{icon}</span>
      <span className="font-medium text-sm">{label}</span>
      
      {/* نشانگر فعال بودن (نقطه کوچک) */}
      {active && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />}
    </Link>
  );
}