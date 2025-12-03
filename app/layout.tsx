import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import MainSidebar from "@/components/MainSidebar";
import PomodoroTimer from "@/components/PomodoroTimer";
// 1. ایمپورت استایل و کامپوننت نوتیفیکیشن
import { Toaster } from 'react-hot-toast';

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
        <link
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
          rel="stylesheet"
          type="text/css"
        />
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

        {/* ویجت‌های شناور */}
        <PomodoroTimer />
        
        {/* کانفیگ نوتیفیکیشن‌ها (Toast) */}
        <Toaster 
            position="top-center"
            toastOptions={{
                style: {
                    background: '#1a1a2e',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                },
                success: {
                    iconTheme: {
                        primary: '#4ade80',
                        secondary: '#black',
                    },
                },
            }}
        />
        
      </body>
    </html>
  );
}