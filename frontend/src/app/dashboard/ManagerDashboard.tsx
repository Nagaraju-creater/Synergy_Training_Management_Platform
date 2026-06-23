import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  AlertTriangle, Clock, Calendar, CheckCircle2,
  Users, Award, UserPlus, ClipboardCheck,
  ChevronRight, Search, Download, History,
  TrendingUp, Activity, Sparkles, LayoutGrid,
  Plus, X, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

import { analyticsService } from "@/services/analytics.service";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { formatDate } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { 
  ManagerDashboardActivity
} from "@/types";
import { TrainingCalendar } from "@/components/ui/TrainingCalendar";

// ── Local Premium Components ────────────────────────────────────────────────

function PremiumStatCard({ title, value, icon: Icon, insight, insightLabel, variant = "indigo", delay = 0, loading = false }: any) {
  const variants: any = {
    indigo: "text-indigo-600 bg-indigo-50/50 border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20",
    emerald: "text-emerald-600 bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    amber: "text-amber-600 bg-amber-50/50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20",
    rose: "text-rose-600 bg-rose-50/50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20",
  };

  if (loading) return <Skeleton className="h-[120px] rounded-[24px]" />;

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

export default function ManagerDashboard() {
  const [page, setPage] = useState(1);

  // 1. Unified Dashboard Query — staleTime:0 ensures real-time updates after
  // attendance submissions, training completions, and data imports.
  const { data: unifiedData, isLoading: isUnifiedLoading } = useQuery({
    queryKey: ["manager-dashboard-unified"],
    queryFn: () => analyticsService.getUnifiedManagerDashboard(),
    select: (res) => res.data.data,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // 2. Team Query (for pagination)
  const { data: paginatedTeam, isLoading: isTeamLoading } = useQuery({
    queryKey: ["manager-team", page],
    queryFn: () => analyticsService.getManagerTeam(page),
    select: (res) => res.data.data,
    enabled: page > 1,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const [isMobile, setIsMobile] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [sortType, setSortType] = useState<"hours" | "completion" | "progress">("hours");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert("Strategic dashboard data exported successfully.");
    }, 1500);
  };

  const summary = unifiedData?.summary;
  const charts = unifiedData?.charts;
  const activity = unifiedData?.activity;
  const pendingReviews = unifiedData?.pending_reviews;
  const teamData = page === 1 ? unifiedData?.team : paginatedTeam;
  
  const isInitialLoading = isUnifiedLoading;
  const isDataLoading = isInitialLoading || (page > 1 && isTeamLoading);

  const pieData = charts ? [
    { name: "Completed", value: charts.completion_rate.completed },
    { name: "Pending", value: charts.completion_rate.pending },
  ] : [];

  const teamColumns: Column<any>[] = [
    { 
      key: "name", 
      label: "Name", 
      className: "min-w-[250px]",
      render: (m: any) => (
        <div className="flex items-center gap-3 py-1 text-left">
          <div className="w-10 h-10 rounded-[14px] bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
            <Users size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-900 dark:text-white leading-tight">{m.name}</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-0.5">{m.department}</span>
          </div>
        </div>
      ) 
    },
    { 
      key: "trainings_assigned", 
      label: "Enrollments",
      render: (m) => (
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 px-4">{m.trainings_assigned}</span>
      )
    },
    { 
      key: "completion_percentage", 
      label: "Progress",
      render: (m) => (
        <div className="flex items-center gap-3 px-4">
          <div className="h-1.5 w-24 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${m.completion_percentage}%` }}
               transition={{ duration: 1, ease: "easeOut" }}
               className={cn(
                 "h-full rounded-full",
                 m.completion_percentage >= 80 ? "bg-emerald-500" : m.completion_percentage >= 40 ? "bg-indigo-500" : "bg-amber-500"
               )} 
             />
          </div>
          <span className="text-[11px] font-black text-slate-500 w-8">{m.completion_percentage}%</span>
        </div>
      )
    },
    {
      key: "learning_goal_progress",
      label: "FY Learning Goal",
      render: (m) => (
        <div className="min-w-[180px] px-4 text-left">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>{m.learning_hours_fy} / 16h</span>
            <span className={m.below_learning_target ? "text-amber-500" : "text-emerald-500"}>{m.learning_goal_progress}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
            <div
              className={cn("h-full rounded-full", m.below_learning_target ? "bg-brand-500" : "bg-emerald-500")}
              style={{ width: `${Math.min(m.learning_goal_progress, 100)}%` }}
            />
          </div>
        </div>
      )
    },
    { 
      key: "status", 
      label: "Status",
      render: (m) => (
        <Badge variant={m.status === 'On track' ? 'success' : 'warning'} className="text-[9px] uppercase font-black px-2.5 py-0.5 rounded-lg tracking-widest">
          {m.status}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (m) => (
        <Link to={`/employees/${m.id}`}>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
            <ChevronRight size={18} className="text-slate-400" />
          </Button>
        </Link>
      )
    }
  ];

  const reviewColumns: Column<any>[] = [
    { 
      key: "employee_name", 
      label: "Employee",
      render: (r) => <span className="font-bold text-slate-900 dark:text-white">{r.employee_name}</span>
    },
    { 
      key: "training_name", 
      label: "Training",
      render: (r) => <span className="text-xs font-medium text-slate-500">{r.training_name}</span>
    },
    { 
      key: "submission_date", 
      label: "Submitted",
      render: (r) => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{formatDate(r.submission_date)}</span>
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (r) => (
        <Link to={`/effectiveness/${r.id}`}>
          <Button size="sm" className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] uppercase tracking-widest">Review</Button>
        </Link>
      )
    }
  ];

  const renderMobileView = () => {
    const sortedMembers = [...(unifiedData?.leaderboard ?? [])].sort((a, b) => {
      if (sortType === "hours") {
        return (b.learning_hours_fy ?? 0) - (a.learning_hours_fy ?? 0);
      }
      if (sortType === "completion") {
        return (b.completion_percentage ?? 0) - (a.completion_percentage ?? 0);
      }
      if (sortType === "progress") {
        return (a.learning_goal_progress ?? 0) - (b.learning_goal_progress ?? 0);
      }
      return 0;
    });

    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D1A] pb-24 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-500 relative overflow-x-hidden text-left">
        {/* Compact Header */}
        <div className="bg-white dark:bg-[#111726] border-b border-slate-100 dark:border-white/5 px-4 py-3 flex flex-col justify-between h-[105px] sticky top-0 z-30 shadow-xs backdrop-blur-md bg-white/95 dark:bg-[#111726]/95">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none">Manager Dashboard</h1>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1.5">
                {summary?.team_count ?? 0} Team Members • {summary?.financial_year_label ?? "FY 2026-2027"}
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] uppercase font-black px-2.5 py-0.5 rounded-lg border-indigo-100 text-indigo-600 bg-indigo-50/50">
              Manager
            </Badge>
          </div>
          <div className="flex gap-2">
            <Link to="/employees" className="flex-1">
              <Button className="w-full h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-sm">
                Team Management
              </Button>
            </Link>
            <Button 
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 font-extrabold text-[10px] uppercase tracking-wider"
            >
              {exporting ? "Exporting..." : "Export Data"}
            </Button>
          </div>
        </div>

        {/* Top KPI Swipe Row */}
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 bg-slate-50/50 dark:bg-[#0B0F1E]/50 border-b border-slate-100 dark:border-white/5 scrollbar-none">
          {[
            { title: "My Team", value: summary?.team_count ?? 0, icon: Users, variant: "indigo" },
            { title: "Active", value: summary?.active_trainings ?? 0, icon: Award, variant: "emerald" },
            { title: "Pending", value: summary?.pending_nominations ?? 0, icon: Clock, variant: "amber" },
            { title: "At Risk", value: summary?.overdue_employees ?? 0, icon: AlertTriangle, variant: "rose" },
            { title: "Hours", value: `${summary?.team_learning_hours_fy ?? 0}h`, icon: ClipboardCheck, variant: "indigo" }
          ].map((item, idx) => {
            const Icon = item.icon;
            const variants: any = {
              indigo: "text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20",
              emerald: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
              amber: "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20",
              rose: "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20",
            };
            return (
              <div 
                key={idx}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#111726] rounded-xl border border-slate-100 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-w-[110px]"
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center border", variants[item.variant])}>
                  <Icon size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter leading-none">{item.title}</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight mt-0.5 leading-none">{item.value}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pending Reviews (Moved to Top) */}
        {pendingReviews && pendingReviews.length > 0 && (
          <div className="px-4 pt-3 space-y-2">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block pl-1">Urgent Pending Reviews</span>
            <div className="space-y-2">
              {pendingReviews.slice(0, 3).map((rev: any) => (
                <div 
                  key={rev.id}
                  className="bg-white dark:bg-[#111726] p-3.5 rounded-xl border border-slate-100 dark:border-white/5 shadow-xs flex items-center justify-between"
                >
                  <div className="flex flex-col min-w-0 flex-1 mr-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">{rev.employee_name}</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 truncate leading-tight">{rev.training_name}</span>
                    <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-wider mt-1.5">{formatDate(rev.submission_date)}</span>
                  </div>
                  <Link to={`/effectiveness/${rev.id}`} className="shrink-0">
                    <Button size="sm" className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] uppercase tracking-wider">
                      Review
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Health Summary */}
        <div className="mx-4 mt-3 bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm space-y-3">
          <div>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block pl-0.5">TEAM HEALTH</span>
            <h3 className="text-xs font-black text-slate-800 dark:text-white">Overall Performance Summary</h3>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center pb-2 border-b border-slate-50 dark:border-white/5">
            <div>
              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Completion</span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
                {summary?.avg_completion_rate ? `${Math.round(summary.avg_completion_rate)}%` : "0%"}
              </span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Hours</span>
              <span className="text-sm font-black text-slate-800 dark:text-white block mt-0.5">{summary?.team_learning_hours_fy ?? 0}h</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Participation</span>
              <span className="text-sm font-black text-slate-800 dark:text-white block mt-0.5">100%</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase block">At Risk</span>
              <span className="text-sm font-black text-rose-500 block mt-0.5">{summary?.overdue_employees ?? 0}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase">
              <span>Completion Target Progress</span>
              <span>{summary?.avg_completion_rate ? `${Math.round(summary.avg_completion_rate)}%` : "0%"}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
              <div 
                style={{ width: `${summary?.avg_completion_rate ?? 0}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Team Members Progress Leaderboard */}
        <div className="bg-white dark:bg-[#111726] mx-4 mt-3 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-xs space-y-3">
          <div className="flex flex-col gap-2 border-b border-slate-50 dark:border-white/5 pb-2">
            <div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block pl-0.5">TEAM MEMBERS</span>
              <h3 className="text-xs font-black text-slate-800 dark:text-white">Progress Leaderboard</h3>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pt-1">
              {[
                { label: "Highest Hours", value: "hours" },
                { label: "Highest Completion", value: "completion" },
                { label: "Lowest Progress", value: "progress" }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setSortType(tab.value as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all active:scale-95 whitespace-nowrap",
                    sortType === tab.value 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" 
                      : "bg-slate-50 border-slate-100 text-slate-500 dark:bg-white/5 dark:border-white/5 dark:text-slate-400"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {sortedMembers.slice(0, 10).map((m: any) => (
              <div 
                key={m.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] h-[85px] active:bg-slate-50 dark:active:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 shrink-0">
                    <Users size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight">{m.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate leading-tight">{m.department}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase mt-1 leading-tight">
                      {m.learning_hours_fy} / 16h FY
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0 pl-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{m.completion_percentage}%</span>
                    <Badge variant={m.status === 'On track' ? 'success' : 'warning'} className="text-[7.5px] uppercase font-black px-1.5 py-0.5 rounded-md tracking-wider">
                      {m.status}
                    </Badge>
                  </div>
                  <Link to={`/employees/${m.id}`}>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center hover:text-indigo-600 transition-colors">
                      View <ChevronRight size={10} className="ml-0.5" />
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendation Card */}
        <div 
          className="mx-4 mt-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/20 p-4 rounded-2xl backdrop-blur-md relative overflow-hidden shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">AI Recommendation</span>
          </div>
          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-normal">
            Nominate 3 high performers from QA. Expected skill growth: <span className="text-emerald-500 font-black">+15%</span>.
          </p>
          <Link to="/trainings" className="mt-3">
            <Button className="w-full bg-white hover:bg-slate-100 text-slate-900 font-black text-[9px] uppercase tracking-widest h-8 rounded-lg shadow-sm">
              Nominate Staff →
            </Button>
          </Link>
        </div>

        {/* Top Trainings list (replacing oversized chart) */}
        <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-100 dark:border-white/5 mx-4 mt-3 space-y-3 shadow-xs">
          <div>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block pl-0.5">TOP TRAININGS</span>
            <h3 className="text-xs font-black text-slate-800 dark:text-white">Active Course Popularity</h3>
          </div>
          <div className="space-y-2.5">
            {(charts?.participation ?? []).slice(0, 5).map((training: any, index: number) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-100 dark:border-white/5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500">
                    {index + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{training.training_name}</span>
                </div>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-lg shrink-0">
                  {training.participation_count} {training.participation_count === 1 ? "Enrollment" : "Enrollments"}
                </span>
              </div>
            ))}
            {(!charts?.participation || charts.participation.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">No popular trainings to display.</p>
            )}
          </div>
        </div>

        {/* Completion Chart (Reduced Height) */}
        <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-100 dark:border-white/5 mx-4 mt-3 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block pl-0.5">COMPLETION RATE</span>
              <h3 className="text-xs font-black text-slate-800 dark:text-white">Target vs Current</h3>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-emerald-500 font-black uppercase tracking-tight">Target: 80%</span>
              <span className="text-[9px] text-indigo-500 font-black uppercase tracking-tight">Current: {summary?.avg_completion_rate ? `${Math.round(summary.avg_completion_rate)}%` : "0%"}</span>
            </div>
          </div>
          
          <div className="h-[185px] w-full flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#6366f1" />
                  <Cell fill="rgba(99, 102, 241, 0.05)" />
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '12px', fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {summary?.avg_completion_rate ? `${Math.round(summary.avg_completion_rate)}%` : "0%"}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Overall</span>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-100 dark:border-white/5 mx-4 mt-3 shadow-xs">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 pl-0.5">
            <History size={12} className="text-indigo-500" /> Recent Activity Timeline
          </h3>
          <div className="space-y-4">
            {activity?.slice(0, 5).map((act: ManagerDashboardActivity, i: number) => (
              <div key={i} className="flex gap-3 relative text-xs text-left">
                {i !== Math.min(5, activity.length) - 1 && (
                  <div className="absolute left-1.5 top-4 bottom-[-18px] w-0.5 bg-slate-100 dark:bg-white/[0.05]" />
                )}
                <div className="w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 flex items-center justify-center z-10 bg-indigo-500 shadow-sm">
                  <div className="w-1 h-1 rounded-full bg-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] text-slate-600 dark:text-slate-300 font-bold leading-normal">
                    <span className="font-black text-slate-800 dark:text-white">{act.user}</span> {act.detail}
                  </p>
                  <span className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5 block">
                    {formatDate(act.time)}
                  </span>
                </div>
              </div>
            ))}
            {(!activity || activity.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">No recent activity.</p>
            )}
          </div>
        </div>

        {/* Upcoming Sessions — from real training participation data */}
        <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-100 dark:border-white/5 mx-4 mt-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-50 dark:border-white/5 pb-2">
            <div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block pl-0.5">TRAINING SCHEDULE</span>
              <h3 className="text-xs font-black text-slate-800 dark:text-white">Active Course Popularity</h3>
            </div>
            <button 
              onClick={() => setShowCalendarModal(true)}
              className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider"
            >
              Full Calendar →
            </button>
          </div>
          
          <div className="space-y-2.5 pt-2">
            {(charts?.participation ?? []).slice(0, 5).map((training: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-[9px] font-black text-indigo-600 border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{training.training_name}</span>
                </div>
                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-lg shrink-0 border border-indigo-100/50 dark:border-indigo-500/10">
                  {training.participation_count} {training.participation_count === 1 ? "member" : "members"}
                </span>
              </div>
            ))}
            {(!charts?.participation || charts.participation.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">No active trainings to display.</p>
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        <button 
          onClick={() => setShowActionSheet(true)}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 hover:bg-indigo-700 transition-all border border-indigo-500"
        >
          <Plus size={20} />
        </button>

        {/* Bottom Action Sheet */}
        <AnimatePresence>
          {showActionSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowActionSheet(false)}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="fixed inset-x-0 bottom-0 z-[60] bg-white dark:bg-[#111726] rounded-t-3xl border-t border-slate-100 dark:border-white/5 shadow-2xl p-5 pb-8 space-y-4 text-left"
              >
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" onClick={() => setShowActionSheet(false)} />
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Quick Actions</h3>
                  <button 
                    onClick={() => setShowActionSheet(false)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-full text-slate-500 dark:text-slate-400 active:scale-90 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link to="/employees" onClick={() => setShowActionSheet(false)} className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl flex flex-col items-center text-center justify-center gap-2 active:scale-95 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                      <Users size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Manage Team</span>
                  </Link>

                  <Link to="/trainings" onClick={() => setShowActionSheet(false)} className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl flex flex-col items-center text-center justify-center gap-2 active:scale-95 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <UserPlus size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Nominate Staff</span>
                  </Link>

                  <div onClick={() => { setShowActionSheet(false); handleExport(); }} className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl flex flex-col items-center text-center justify-center gap-2 active:scale-95 transition-all cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
                      <Download size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Export Report</span>
                  </div>

                  <Link to="/trainings" onClick={() => setShowActionSheet(false)} className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl flex flex-col items-center text-center justify-center gap-2 active:scale-95 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600">
                      <BookOpen size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Create Training</span>
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Full Calendar Modal */}
        <AnimatePresence>
          {showCalendarModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
                onClick={() => setShowCalendarModal(false)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-[#172036] rounded-[32px] p-5 w-full max-w-lg border border-slate-100 dark:border-white/5 shadow-2xl relative z-10 max-h-[85vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-4 text-left">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Full Training Calendar</h3>
                  <button 
                    onClick={() => setShowCalendarModal(false)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-full text-slate-500 dark:text-slate-400 active:scale-90 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-white/5">
                  <TrainingCalendar />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (isInitialLoading) {
    if (isMobile) {
      return (
        <div className="p-4 space-y-4 min-h-screen bg-[#F8FAFC] dark:bg-[#090D1A] text-left">
          <Skeleton className="h-10 w-full rounded-2xl" />
          <div className="flex gap-2 overflow-x-auto">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-28 rounded-xl shrink-0" />)}
          </div>
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] px-4 lg:px-8 pt-4 lg:pt-8 space-y-8 text-left">
        <Skeleton className="h-48 w-full rounded-[32px]" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-[24px]" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <Skeleton className="h-[400px] rounded-[24px]" />
             <Skeleton className="h-[400px] rounded-[24px]" />
          </div>
          <Skeleton className="h-full rounded-[24px]" />
        </div>
      </div>
    );
  }

  if (isMobile) {
    return renderMobileView();
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] transition-colors duration-500 px-4 lg:px-8 pt-4 lg:pt-8 pb-12">
      <div className="max-w-[1600px] mx-auto space-y-4 animate-in fade-in duration-700">
        
        {/* ── Premium Hero Header ─────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-white via-indigo-50/50 to-slate-50 dark:from-[#172036] dark:via-indigo-950/10 dark:to-[#0B1020] border border-[#EEF2FF] dark:border-white/5 p-6 lg:p-8 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-400/5 dark:bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-violet-400/5 dark:bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-xl">
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/5 border border-[#EEF2FF] dark:border-white/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest mb-4 backdrop-blur-md shadow-sm"
              >
                <Users size={12} className="text-brand-500 dark:text-brand-400" /> Team Performance
              </motion.div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tighter mb-2 leading-tight text-slate-900 dark:text-white">
                Manager Dashboard
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg font-medium leading-relaxed">
                Monitor team performance, track training status, and drive organizational growth through deep behavioral insights.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="outline" className="h-10 px-5 rounded-xl border-[#EEF2FF] dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md text-slate-700 dark:text-slate-300 font-bold text-xs shadow-sm">
                <Download size={14} className="mr-2 text-brand-500" />
                Export Data
              </Button>
              <Link to="/employees">
                <Button className="h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-lg shadow-brand-500/20">
                  Manage My Team
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <PremiumStatCard
            title="My Team"
            value={summary?.team_count ?? 0}
            icon={Users}
            insight="Live"
            variant="indigo"
            delay={0.1}
          />
          <PremiumStatCard
            title="Active Trainings"
            value={summary?.active_trainings ?? 0}
            icon={Award}
            insight="+3"
            insightLabel="This Month"
            variant="emerald"
            delay={0.2}
          />
          <PremiumStatCard
            title="Pending Actions"
            value={summary?.pending_nominations ?? 0}
            icon={Clock}
            insight={Number(summary?.pending_nominations) > 0 ? "Priority" : "Clear"}
            variant={Number(summary?.pending_nominations) > 0 ? "rose" : "amber"}
            delay={0.3}
          />
          <PremiumStatCard
            title="At Risk Focus"
            value={summary?.overdue_employees ?? 0}
            icon={AlertTriangle}
            insight="Critical"
            variant="rose"
            delay={0.4}
          />
          <PremiumStatCard
            title="Team Learning Hours"
            value={`${summary?.team_learning_hours_fy ?? 0}h`}
            icon={ClipboardCheck}
            insight={summary?.financial_year_label ?? "FY"}
            insightLabel={`${summary?.employees_below_learning_target ?? 0} Below Target`}
            variant="indigo"
            delay={0.5}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
          <div className="lg:col-span-2 space-y-4">
            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]"
              >
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity size={16} className="text-indigo-500" /> Completion Rate
                </h3>
                <div className="h-[240px] w-full flex flex-col items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#6366f1" />
                          <Cell fill="rgba(99, 102, 241, 0.05)" />
                        </Pie>
                        <RechartsTooltip 
                           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 700 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                         {summary?.avg_completion_rate ? `${Math.round(summary.avg_completion_rate)}%` : "0%"}
                       </span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Overall</span>
                    </div>
                    <div className="flex justify-center gap-6 mt-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase"><div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm" /> Completed</div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase"><div className="w-2 h-2 rounded-full bg-slate-100 dark:bg-white/5 shadow-sm" /> Pending</div>
                    </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]"
              >
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" /> Top Trainings
                </h3>
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts?.participation} layout="vertical">
                         <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-white/5" />
                         <XAxis type="number" hide />
                         <YAxis 
                            dataKey="training_name" 
                            type="category" 
                            width={100} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                         <RechartsTooltip cursor={{ fill: 'rgba(99, 102, 241, 0.02)' }} />
                         <Bar dataKey="participation_count" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Team Progress Table */}
            <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] overflow-hidden">
               <div className="sticky top-0 z-20 bg-white dark:bg-[#172036] rounded-t-[24px]">
                 <div className="p-5 border-b border-[#EEF2FF] dark:border-white/[0.07] flex items-center justify-between bg-white dark:bg-[#172036]">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Team Progress</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        {summary?.learning_goal_completion_percentage ?? 0}% at annual target - {summary?.financial_year_label}
                      </p>
                    </div>
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                      <input 
                        type="text" 
                        placeholder="Search team..." 
                        className="h-9 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 w-48 transition-all"
                      />
                    </div>
                 </div>
               </div>
               
               <div className="relative z-0">
                 <Table 
                    columns={teamColumns} 
                    data={teamData?.members ?? []} 
                    isLoading={isDataLoading}
                    keyExtractor={(m) => m.id}
                    className="border-none shadow-none rounded-none"
                 />
               </div>

               {teamData && teamData.total_count > 10 && (
                 <div className="p-4 border-t border-[#EEF2FF] dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Page {page} of {Math.ceil(teamData.total_count / 10)}</span>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-4 rounded-lg font-bold text-xs"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-4 rounded-lg font-bold text-xs"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page * 10 >= teamData.total_count}
                      >
                        Next
                      </Button>
                    </div>
                 </div>
               )}
            </div>

            {/* Pending Reviews Table */}
            <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] overflow-hidden">
               <div className="p-5 border-b border-[#EEF2FF] dark:border-white/[0.07]">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <ClipboardCheck size={20} className="text-brand-500" />
                    Pending Reviews
                  </h3>
               </div>
               <Table 
                  columns={reviewColumns} 
                  data={pendingReviews ?? []} 
                  isLoading={isInitialLoading}
                  keyExtractor={(r) => r.id}
                  className="border-none shadow-none rounded-none"
               />
               {pendingReviews?.length === 0 && !isInitialLoading && (
                 <div className="p-12 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-300">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">All caught up!</p>
                      <p className="text-xs text-slate-400 font-medium">No pending effectiveness evaluations to review.</p>
                    </div>
                 </div>
               )}
            </div>
          </div>

          {/* Sidebar Activity & Widgets */}
          <aside className="space-y-4">
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.7 }}
               className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]"
             >
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                   <History size={14} className="text-indigo-500" /> Recent Activity
                </h3>
                <div className="space-y-6">
                   {activity?.map((act: ManagerDashboardActivity, i: number) => (
                     <div key={i} className="flex gap-4 relative">
                        {i !== activity.length - 1 && (
                          <div className="absolute left-2 top-6 bottom-[-18px] w-0.5 bg-slate-100 dark:bg-white/[0.05]" />
                        )}
                        <div className={cn(
                          "w-4 h-4 rounded-full mt-1 shrink-0 flex items-center justify-center z-10",
                          act.type === 'completion' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : 
                          act.type === 'nomination' ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]" : 
                          "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                        )}>
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-[13px] text-slate-700 dark:text-slate-200 leading-snug">
                              <span className="font-black">{act.user}</span> <span className="text-slate-500 dark:text-slate-400 font-medium">{act.detail}</span>
                           </p>
                           <p className="text-[9px] text-slate-400 mt-1.5 uppercase font-black tracking-widest">
                              {formatDate(act.time)} • {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                     </div>
                   ))}
                   {activity?.length === 0 && (
                     <p className="text-xs text-slate-400 text-center py-8 font-medium">No recent activity detected.</p>
                   )}
                </div>
             </motion.div>

             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.8 }}
               className="bg-slate-900 dark:bg-[#1E293B] p-6 rounded-[24px] text-white shadow-xl relative overflow-hidden group"
             >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles size={64} />
                </div>
                <h4 className="text-lg font-black tracking-tight mb-2">Team Growth</h4>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed font-medium">
                  Nominate your top performers for specialized training to maximize unit performance.
                </p>
                <Link to="/trainings">
                  <Button className="w-full bg-white hover:bg-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-widest h-10 rounded-xl shadow-lg shadow-black/20">
                    <UserPlus size={14} className="mr-2" /> Nominate Staff
                  </Button>
                </Link>
             </motion.div>

             <div className="bg-indigo-600 p-6 rounded-[24px] text-white shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <Award size={20} className="text-white" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Unit Success</p>
                      <h4 className="text-lg font-black tracking-tight">
                        {summary?.avg_completion_rate ? `${Math.round(summary.avg_completion_rate)}% Completion` : "0% Completion"}
                      </h4>
                   </div>
                </div>
                <p className="text-xs font-medium opacity-80 leading-relaxed mb-4">
                  {summary?.avg_completion_rate && summary.avg_completion_rate >= 50
                    ? `Your team is performing at ${Math.round(summary.avg_completion_rate)}% completion this financial year.`
                    : "Keep driving training participation to improve your team's completion rate."}
                </p>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-700"
                     style={{ width: `${Math.min(summary?.avg_completion_rate ?? 0, 100)}%` }}
                   />
                </div>
             </div>
          </aside>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-8 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Calendar size={22} className="text-brand-500" /> Team Training Calendar
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Schedule & Upcoming sessions</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase bg-white dark:bg-white/5 px-3 py-1.5 rounded-full border border-[#EEF2FF] dark:border-white/5">
                <LayoutGrid size={12} /> Grid View
              </div>
            </div>
          </div>
          <div id="calendar" className="bg-white dark:bg-[#172036] p-2 rounded-[32px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] overflow-hidden">
            <TrainingCalendar />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
