import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Clock, CheckCircle2, AlertCircle, Calendar, 
  Search, BookOpen, BarChart3, PieChart as PieIcon, 
  RefreshCw, CalendarDays, Award, HelpCircle
} from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { attendanceService } from "@/services/attendance.service";
import { analyticsService } from "@/services/analytics.service";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import DesktopAdminAttendanceWrapper from "./DesktopAdminAttendanceWrapper";
import MobileAdminAttendancePage from "./MobileAdminAttendancePage";

// ── Status Badging & Custom Mapping ───────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { cls: string; label: string; Icon: any }> = {
    PRESENT: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Present", Icon: CheckCircle2 },
    LATE:    { cls: "bg-amber-500/10 text-amber-600 border-amber-500/20",   label: "Late",    Icon: Clock },
    ABSENT:  { cls: "bg-rose-500/10 text-rose-600 border-rose-500/20",     label: "Absent",  Icon: AlertCircle },
    PARTIAL: { cls: "bg-purple-500/10 text-purple-600 border-purple-500/20", label: "Excused", Icon: HelpCircle },
  };
  const { cls, label, Icon } = cfg[status] ?? { cls: "bg-slate-500/10 text-slate-600 border-slate-500/20", label: status, Icon: HelpCircle };
  return (
    <Badge className={cn("px-2.5 py-1 rounded-lg border font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit shadow-sm", cls)}>
      <Icon size={12} /> {label}
    </Badge>
  );
};

// ── Local Stats KPI Cards ─────────────────────────────────────────────────────

const StatsCard = ({ title, value, subtitle, icon: Icon, color = "brand", delay = 0 }: any) => {
  const themes: Record<string, string> = {
    brand: "text-brand-600 bg-brand-50 border-brand-100 dark:bg-brand-500/10 dark:border-brand-500/20",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    amber: "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20",
    rose: "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20",
    purple: "text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-500/10 dark:border-purple-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-white dark:bg-[#172036] p-5 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group"
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105", themes[color])}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">{title}</span>
        <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{value}</h4>
        {subtitle && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-tighter truncate">{subtitle}</span>}
      </div>
    </motion.div>
  );
};

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth });
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

