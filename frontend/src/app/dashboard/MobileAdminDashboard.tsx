import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Layers, Zap, GraduationCap, Target, ShieldCheck,
  TrendingUp, ArrowRight, Calendar, Plus, FileSpreadsheet,
  BarChart3, CheckCircle2
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart, Area, Tooltip
} from "recharts";
import { cn } from "@/lib/utils";

// Reusable components
const ActionChip = ({ icon: Icon, label, to, onClick }: any) => {
  const content = (
    <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white dark:bg-[#172036] px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm border border-[#EEF2FF] dark:border-white/5 active:scale-95 transition-transform">
      <Icon size={14} className="text-brand-500" />
      {label}
    </div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return <button onClick={onClick}>{content}</button>;
};

const CompactKPI = ({ title, value, icon: Icon, colorClass }: any) => (
  <div className="flex flex-col p-3 bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 shadow-sm">
    <div className="flex items-center gap-2 mb-2">
      <div className={cn("p-1.5 rounded-lg bg-opacity-10 dark:bg-opacity-20", colorClass.bg, colorClass.text)}>
        <Icon size={14} strokeWidth={2.5} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{title}</span>
    </div>
    <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">{value}</span>
  </div>
);

export default function MobileAdminDashboard({ adminData }: { adminData: any }) {
  const [trendFilter, setTrendFilter] = useState("30d"); // 7d, 30d, 90d

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1020] pb-24 text-slate-900 dark:text-slate-100 overflow-x-hidden">
      
      {/* SECTION 1: Executive Header (Max 100px) */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0B1020]/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 px-4 pt-4 pb-3">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-lg font-black tracking-tighter flex items-center gap-1.5">
            <ShieldCheck size={18} className="text-brand-500" />
            Executive Command
          </h1>
          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1">
          <div className="text-center"><span className="block text-slate-900 dark:text-white font-black">{adminData?.summary?.total_employees}</span> Emps</div>
          <div className="w-px h-6 bg-slate-200 dark:bg-white/10" />
          <div className="text-center"><span className="block text-slate-900 dark:text-white font-black">{adminData?.summary?.total_trainings}</span> Progs</div>
          <div className="w-px h-6 bg-slate-200 dark:bg-white/10" />
          <div className="text-center"><span className="block text-slate-900 dark:text-white font-black">{adminData?.summary?.total_enrollments}</span> Enrolls</div>
          <div className="w-px h-6 bg-slate-200 dark:bg-white/10" />
          <div className="text-center"><span className="block text-emerald-500 font-black">{adminData?.summary?.avg_completion_rate}%</span> Vel</div>
        </div>
      </header>

      <div className="p-4 space-y-5">
        
        {/* SECTION 3: Sticky Quick Actions (Horizontal Scroll) */}
        <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar flex gap-2 pb-1">
          <ActionChip icon={Plus} label="Create Training" to="/trainings" />
          <ActionChip icon={FileSpreadsheet} label="Import Data" to="/data-import" />
          <ActionChip icon={BarChart3} label="Analytics" to="/analytics" />
          <ActionChip icon={CheckCircle2} label="Attendance" to="/attendance" />
        </div>

        {/* SECTION 2: KPI Grid (2x2) */}
        <div className="grid grid-cols-2 gap-3">
          <CompactKPI title="Workforce" value={adminData?.summary?.total_employees} icon={Users} colorClass={{ bg: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" }} />
          <CompactKPI title="Programs" value={adminData?.summary?.total_trainings} icon={Layers} colorClass={{ bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }} />
          <CompactKPI title="Enrollments" value={adminData?.summary?.total_enrollments} icon={GraduationCap} colorClass={{ bg: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" }} />
          <CompactKPI title="Avg Velocity" value={`${adminData?.summary?.avg_completion_rate}%`} icon={Zap} colorClass={{ bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }} />
        </div>

        {/* SECTION 4: FY Learning Compliance Widget */}
        <div className="bg-white dark:bg-[#172036] rounded-2xl p-4 shadow-sm border border-[#EEF2FF] dark:border-white/5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="flex items-center gap-2 text-sm font-black tracking-tight text-slate-900 dark:text-white">
              <Target size={16} className="text-emerald-500" /> FY Learning Compliance
            </h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {adminData?.learning_goal?.financial_year_label} - 16 Learning Hours / Year
            </p>
          </div>

          {/* Redesigned KPI Section Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-white/[0.03]">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Organization Target Hours</p>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white">{adminData?.learning_goal?.organization_target_hours}h</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-white/[0.03]">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Organization Actual Hours</p>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white">{adminData?.learning_goal?.organization_learning_hours}h</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-white/[0.03]">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Compliance %</p>
              <p className="mt-1 text-base font-black text-indigo-600 dark:text-indigo-400">{adminData?.learning_goal?.yearly_completion_percentage}%</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-white/[0.03]">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Employees At Target</p>
              <p className="mt-1 text-base font-black text-emerald-600 dark:text-emerald-400">{adminData?.learning_goal?.achieved_employees}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-white/[0.03]">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Employees Below Target</p>
              <p className="mt-1 text-base font-black text-amber-600 dark:text-amber-400">{adminData?.learning_goal?.employees_below_target} Employees</p>
            </div>
          </div>

          {/* Progress Visualization */}
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 dark:bg-white/[0.03] dark:border-white/5">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
              <span>{adminData?.learning_goal?.organization_learning_hours}h Completed</span>
              <span>{adminData?.learning_goal?.organization_remaining_hours}h Remaining</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5 relative">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                style={{ width: `${Math.min(adminData?.learning_goal?.yearly_completion_percentage || 0, 100)}%` }} 
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[8px] font-bold text-slate-400">
              <span>0%</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400">{adminData?.learning_goal?.organization_target_hours}h Target</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* SECTION 7: Executive Insights */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/nominations" className="bg-brand-50 dark:bg-brand-500/10 p-3 rounded-2xl flex justify-between items-center active:scale-95 transition-transform border border-brand-100 dark:border-brand-500/20">
            <div>
              <p className="text-xl font-black text-brand-600 dark:text-brand-400 leading-none mb-1">{adminData?.pending_nominations ?? 0}</p>
              <p className="text-[9px] font-black text-brand-600/70 dark:text-brand-400/70 uppercase">Nominations</p>
            </div>
            <ArrowRight size={14} className="text-brand-500" />
          </Link>
          <Link to="/effectiveness" className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-2xl flex justify-between items-center active:scale-95 transition-transform border border-amber-100 dark:border-amber-500/20">
            <div>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 leading-none mb-1">{adminData?.pending_reviews ?? 0}</p>
              <p className="text-[9px] font-black text-amber-600/70 dark:text-amber-400/70 uppercase">Reviews</p>
            </div>
            <ArrowRight size={14} className="text-amber-500" />
          </Link>
        </div>

        {/* SECTION 5: Department Compliance Cards */}
        <div className="bg-white dark:bg-[#172036] rounded-2xl p-4 shadow-sm border border-[#EEF2FF] dark:border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Department Compliance</h3>
            <Link to="/departments" className="text-[10px] font-bold text-brand-600 dark:text-brand-400">View All</Link>
          </div>
          
          <div className="space-y-3">
            {adminData?.learning_goal?.department_goal_achievement?.map((dept: any) => (
              <div key={dept.dept} className="rounded-xl border border-slate-100 p-3 dark:border-white/5 bg-slate-50/30 dark:bg-[#1a233a]/50 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">{dept.dept}</span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{dept.completion_percentage}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.min(dept.completion_percentage || 0, 100)}%` }} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-100 pt-2 dark:border-white/5">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Actual</p>
                    <p className="text-[10px] font-black text-slate-800 dark:text-white mt-0.5">{dept.hours}h</p>
                  </div>
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Target</p>
                    <p className="text-[10px] font-black text-slate-800 dark:text-white mt-0.5">{dept.target_hours}h</p>
                  </div>
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Remaining</p>
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 mt-0.5">{dept.remaining_hours}h</p>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>{dept.employees} {dept.employees === 1 ? 'Employee' : 'Employees'}</span>
                  <span>{dept.achieved_employees} At Target</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5.5: Top FY Learners */}
        <div className="bg-white dark:bg-[#172036] rounded-2xl p-4 shadow-sm border border-[#EEF2FF] dark:border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Top FY Learners</h3>
            <GraduationCap size={16} className="text-brand-500" />
          </div>
          <div className="space-y-2">
            {adminData?.learning_goal?.top_learners?.length > 0 ? (
              adminData.learning_goal.top_learners.map((learner: any, index: number) => (
                <div key={learner.employee_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-2.5 dark:border-white/5 bg-slate-50/30 dark:bg-[#1a233a]/50">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900 dark:text-white">{index + 1}. {learner.name}</p>
                    <p className="truncate text-[9px] font-bold uppercase tracking-widest text-slate-400">{learner.department}</p>
                  </div>
                  <span className="shrink-0 text-xs font-black text-emerald-600 dark:text-emerald-400">{learner.hours}h</span>
                </div>
              ))
            ) : (
              <p className="text-xs font-bold text-slate-400 py-1">No completed trainings recorded yet.</p>
            )}
          </div>
        </div>

        {/* SECTION 6: Learning Trends */}
        <div className="bg-white dark:bg-[#172036] rounded-2xl p-4 shadow-sm border border-[#EEF2FF] dark:border-white/5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Learning Trends</h3>
            <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-0.5">
              {['7d', '30d', '90d'].map(f => (
                <button
                  key={f}
                  onClick={() => setTrendFilter(f)}
                  className={cn(
                    "px-2 py-1 text-[9px] font-black uppercase rounded-md transition-colors",
                    trendFilter === f ? "bg-white dark:bg-[#172036] text-brand-600 shadow-sm" : "text-slate-400"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={adminData?.monthly_trends || []}>
                <defs>
                  <linearGradient id="colorEnrollsMobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', padding: '4px 8px' }} />
                <Area type="monotone" dataKey="enrollments" stroke="#6366f1" fill="url(#colorEnrollsMobile)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 9: Skills Velocity (Horizontal Scroll) */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Skills Velocity Gap</h3>
          <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar flex gap-3 pb-2">
            {adminData?.skills_gap?.map((skill: any, i: number) => (
              <div key={i} className="min-w-[140px] bg-white dark:bg-[#172036] rounded-2xl p-3 shadow-sm border border-[#EEF2FF] dark:border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate mb-3">{skill.skill}</span>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-lg font-black leading-none text-slate-900 dark:text-white">{(skill.gap * 100).toFixed(0)}%</span>
                    <TrendingUp size={12} className={skill.gap > 0.5 ? "text-rose-500" : "text-emerald-500"} />
                  </div>
                  <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", skill.gap > 0.5 ? "bg-rose-500" : "bg-brand-500")} style={{ width: `${skill.gap * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 8: High Impact Programs */}
        <div className="bg-white dark:bg-[#172036] rounded-2xl p-4 shadow-sm border border-[#EEF2FF] dark:border-white/5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">High Impact Programs</h3>
          <div className="space-y-3">
            {adminData?.top_trainings?.slice(0, 3).map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 shrink-0 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-400">
                  #{i+1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.title}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{t.completions} Enrollments</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 10: Upcoming Trainings (Replaces Calendar) */}
        <div className="bg-white dark:bg-[#172036] rounded-2xl p-4 shadow-sm border border-[#EEF2FF] dark:border-white/5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={14} /> Upcoming</h3>
            <Link to="/trainings" className="text-[10px] font-bold text-brand-600 dark:text-brand-400">Full Schedule</Link>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex gap-3 relative pl-4 border-l-2 border-brand-100 dark:border-brand-500/20 py-1">
                <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-brand-500" />
                <div>
                  <p className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 mb-0.5">Tomorrow, 10:00 AM</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Leadership Foundation Phase {i+1}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
