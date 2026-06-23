import { useQuery } from "@tanstack/react-query";
import {
  Trophy, Flame, Star, Clock, ArrowRight,
  Award, BookOpen, Sparkles, TrendingUp,
  Target, ListChecks, CheckCircle2, ShieldCheck, Zap,
  ChevronRight, AlertTriangle, BarChart2, CalendarDays
} from "lucide-react";
import { analyticsService } from "@/services/analytics.service";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/utils/formatters";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { TrainingCalendar } from "@/components/ui/TrainingCalendar";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// ── Skeleton shimmer ────────────────────────────────────────────────────────
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200/50 dark:bg-white/5 ${className}`} />
  );
}

// ── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    let totalMiliseconds = duration * 1000;
    let incrementTime = (totalMiliseconds / end);

    let timer = setInterval(() => {
      start += 1;
      setDisplayValue(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

// ── Circular progress ring ───────────────────────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(pct, 100)) / 100;
  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="rotate-[-90deg] w-24 h-24 md:w-[120px] md:h-[120px]">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor"
          strokeWidth="8" className="text-slate-100 dark:text-white/5" />
        <motion.circle cx="50" cy="50" r={r} fill="none"
          stroke="url(#prog-grad-premium)" strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        />
        <defs>
          <linearGradient id="prog-grad-premium" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tighter">
          {pct}%
        </span>
        <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">
          Mastery
        </span>
      </div>
    </div>
  );
}

// ── Stat Pill Refined ────────────────────────────────────────────────────────
function StatPill({
  value, label, icon: Icon, colorClass = "text-slate-900 dark:text-white",
}: { value: number; label: string; icon?: any; colorClass?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={12} className="opacity-50" />}
        <span className={`text-xl font-black transition-transform group-hover:scale-110 ${colorClass}`}>{value}</span>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</span>
    </div>
  );
}

// ── Skill bar ────────────────────────────────────────────────────────────────
function SkillBar({ name, pct }: { name: string; pct: number }) {
  return (
    <div className="space-y-1.5 group">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-brand-500 transition-colors">{name}</span>
        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-500"
        />
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

// ── Dashboard Card ───────────────────────────────────────────────────────────
function DashboardCard({ 
  children, 
  className = "", 
  elevated = false,
  title,
  icon: Icon,
  action,
  id
}: { 
  children: React.ReactNode; 
  className?: string; 
  elevated?: boolean;
  title?: string;
  icon?: any;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <motion.div 
      id={id}
      variants={itemVariants}
      className={`
        relative overflow-hidden rounded-[20px] md:rounded-[24px] p-4 md:p-6 lg:p-7 transition-all duration-300
        border border-[#EEF2FF] dark:border-white/5
        ${elevated 
          ? "bg-[#FCFCFF] dark:bg-[#1E293B] shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:shadow-none" 
          : "bg-white dark:bg-[#172036] shadow-[0_4px_20px_rgba(15,23,42,0.04)] dark:shadow-none"
        }
        hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] dark:hover:shadow-none md:hover:-translate-y-1
        ${className}
      `}
    >
      {(title || Icon) && (
        <div className="flex items-center justify-between mb-3.5 md:mb-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5 md:gap-2">
            {Icon && <Icon size={13} className="text-brand-500" />} {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </motion.div>
  );
}


// ── Floating Stat Widget ───────────────────────────────────────────────────
function StatWidget({ label, value, unit, icon: Icon, color, delay }: any) {
  const colors: any = {
    orange: "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20",
    indigo: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20",
    violet: "text-violet-500 bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] min-w-[140px] group transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${colors[color]}`}>
          <Icon size={16} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-2xl font-black text-slate-900 dark:text-white">
          <AnimatedCounter value={value} />
        </p>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{unit}</span>
      </div>
      {/* Decorative Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full bg-slate-100 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const { data: d, isLoading } = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: () => analyticsService.getEmployeeDashboard(),
    select: (res) => res.data.data,
    staleTime: 60_000,
  });

  const firstName = user?.full_name?.split(" ")[0] || "Learner";
  const progress = d?.overall_progress ?? 0;
  const streak = d?.streak_days ?? 0;
  const xp = d?.points ?? 0;
  const badges = d?.badges_count ?? 0;
  const activeCount = d?.active_courses_count ?? 0;
  const pendingEffectiveness = d?.pending_effectiveness ?? 0;
  const learningGoal = d?.annual_learning_goal;
  const goalPct = Math.min(learningGoal?.progress_percentage ?? 0, 100);



  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] -mx-4 -mt-8 px-4 pt-4 md:pt-8 transition-colors duration-500">
      <div className="max-w-[1500px] mx-auto pb-24 space-y-3.5 md:space-y-6 lg:space-y-8 relative">

        {/* ── Premium Light Hero Section ────────────────────────────────────────── */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:block relative overflow-hidden rounded-[40px] bg-white/40 dark:bg-white/[0.02] border border-white dark:border-white/5 p-8 lg:p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.04)] backdrop-blur-3xl ring-1 ring-slate-200/50 dark:ring-white/5"
        >
          {/* Airy Aesthetic Blobs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 dark:bg-indigo-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-200/20 dark:bg-violet-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-blue-100/30 dark:bg-blue-500/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-12">
            {/* Left Content */}
            <div className="max-w-2xl">
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm mb-8"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/20">
                  <Sparkles size={10} />
                </div>
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                  Welcome back to your learning hub 🚀
                </span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl lg:text-5xl font-black tracking-tight mb-5 leading-[1.05] text-slate-900 dark:text-white"
              >
                Ready to grow your skills, <span className="text-brand-600 dark:text-brand-400">{firstName}</span>?
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-slate-500 dark:text-slate-400 text-base lg:text-lg font-medium leading-relaxed max-w-xl mb-8"
              >
                You're making incredible progress. Explore new modules, track your achievements, and take the next step in your professional journey today.
              </motion.p>
              
              {/* Learning Chips */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                  <Flame size={14} className="animate-pulse" />
                  {streak} Day Streak
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/5 border border-brand-500/10 text-brand-600 dark:text-brand-400 text-[11px] font-bold">
                  <Trophy size={14} />
                  Top 5% this month
                </div>
              </div>
            </div>
            
            {/* Right Stats: Floating Glass Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 xl:flex xl:flex-row gap-4 shrink-0">
              <StatWidget 
                label="Streak" 
                value={streak} 
                unit="Days" 
                icon={Flame} 
                color="orange" 
                delay={0.4} 
              />
              <StatWidget 
                label="Total XP" 
                value={xp} 
                unit="Points" 
                icon={Zap} 
                color="indigo" 
                delay={0.5} 
              />
              <StatWidget 
                label="Courses" 
                value={activeCount} 
                unit="Active" 
                icon={BookOpen} 
                color="violet" 
                delay={0.6} 
              />
            </div>
          </div>
        </motion.div>

        {/* ── Premium Compact Mobile Learning Summary & KPI Grid ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="block md:hidden space-y-3"
        >
          {/* Greeting Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#172036] border border-[#EEF2FF] dark:border-white/5 p-4 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 dark:bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Hi, {firstName}! 👋
                </h1>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Keep up the great momentum today.
                </p>
              </div>
              <div className="flex items-center gap-1 bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 rounded-full border border-brand-100/30 dark:border-brand-500/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold">
                <Flame size={12} className="animate-pulse" />
                <span>{streak}d Streak</span>
              </div>
            </div>
          </div>

          {/* 2-Column KPI Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Streak", value: streak, unit: "Days", icon: Flame, color: "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20" },
              { label: "Total XP", value: xp, unit: "Pts", icon: Zap, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20" },
              { label: "Active", value: activeCount, unit: "Courses", icon: BookOpen, color: "text-violet-500 bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20" },
              { label: "Badges", value: badges, unit: "Earned", icon: Award, color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20" }
            ].map((kpi, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#172036] border border-[#EEF2FF] dark:border-white/5 rounded-xl p-3 shadow-[0_4px_15px_rgba(15,23,42,0.01)] flex items-center gap-2.5"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${kpi.color}`}>
                  <kpi.icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none mb-1">
                    {kpi.label}
                  </p>
                  <p className="text-base font-extrabold text-slate-900 dark:text-white leading-none">
                    {kpi.value} <span className="text-[9px] font-semibold text-slate-400 lowercase">{kpi.unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Main Dashboard Content ─────────────────────────────────────────── */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6"
        >
          {/* Progress Card (Primary Weight) */}
          <DashboardCard 
            elevated 
            title="Mastery Overview" 
            icon={TrendingUp}
            className="order-1 md:order-none"
            action={
              <Badge variant={progress >= 75 ? "success" : progress >= 40 ? "warning" : "secondary"}
                className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                {progress >= 75 ? "On Track" : progress >= 40 ? "Steady" : "Starting"}
              </Badge>
            }
          >
            {isLoading ? (
              <div className="flex justify-center py-6"><Shimmer className="w-32 h-32 rounded-full" /></div>
            ) : (
              <div className="flex flex-col items-center">
                <ProgressRing pct={progress} />
                <div className="w-full grid grid-cols-3 gap-1 mt-4 md:mt-8 pt-4 md:pt-6 border-t border-slate-100 dark:border-white/5">
                  <StatPill value={activeCount} label="Active" colorClass="text-brand-600 dark:text-brand-400" />
                  <div className="border-x border-slate-100 dark:border-white/5">
                    <StatPill value={d?.completed_courses_count ?? 0} label="Done" colorClass="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <StatPill value={d?.missed_courses_count ?? 0} label="Missed" colorClass="text-red-500 dark:text-red-400" />
                </div>
              </div>
            )}
          </DashboardCard>

          <DashboardCard
            elevated
            title="Annual Learning Goal"
            icon={Target}
            className="order-2 md:order-none"
            action={
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20">
                {learningGoal?.progress_state === "Goal Achieved" ? "Goal Achieved 🎉" : learningGoal?.progress_state ?? "Getting Started"}
              </Badge>
            }
          >
            {isLoading ? (
              <div className="space-y-3 md:space-y-4">
                <Shimmer className="h-10 md:h-12 rounded-2xl" />
                <Shimmer className="h-2 md:h-3 rounded-full" />
                <Shimmer className="h-16 md:h-20 rounded-2xl" />
              </div>
            ) : (
              <div className="space-y-3 md:space-y-5">
                <div>
                  <p className="text-xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {learningGoal?.completed_hours ?? 0} / {learningGoal?.goal_hours ?? 16}
                    <span className="ml-1.5 text-xs md:text-sm font-bold text-slate-400">Hours Completed</span>
                  </p>
                  <p className="mt-0.5 md:mt-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {learningGoal?.financial_year_label ?? "FY: Apr - Mar"}
                  </p>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex items-center justify-between text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Learning Goal Progress</span>
                    <span className="text-brand-600 dark:text-brand-400">{learningGoal?.progress_percentage ?? 0}%</span>
                  </div>
                  <div className="h-2 md:h-3 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${goalPct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-brand-500 to-indigo-500"
                    />
                  </div>
                </div>

                {/* Mobile-only compact hours row */}
                <div className="flex md:hidden items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 py-0.5">
                  <span>Goal: <strong className="text-slate-700 dark:text-slate-200">{learningGoal?.goal_hours ?? 16}h</strong></span>
                  <span>Remaining: <strong className="text-brand-600 dark:text-brand-400">{learningGoal?.remaining_hours ?? 16}h</strong></span>
                </div>

                {/* Desktop-only hours grid */}
                <div className="hidden md:grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Remaining</p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{learningGoal?.remaining_hours ?? 16}h</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Goal Hours</p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{learningGoal?.goal_hours ?? 16}h</p>
                  </div>
                </div>

                <div className="rounded-xl md:rounded-2xl border border-brand-100 bg-brand-50/60 p-2.5 md:p-3 dark:border-brand-500/15 dark:bg-brand-500/10">
                  <p className="text-[9px] font-black uppercase tracking-widest text-brand-500">Recent Contribution</p>
                  <p className="mt-0.5 truncate text-[11px] md:text-xs font-bold text-slate-800 dark:text-slate-100">
                    {learningGoal?.recent_contribution
                      ? `${learningGoal.recent_contribution.training_title} +${learningGoal.recent_contribution.hours}h`
                      : "Complete training to add hours."}
                  </p>
                  {learningGoal?.last_completed_course && (
                    <p className="mt-0.5 truncate text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      Last completed: {learningGoal.last_completed_course}
                    </p>
                  )}
                </div>
              </div>
            )}
          </DashboardCard>

          {/* Learning Calendar (Primary Weight) */}
          <DashboardCard 
            id="calendar"
            className="order-6 md:order-none xl:col-span-2" 
            title="Learning Calendar" 
            icon={CalendarDays}
            action={
              <Button variant="ghost" size="sm" className="h-7 md:h-8 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-600">
                View Details <ArrowRight size={10} className="ml-1 md:ml-1.5" />
              </Button>
            }
          >
            <div className="bg-slate-50/50 dark:bg-white/[0.02] rounded-xl md:rounded-2xl p-1.5 md:p-2 border border-slate-100 dark:border-white/5 h-full">
              <TrainingCalendar compact={true} />
            </div>
          </DashboardCard>


          {/* Skill Progress (Secondary Weight) */}
          <DashboardCard className="order-7 md:order-none xl:col-span-2" title="Skill DNA" icon={Target}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3.5 md:gap-y-5">
              {isLoading
                ? [1, 2, 3, 4].map((i) => <Shimmer key={i} className="h-6 md:h-7 rounded-lg" />)
                : (d?.skills?.length ?? 0) > 0
                  ? d!.skills.map((skill: any, i: number) => (
                      <SkillBar key={i} name={skill.skill} pct={skill.progress} />
                    ))
                  : (
                    <div className="col-span-full py-4 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-100 rounded-xl">
                      Complete a training to generate your Skill DNA.
                    </div>
                  )
              }
            </div>
          </DashboardCard>

          {/* Quick Actions (Relocated) */}
          <DashboardCard title="Quick Actions" icon={Zap} className="order-4 md:order-none">
            <div className="grid grid-cols-3 md:grid-cols-1 gap-2 md:gap-2.5">
              {[
                { label: "Browse Catalog", to: "/enrollments", icon: BookOpen, color: "bg-brand-50 text-brand-600" },
                { label: "My Enrollments", to: "/enrollments", icon: Star, color: "bg-violet-50 text-violet-600" },
                { label: "Assessments", to: "/effectiveness", icon: ListChecks, color: "bg-amber-50 text-amber-600" },
              ].map((item, i) => (
                <Link key={i} to={item.to}
                  className="flex flex-col md:flex-row items-center md:justify-between p-2 md:p-3.5 rounded-xl md:rounded-2xl border border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/5 hover:shadow-sm group transition-all"
                >
                  <div className="flex flex-col md:flex-row items-center gap-1.5 md:gap-3 text-center md:text-left w-full md:w-auto">
                    <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl ${item.color} dark:bg-white/10 dark:text-slate-400 transition-colors group-hover:bg-brand-600 group-hover:text-white shrink-0`}>
                      <item.icon size={15} />
                    </div>
                    <span className="text-[9px] md:text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-brand-600 leading-tight">
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight size={14} className="hidden md:block text-slate-300 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </DashboardCard>

          {/* Task Summary (Secondary Weight) */}
          <DashboardCard 
            title="Priority Tasks" 
            icon={ListChecks}
            className={`order-3 md:order-none ${pendingEffectiveness > 0 ? "bg-gradient-to-br from-amber-50/30 to-transparent" : ""}`}
          >
            <div className="space-y-3 md:space-y-4">
              <div className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl border ${pendingEffectiveness > 0 ? 'bg-amber-50/50 border-amber-100 text-amber-900' : 'bg-emerald-50/50 border-emerald-100 text-emerald-900'} dark:bg-white/5 dark:border-white/10 transition-all`}>
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${pendingEffectiveness > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {pendingEffectiveness > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-tight leading-none mb-1">Assessments</p>
                  <p className="text-[10px] md:text-[11px] font-bold opacity-70">
                    {pendingEffectiveness > 0 ? `${pendingEffectiveness} reviews pending` : 'All complete'}
                  </p>
                </div>
              </div>
              
              {pendingEffectiveness > 0 && (
                <Button asChild size="sm" className="w-full h-9 md:h-11 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-amber-600/20">
                  <Link to="/effectiveness">Complete Review <ArrowRight size={12} className="ml-1.5" /></Link>
                </Button>
              )}
            </div>
          </DashboardCard>

          {/* Upcoming Deadlines (Tertiary Weight) */}
          <DashboardCard title="Deadlines" icon={Clock} className="order-5 md:order-none">
            <div className="space-y-2 md:space-y-3">
              {isLoading
                ? <Shimmer className="h-20 md:h-24 rounded-xl" />
                : (d?.upcoming_deadlines?.length ?? 0) > 0
                  ? d!.upcoming_deadlines.slice(0, 3).map((dl: any, i: number) => (
                      <div key={i} className="group flex items-center justify-between p-2 md:p-3 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-50 dark:border-white/5">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                          <p className="text-[10px] md:text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{dl.title}</p>
                        </div>
                        <span className="text-[8px] md:text-[9px] font-black text-red-500 whitespace-nowrap ml-2">{formatDate(dl.due_date)}</span>
                      </div>
                    ))
                  : <p className="text-[10px] text-center text-slate-400 py-3 font-bold uppercase tracking-widest">No upcoming deadlines</p>
              }
            </div>
          </DashboardCard>

          {/* Historical Stats (Tertiary Weight) */}
          <DashboardCard title="Performance" icon={BarChart2} className="order-9 md:order-none">
            <div className="grid grid-cols-2 gap-2 md:gap-4 pt-1 md:pt-2">
              <div className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-50 dark:border-white/10 text-center">
                <p className="text-lg md:text-xl font-black text-slate-800 dark:text-white leading-none mb-1">{d?.completed_courses_count ?? 0}</p>
                <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Done</p>
              </div>
              <div className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-50 dark:border-white/10 text-center">
                <p className="text-lg md:text-xl font-black text-slate-800 dark:text-white leading-none mb-1">{badges}</p>
                <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Badges</p>
              </div>
            </div>
          </DashboardCard>

          {/* Achievement Badges (Secondary Weight) */}
          <DashboardCard className="order-8 md:order-none xl:col-span-1" title="Top Achievements" icon={Award}>
             <div className="flex flex-wrap gap-2 md:gap-3">
               {[
                 { icon: BookOpen, color: "text-indigo-500 bg-indigo-50" },
                 { icon: Zap, color: "text-amber-500 bg-amber-50" },
                 { icon: ShieldCheck, color: "text-emerald-500 bg-emerald-50" },
                 { icon: Trophy, color: "text-orange-500 bg-orange-50" },
               ].slice(0, badges).map((BadgeItem, i) => (
                 <div key={i} className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center ${BadgeItem.color} dark:bg-white/10 dark:text-slate-400 border border-current border-opacity-10 shadow-sm transition-transform hover:scale-110`}>
                   <BadgeItem.icon size={15} className="md:w-[18px] md:h-[18px]" />
                 </div>
               ))}
               {badges === 0 && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No badges yet</p>}
             </div>
          </DashboardCard>
        </motion.div>


      </div>
    </div>
  );
}