export default function AttendancePage() {
  const { user } = useAuthStore();

  const userRole = (user?.role as any)?.name?.toLowerCase() || (user?.role as any)?.toLowerCase() || "employee";
  const isManager = userRole.includes("manager") || userRole.includes("admin");

  const { width } = useWindowSize();
  const isMobile = width < 1024;

  // ── Local States ───────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewTab, setViewTab] = useState<"timeline" | "logs">("timeline");
  const [dateSearch, setDateSearch] = useState("");
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState(false);

  // ── Employee-specific queries ──────────────────────────────────────────────
  const { data: history, isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["attendance-history-me"],
    queryFn: () => attendanceService.getMyAttendance().then(r => r.data),
    enabled: !isManager,
  });

  const { data: analytics, isLoading: loadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["attendance-analytics-employee", user?.employee?.id],
    queryFn: () => attendanceService.getAnalytics({ employee_id: user?.employee?.id }).then(r => r.data),
    enabled: !isManager,
  });

  const { data: dashboardData, refetch: refetchDashboard } = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: () => analyticsService.getEmployeeDashboard(),
    select: (res) => res.data.data,
    enabled: !isManager,
    staleTime: 60_000,
  });

  const learningGoal = dashboardData?.annual_learning_goal;
  const goalPct = Math.min(learningGoal?.progress_percentage ?? 0, 100);

  const handleRefresh = async () => {
    toast.promise(
      Promise.all([refetchHistory(), refetchAnalytics(), refetchDashboard()]),
      {
        loading: "Refreshing records...",
        success: "Attendance records up to date!",
        error: "Failed to refresh attendance data.",
      }
    );
  };

  // ── Filter Log List ────────────────────────────────────────────────────────
  const filteredHistory = (history as any[])?.filter((row) => {
    const matchesSearch = row.training_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;
    
    // Date string matching (e.g. searching '18 May' or '2026')
    const formattedDate = row.marked_at ? format(new Date(row.marked_at), "dd MMM yyyy hh:mm a").toLowerCase() : "pending";
    const matchesDate = !dateSearch || formattedDate.includes(dateSearch.toLowerCase());

    return matchesSearch && matchesStatus && matchesDate;
  }) || [];

  if (isManager) {
    if (isMobile) {
      return <MobileAdminAttendancePage />;
    }
    return <DesktopAdminAttendanceWrapper />;
  }

  // ── Employee Dashboard Layout ──────────────────────────────────────────────
  const chartColors = ["#10b981", "#f59e0b", "#f43f5e", "#a855f7"];

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] px-4 lg:px-8 pt-4 lg:pt-8 pb-12 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* ── Glassmorphic Hero ── */}
        <div className="hidden md:block relative overflow-hidden rounded-[32px] bg-gradient-to-br from-white via-indigo-50/50 to-slate-50 dark:from-[#172036] dark:via-indigo-950/10 dark:to-[#0B1020] border border-[#EEF2FF] dark:border-white/5 p-6 lg:p-8 shadow-sm">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-400/5 dark:bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-xl space-y-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/5 border border-[#EEF2FF] dark:border-white/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                <Award size={12} className="text-indigo-500" /> Attendance Ledger
              </div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
                My Attendance History
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-lg leading-relaxed">
                Review your historical training attendance records, checked status, and performance analytics. All attendance is securely recorded via Admin-authorized coordinator sessions.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-[#EEF2FF] dark:border-white/10 flex flex-col items-center min-w-[130px] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ratio</span>
                <span className="text-3xl font-black text-slate-900 dark:text-white">{analytics?.attendance_percentage || 0}%</span>
              </div>
              <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-[#EEF2FF] dark:border-white/10 flex flex-col items-center min-w-[130px] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Missed</span>
                <span className="text-3xl font-black text-rose-500">{analytics?.absent_count || 0}</span>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleRefresh}
                className="w-12 h-12 rounded-2xl border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <RefreshCw size={18} className="text-slate-500" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Mobile Compact Summary Card ── */}
        <div className="block md:hidden bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-[#1e293b] dark:to-[#0f172a] rounded-2xl p-4 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-indigo-200" />
              <h1 className="text-lg font-black tracking-tight">My Attendance</h1>
            </div>
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-transform"
            >
              <RefreshCw size={14} className="text-white" />
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center bg-white/10 dark:bg-white/5 rounded-xl p-3">
            <div>
              <span className="text-[9px] font-black uppercase text-indigo-200 tracking-wider block">Ratio</span>
              <span className="text-lg font-black">{analytics?.attendance_percentage || 0}%</span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-indigo-200 tracking-wider block">Present</span>
              <span className="text-lg font-black">{analytics?.present_count || 0}</span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-indigo-200 tracking-wider block">Missed</span>
              <span className="text-lg font-black text-rose-200">{analytics?.absent_count || 0}</span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-indigo-200 tracking-wider block">Learning</span>
              <span className="text-lg font-black">{learningGoal?.completed_hours || 0}h</span>
            </div>
          </div>
        </div>

        {/* ── KPI Widgets Grid ── */}
        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard 
            title="Total Registered" 
            value={analytics?.total_records || 0} 
            subtitle="Training programs enrolled" 
            icon={BookOpen} 
            color="brand" 
            delay={0.05} 
          />
          <StatsCard 
            title="Present Sessions" 
            value={analytics?.present_count || 0} 
            subtitle="Arrived on schedule" 
            icon={CheckCircle2} 
            color="emerald" 
            delay={0.1} 
          />
          <StatsCard 
            title="Late Check-Ins" 
            value={analytics?.late_count || 0} 
            subtitle="Verified late arrivals" 
            icon={Clock} 
            color="amber" 
            delay={0.15} 
          />
          <StatsCard 
            title="Absent/Missed" 
            value={analytics?.absent_count || 0} 
            subtitle="No check-in record" 
            icon={AlertCircle} 
            color="rose" 
            delay={0.2} 
          />
          <StatsCard 
            title="Excused/Other" 
            value={analytics?.partial_count || 0} 
            subtitle="Approved exemptions" 
            icon={HelpCircle} 
            color="purple" 
            delay={0.25} 
          />
        </div>

        {/* ── Mobile KPI Chips & Learning Contribution ── */}
        <div className="block md:hidden space-y-3">
          {/* Mobile Stats Horizontal Chip Row */}
          <div className="overflow-x-auto scrollbar-none">
            <div className="flex gap-2 pb-1 pr-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#172036] border border-slate-100 dark:border-white/5 shadow-sm shrink-0">
                <BookOpen size={12} className="text-indigo-500" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Total:</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{analytics?.total_records || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#172036] border border-slate-100 dark:border-white/5 shadow-sm shrink-0">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Present:</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{analytics?.present_count || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#172036] border border-slate-100 dark:border-white/5 shadow-sm shrink-0">
                <Clock size={12} className="text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Late:</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{analytics?.late_count || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#172036] border border-slate-100 dark:border-white/5 shadow-sm shrink-0">
                <AlertCircle size={12} className="text-rose-500" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Absent:</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{analytics?.absent_count || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#172036] border border-slate-100 dark:border-white/5 shadow-sm shrink-0">
                <HelpCircle size={12} className="text-purple-500" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Excused:</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{analytics?.partial_count || 0}</span>
              </div>
            </div>
          </div>

          {/* Compact Learning Contribution Card */}
          <div className="bg-white dark:bg-[#172036] rounded-2xl p-4 border border-slate-100 dark:border-white/5 shadow-sm space-y-3">
            <div className="flex items-center gap-1.5">
              <BookOpen size={16} className="text-indigo-500" />
              <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-tight uppercase">Learning Contribution</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                <span>Annual Goal Progress</span>
                <span className="text-indigo-600 dark:text-brand-400 font-black">{learningGoal?.completed_hours || 0}h / {learningGoal?.goal_hours || 16}h ({goalPct}%)</span>
              </div>
              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase pt-1">
                <span>Completed: <strong>{learningGoal?.completed_hours || 0}h</strong></span>
                <span>Remaining: <strong className="text-indigo-600 dark:text-brand-400">{learningGoal?.remaining_hours || 16}h</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Double Column Details & Analytics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column (8/12): History Records and Timelines */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm overflow-hidden">
              
              {/* Table Header & Tabs */}
              <div className="p-6 border-b border-[#EEF2FF] dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 id="5c6j4q" className="text-lg font-black text-slate-900 dark:text-white tracking-tight">My Attendance History</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Verified roster sync entries</p>
                </div>
                
                <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit shrink-0">
                  <button 
                    onClick={() => setViewTab("timeline")}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      viewTab === "timeline" ? "bg-white dark:bg-[#0b1020] text-indigo-500 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    )}
                  >
                    Timeline View
                  </button>
                  <button 
                    onClick={() => setViewTab("logs")}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      viewTab === "logs" ? "bg-white dark:bg-[#0b1020] text-indigo-500 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    )}
                  >
                    Detailed Log
                  </button>
                </div>
              </div>

              {/* Filtering Suite */}
              <div className="hidden md:flex p-5 bg-slate-50/50 dark:bg-white/[0.01] border-b border-[#EEF2FF] dark:border-white/5 flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <Input 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search training name..."
                    className="h-9 pl-9 rounded-xl bg-white dark:bg-white/5 text-xs font-bold border-slate-200 dark:border-white/10"
                  />
                </div>
                <div className="relative min-w-[150px]">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <Input 
                    value={dateSearch}
                    onChange={(e) => setDateSearch(e.target.value)}
                    placeholder="Search by date (e.g. May)..."
                    className="h-9 pl-9 rounded-xl bg-white dark:bg-white/5 text-xs font-bold border-slate-200 dark:border-white/10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-white dark:bg-white/5 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 outline-none border border-slate-200 dark:border-white/10"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="ABSENT">Absent</option>
                  <option value="PARTIAL">Excused</option>
                </select>
                <Badge variant="outline" className="h-9 rounded-xl border-slate-200 dark:border-white/10 px-3 flex items-center font-bold text-[10px] uppercase text-slate-400 tracking-widest">
                  {filteredHistory.length} Matches
                </Badge>
              </div>

              {/* Mobile Filtering Suite */}
              <div className="block md:hidden p-4 border-b border-slate-100 dark:border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <Input 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search training..."
                      className="h-8 pl-8 rounded-xl bg-white dark:bg-white/5 text-[11px] border-slate-200 dark:border-white/10"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsMobileFiltersExpanded(!isMobileFiltersExpanded)}
                    className="h-8 px-2.5 rounded-xl border-slate-200 dark:border-white/10 flex items-center gap-1 text-[10px] font-bold text-slate-500"
                  >
                    <Calendar size={12} />
                    <span>Date</span>
                  </Button>
                </div>

                {isMobileFiltersExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="bg-slate-50/50 dark:bg-white/[0.01] p-3 rounded-xl border border-slate-100 dark:border-white/5 space-y-2"
                  >
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Search by Date</label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <Input 
                          value={dateSearch}
                          onChange={(e) => setDateSearch(e.target.value)}
                          placeholder="e.g. May, 2026..."
                          className="h-8 pl-8 rounded-lg bg-white dark:bg-white/5 text-xs border-slate-200 dark:border-white/10"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="overflow-x-auto scrollbar-none">
                  <div className="flex gap-1.5 pb-1">
                    {[
                      { value: "ALL", label: "All" },
                      { value: "PRESENT", label: "Present" },
                      { value: "ABSENT", label: "Absent" },
                      { value: "LATE", label: "Late" },
                      { value: "PARTIAL", label: "Excused" }
                    ].map(chip => {
                      const isActive = statusFilter === chip.value;
                      return (
                        <button
                          key={chip.value}
                          onClick={() => setStatusFilter(chip.value)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold border transition-all shrink-0",
                            isActive 
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white dark:bg-[#172036] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:bg-slate-50"
                          )}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Data Representation Tabs */}
              <div className="p-6">
                {loadingHistory ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="py-12 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                      <HelpCircle size={28} />
                    </div>
                    <h4 className="text-slate-900 dark:text-white font-black tracking-tight">No attendance matches found</h4>
                    <p className="text-slate-400 text-xs font-medium mt-1 max-w-xs">Refine your search tags or verify with your coordinator.</p>
                  </div>
                ) : viewTab === "timeline" ? (
                  /* Timeline presentation card */
                  <>
                    {/* Desktop Timeline */}
                    <div className="hidden md:block relative pl-6 border-l border-slate-100 dark:border-white/5 ml-3 space-y-6">
                      {filteredHistory.map((row, idx) => (
                        <motion.div
                          key={row.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="relative"
                        >
                          {/* Timeline Node Dot */}
                          <div className={cn(
                            "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-[#172036] flex items-center justify-center shadow-sm",
                            row.status === "PRESENT" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" :
                            row.status === "LATE" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" :
                            row.status === "ABSENT" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" :
                            "bg-purple-500"
                          )} />

                          {/* Timeline Content Block */}
                          <div className="bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100/50 dark:hover:bg-white/[0.04] p-5 rounded-[20px] border border-slate-100 dark:border-white/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-black text-indigo-500 dark:text-brand-400 uppercase tracking-widest block">Roster Marked Session</span>
                              <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{row.training_title}</h4>
                              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                                <span className="flex items-center gap-1"><Calendar size={11} /> {row.marked_at ? format(new Date(row.marked_at), "dd MMM yyyy") : "Pending"}</span>
                                <span className="flex items-center gap-1"><Clock size={11} /> {row.marked_at ? format(new Date(row.marked_at), "hh:mm a") : "—"}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                              <StatusBadge status={row.status} />
                              {row.status === "ABSENT" ? (
                                <span className="text-[9px] font-black text-rose-500 bg-rose-500/5 px-2 py-0.5 rounded uppercase tracking-widest">Missed Session</span>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Roster Verified</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Mobile Timeline */}
                    <div className="block md:hidden relative pl-4 border-l border-slate-100 dark:border-white/5 ml-2 space-y-4">
                      {filteredHistory.map((row, idx) => (
                        <motion.div
                          key={row.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="relative"
                        >
                          {/* Timeline Node Dot */}
                          <div className={cn(
                            "absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#172036] flex items-center justify-center shadow-sm",
                            row.status === "PRESENT" ? "bg-emerald-500" :
                            row.status === "LATE" ? "bg-amber-500" :
                            row.status === "ABSENT" ? "bg-rose-500" :
                            "bg-purple-500"
                          )} />

                          {/* Timeline Content Block */}
                          <div className="bg-slate-50/50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/5 space-y-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-2">{row.training_title}</h4>
                              <div className="shrink-0"><StatusBadge status={row.status} /></div>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase">
                              <span>{row.marked_at ? format(new Date(row.marked_at), "dd MMM yyyy • hh:mm a") : "Pending"}</span>
                              {row.status === "ABSENT" ? (
                                <span className="text-rose-500 bg-rose-500/5 px-1 py-0.5 rounded">Missed</span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">Verified</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : (
                  /* History Log Table View */
                  <>
                    {/* Desktop Detailed Table */}
                    <div className="hidden md:block overflow-x-auto border border-slate-100 dark:border-white/5 rounded-2xl">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Training Curriculum</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {filteredHistory.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-bold text-slate-900 dark:text-white text-sm block">{row.training_title}</span>
                                <span className="text-[9px] text-slate-400 uppercase font-black tracking-tight">Record Ref: #{row.id.substring(0, 8)}</span>
                              </td>
                              <td className="px-6 py-4 text-center flex justify-center items-center">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {row.marked_at ? format(new Date(row.marked_at), "hh:mm a") : "—"}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">
                                    {row.marked_at ? format(new Date(row.marked_at), "dd MMM yyyy") : "Pending"}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Detailed Card List */}
                    <div className="block md:hidden space-y-2">
                      {filteredHistory.map((row) => (
                        <div key={row.id} className="p-3 bg-white dark:bg-[#172036] rounded-xl border border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{row.training_title}</h4>
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-tight block mt-0.5">Ref: #{row.id.substring(0, 8)}</span>
                            <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                              {row.marked_at ? format(new Date(row.marked_at), "dd MMM yyyy • hh:mm a") : "Pending"}
                            </span>
                          </div>
                          <div className="shrink-0">
                            <StatusBadge status={row.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (4/12): Charts and Mini Analytics */}
          <div className={cn("lg:col-span-4 space-y-6", (history?.length ?? 0) < 10 ? "hidden lg:block" : "block")}>
            
            {/* Pie Breakdown */}
            <div className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5"><PieIcon size={12} className="text-indigo-500" /> Completion Ratio</h3>
              {loadingAnalytics ? (
                <div className="h-48 bg-slate-100 dark:bg-white/5 animate-pulse rounded-2xl" />
              ) : (
                <div className="relative h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={analytics?.completion_data || []} 
                        innerRadius={52} 
                        outerRadius={74} 
                        paddingAngle={5} 
                        dataKey="value" 
                        stroke="none"
                      >
                        {(analytics?.completion_data || []).map((_: any, i: number) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11, fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{analytics?.attendance_percentage || 0}%</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Verified</span>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 border-t border-slate-50 dark:border-white/5 pt-4">
                {(analytics?.completion_data || []).map((entry: any, i: number) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartColors[i] }} />
                    {entry.name}: <span className="text-slate-800 dark:text-white font-black">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Trend Bar Chart */}
            <div className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5"><BarChart3 size={12} className="text-indigo-500" /> Session Trend</h3>
              {loadingAnalytics ? (
                <div className="h-44 bg-slate-100 dark:bg-white/5 animate-pulse rounded-2xl" />
              ) : (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.trend_data || []} margin={{ bottom: 0, left: -25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11, fontWeight: 700 }} formatter={(v: any) => [`${v}%`, "Marked"]} />
                      <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={26}>
                        {(analytics?.trend_data || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.rate >= 75 ? "#10b981" : entry.rate >= 50 ? "#f59e0b" : "#f43f5e"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
