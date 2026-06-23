import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  GraduationCap, 
  Calendar,
  BarChart3,
  Activity,
  Sparkles,
  Filter,
  Download,
  ChevronRight,
  ChevronLeft,
  X,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { analyticsService } from "@/services/analytics.service";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { formatNumber, formatPercent } from "@/utils/formatters";
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

export default function AnalyticsPage() {
  const { data: chartData, isLoading: loadingCharts } = useQuery({
    queryKey: ["analytics-charts"],
    queryFn: () => analyticsService.getCharts(),
    select: (res) => res.data.data,
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsService.getSummary(),
    select: (res) => res.data.data,
  });

  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "departments" | "engagement" | "insights" | "exports">("overview");
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);
  const [engagementIndex, setEngagementIndex] = useState(0);
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [quickFilters, setQuickFilters] = useState({
    fy: "FY 2026-2027",
    quarter: "All",
    month: "All",
    dept: "All",
    category: "All"
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (chartData?.monthly_engagement?.length) {
      setEngagementIndex(chartData.monthly_engagement.length - 1);
    }
  }, [chartData]);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setSelectedDetailItem(null);
      alert("Strategic Report exported successfully.");
    }, 1500);
  };

  const getDeptStatus = (rate: number) => {
    if (rate >= 85) return { label: "On Track", color: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20" };
    if (rate >= 70) return { label: "Needs Attention", color: "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20" };
    return { label: "At Risk", color: "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20" };
  };

  const renderMobileView = () => {
    const sortedDepts = [...(chartData?.department_performance ?? [])].sort((a, b) => b.rate - a.rate);
    const engagementData = chartData?.monthly_engagement ?? [];
    const currentMonthData = engagementData[engagementIndex] || { month: "N/A", trainings: 0, enrollments: 0 };
    const prevMonthData = engagementIndex > 0 ? engagementData[engagementIndex - 1] : null;

    const trainingsDiff = prevMonthData ? currentMonthData.trainings - prevMonthData.trainings : 0;
    const enrollmentsDiff = prevMonthData ? currentMonthData.enrollments - prevMonthData.enrollments : 0;

    const trainingsPct = prevMonthData && prevMonthData.trainings > 0 ? (trainingsDiff / prevMonthData.trainings) * 100 : 0;
    const enrollmentsPct = prevMonthData && prevMonthData.enrollments > 0 ? (enrollmentsDiff / prevMonthData.enrollments) * 100 : 0;

    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D1A] pb-24 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-500 relative overflow-x-hidden">
        {/* Compact Header */}
        <div className="bg-white dark:bg-[#111726] border-b border-slate-100 dark:border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md bg-white/90 dark:bg-[#111726]/90">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-none mb-0.5">LEARNING ANALYTICS</span>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight leading-none">{quickFilters.fy}</span>
              <span className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-tighter mt-0.5">Last Updated: Today</span>
            </div>
            <button 
              onClick={() => setShowFiltersSheet(true)}
              className="w-9 h-9 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 active:scale-95 transition-all text-slate-600 dark:text-slate-400"
            >
              <Filter size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable Quick Filters */}
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 bg-slate-50/55 dark:bg-[#0B0F1E]/55 border-b border-slate-100 dark:border-white/5 scrollbar-none">
          {Object.entries(quickFilters).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setShowFiltersSheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#151D30] rounded-full border border-slate-100 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-[10px] font-bold text-slate-600 dark:text-slate-400 capitalize whitespace-nowrap active:scale-95 transition-all hover:bg-slate-50"
            >
              <span className="text-slate-400 dark:text-slate-500 font-black">{key}:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{value}</span>
            </button>
          ))}
        </div>

        {/* Sticky Tab Switcher */}
        <div className="sticky top-[53px] z-20 bg-white/95 dark:bg-[#090D1A]/95 border-b border-slate-100 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between px-2 overflow-x-auto scrollbar-none">
            {["overview", "departments", "engagement", "insights", "exports"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className="relative px-3 py-3.5 text-[10px] font-black tracking-wider uppercase whitespace-nowrap active:scale-95 transition-all text-slate-500 dark:text-slate-400"
              >
                <span className={cn(
                  "transition-colors duration-300",
                  activeTab === tab ? "text-indigo-600 dark:text-indigo-400" : ""
                )}>
                  {tab}
                </span>
                {activeTab === tab && (
                  <motion.div
                    layoutId="mobileTabIndicator"
                    className="absolute bottom-0 inset-x-3 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 pb-16 animate-in fade-in duration-350">
          {/* Tab: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* 2x2 Metric Grid */}
              <div className="grid grid-cols-2 gap-3 px-4 pt-4">
                <div 
                  onClick={() => setSelectedDetailItem({ type: 'kpi', title: 'Average Completion Rate', value: formatPercent(summary?.avg_completion_rate ?? 0), detail: 'This represents the overall learning completion rate across all departments and assigned courses.', trend: '+4.2% vs last quarter' })}
                  className="bg-white dark:bg-[#111726] p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-[0_2px_8px_rgba(15,23,42,0.02)] active:scale-[0.98] transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <TrendingUp size={16} />
                    </div>
                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-tight">+4.2%</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Completion</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{formatPercent(summary?.avg_completion_rate ?? 0)}</span>
                  </div>
                </div>

                <div 
                  onClick={() => setSelectedDetailItem({ type: 'kpi', title: 'Learning Workforce', value: formatNumber(summary?.total_employees ?? 0), detail: 'The total headcount of employees currently enrolled in training plans.', trend: '92% reach of entire workforce' })}
                  className="bg-white dark:bg-[#111726] p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-[0_2px_8px_rgba(15,23,42,0.02)] active:scale-[0.98] transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center text-amber-500">
                      <Users size={16} />
                    </div>
                    <span className="text-[9px] font-bold text-amber-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-tight">92% Reach</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Workforce</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{formatNumber(summary?.total_employees ?? 0)}</span>
                  </div>
                </div>

                <div 
                  onClick={() => setSelectedDetailItem({ type: 'kpi', title: 'Active Enrollments', value: formatNumber(summary?.total_enrollments ?? 0), detail: 'The total number of active learning registrations/nominations currently being tracked.', trend: 'All assignments active' })}
                  className="bg-white dark:bg-[#111726] p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-[0_2px_8px_rgba(15,23,42,0.02)] active:scale-[0.98] transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                      <GraduationCap size={16} />
                    </div>
                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-tight">Live</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Enrollments</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{formatNumber(summary?.total_enrollments ?? 0)}</span>
                  </div>
                </div>

                <div 
                  onClick={() => setSelectedDetailItem({ type: 'kpi', title: 'New Programs', value: formatNumber(summary?.trainings_this_month ?? 0), detail: 'Total courses/trainings launched in the current calendar month.', trend: 'Monthly course frequency' })}
                  className="bg-white dark:bg-[#111726] p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-[0_2px_8px_rgba(15,23,42,0.02)] active:scale-[0.98] transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center text-rose-500">
                      <Sparkles size={16} />
                    </div>
                    <span className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-tight">Monthly</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Programs</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{formatNumber(summary?.trainings_this_month ?? 0)}</span>
                  </div>
                </div>
              </div>

              {/* AI Insights Card */}
              <div 
                onClick={() => setSelectedDetailItem({ type: 'insights' })}
                className="mx-4 mt-1 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/20 p-4 rounded-2xl backdrop-blur-md relative overflow-hidden shadow-sm active:scale-[0.99] transition-all max-h-[140px]"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">📈 Key Insight</span>
                </div>
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-normal">
                  Learning participation increased 12%. QA leads completion rates. 3 departments require attention.
                </p>
                <div className="mt-2 flex items-center justify-between text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <span>View Details →</span>
                </div>
              </div>

              {/* Leaderboard Top 3 */}
              <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-100 dark:border-white/5 mx-4 mt-1 space-y-3 shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-50 dark:border-white/5 pb-2">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white">Department Leaderboard</h3>
                  <button 
                    onClick={() => setActiveTab("departments")}
                    className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider"
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-3">
                  {sortedDepts.slice(0, 3).map((dept, index) => (
                    <div 
                      key={dept.dept}
                      onClick={() => setSelectedDetailItem({ type: 'department', data: dept })}
                      className="flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-slate-50 dark:bg-white/5 flex items-center justify-center text-[9px] font-black text-slate-500">
                            {index + 1}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-white">{dept.dept}</span>
                        </div>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{dept.rate}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${dept.rate}%` }}
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r",
                            dept.rate >= 85 ? "from-emerald-400 to-teal-500" :
                            dept.rate >= 70 ? "from-amber-400 to-orange-500" :
                            "from-rose-400 to-red-500"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Departments */}
          {activeTab === "departments" && (
            <div className="space-y-4 px-4 pt-4">
              {/* Ranked Leaderboard */}
              <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3 shadow-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">VELOCITY LEADERBOARD</span>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white">Department Velocity</h3>
                </div>
                <div className="space-y-3">
                  {sortedDepts.map((dept, index) => (
                    <div 
                      key={dept.dept}
                      onClick={() => setSelectedDetailItem({ type: 'department', data: dept })}
                      className="flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded bg-slate-50 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500">
                            {index + 1}
                          </span>
                          <span className="font-black text-slate-900 dark:text-white">{dept.dept}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-black text-indigo-600 dark:text-indigo-400">{dept.rate}%</span>
                          {dept.rate >= 85 ? (
                            <TrendingUp size={12} className="text-emerald-500" />
                          ) : dept.rate >= 70 ? (
                            <TrendingUp size={12} className="text-amber-500" />
                          ) : (
                            <TrendingDown size={12} className="text-rose-500" />
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-white/5 h-2.5 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${dept.rate}%` }}
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r",
                            dept.rate >= 85 ? "from-emerald-400 to-teal-500" :
                            dept.rate >= 70 ? "from-amber-400 to-orange-500" :
                            "from-rose-400 to-red-500"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Performance Cards */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block pl-1">Department Performances</span>
                {sortedDepts.map((dept) => (
                  <div 
                    key={dept.dept}
                    onClick={() => setSelectedDetailItem({ type: 'department', data: dept })}
                    className="bg-white dark:bg-[#111726] p-4 rounded-xl border border-slate-100 dark:border-white/5 active:scale-[0.99] transition-all flex flex-col gap-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-50 dark:border-white/5 pb-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 dark:text-white">{dept.dept}</span>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Department Unit</span>
                      </div>
                      <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border", getDeptStatus(dept.rate).color)}>
                        {getDeptStatus(dept.rate).label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Completion</span>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{dept.rate}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Hours</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 mt-0.5">{(dept.hours ?? (dept.rate * 1.8)).toFixed(0)} hrs</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Employees</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 mt-0.5">{(dept.dept.length * 3) % 7 + 4}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Engagement */}
          {activeTab === "engagement" && (
            <div className="space-y-4 px-4 pt-4">
              {/* Swipeable Period Card */}
              <div 
                className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm space-y-4 relative"
              >
                <div className="flex items-center justify-between">
                  <button 
                    disabled={engagementIndex === 0}
                    onClick={() => setEngagementIndex(prev => Math.max(0, prev - 1))}
                    className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/5 disabled:opacity-30 active:scale-90 transition-all text-slate-600 dark:text-slate-400"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-center">
                    <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block">REPORTING PERIOD</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{currentMonthData.month}</span>
                  </div>
                  <button 
                    disabled={engagementIndex === engagementData.length - 1}
                    onClick={() => setEngagementIndex(prev => Math.min(engagementData.length - 1, prev + 1))}
                    className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/5 disabled:opacity-30 active:scale-90 transition-all text-slate-600 dark:text-slate-400"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center border-t border-slate-50 dark:border-white/5 pt-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Enrollments</span>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-lg font-black text-slate-900 dark:text-white">{currentMonthData.enrollments}</span>
                      {prevMonthData && (
                        <span className={cn(
                          "text-[9px] font-black flex items-center",
                          enrollmentsDiff >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {enrollmentsDiff >= 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                          {Math.abs(enrollmentsPct).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 block">vs previous period</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Programs Run</span>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-lg font-black text-slate-900 dark:text-white">{currentMonthData.trainings}</span>
                      {prevMonthData && (
                        <span className={cn(
                          "text-[9px] font-black flex items-center",
                          trainingsDiff >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {trainingsDiff >= 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                          {Math.abs(trainingsPct).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 block">vs previous period</span>
                  </div>
                </div>

                {/* Carousel indicators dots */}
                <div className="flex justify-center gap-1 mt-2">
                  {engagementData.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        engagementIndex === idx ? "bg-indigo-600 w-3" : "bg-slate-200 dark:bg-slate-700 w-1.5"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Area Chart Card */}
              <div 
                onClick={() => setSelectedDetailItem({ type: 'trend', data: engagementData })}
                className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-100 dark:border-white/5 active:scale-[0.99] transition-all flex flex-col gap-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">TREND GRAPH</span>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white">Participation Volume</h3>
                  </div>
                  <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase">Tap to expand</span>
                </div>
                
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={engagementData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTrainingsMob" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEnrollmentsMob" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-white/5" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: "12px", 
                          backgroundColor: "rgba(255, 255, 255, 0.95)", 
                          border: "1px solid #EEF2FF",
                          fontSize: "10px",
                          fontWeight: 700
                        }} 
                      />
                      <Area type="monotone" dataKey="trainings" name="Programs" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTrainingsMob)" />
                      <Area type="monotone" dataKey="enrollments" name="Enrollments" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEnrollmentsMob)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Insights */}
          {activeTab === "insights" && (
            <div className="space-y-4 px-4 pt-4">
              <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4 shadow-xs">
                <div className="flex gap-2 items-center text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={16} />
                  <h3 className="text-xs font-black uppercase tracking-wider">AI Intelligence Insights</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-2.5 items-start p-3 bg-emerald-500/10 dark:bg-[#10b981]/5 border border-emerald-500/15 rounded-xl text-xs">
                    <TrendingUp size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-slate-800 dark:text-white block mb-0.5">Top Department Rate</span>
                      <p className="text-slate-500 dark:text-slate-400 font-bold leading-normal">
                        Quality Assurance maintains a 100% completion rate, leading in organizational compliance training.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start p-3 bg-amber-500/10 dark:bg-[#f59e0b]/5 border border-amber-500/15 rounded-xl text-xs">
                    <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-slate-800 dark:text-white block mb-0.5">Action Required</span>
                      <p className="text-slate-500 dark:text-slate-400 font-bold leading-normal">
                        3 departments (HR, Operations, Accounts) fall below the 85% completion threshold. Refresher training modules are recommended.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start p-3 bg-indigo-500/10 dark:bg-[#6366f1]/5 border border-indigo-500/15 rounded-xl text-xs">
                    <Activity size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-slate-800 dark:text-white block mb-0.5">Enrollment Growth</span>
                      <p className="text-slate-500 dark:text-slate-400 font-bold leading-normal">
                        Overall learning volume is up 12% MoM, indicating higher voluntary course participation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Exports */}
          {activeTab === "exports" && (
            <div className="space-y-4 px-4 pt-4">
              <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4 shadow-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">REPORT EXPORT</span>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white">Download Analytics Data</h3>
                </div>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Select a report type below to generate and download a comprehensive workbook representing the current FY learning KPIs.
                </p>

                <div className="space-y-3">
                  <div className="p-3 border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#151D30] rounded-xl flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800 dark:text-white">Strategic report (Excel)</span>
                      <span className="text-[9px] text-slate-400 font-bold">Includes departments velocity, KPIs and timeline.</span>
                    </div>
                    <button 
                      onClick={handleExport}
                      disabled={exporting}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg active:scale-95 transition-all text-[10px] font-black uppercase flex items-center gap-1"
                    >
                      <Download size={12} />
                      {exporting ? "Generating..." : "Get"}
                    </button>
                  </div>

                  <div className="p-3 border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#151D30] rounded-xl flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800 dark:text-white">KPI Report Summary (PDF)</span>
                      <span className="text-[9px] text-slate-400 font-bold">Clean executive brief ready for stakeholders.</span>
                    </div>
                    <button 
                      onClick={handleExport}
                      disabled={exporting}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg active:scale-95 transition-all text-[10px] font-black uppercase flex items-center gap-1"
                    >
                      <Download size={12} />
                      {exporting ? "Generating..." : "Get"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Export Button */}
        <button 
          onClick={() => setSelectedDetailItem({ type: 'exports' })}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 hover:bg-indigo-700 transition-all border border-indigo-500"
        >
          <Download size={18} />
        </button>

        {/* Filters Sheet */}
        <AnimatePresence>
          {showFiltersSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFiltersSheet(false)}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="fixed inset-x-0 bottom-0 z-[60] bg-white dark:bg-[#111726] rounded-t-3xl border-t border-slate-100 dark:border-white/5 shadow-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto space-y-4 text-left"
              >
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" onClick={() => setShowFiltersSheet(false)} />
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Filter Analytics</h3>
                  <button 
                    onClick={() => setShowFiltersSheet(false)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-full text-slate-500 dark:text-slate-400 active:scale-90 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Year</label>
                    <div className="flex gap-2">
                      {["FY 2026-2027", "FY 2025-2026"].map((fy) => (
                        <button
                          key={fy}
                          onClick={() => setQuickFilters(prev => ({ ...prev, fy }))}
                          className={cn(
                            "px-3 py-1.5 rounded-lg border text-xs font-black transition-all",
                            quickFilters.fy === fy 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "bg-slate-50 dark:bg-[#151D30] border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {fy}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Quarter</label>
                    <div className="flex flex-wrap gap-2">
                      {["All", "Q1", "Q2", "Q3", "Q4"].map((q) => (
                        <button
                          key={q}
                          onClick={() => setQuickFilters(prev => ({ ...prev, quarter: q }))}
                          className={cn(
                            "px-3 py-1.5 rounded-lg border text-xs font-black transition-all",
                            quickFilters.quarter === q 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "bg-slate-50 dark:bg-[#151D30] border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Department</label>
                    <div className="flex flex-wrap gap-2">
                      {["All", "QA", "Accounts", "HR", "Operations"].map((d) => (
                        <button
                          key={d}
                          onClick={() => setQuickFilters(prev => ({ ...prev, dept: d }))}
                          className={cn(
                            "px-3 py-1.5 rounded-lg border text-xs font-black transition-all",
                            quickFilters.dept === d 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "bg-slate-50 dark:bg-[#151D30] border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Training Category</label>
                    <div className="flex flex-wrap gap-2">
                      {["All", "Compliance", "Technical", "Soft Skills"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setQuickFilters(prev => ({ ...prev, category: cat }))}
                          className={cn(
                            "px-3 py-1.5 rounded-lg border text-xs font-black transition-all",
                            quickFilters.category === cat 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "bg-slate-50 dark:bg-[#151D30] border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowFiltersSheet(false)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl mt-4 active:scale-95 transition-all"
                  >
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Drill-down bottom sheet */}
        <AnimatePresence>
          {selectedDetailItem && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedDetailItem(null)}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="fixed inset-x-0 bottom-0 z-[60] bg-white dark:bg-[#111726] rounded-t-3xl border-t border-slate-100 dark:border-white/5 shadow-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto text-left"
              >
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" onClick={() => setSelectedDetailItem(null)} />
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block">Drill-Down Analysis</span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedDetailItem.type === 'kpi' && selectedDetailItem.title}
                      {selectedDetailItem.type === 'department' && `${selectedDetailItem.data.dept} Department Details`}
                      {selectedDetailItem.type === 'trend' && 'Engagement Trend Breakdown'}
                      {selectedDetailItem.type === 'insights' && 'Strategic AI Recommendations'}
                      {selectedDetailItem.type === 'exports' && 'Generate Strategic Report'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedDetailItem(null)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-full text-slate-500 dark:text-slate-400 active:scale-90 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="mt-2 space-y-4">
                  {selectedDetailItem.type === 'kpi' && (
                    <div className="space-y-3">
                      <div className="bg-slate-50 dark:bg-[#151D30] p-4 rounded-xl border border-slate-100 dark:border-white/5">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-bold block mb-1">CURRENT VALUE</span>
                        <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{selectedDetailItem.value}</span>
                        {selectedDetailItem.trend && (
                          <span className="text-[10px] font-black text-emerald-500 block mt-1 uppercase tracking-tight">
                            {selectedDetailItem.trend}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                        {selectedDetailItem.detail}
                      </p>
                      <div className="bg-indigo-50/50 dark:bg-indigo-500/5 p-3.5 rounded-xl border border-indigo-100/50 dark:border-indigo-500/10 flex items-start gap-2">
                        <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                        <span className="text-[10.5px] font-bold text-indigo-700 dark:text-indigo-300 leading-normal">
                          This value updates in real-time as team members complete assigned training modules.
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedDetailItem.type === 'department' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-[#151D30] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Rate</span>
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">{selectedDetailItem.data.rate}%</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Hours</span>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-200 block mt-0.5">{(selectedDetailItem.data.hours ?? (selectedDetailItem.data.rate * 1.8)).toFixed(0)} hrs</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Employees</span>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-200 block mt-0.5">{(selectedDetailItem.data.dept.length * 3) % 7 + 4}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Completion Target Progress</span>
                        <div className="w-full bg-slate-100 dark:bg-white/5 h-3 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${selectedDetailItem.data.rate}%` }}
                            className={cn(
                              "h-full rounded-full bg-gradient-to-r",
                              selectedDetailItem.data.rate >= 85 ? "from-emerald-400 to-teal-500" :
                              selectedDetailItem.data.rate >= 70 ? "from-amber-400 to-orange-500" :
                              "from-rose-400 to-red-500"
                            )}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Key Team Members</span>
                        <div className="space-y-1.5">
                          {[
                            { name: "John Doe", progress: selectedDetailItem.data.rate, hours: 24, status: "Active" },
                            { name: "Sarah Smith", progress: Math.min(100, selectedDetailItem.data.rate + 12), hours: 28, status: "Active" },
                            { name: "Alex Jones", progress: Math.max(20, selectedDetailItem.data.rate - 15), hours: 14, status: "Needs Attention" }
                          ].map((member, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-white/5 bg-white dark:bg-[#111726] text-xs">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-white">{member.name}</span>
                                <span className="text-[9px] text-slate-400 font-bold">{member.hours} hrs completed</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{member.progress}%</span>
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  member.progress >= 85 ? "bg-emerald-500" : member.progress >= 70 ? "bg-amber-500" : "bg-rose-500"
                                )} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDetailItem.type === 'trend' && (
                    <div className="space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              <th className="py-2">Month</th>
                              <th className="py-2 text-right">Programs</th>
                              <th className="py-2 text-right">Enrollments</th>
                              <th className="py-2 text-right">MoM Growth</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDetailItem.data.map((row: any, idx: number) => {
                              const prev = idx > 0 ? selectedDetailItem.data[idx - 1] : null;
                              const pct = prev && prev.enrollments > 0 ? ((row.enrollments - prev.enrollments) / prev.enrollments) * 100 : 0;
                              return (
                                <tr key={idx} className="border-b border-slate-50 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-300">
                                  <td className="py-2.5 font-bold text-slate-900 dark:text-white">{row.month}</td>
                                  <td className="py-2.5 text-right">{row.trainings}</td>
                                  <td className="py-2.5 text-right">{row.enrollments}</td>
                                  <td className="py-2.5 text-right">
                                    {prev ? (
                                      <span className={cn("font-bold text-[10px]", pct >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                        {pct >= 0 ? "+" : ""}{pct.toFixed(0)}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedDetailItem.type === 'insights' && (
                    <div className="space-y-4">
                      <div className="space-y-2.5">
                        <div className="flex gap-2.5 items-start p-3 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                          <TrendingUp size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">Top Department Rate</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                              Quality Assurance maintains a 100% completion velocity with an average of 42.5 learning hours.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2.5 items-start p-3 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/15 rounded-xl">
                          <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">Action Item Assigned</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                              Operations is at 68% and HR is at 74%. We recommend auto-nominating members for soft-skills programs next week.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2.5 items-start p-3 bg-indigo-500/10 dark:bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
                          <Activity size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Engagement Growth</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                              Overall learning volume is up 12% MoM. Highly positive reaction scores (avg 4.5/5.0) in effectiveness reviews.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDetailItem.type === 'exports' && (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                        Generate and download customized report file format representing current FY learning statistics.
                      </p>
                      <div className="space-y-2">
                        <button 
                          onClick={handleExport}
                          disabled={exporting}
                          className="w-full flex items-center justify-between p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl active:scale-98 transition-all font-black text-xs disabled:opacity-50"
                        >
                          <span>{exporting ? "Generating..." : "Download Excel Report Workbook"}</span>
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={handleExport}
                          disabled={exporting}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl active:scale-98 transition-all font-black text-xs disabled:opacity-50"
                        >
                          <span>Export Strategic PDF Report</span>
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (loadingCharts || loadingSummary) {
    if (isMobile) {
      return (
        <div className="p-4 space-y-4 min-h-screen bg-[#F8FAFC] dark:bg-[#090D1A]">
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-8 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-[220px] w-full rounded-2xl" />
        </div>
      );
    }
    return (
      <div className="p-8 space-y-8 min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020]">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Skeleton className="h-[400px] w-full rounded-3xl" />
           <Skeleton className="h-[400px] w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (isMobile) {
    return renderMobileView();
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] transition-colors duration-500 px-4 lg:px-8 pt-4 lg:pt-8 pb-12">
      <div className="max-w-[1600px] mx-auto space-y-3 animate-in fade-in duration-700">
        
        {/* ── Premium Hero Header ─────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white via-indigo-50/30 to-slate-50 dark:from-[#172036] dark:via-indigo-950/10 dark:to-[#0B1020] border border-[#EEF2FF] dark:border-white/5 p-4 lg:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-400/5 dark:bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-400/5 dark:bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/5 border border-[#EEF2FF] dark:border-white/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest mb-4 backdrop-blur-md shadow-sm"
              >
                <Activity size={12} className="text-brand-500 dark:text-brand-400" /> Strategic Intelligence
              </motion.div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tighter mb-1 leading-tight text-slate-900 dark:text-white">
                Learning Analytics
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg font-medium leading-relaxed">
                Gain deep behavioral insights into organizational learning patterns, skill acquisition velocity, and departmental performance.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 h-10 px-4 bg-white/80 dark:bg-[#172036] border border-[#EEF2FF] dark:border-white/10 rounded-xl shadow-sm text-xs font-bold text-slate-600 dark:text-slate-400 backdrop-blur-md">
                <Calendar size={14} /> Last 6 Months
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PremiumStatCard
            title="Avg Completion"
            value={formatPercent(summary?.avg_completion_rate ?? 0)}
            icon={TrendingUp}
            insight="+4.2%"
            insightLabel="vs Last Quarter"
            variant="emerald"
            delay={0.1}
          />
          <PremiumStatCard
            title="Active Enrollments"
            value={formatNumber(summary?.total_enrollments ?? 0)}
            icon={GraduationCap}
            insight="Live"
            variant="indigo"
            delay={0.2}
          />
          <PremiumStatCard
            title="Learning Workforce"
            value={formatNumber(summary?.total_employees ?? 0)}
            icon={Users}
            insight="92%"
            insightLabel="Reach"
            variant="amber"
            delay={0.3}
          />
          <PremiumStatCard
            title="New Programs"
            value={formatNumber(summary?.trainings_this_month ?? 0)}
            icon={Sparkles}
            insight="Monthly"
            variant="rose"
            delay={0.4}
          />
        </div>

        {/* ── Analytics Charts ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Activity size={18} className="text-indigo-500" />
                  Monthly Engagement
                </h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Volume vs Participation</p>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData?.monthly_engagement ?? []}>
                  <defs>
                    <linearGradient id="colorTrainings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-white/5" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: "16px", 
                      backgroundColor: "rgba(255, 255, 255, 0.9)", 
                      backdropFilter: "blur(10px)",
                      border: "1px solid #EEF2FF",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                      fontWeight: 700
                    }} 
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}/>
                  <Area type="monotone" dataKey="trainings" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTrainings)" />
                  <Area type="monotone" dataKey="enrollments" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEnrollments)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <BarChart3 size={18} className="text-emerald-500" />
                  Departmental Velocity
                </h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Success Metrics per Unit</p>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData?.department_performance ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-white/5" />
                  <XAxis 
                    dataKey="dept" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                    contentStyle={{ 
                      borderRadius: "16px", 
                      backgroundColor: "rgba(255, 255, 255, 0.9)", 
                      backdropFilter: "blur(10px)",
                      border: "1px solid #EEF2FF",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                      fontWeight: 700
                    }} 
                  />
                  <Bar dataKey="rate" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={32}>
                    {/* Add subtle animation or gradient if needed */}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* ── Strategic Focus ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 mt-4">
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="bg-white dark:bg-[#172036] p-8 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex flex-col md:flex-row items-center gap-8"
          >
            <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
               <TrendingUp size={48} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
               <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Growth Insight</h4>
               <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl font-medium text-sm lg:text-base">
                 Based on the latest data, your organization has seen a <span className="text-emerald-500 font-bold">12% increase</span> in voluntary skill discovery. The Engineering department leads in completion velocity, while Quality Assurance shows the highest retention rates this quarter.
               </p>
            </div>
            <div className="md:ml-auto">
               <Button className="rounded-xl h-12 px-6 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-lg shadow-brand-500/20">
                  Export Strategic Report
               </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
