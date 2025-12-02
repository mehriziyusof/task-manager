"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { FiUser, FiMail, FiCamera, FiSave, FiLogOut, FiMapPin, FiLink, FiLoader } from 'react-icons/fi';

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false); // استیت برای لودینگ آپلود عکس
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) setProfile({ ...data, email: user.email! });
    }
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return;
    setSaving(true);
    
    // حذف فیلدهای غیر مجاز با استفاده از as any برای جلوگیری از خطای تایپ‌اسکریپت
    const { email, id, role, created_at, ...safeUpdates } = { ...profile, ...updates } as any;

    const { error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, ...updates });
      if (!uploading) alert("پروفایل با موفقیت به‌روزرسانی شد! ✅");
    } else {
      console.error("Update Error:", error);
      alert(`خطا در ذخیره: ${error.message}`);
    }
    setSaving(false);
  };

  // --- هندلر واقعی آپلود عکس به Supabase Storage ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !profile) return;

    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
        // 1. آپلود فایل به باکت avatars
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. دریافت لینک عمومی (Public URL)
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // 3. ذخیره لینک در پروفایل
        await updateProfile({ avatar_url: publicUrl });
        alert("عکس پروفایل با موفقیت تغییر کرد! 📸");

    } catch (error: any) {
        console.error("Upload Error:", error);
        alert("خطا در آپلود عکس!");
    } finally {
        setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-white/50">در حال بارگذاری پروفایل...</div>;
  if (!profile) return null;

  return (
    <div className="p-6 md:p-10 text-white min-h-screen flex justify-center">
      <div className="w-full max-w-2xl space-y-8">
        
        {/* Profile Card */}
        <div className="glass p-8 rounded-[40px] border border-white/10 relative overflow-hidden">
          {/* Background Blur */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl"></div>

          <div className="relative z-10 flex flex-col items-center">
            
            {/* Avatar Upload */}
            <div className="relative group cursor-pointer" onClick={() => !uploading && fileInputRef.current?.click()}>
              <div className="w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden shadow-2xl bg-[#1a1a2e] relative">
                {uploading ? (
                    <div className="w-full h-full flex items-center justify-center bg-black/50">
                        <FiLoader className="animate-spin text-white text-2xl" />
                    </div>
                ) : profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
                        <FiUser size={48} className="text-white/30" />
                    </div>
                )}
              </div>
              
              {/* Edit Overlay */}
              {!uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 backdrop-blur-sm">
                    <FiCamera size={24} className="text-white" />
                  </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </div>

            {/* Info */}
            <div className="mt-4 text-center">
                <h2 className="text-2xl font-bold text-white">{profile.full_name || "کاربر بدون نام"}</h2>
                <span className="text-sm text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full mt-2 inline-block border border-blue-500/20">
                    {profile.role === 'manager' ? 'مدیر سیستم' : 'عضو تیم'}
                </span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-white/60">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg"><FiMail /> {profile.email}</div>
                {profile.location && <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg"><FiMapPin /> {profile.location}</div>}
            </div>

            <div className="flex gap-4 mt-8 w-full max-w-md">
                <button className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl transition font-medium border border-white/5">
                    پیام‌ها
                </button>
                <button 
                    onClick={handleLogout}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-2xl transition font-medium border border-red-500/10 flex items-center justify-center gap-2"
                >
                    <FiLogOut /> خروج
                </button>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="glass p-8 rounded-3xl border border-white/10">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FiUser className="text-purple-400" /> ویرایش اطلاعات
            </h3>
            
            <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-xs text-white/50 mr-2">نام و نام خانوادگی</label>
                        <input 
                            value={profile.full_name || ''}
                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition text-white"
                            placeholder="نام خود را وارد کنید"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-white/50 mr-2">وب‌سایت</label>
                        <div className="relative">
                            <FiLink className="absolute left-4 top-3.5 text-white/30" />
                            <input 
                                value={profile.website || ''}
                                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition text-white text-left ltr"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs text-white/50 mr-2">موقعیت مکانی</label>
                        <div className="relative">
                            <FiMapPin className="absolute right-4 top-3.5 text-white/30" />
                            <input 
                                value={profile.location || ''}
                                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition text-white"
                                placeholder="تهران، ایران"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-white/50 mr-2">بیوگرافی</label>
                    <textarea 
                        value={profile.bio || ''}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition text-white resize-none"
                        placeholder="درباره خودتان بنویسید..."
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <button 
                        onClick={() => updateProfile(profile)}
                        disabled={saving}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 transition flex items-center gap-2"
                    >
                        {saving ? 'در حال ذخیره...' : <><FiSave /> ذخیره تغییرات</>}
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}