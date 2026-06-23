import { Activity } from "lucide-react";
import AdminAttendanceDashboard from "./AdminAttendance";

export default function DesktopAdminAttendanceWrapper() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] px-4 lg:px-8 pt-4 lg:pt-8 pb-12 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-white via-indigo-50/50 to-slate-50 dark:from-[#172036] dark:via-indigo-950/10 dark:to-[#0B1020] border border-[#EEF2FF] dark:border-white/5 p-6 lg:p-8 shadow-sm">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-400/5 dark:bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl space-y-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/5 border border-[#EEF2FF] dark:border-white/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                <Activity size={12} className="text-brand-500" /> Attendance Command Center
              </div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
                Attendance Command Center
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-lg leading-relaxed">
                Monitor real-time participation, live sessions, and historical logs — all in one place. Managers do not mark attendance directly.
              </p>
            </div>
          </div>
        </div>
        <AdminAttendanceDashboard />
      </div>
    </div>
  );
}
