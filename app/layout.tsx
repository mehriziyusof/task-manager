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
      <body className="flex h-screen overflow-hidden">
        
        {/* منوی کناری شیشه‌ای (Sidebar) */}
        <aside className="w-64 glass m-4 rounded-3xl flex flex-col justify-between p-6 hidden md:flex z-10">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-400 to-purple-500 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg">
                DT
              </div>
              <h1 className="text-xl font-bold tracking-wider">دیجی‌تسک</h1>
            </div>

            <nav className="space-y-2">
              <Link href="/" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition text-white/90 hover:text-white">
                🏠 <span className="font-medium">میز کار من</span>
              </Link>
              <Link href="/team" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition text-white/80 hover:text-white">
                👥 <span className="font-medium">اعضای تیم</span>
              </Link>
              <Link href="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition text-white/80 hover:text-white">
                ⚙️ <span className="font-medium">تنظیمات</span>
              </Link>
            </nav>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/5">
            <p className="text-xs text-white/60 mb-2">وضعیت اشتراک</p>
            <p className="text-sm font-bold text-emerald-400">💎 نسخه حرفه‌ای</p>
          </div>
        </aside>

        {/* محتوای اصلی */}
        <main className="flex-1 overflow-y-auto p-4 md:p-0 md:py-4 md:pl-4">
          <div className="glass w-full h-full rounded-3xl md:rounded-l-none md:rounded-r-none overflow-y-auto relative">
             {children}
          </div>
        </main>

      </body>
    </html>
  );
}