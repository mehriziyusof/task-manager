import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "دیجی‌تسک | مدیریت پروژه",
  description: "سیستم مدیریت پروژه هوشمند",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="flex h-screen w-screen overflow-hidden bg-gray-900 text-white selection:bg-purple-500/30">
        
        {/* تصویر پس‌زمینه اصلی - کل صفحه را می‌پوشاند */}
        {/* نکته: فایل عکس خود را در پوشه public قرار دهید و نام آن را جایگزین کنید */}
        <div 
          className="fixed inset-0 z-0 opacity-80"
          style={{
            backgroundImage: "url('/bg-image.jpg')", // 👈 آدرس عکس پس‌زمینه
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        
        {/* لایه تاری روی پس‌زمینه برای خوانایی بهتر (اختیاری) */}
        <div className="fixed inset-0 z-0 bg-black/40 backdrop-blur-[2px]" />

        <div className="relative z-10 flex w-full h-full p-4 gap-4 md:gap-6 md:p-6">
          
          {/* منوی کناری شیشه‌ای (Sidebar) */}
          <aside className="hidden md:flex flex-col w-72 h-full">
            <div className="glass flex flex-col justify-between h-full p-6 rounded-3xl animate-fade-in-left">
              <div>
                {/* لوگو */}
                <div className="flex items-center gap-4 mb-10 px-2">
                  <div className="w-12 h-12 relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-600 shadow-lg shadow-purple-500/20 group overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="font-bold text-xl text-white">DT</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white tracking-wide">دیجی‌تسک</h1>
                    <span className="text-xs text-white/50">مدیریت هوشمند</span>
                  </div>
                </div>

                {/* منو */}
                <nav className="space-y-3">
                  <SidebarLink href="/" icon="🏠" label="میز کار من" active />
                  <SidebarLink href="/team" icon="👥" label="اعضای تیم" />
                  <SidebarLink href="/profile" icon="⚙️" label="تنظیمات" />
                </nav>
              </div>

              {/* کارت وضعیت اشتراک */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/20 blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-purple-500/30" />
                <p className="text-xs text-white/60 mb-2 relative z-10">وضعیت اشتراک</p>
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-sm font-bold text-white">نسخه حرفه‌ای</span>
                  <span className="text-lg shadow-glow">💎</span>
                </div>
              </div>
            </div>
          </aside>

          {/* محتوای اصلی */}
          <main className="flex-1 h-full min-w-0">
            {/* اینجا rounded-3xl کامل دادیم تا جدا از سایدبار باشد */}
            <div className="glass w-full h-full rounded-3xl overflow-y-auto overflow-x-hidden p-6 md:p-8 animate-fade-in-up scrollbar-hide">
               {children}
            </div>
          </main>
        </div>

      </body>
    </html>
  );
}

// کامپوننت کمکی برای لینک‌های سایدبار
function SidebarLink({ href, icon, label, active = false }: { href: string; icon: string; label: string; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 group ${
        active 
          ? "bg-white/15 text-white shadow-lg border border-white/10" 
          : "text-white/70 hover:bg-white/10 hover:text-white hover:translate-x-1"
      }`}
    >
      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}