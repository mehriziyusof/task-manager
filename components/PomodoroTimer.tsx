"use client";
import React, { useState, useEffect } from 'react';
// FiClock را به لیست اضافه کنید
import { FiPlay, FiPause, FiRefreshCw, FiCheckCircle, FiClock } from 'react-icons/fi';

export default function PomodoroTimer() {
    const WORK_TIME = 25 * 60; // 25 دقیقه
    const BREAK_TIME = 5 * 60; // 5 دقیقه

    const [timeLeft, setTimeLeft] = useState(WORK_TIME);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState<'work' | 'break'>('work');
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            // پایان تایمر
            setIsActive(false);
            const audio = new Audio('/notification.mp3'); // اگر فایل صدا دارید
            audio.play().catch(e => console.log('Audio error'));
            
            // سوییچ اتوماتیک مود
            if (mode === 'work') {
                setMode('break');
                setTimeLeft(BREAK_TIME);
            } else {
                setMode('work');
                setTimeLeft(WORK_TIME);
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(mode === 'work' ? WORK_TIME : BREAK_TIME);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (isMinimized) {
        return (
            <button 
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition animate-bounce-slow"
            >
                <FiClock className="text-white text-xl" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-64 glass border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className={`h-1.5 w-full ${mode === 'work' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
            
            <div className="p-5 bg-[#0a0a0a]/90 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${mode === 'work' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                        {mode === 'work' ? 'تمرکز 🔥' : 'استراحت ☕'}
                    </span>
                    <button onClick={() => setIsMinimized(true)} className="text-white/40 hover:text-white text-xs">
                        کوچک کردن
                    </button>
                </div>

                <div className="text-5xl font-mono font-bold text-center text-white tracking-widest mb-6">
                    {formatTime(timeLeft)}
                </div>

                <div className="flex justify-center gap-4">
                    <button 
                        onClick={toggleTimer}
                        className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition shadow-lg shadow-white/10"
                    >
                        {isActive ? <FiPause size={20} /> : <FiPlay size={20} className="ml-1" />}
                    </button>
                    <button 
                        onClick={resetTimer}
                        className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition border border-white/5"
                    >
                        <FiRefreshCw size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}