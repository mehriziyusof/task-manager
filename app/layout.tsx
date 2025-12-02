import type { Metadata } from "next";
import "./globals.css";
import MainSidebar from "@/components/MainSidebar";

export const metadata: Metadata = {
  title: "دیجی‌تسک | مدیریت پروژه",
  description: "سیستم مدیریت پروژه هوشمند و چابک",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />
      </head>
      <body className="flex h-screen w-screen overflow-hidden bg-[#0D0D15] text-white">
        <div className="relative z-10 flex w-full h-full p-4 gap-4 md:gap-6 md:p-6">
          <MainSidebar />
          <main className="flex-1 h-full min-w-0">
            <div className="glass w-full h-full rounded-3xl overflow-hidden flex flex-col">
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