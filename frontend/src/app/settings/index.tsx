import React from "react";
import { 
  User as UserIcon, 
  Shield, 
  Moon, 
  Sun, 
  Globe, 
  Lock, 
  Sparkles,
  Key,
  Monitor,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";

import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/uiStore";
import { Button } from "@/components/ui/Button";
import { usersService } from "@/services/users.service";
import { toast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { AdminOnboardingSettings } from "./AdminOnboardingSettings";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [passwords, setPasswords] = React.useState({
    old_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [loading, setLoading] = React.useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      toast("error", "Security Conflict", "New password confirmation does not match.");
      return;
    }

    setLoading(true);
    try {
      await usersService.changePassword({
        old_password: passwords.old_password,
        new_password: passwords.new_password
      });
      toast("success", "Security Updated", "Your account password has been successfully rotated.");
      setPasswords({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err: any) {
      toast("error", "Update Failed", err.response?.data?.detail || "Could not verify current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] transition-colors duration-500 px-4 lg:px-8 pt-4 lg:pt-8 pb-12">
      <div className="max-w-[1200px] mx-auto space-y-4 animate-in fade-in duration-700">
        
        {/* ── Premium Hero Header ─────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white via-indigo-50/30 to-slate-50 dark:from-[#172036] dark:via-indigo-950/10 dark:to-[#0B1020] border border-[#EEF2FF] dark:border-white/5 p-4 lg:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-400/5 dark:bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-400/5 dark:bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/5 border border-[#EEF2FF] dark:border-white/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest mb-4 backdrop-blur-md shadow-sm"
              >
                <Monitor size={12} className="text-brand-500 dark:text-brand-400" /> Account Governance
              </motion.div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tighter mb-1 leading-tight text-slate-900 dark:text-white">
                Platform Preferences
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg font-medium leading-relaxed">
                Customize your interface experience, manage security protocols, and configure account-level parameters.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-1 space-y-4">
            {/* Profile Context */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 border border-indigo-100 dark:border-brand-500/20">
                  <UserIcon size={28} />
                </div>
                <div>
                   <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{user?.full_name}</h3>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{user?.role}</span>
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-white/5">
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Email Authority</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{user?.email}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</span>
                    <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-black uppercase">
                       <CheckCircle2 size={12} /> Active
                    </div>
                 </div>
              </div>
            </motion.div>

            {/* Appearance Control */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]"
            >
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <Sparkles size={14} className="text-amber-500" /> Interface Aesthetics
               </h3>
               <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-[#EEF2FF] dark:border-white/5">
                 <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      theme === 'light' ? "bg-amber-50 text-amber-500" : "bg-brand-500/10 text-brand-400"
                    )}>
                       {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalize">{theme} Mode</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Active Theme</p>
                    </div>
                 </div>
                 <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg font-black text-[10px] uppercase tracking-widest bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm"
                    onClick={toggleTheme}
                  >
                    Switch
                  </Button>
               </div>
            </motion.div>
            
            {user?.role === 'admin' && <AdminOnboardingSettings />}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {/* Security Protocol */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-[#172036] p-8 rounded-[32px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]"
            >
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <Shield size={20} />
                 </div>
                 <div>
                   <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Security Credentials</h3>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Rotate password periodically</p>
                 </div>
              </div>
              
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5">
                      <Key size={10} /> Current Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      required
                      className="rounded-xl h-12 bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/10 font-bold"
                      value={passwords.old_password}
                      onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                    />
                  </div>
                  <div className="hidden md:block" />
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5">
                      <Lock size={10} /> New Protocol
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      required
                      className="rounded-xl h-12 bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/10 font-bold"
                      value={passwords.new_password}
                      onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5">
                      <Lock size={10} /> Confirm Protocol
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      required
                      className="rounded-xl h-12 bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/10 font-bold"
                      value={passwords.confirm_password}
                      onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    isLoading={loading}
                    className="h-12 px-10 rounded-xl bg-slate-900 dark:bg-brand-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 dark:shadow-brand-500/20"
                  >
                    Update Credentials
                  </Button>
                </div>
              </form>
            </motion.div>

            {/* Platform Metadata */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]"
            >
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                 <Globe size={14} className="text-slate-400" /> Infrastructure Node
               </h3>
               <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-[#EEF2FF] dark:border-white/5">
                  <span className="text-xs font-bold text-slate-500">API Gateway</span>
                  <code className="text-[10px] bg-white dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/5 font-mono text-brand-600 dark:text-brand-400 font-bold">
                    {import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000/api/v1`}
                  </code>
               </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
