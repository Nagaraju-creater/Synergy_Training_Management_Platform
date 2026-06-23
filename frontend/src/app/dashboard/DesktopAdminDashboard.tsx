
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import {
  Users, Activity, Calendar, Layers, 
  DollarSign, Target, ShieldCheck,
  TrendingUp, Sparkles,
  GraduationCap, ArrowRight,
  Zap, Box
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TrainingCalendar } from "@/components/ui/TrainingCalendar";
import { cn } from "@/lib/utils";

// ── Local Premium Components ────────────────────────────────────────────────

function PremiumStatCard({ title, value, icon: Icon, insight, insightLabel, variant = "indigo", delay = 0 }: any) {
  const variants: any = {
    indigo: "text-indigo-600 bg-indigo-50/50 border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20",
    emerald: "text-emerald-600 bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    amber: "text-amber-600 bg-amber-50/50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20",
    rose: "text-rose-600 bg-rose-50/50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="relative group bg-white dark:bg-[#172036] p-5 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:shadow-[0_15px_30px_rgba(15,23,42,0.08)] transition-all ring-1 ring-slate-200/50 dark:ring-white/5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-all group-hover:scale-105 group-hover:shadow-lg", variants[variant])}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        {insight && (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-tight">
              <TrendingUp size={10} />
              {insight}
            </div>
            {insightLabel && <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{insightLabel}</span>}
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DesktopAdminDashboard({ adminData }: { adminData: any }) {


  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] transition-colors duration-500 px-4 lg:px-8 pt-4 lg:pt-8 pb-12">
      <div className="max-w-[1600px] mx-auto space-y-4 animate-in fade-in duration-700">
        
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
                <ShieldCheck size={12} className="text-brand-500 dark:text-brand-400" /> Executive Command
              </motion.div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tighter mb-1 leading-tight text-slate-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg font-medium leading-relaxed">
                Analyze organizational learning velocity, track strategic development ROI, and manage system-wide governance from a unified interface.
              </p>
            </div>
            
            <div className="flex items-center gap-2.5">
               <Button variant="outline" className="h-10 px-5 rounded-xl font-bold border-slate-200/60 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md text-[11px] uppercase tracking-widest text-slate-600 dark:text-slate-400">
                <Activity size={14} className="mr-2 text-brand-500" /> System Health
              </Button>
              <Button className="h-10 px-6 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20 text-[11px] uppercase tracking-widest">
                Analytics Export
              </Button>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PremiumStatCard
            title="Total Workforce"
            value={adminData?.summary?.total_employees ?? 0}
            icon={Users}
            insight="Global"
            variant="indigo"
            delay={0.1}
          />
          <PremiumStatCard
            title="Active Programs"
            value={adminData?.summary?.total_trainings ?? 0}
            icon={Layers}
            insight="+2 New"
            variant="amber"
            delay={0.2}
          />
          <PremiumStatCard
            title="Avg Velocity"
            value={adminData?.summary?.avg_completion_rate ? `${adminData.summary.avg_completion_rate}%` : '0%'}
            icon={Zap}
            insight="Optimized"
            variant="emerald"
            delay={0.3}
          />
          <PremiumStatCard
            title="Net Enrollments"
            value={adminData?.summary?.total_enrollments ?? 0}
            icon={GraduationCap}
            insight="Live"
            variant="rose"
            delay={0.4}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-[24px] border border-[#EEF2FF] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] dark:border-white/5 dark:bg-[#172036]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  <Target size={18} className="text-emerald-500" /> FY Learning Compliance
                </h3>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {adminData.learning_goal.financial_year_label} - 16 Learning Hours / Year
                </p>
              </div>
              <Badge className="w-fit border border-emerald-100 bg-emerald-50 text-[10px] font-black uppercase text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                {adminData.learning_goal.yearly_completion_percentage}% Compliance
              </Badge>
            </div>
            
            {/* Top Row: KPI Cards */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Organization Target Hours</p>
                <p className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">{adminData.learning_goal.organization_target_hours}h</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Organization Actual Hours</p>
                <p className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">{adminData.learning_goal.organization_learning_hours}h</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Compliance %</p>
                <p className="mt-1.5 text-2xl font-black text-indigo-600 dark:text-indigo-400">{adminData.learning_goal.yearly_completion_percentage}%</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Employees At Target</p>
                <p className="mt-1.5 text-2xl font-black text-emerald-600 dark:text-emerald-400">{adminData.learning_goal.achieved_employees}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Employees Below Target</p>
                <p className="mt-1.5 text-2xl font-black text-amber-600 dark:text-amber-400">{adminData.learning_goal.employees_below_target}</p>
              </div>
            </div>

            {/* Progress Visualization */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-white/[0.03] dark:border-white/5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{adminData.learning_goal.organization_learning_hours}h Completed</span>
                <span>{adminData.learning_goal.organization_remaining_hours}h Remaining</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5 relative">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                  style={{ width: `${Math.min(adminData.learning_goal.yearly_completion_percentage, 100)}%` }} 
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                <span>0%</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400">{adminData.learning_goal.organization_target_hours}h Target</span>
                <span>100%</span>
              </div>
            </div>

            {/* Department Cards */}
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {adminData.learning_goal.department_goal_achievement.map((dept: any) => (
                <div key={dept.dept} className="rounded-2xl border border-slate-100 p-4 dark:border-white/5 bg-white dark:bg-[#1a233a] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">{dept.dept}</span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{dept.completion_percentage}%</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.min(dept.completion_percentage, 100)}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-50 pt-3 dark:border-white/5">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Actual</p>
                      <p className="text-xs font-black text-slate-850 dark:text-white mt-0.5">{dept.hours}h</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Target</p>
                      <p className="text-xs font-black text-slate-850 dark:text-white mt-0.5">{dept.target_hours}h</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Remaining</p>
                      <p className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5">{dept.remaining_hours}h</p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>{dept.employees} {dept.employees === 1 ? 'Employee' : 'Employees'}</span>
                    <span>{dept.achieved_employees} At Target</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] border border-[#EEF2FF] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] dark:border-white/5 dark:bg-[#172036]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top FY Learners</h3>
            <div className="mt-5 space-y-3">
              {adminData.learning_goal.top_learners.length > 0 ? adminData.learning_goal.top_learners.map((learner: any, index: number) => (
                <div key={learner.employee_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3 dark:border-white/5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900 dark:text-white">{index + 1}. {learner.name}</p>
                    <p className="truncate text-[9px] font-bold uppercase tracking-widest text-slate-400">{learner.department}</p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-emerald-600 dark:text-emerald-400">{learner.hours}h</span>
                </div>
              )) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-xs font-bold text-slate-400 dark:bg-white/[0.03]">No FY attended completions yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] h-full flex flex-col"
            >
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <TrendingUp size={18} className="text-brand-500" />
                      Learning Trends
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Monthly participation volume</p>
                  </div>
               </div>

               <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={adminData?.monthly_trends || []}>
                      <defs>
                        <linearGradient id="colorEnrolls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-white/5" opacity={0.05} />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: '1px solid #EEF2FF', 
                          backgroundColor: 'rgba(255,255,255,0.95)',
                          backdropFilter: 'blur(10px)',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
                          fontSize: '11px',
                          fontWeight: 700
                        }} 
                      />
                      <Area type="monotone" dataKey="enrollments" stroke="#6366f1" fillOpacity={1} fill="url(#colorEnrolls)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </motion.div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="bg-slate-950 p-6 rounded-[24px] text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 pointer-events-none">
                <DollarSign size={120} />
              </div>
              <div className="relative z-10">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400" /> ROI Multiplier
                </h3>
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                       <p className="text-4xl font-black text-white leading-none tracking-tighter mb-1">{adminData?.roi_metrics?.ratio?.toFixed(1) ?? '0.0'}x</p>
                       <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Strategic Yield</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Efficiency</p>
                      <p className="text-xs font-black text-emerald-400 flex items-center gap-1 justify-end">
                        <TrendingUp size={12} /> +12% YoY
                      </p>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/10 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold uppercase tracking-tight">Est. Savings</span>
                      <span className="font-black text-white">${adminData?.roi_metrics?.savings?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold uppercase tracking-tight">L&D Investment</span>
                      <span className="font-black text-white">${adminData?.roi_metrics?.cost?.toLocaleString() ?? '0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Action Intelligence</h3>
              <div className="space-y-3">
                <Link to="/nominations" className="block group">
                  <motion.div whileHover={{ x: 4 }} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-[#EEF2FF] dark:border-white/5 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#172036] shadow-sm flex items-center justify-center text-brand-600 dark:text-brand-400">
                          <Target size={18} />
                       </div>
                       <div>
                        <p className="text-xl font-black text-slate-900 dark:text-white leading-none mb-1">{adminData?.pending_nominations ?? 0}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pending Nominations</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-600 transition-colors" />
                  </motion.div>
                </Link>
                <Link to="/effectiveness" className="block group">
                  <motion.div whileHover={{ x: 4 }} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-[#EEF2FF] dark:border-white/5 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#172036] shadow-sm flex items-center justify-center text-amber-600 dark:text-amber-400">
                          <Activity size={18} />
                       </div>
                       <div>
                        <p className="text-xl font-black text-slate-900 dark:text-white leading-none mb-1">{adminData?.pending_reviews ?? 0}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pending Reviews</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-amber-600 transition-colors" />
                  </motion.div>
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <GraduationCap size={16} className="text-brand-500" /> High Impact Programs
                 </h3>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg">Participation</span>
              </div>
              <div className="space-y-3">
                {adminData?.top_trainings?.map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors border border-transparent hover:border-[#EEF2FF] dark:hover:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 font-black text-xs">
                        {i + 1}
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.title}</span>
                    </div>
                    <span className="text-xs font-black text-slate-400">{t.completions} Enrollments</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Box size={16} className="text-emerald-500" /> Unit Performance
                </h3>
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">Top Tier</span>
              </div>
              <div className="space-y-3">
                {adminData?.top_departments?.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors border border-transparent hover:border-[#EEF2FF] dark:hover:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-xs">
                        {i + 1}
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{d.name}</span>
                    </div>
                    <span className="text-xs font-black text-emerald-500">{d.performance}% Score</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white dark:bg-[#172036] p-8 rounded-[32px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-[0.03] rotate-12 pointer-events-none">
              <Target size={240} />
            </div>
            <div className="relative z-10 mb-8">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Skills Velocity Analysis</h2>
              <p className="text-xs text-slate-400 mt-1 font-black uppercase tracking-widest">Identifying strategic capability gaps</p>
            </div>
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-8">
              {adminData?.skills_gap?.map((skill: any, i: number) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{skill.skill}</span>
                    <span className={cn(
                      "text-[10px] font-black",
                      skill.gap > 0.5 ? "text-rose-500" : "text-brand-600"
                    )}>{(skill.gap * 100).toFixed(0)}% Gap</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(skill.gap) * 100}%` }}
                      transition={{ duration: 1, delay: 0.8 + (i * 0.1) }}
                      className={cn(
                        "h-full rounded-full",
                        skill.gap > 0.5 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-3 mb-6 px-2">
             <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
                <Calendar size={20} />
             </div>
             <div>
               <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Global Learning Schedule</h3>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Master training timeline for the current quarter</p>
             </div>
          </div>
          <div id="calendar" className="bg-white dark:bg-[#172036] p-6 rounded-[32px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
            <TrainingCalendar />
          </div>
        </div>
      </div>
    </div>
  );
}
