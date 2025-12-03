"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { FiPlay, FiPause, FiRefreshCw, FiClock, FiMove, FiCheckCircle, FiMinus, FiPlus, FiList } from 'react-icons/fi';

export default function PomodoroTimer() {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState<'work' | 'break'>('work');
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 20 }); // فاصله از پایین و راست
    const [isDragging, setIsDragging] = useState(false);
    
    // Task Linking
    const [myTasks, setMyTasks] = useState<{id: number, title: string}[]>([]);
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [showTaskSelector, setShowTaskSelector] = useState(false);

    // Fetch user tasks
    useEffect(() => {
        const fetchMyTasks = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if(!user) return;
            
            const { data } = await supabase
                .from('project_tasks')
                .select('id, title')
                .eq('assigned_to', user.id) // فقط تسک‌های خودم
                .neq('status', 'completed'); // فقط تسک‌های ناتمام
                
            if(data) setMyTasks(data);
        };
        fetchMyTasks();
    }, []);

    // Timer Logic
    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
            if (mode === 'work') { setMode('break'); setTimeLeft(5 * 60); }
            else { setMode('work'); setTimeLeft(25 * 60); }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode]);

    // Drag Logic (Simple Implementation)
    const dragRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            // محاسبه موقعیت برعکس (چون right/bottom فیکس هستند)
            setPosition(prev => ({
                x: prev.x - e.movementX,
                y: prev.y - e.movementY
            }));
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const adjustTime = (amount: number) => {
        setTimeLeft(prev => Math.max(60, prev + amount));
    };

    if (isMinimized) {
        return (
            <button 
                onClick={() => setIsMinimized(false)}
                style={{ right: `${position.x}px`, bottom: `${position.y}px` }}
                className="fixed z-50 w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition animate-bounce-slow cursor-pointer"
            >
                <FiClock className="text-white text-xl" />
            </button>
        );
    }

    return (
        <div 
            ref={dragRef}
            style={{ right: `${position.x}px`, bottom: `${position.y}px` }}
            className="fixed z-50 w-72 glass border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col"
        >
            {/* Header / Drag Handle */}
            <div 
                onMouseDown={() => setIsDragging(true)}
                className={`h-8 w-full ${mode === 'work' ? 'bg-blue-600' : 'bg-green-600'} cursor-move flex items-center justify-between px-3`}
            >
                <div className="flex items-center gap-2">
                    <FiMove className="text-white/70" size={14} />
                    <span className="text-[10px] text-white font-bold tracking-wider uppercase">
                        {mode === 'work' ? 'Work Mode' : 'Break Mode'}
                    </span>
                </div>
                <button onClick={() => setIsMinimized(true)} className="text-white/70 hover:text-white font-bold text-xs">-</button>
            </div>
            
            <div className="p-5 bg-[#0a0a0a]/95 backdrop-blur-xl relative">
                
                {/* Task Selector */}
                <div className="mb-4 relative">
                     <button onClick={() => setShowTaskSelector(!showTaskSelector)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 flex items-center gap-2 text-xs text-white/80 transition">
                        <FiCheckCircle className={selectedTask ? "text-blue-400" : "text-white/30"} />
                        <span className="truncate flex-1 text-right">{selectedTask || "انتخاب تسک برای تمرکز..."}</span>
                        <FiList />
                     </button>
                     {showTaskSelector && (
                         <div className="absolute top-full left-0 w-full mt-1 bg-[#151520] border border-white/10 rounded-lg max-h-40 overflow-y-auto z-10 custom-scrollbar shadow-xl">
                             {myTasks.length === 0 && <div className="p-2 text-xs text-white/40 text-center">تسک فعالی ندارید</div>}
                             {myTasks.map(t => (
                                 <div key={t.id} onClick={() => { setSelectedTask(t.title); setShowTaskSelector(false); }} className="p-2 text-xs text-white hover:bg-white/10 cursor-pointer border-b border-white/5 truncate">
                                     {t.title}
                                 </div>
                             ))}
                         </div>
                     )}
                </div>

                {/* Timer Display */}
                <div className="flex items-center justify-between mb-6 px-2">
                    <button onClick={() => adjustTime(-60)} className="text-white/30 hover:text-white transition"><FiMinus size={18}/></button>
                    <div className="text-5xl font-mono font-bold text-center text-white tracking-widest drop-shadow-lg">
                        {formatTime(timeLeft)}
                    </div>
                    <button onClick={() => adjustTime(60)} className="text-white/30 hover:text-white transition"><FiPlus size={18}/></button>
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={() => setIsActive(!isActive)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg shadow-white/5 ${isActive ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-white text-black hover:bg-gray-200'}`}
                    >
                        {isActive ? <FiPause size={24} /> : <FiPlay size={24} className="ml-1" />}
                    </button>
                    <button 
                        onClick={() => { setIsActive(false); setTimeLeft(mode === 'work' ? 25*60 : 5*60); }}
                        className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition border border-white/5"
                    >
                        <FiRefreshCw size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}