import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Camera, Mail, User as UserIcon, Lock, CheckCircle2, 
  Loader2, Sparkles, Zap, BookOpen, Award, 
  ShieldCheck, Briefcase, ChevronDown, ChevronUp, Bell, 
  Settings, Activity, Globe, Moon, Clock, ArrowRight, LayoutDashboard
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { usersService } from "@/services/users.service";
import { analyticsService } from "@/services/analytics.service";
import { getAssetUrl } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z.object({
  old_password: z.string().min(1, "Old password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
  confirm_password: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
  <button 
    type="button"
    onClick={() => onChange(!checked)}
    className={cn("w-10 h-6 rounded-full transition-colors relative flex-shrink-0", checked ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700")}
  >
    <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", checked ? "left-5" : "left-1")} />
  </button>
);

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Accordion states
  const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);
  const [isNotificationsExpanded, setIsNotificationsExpanded] = useState(false);
  const [isPreferencesExpanded, setIsPreferencesExpanded] = useState(false);

  // Mock states for UI
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [trainingReminders, setTrainingReminders] = useState(true);
  const [attendanceUpdates, setAttendanceUpdates] = useState(false);

  // Fetch optional learning stats to display in the profile panel
  const { data: analytics } = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: () => analyticsService.getEmployeeDashboard(),
    select: (res) => res.data.data,
    enabled: user?.role === "employee" || user?.role === "manager",
  });

  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || "",
      email: user?.email || "",
    },
  });

  const {
    register: regPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch,
    formState: { isDirty: isPasswordDirty },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const newPasswordValue = watch("new_password", "");

  const updateProfileMutation = useMutation({
    mutationFn: usersService.updateMe,
    onSuccess: (res) => {
      if (res.data.data) {
        setUser(res.data.data);
      }
      toast("success", "Profile Updated", "Your personal details have been saved.");
    },
    onError: (err: any) => {
      toast("error", "Update Failed", err.response?.data?.message || "Could not update profile.");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: usersService.changePassword,
    onSuccess: () => {
      toast("success", "Password Changed", "Your password has been successfully updated.");
      resetPassword();
      setIsSecurityExpanded(false);
    },
    onError: (err: any) => {
      toast("error", "Action Failed", err.response?.data?.message || "Could not change password.");
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast("error", "File Too Large", "Image must be less than 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const res = await usersService.uploadAvatar(file);
      if (res.data.data) {
        setUser(res.data.data);
      }
      toast("success", "Avatar Updated", "Your profile picture has been updated.");
    } catch (err: any) {
      toast("error", "Upload Failed", err.response?.data?.message || "Could not upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "None", color: "bg-slate-200 dark:bg-white/10" };
    if (pwd.length < 8) return { score: 1, label: "Weak", color: "bg-rose-500 text-white" };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { score: 2, label: "Medium", color: "bg-amber-500 text-white" };
    return { score: 3, label: "Strong", color: "bg-emerald-500 text-white" };
  };

  const pwdStrength = getPasswordStrength(newPasswordValue);

  return (
    <div className="max-w-[1300px] mx-auto pb-24 md:space-y-8 relative">
      
      {/* ── DESKTOP ONLY: Premium Light Theme Hero Header ── */}
      <div className="hidden md:block relative overflow-hidden rounded-[32px] bg-gradient-to-br from-white via-indigo-50/50 to-slate-50 dark:from-[#172036] dark:via-indigo-950/10 dark:to-[#0B1020] border border-slate-200/60 dark:border-white/5 p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-colors duration-500">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-400/10 dark:bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-violet-400/10 dark:bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-brand-600 dark:text-brand-400 text-xs font-bold mb-6 backdrop-blur-md shadow-sm">
              <Sparkles size={14} className="text-brand-500 dark:text-brand-400" /> Account Management
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-3 leading-tight text-slate-900 dark:text-white">
              Profile Settings
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg max-w-xl font-medium leading-relaxed">
              Manage your personal information, security preferences, and view your learning profile.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 md:gap-8">
        
        {/* ── Left Sidebar / Mobile Header ── */}
        <div className="md:col-span-4 space-y-4 md:space-y-6">
          
          {/* Profile Card (Adapts for Mobile & Desktop) */}
          <div className="bg-white dark:bg-[#172036] md:border border-b border-slate-200 dark:border-white/5 md:rounded-[32px] p-6 md:p-8 shadow-sm md:shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-24 md:h-32 bg-gradient-to-b from-indigo-50 to-transparent dark:from-indigo-950/30 pointer-events-none" />
            
            <div className="relative flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-0">
              {/* Avatar */}
              <div className="relative md:mb-6 shrink-0">
                <div className="w-16 h-16 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-white dark:border-[#172036] shadow-md md:shadow-xl overflow-hidden bg-slate-100 dark:bg-white/5 flex items-center justify-center relative z-10">
                  {user?.avatar_url ? (
                    <img src={getAssetUrl(user.avatar_url)} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl md:text-4xl font-bold text-slate-400 dark:text-slate-500">{user?.full_name?.charAt(0)}</span>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-brand-600 dark:text-brand-400" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 z-20 w-6 h-6 md:w-10 md:h-10 rounded-full bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-md flex items-center justify-center hover:scale-110 transition-all cursor-pointer border border-slate-100 dark:border-white/10"
                >
                  <Camera className="w-3 h-3 md:w-[18px] md:h-[18px]" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              </div>
              
              {/* Details */}
              <div className="flex-1 min-w-0 flex flex-col md:items-center">
                <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                  <h2 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white truncate">{user?.full_name}</h2>
                  {/* Status Badges inline on mobile */}
                  <div className="flex items-center gap-1 md:hidden">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <ShieldCheck size={14} className="text-indigo-500" />
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 md:mb-6 truncate">
                  <Briefcase size={12} className="shrink-0" /> <span className="truncate">{user?.role}</span>
                  <span className="md:hidden opacity-50 px-1">•</span>
                  <span className="md:hidden truncate">Operations</span> {/* Defaulting department to Operations visually */}
                </div>

                {/* Status blocks desktop */}
                <div className="hidden md:flex w-full items-center justify-center gap-4 border-t border-slate-100 dark:border-white/5 pt-6">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-1">
                      <CheckCircle2 size={18} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-1">
                      <ShieldCheck size={18} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── KPI Chips Row (Mobile) / Learning Card (Desktop) ── */}
          {analytics && (
            <>
              {/* Mobile Swipeable KPI Row */}
              <div className="md:hidden flex overflow-x-auto gap-2 px-4 pb-2 scrollbar-hide pt-2 bg-slate-50/50 dark:bg-[#0B1020]/50 border-b border-slate-200/50 dark:border-white/5 [scrollbar-width:none]">
                <div className="shrink-0 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
                  <BookOpen size={14} className="text-indigo-500" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Courses</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{analytics.completed_courses_count}</p>
                  </div>
                </div>
                <div className="shrink-0 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
                  <Clock size={14} className="text-emerald-500" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Hours</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">12.5</p>
                  </div>
                </div>
                <div className="shrink-0 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
                  <Award size={14} className="text-amber-500" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Badges</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{analytics.badges_count}</p>
                  </div>
                </div>
                <div className="shrink-0 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
                  <Activity size={14} className="text-rose-500" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Goal</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">25%</p>
                  </div>
                </div>
              </div>

              {/* Desktop Analytics Card */}
              <div className="hidden md:block bg-white dark:bg-[#172036] border border-slate-200 dark:border-white/5 rounded-[32px] p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-6">
                  <Zap size={14} className="text-brand-500" /> Learning Profile
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <BookOpen size={16} className="text-indigo-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Completed Courses</span>
                    </div>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{analytics.completed_courses_count}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <Award size={16} className="text-amber-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Badges Earned</span>
                    </div>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{analytics.badges_count}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right Content Area (Forms & Settings) ── */}
        <div className="md:col-span-8 px-4 md:px-0 space-y-4 md:space-y-8 mt-4 md:mt-0 pb-20 md:pb-0">
          
          {/* 1. Personal Information */}
          <div className="bg-white dark:bg-[#172036] border border-slate-200 dark:border-white/5 rounded-2xl md:rounded-[32px] overflow-hidden shadow-sm md:shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <div className="px-5 md:px-8 py-4 md:py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
              <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserIcon size={16} className="text-brand-500" /> Personal Details
              </h3>
              <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Update your name and primary email address.</p>
            </div>
            
            <div className="p-5 md:p-8">
              <form onSubmit={handleProfileSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                  <div className="space-y-1.5 md:space-y-2 relative group">
                    <label className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Full Name</label>
                    <Input 
                      {...regProfile("full_name")} 
                      placeholder="Your full name" 
                      error={!!profileErrors.full_name}
                      className="h-10 md:h-12 rounded-xl bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 focus:bg-white focus:ring-4 focus:ring-brand-500/10 font-semibold text-xs md:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2 relative group">
                    <label className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Email Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                      <Input 
                        {...regProfile("email")} 
                        type="email" 
                        placeholder="email@company.com" 
                        error={!!profileErrors.email}
                        className="h-10 md:h-12 pl-9 rounded-xl bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 focus:bg-white focus:ring-4 focus:ring-brand-500/10 font-semibold text-xs md:text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex justify-end pt-4 border-t border-slate-100 dark:border-white/5 mt-8">
                  <Button 
                    type="submit" 
                    isLoading={updateProfileMutation.isPending} 
                    disabled={!isProfileDirty}
                    className="h-11 px-8 rounded-xl font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 shadow-md transition-all disabled:opacity-50"
                  >
                    Save Changes
                  </Button>
                </div>

                {/* Mobile Sticky Save Banner */}
                {isProfileDirty && (
                  <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
                    <Button 
                      type="submit" 
                      isLoading={updateProfileMutation.isPending}
                      className="w-full h-12 rounded-2xl font-black bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* 2. Security Section (Accordion on Mobile, Flat on Desktop) */}
          <div className="bg-white dark:bg-[#172036] border border-slate-200 dark:border-white/5 rounded-2xl md:rounded-[32px] overflow-hidden shadow-sm md:shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <button 
              type="button"
              onClick={() => setIsSecurityExpanded(!isSecurityExpanded)}
              className="w-full px-5 md:px-8 py-4 md:py-6 md:border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex justify-between items-center text-left"
            >
              <div>
                <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock size={16} className="text-amber-500" /> Security & Password
                </h3>
                <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Keep your account secure.</p>
              </div>
              <div className="flex items-center gap-2">
                {pwdStrength.score > 0 && !isSecurityExpanded && (
                  <span className={cn("flex items-center text-[10px] px-2 py-0.5 rounded font-bold uppercase", pwdStrength.color)}>
                    {pwdStrength.label}
                  </span>
                )}
                <div className="md:hidden">
                  {isSecurityExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>
            </button>
            
            <div className={cn("p-5 md:p-8 pt-0 md:pt-8 border-t border-slate-100 dark:border-white/5 md:border-t-0 md:block", isSecurityExpanded ? "block" : "hidden")}>
              <form onSubmit={handlePasswordSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-4 md:space-y-6">
                
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Current Password</label>
                  <Input 
                    {...regPassword("old_password")} 
                    type="password" 
                    placeholder="••••••••" 
                    className="h-10 md:h-12 rounded-xl bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 font-semibold text-xs md:text-sm max-w-md"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 pt-4 md:pt-6 md:border-t border-slate-100 dark:border-white/5">
                  <div className="space-y-1.5 md:space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">New Password</label>
                      <span className={cn("md:hidden text-[9px] px-1.5 py-0.5 rounded font-bold uppercase", pwdStrength.score > 0 ? pwdStrength.color : "bg-slate-100 text-slate-400")}>
                        {pwdStrength.score > 0 ? pwdStrength.label : "Required"}
                      </span>
                    </div>
                    <Input 
                      {...regPassword("new_password")} 
                      type="password" 
                      placeholder="••••••••" 
                      className="h-10 md:h-12 rounded-xl bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 font-semibold text-xs md:text-sm"
                    />
                    
                    {/* Desktop Strength Indicator */}
                    <div className="hidden md:block mt-3 space-y-1.5">
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3].map((level) => (
                          <div 
                            key={level} 
                            className={`flex-1 rounded-full transition-colors duration-500 ${pwdStrength.score >= level ? pwdStrength.color : 'bg-slate-200 dark:bg-white/10'}`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Confirm Password</label>
                    <Input 
                      {...regPassword("confirm_password")} 
                      type="password" 
                      placeholder="••••••••" 
                      className="h-10 md:h-12 rounded-xl bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 font-semibold text-xs md:text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 md:pt-4 border-t border-slate-100 dark:border-white/5 mt-4 md:mt-8">
                  <Button 
                    type="submit" 
                    variant="outline"
                    disabled={!isPasswordDirty}
                    isLoading={changePasswordMutation.isPending} 
                    className="w-full md:w-auto h-10 md:h-11 px-8 rounded-xl font-bold border-brand-200 dark:border-brand-900/50 text-brand-700 dark:text-brand-400 shadow-sm transition-all disabled:opacity-50"
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* 3. Notifications */}
          <div className="bg-white dark:bg-[#172036] border border-slate-200 dark:border-white/5 rounded-2xl md:rounded-[32px] overflow-hidden shadow-sm md:shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all">
            <button 
              type="button"
              onClick={() => setIsNotificationsExpanded(!isNotificationsExpanded)}
              className="w-full px-5 md:px-8 py-4 md:py-6 bg-slate-50/50 dark:bg-white/[0.01] flex justify-between items-center text-left"
            >
              <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bell size={16} className="text-rose-500" /> Notifications
              </h3>
              <div className="md:hidden">
                {isNotificationsExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>
            </button>
            <div className={cn("p-5 md:p-8 pt-0 md:pt-8 md:block border-t border-slate-100 dark:border-white/5 md:border-t-0", isNotificationsExpanded ? "block" : "hidden")}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">Email Alerts</p>
                    <p className="text-[10px] md:text-xs text-slate-400">Receive major account updates via email</p>
                  </div>
                  <ToggleSwitch checked={emailAlerts} onChange={setEmailAlerts} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">Training Reminders</p>
                    <p className="text-[10px] md:text-xs text-slate-400">Get notified about upcoming courses</p>
                  </div>
                  <ToggleSwitch checked={trainingReminders} onChange={setTrainingReminders} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">Attendance Updates</p>
                    <p className="text-[10px] md:text-xs text-slate-400">Status changes for your enrollments</p>
                  </div>
                  <ToggleSwitch checked={attendanceUpdates} onChange={setAttendanceUpdates} />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Preferences */}
          <div className="bg-white dark:bg-[#172036] border border-slate-200 dark:border-white/5 rounded-2xl md:rounded-[32px] overflow-hidden shadow-sm md:shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all">
            <button 
              type="button"
              onClick={() => setIsPreferencesExpanded(!isPreferencesExpanded)}
              className="w-full px-5 md:px-8 py-4 md:py-6 bg-slate-50/50 dark:bg-white/[0.01] flex justify-between items-center text-left"
            >
              <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Settings size={16} className="text-emerald-500" /> Preferences
              </h3>
              <div className="md:hidden">
                {isPreferencesExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>
            </button>
            <div className={cn("p-5 md:p-8 pt-0 md:pt-8 md:block border-t border-slate-100 dark:border-white/5 md:border-t-0", isPreferencesExpanded ? "block" : "hidden")}>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3 text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                    <Moon size={14} className="text-slate-400" /> Theme Mode
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">System Default</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3 text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                    <Globe size={14} className="text-slate-400" /> Language
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">English (US)</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3 text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                    <Clock size={14} className="text-slate-400" /> Time Zone
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">UTC</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Recent Activity */}
          <div className="bg-white dark:bg-[#172036] border border-slate-200 dark:border-white/5 rounded-2xl md:rounded-[32px] overflow-hidden shadow-sm md:shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all">
            <div className="px-5 md:px-8 py-4 md:py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
              <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <LayoutDashboard size={16} className="text-violet-500" /> Recent Activity
              </h3>
            </div>
            <div className="p-5 md:p-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 size={14} />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">Completed Fire Safety Basics</p>
                  <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">2 days ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <BookOpen size={14} />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">Attended Manager Summit Q3</p>
                  <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">Last week</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Award size={14} />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">Earned "Compliance Champion" Badge</p>
                  <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">2 weeks ago</p>
                </div>
              </div>
              
              <button className="w-full mt-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex justify-center items-center gap-1">
                View All Activity <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
