import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Clock, CheckCircle2, Users, Star, TrendingUp,
  Award, BookOpen, Filter, ChevronUp, ChevronDown,
  FileSpreadsheet, Sparkles, GraduationCap,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { analyticsService } from "@/services/analytics.service";
import { trainingsService } from "@/services/trainings.service";
import { departmentsService } from "@/services/departments.service";
import { employeesService } from "@/services/employees.service";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { cn } from "@/lib/utils";
import {
  CourseParticipationBar, SkillGapBar,
  WorkforceProgressDonut, DeptContributionDonut, TargetVsActualDeptBar,
  RemainingHoursDeptBar, MonthlyTrendActualVsTarget,
} from "./TeamCharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";

// ── Tiny helpers ────────────────────────────────────────────────────────────

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
});

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] p-5",
      className
    )}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">{children}</h2>;
}

const fyStartYear = () => {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

// ── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, icon: Icon, color, delay }: any) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    cyan:   "bg-cyan-50   text-cyan-600",
    violet: "bg-violet-50 text-violet-600",
    emerald:"bg-emerald-50 text-emerald-600",
    amber:  "bg-amber-50  text-amber-600",
  };
  return (
    <motion.div {...fade(delay)} whileHover={{ y:-4, transition:{duration:0.18} }}
      className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
          <Icon size={20}/>
        </div>
        <TrendingUp size={14} className="text-emerald-400"/>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{title}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 font-medium mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Top Learner Card ─────────────────────────────────────────────────────────

function LearnerCard({ learner }: { learner: any }) {
  const rank = learner.rank;
  const medalColors = ["#f59e0b","#94a3b8","#cd7c2f"];
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
        style={{ backgroundColor: rank <= 3 ? medalColors[rank-1]+"22" : "#f1f5f9", color: rank <= 3 ? medalColors[rank-1] : "#94a3b8" }}>
        {rank <= 3 ? <Award size={14}/> : rank}
      </div>
      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
        {learner.avatar_initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{learner.name}</p>
        <p className="text-[11px] text-slate-400">{learner.department}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-indigo-600">{learner.hours}h</p>
        <p className="text-[10px] text-slate-400">{learner.completions} courses</p>
      </div>
    </div>
  );
}

// ── Dept Summary Row ─────────────────────────────────────────────────────────

function DeptRow({ dept }: { dept: any }) {
  return (
    <div className="grid grid-cols-6 gap-2 py-3 border-b border-slate-50 last:border-0 items-center text-sm">
      <p className="col-span-1 font-bold text-slate-800 truncate">{dept.department}</p>
      <p className="col-span-1 text-slate-500 truncate text-xs">{dept.top_learner}</p>
      <p className="col-span-1 font-semibold text-slate-700">{dept.total_hours}h</p>
      <div className="col-span-1 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full" style={{ width:`${dept.completion_pct}%` }}/>
        </div>
        <span className="text-xs text-slate-500 w-8 text-right">{dept.completion_pct}%</span>
      </div>
      <p className="col-span-1 text-center text-xs font-semibold text-cyan-600 bg-cyan-50 rounded-lg px-2 py-1">{dept.active_enrollments}</p>
      <p className="col-span-1 text-center text-xs font-semibold text-amber-600 bg-amber-50 rounded-lg px-2 py-1">{dept.pending_evaluations}</p>
    </div>
  );
}

// ── Employee Table ───────────────────────────────────────────────────────────

type SortKey = "total_hours"|"trainings_completed"|"completion_pct"|"effectiveness_score";

function EmployeeTable({ rows, deptFilter, search }: { rows: any[]; deptFilter: string; search: string }) {
  const [sort, setSort] = useState<SortKey>("total_hours");
  const [dir, setDir] = useState<"asc"|"desc">("desc");

  const toggle = (key: SortKey) => {
    if (sort === key) setDir(d => d === "asc" ? "desc" : "asc");
    else { setSort(key); setDir("desc"); }
  };

  const filtered = useMemo(() => {
    let f = rows;
    if (deptFilter) f = f.filter(r => r.department === deptFilter);
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(r => r.name.toLowerCase().includes(q) || r.department.toLowerCase().includes(q));
    }
    return [...f].sort((a, b) => dir === "desc" ? b[sort] - a[sort] : a[sort] - b[sort]);
  }, [rows, deptFilter, search, sort, dir]);

  const Th = ({ label, col }: { label: string; col: SortKey }) => (
    <th className="py-3 px-4 text-left cursor-pointer select-none" onClick={() => toggle(col)}>
      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
        {sort === col ? (dir === "desc" ? <ChevronDown size={10}/> : <ChevronUp size={10}/>) : null}
      </div>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead className="border-b border-slate-100">
          <tr>
            <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</th>
            <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Dept</th>
            <Th label="Hours" col="total_hours"/>
            <Th label="Completed" col="trainings_completed"/>
            <Th label="Rate %" col="completion_pct"/>
            <Th label="Score" col="effectiveness_score"/>
            <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Last Active</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 20).map((emp) => (
            <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-black shrink-0">
                    {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{emp.name}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-xs text-slate-500">{emp.department}</td>
              <td className="py-3 px-4 text-sm font-bold text-slate-700">{emp.total_hours}h</td>
              <td className="py-3 px-4 text-sm font-bold text-slate-700">{emp.trainings_completed}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width:`${emp.completion_pct}%` }}/>
                  </div>
                  <span className="text-xs text-slate-500">{emp.completion_pct}%</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={cn("text-xs font-bold px-2 py-1 rounded-lg",
                  emp.effectiveness_score >= 80 ? "bg-emerald-50 text-emerald-700" :
                  emp.effectiveness_score >= 50 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"
                )}>
                  {emp.effectiveness_score > 0 ? emp.effectiveness_score : "—"}
                </span>
              </td>
              <td className="py-3 px-4 text-xs text-slate-400">{emp.last_active ?? "—"}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="text-center py-8 text-sm text-slate-400">No employees found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MobileComplianceDonut({ actual, target, pct }: { actual: number; target: number; pct: number }) {
  const chartData = [
    { name: "Completed", value: actual },
    { name: "Remaining", value: Math.max(0, target - actual) },
  ];
  return (
    <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={68}
            paddingAngle={4}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            <Cell fill="#6366f1" />
            <Cell fill="#f1f5f9" className="dark:fill-white/10" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{pct}%</span>
        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1">Compliance</span>
      </div>
    </div>
  );
}

function MobileDeptContributionDonut({ data }: { data: any[] }) {
  const PALETTE = ["#6366f1", "#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#94a3b8"];
  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={68}
              paddingAngle={2}
              dataKey="hours"
              nameKey="department"
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Contribution</span>
        </div>
      </div>
      
      <div className="flex flex-wrap justify-center gap-1.5 mt-3 px-2 w-full">
        {data.map((d, idx) => (
          <div key={d.department} className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-full text-[9px] font-black text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
            <span>{d.department}: {d.hours}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeamAnalyticsPage() {
  const currentFyStart = fyStartYear();

  // Mobile viewport detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [activeTab, setActiveTab] = useState<"overview" | "departments" | "trends" | "employees">("overview");
  const [trendChartType, setTrendChartType] = useState<"engagement" | "participation" | "remaining">("engagement");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Dashboard Filters State
  const [fyFilter, setFyFilter] = useState(`${currentFyStart}-${currentFyStart + 1}`);
  const [qFilter, setQFilter] = useState("All");
  const [mFilter, setMFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [mgrFilter, setMgrFilter] = useState("");
  const [empFilter, setEmpFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [empSearch, setEmpSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  // Dynamic target calculation based on quarter/month filters
  const targetPerEmployee = useMemo(() => {
    if (mFilter) return 1.33;
    if (qFilter && qFilter !== "All") return 4.0;
    return 16.0;
  }, [mFilter, qFilter]);

  // Query team analytics with active filters
  const { data, isLoading } = useQuery({
    queryKey: [
      "team-analytics",
      fyFilter,
      qFilter,
      mFilter,
      deptFilter,
      catFilter,
      typeFilter,
      mgrFilter,
      empFilter,
      startDate,
      endDate
    ],
    queryFn: () =>
      analyticsService.getTeamAnalytics({
        financial_year: fyFilter || undefined,
        quarter: qFilter !== "All" ? qFilter : undefined,
        month: mFilter ? parseInt(mFilter, 10) : undefined,
        department_id: deptFilter || undefined,
        training_category_id: catFilter || undefined,
        training_type: typeFilter || undefined,
        employee_id: empFilter || undefined,
        manager_id: mgrFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
    select: (res) => res.data.data,
  });

  // Query metadata for filter options
  const { data: filterDepartments } = useQuery({
    queryKey: ["team-kpi-export-departments"],
    queryFn: () => departmentsService.list({ page: 1, per_page: 100 }).then(r => r.data.data),
    staleTime: 60_000,
  });
  const { data: filterEmployees } = useQuery({
    queryKey: ["team-kpi-export-employees"],
    queryFn: () => employeesService.list({ page: 1, per_page: 500 }).then(r => r.data.data),
    staleTime: 60_000,
  });
  const { data: filterManagers } = useQuery({
    queryKey: ["team-kpi-export-managers"],
    queryFn: () => employeesService.getManagers().then(r => r.data.data),
    staleTime: 60_000,
  });
  const { data: filterCategories } = useQuery({
    queryKey: ["team-kpi-export-categories"],
    queryFn: () => trainingsService.listCategories().then(r => r.data.data),
    staleTime: 60_000,
  });

  const exportParams = (overrides: Record<string, any> = {}) => ({
    financial_year: fyFilter || undefined,
    month: mFilter || undefined,
    department_id: deptFilter || undefined,
    employee_id: empFilter || undefined,
    manager_id: mgrFilter || undefined,
    training_category_id: catFilter || undefined,
    attendance_status: "PRESENT",
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    ...overrides,
  });

  const handleKpiExport = async (label: string, overrides: Record<string, any> = {}) => {
    setExporting(true);
    try {
      const params = exportParams(overrides);
      const res = await analyticsService.exportTeamKpiReport(params);
      const suffix = label.toLowerCase().replace(/\s+/g, "-");
      downloadBlob(res.data, `learning-kpi-${suffix}-${params.financial_year ?? "all-fy"}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="p-8 space-y-6 bg-[#F7F8FC] min-h-screen">
        <Skeleton className="h-40 rounded-2xl"/>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_,i) => <Skeleton key={i} className="h-28 rounded-2xl"/>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_,i) => <Skeleton key={i} className="h-64 rounded-2xl"/>)}
        </div>
      </div>
    );
  }

  const k = data.kpis;

  if (isMobile) {
    const totalHours = data.dept_learning_hours.reduce((acc: number, curr: any) => acc + curr.hours, 0);
    const sortedDepts = [...data.dept_learning_hours].sort((a, b) => b.hours - a.hours);
    const topDept = sortedDepts[0] || { department: "QA", hours: 0 };
    const topDeptPct = totalHours > 0 ? Math.round((topDept.hours / totalHours) * 100) : 0;

    const mobileDeptData = sortedDepts.length <= 5 ? sortedDepts : [
      ...sortedDepts.slice(0, 5),
      {
        department: "Others",
        hours: sortedDepts.slice(5).reduce((acc, curr) => acc + curr.hours, 0),
        employees: sortedDepts.slice(5).reduce((acc, curr) => acc + curr.employees, 0),
        completion_rate: 0
      }
    ];

    const goalProgressPct = k.total_target_hours > 0 ? Math.min(100, Math.round((k.total_actual_hours / k.total_target_hours) * 100)) : 0;

    const topLearnersList = [...data.employee_table]
      .sort((a, b) => b.total_hours - a.total_hours)
      .slice(0, 5);

    const bottomLearnersList = [...data.employee_table]
      .sort((a, b) => a.total_hours - b.total_hours)
      .slice(0, 5);

    return (
      <div className="bg-[#F7F8FC] dark:bg-[#0B1020] min-h-screen pb-24 text-slate-900 dark:text-white relative">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1020]/95 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 px-4 h-16 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">
              Team Analytics
            </h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-0.5">
              {fyFilter} &bull; Actual: {k.total_actual_hours}h &bull; Compliance: {k.learning_compliance_pct}%
            </p>
          </div>
          
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200 dark:border-white/10 text-slate-500 bg-white dark:bg-[#172036]">
                <Filter size={16} />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[32px] max-h-[85vh] p-6 bg-white dark:bg-[#0B1020] border-t dark:border-white/10 overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-base font-black">Filter Reports</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Financial Year</label>
                  <select value={fyFilter} onChange={e => setFyFilter(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172036] px-3 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none">
                    {[currentFyStart, currentFyStart - 1, currentFyStart - 2, currentFyStart - 3].map(y => <option key={y} value={`${y}-${y + 1}`}>FY {y}-{y + 1}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Quarter</label>
                  <select value={qFilter} onChange={e => setQFilter(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172036] px-3 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none">
                    <option value="All">All Quarters</option>
                    <option value="Q1">Q1 (Apr-Jun)</option>
                    <option value="Q2">Q2 (Jul-Sep)</option>
                    <option value="Q3">Q3 (Oct-Dec)</option>
                    <option value="Q4">Q4 (Jan-Mar)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Month</label>
                  <select value={mFilter} onChange={e => setMFilter(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172036] px-3 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none">
                    <option value="">All Months</option>
                    {[["4","April"],["5","May"],["6","June"],["7","July"],["8","August"],["9","September"],["10","October"],["11","November"],["12","December"],["1","January"],["2","February"],["3","March"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Department</label>
                  <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172036] px-3 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none">
                    <option value="">All Departments</option>
                    {(filterDepartments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Category</label>
                  <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172036] px-3 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none">
                    <option value="">All Categories</option>
                    {(filterCategories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Manager</label>
                  <select value={mgrFilter} onChange={e => setMgrFilter(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172036] px-3 text-xs font-bold text-slate-700 dark:text-slate-355 outline-none">
                    <option value="">All Managers</option>
                    {(filterManagers ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Employee</label>
                  <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172036] px-3 text-xs font-bold text-slate-700 dark:text-slate-355 outline-none">
                    <option value="">All Employees</option>
                    {(filterEmployees ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.employee_code} - {e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172036] px-3 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400">End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172036] px-3 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none" />
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setFyFilter(`${currentFyStart}-${currentFyStart + 1}`);
                      setQFilter("All");
                      setMFilter("");
                      setDeptFilter("");
                      setCatFilter("");
                      setTypeFilter("");
                      setMgrFilter("");
                      setEmpFilter("");
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="flex-1 h-11 rounded-xl font-bold text-xs"
                  >
                    Reset
                  </Button>
                  <SheetClose asChild>
                    <Button className="flex-1 h-11 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs">
                      Apply Filters
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Quick KPI Strip */}
        <div className="bg-white dark:bg-[#172036] border-b border-slate-100 dark:border-white/5 py-3">
          <div className="overflow-x-auto hide-scrollbar flex gap-3 px-4">
            <div className="min-w-[130px] flex flex-col p-3 bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Target Hours</span>
              <span className="text-lg font-black text-slate-800 dark:text-white mt-1">{k.total_target_hours}h</span>
              <span className="text-[9px] text-slate-400 mt-0.5">{k.total_employees} employees</span>
            </div>
            <div className="min-w-[130px] flex flex-col p-3 bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Actual Hours</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{k.total_actual_hours}h</span>
              <span className="text-[9px] text-slate-400 mt-0.5">completed learning</span>
            </div>
            <div className="min-w-[130px] flex flex-col p-3 bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Remaining</span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">{k.remaining_hours}h</span>
              <span className="text-[9px] text-slate-400 mt-0.5">needed to meet goal</span>
            </div>
            <div className="min-w-[130px] flex flex-col p-3 bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Compliance</span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">{k.learning_compliance_pct}%</span>
              <span className="text-[9px] text-slate-400 mt-0.5">{k.employees_achieved_goal} met target</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-white/5 px-4 bg-white dark:bg-[#172036] sticky top-16 z-30 justify-between">
          {(["overview", "departments", "trends", "employees"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-3 capitalize text-xs font-bold border-b-2 transition-all px-2.5",
                activeTab === tab 
                  ? "border-brand-500 text-brand-600 dark:text-brand-400 font-black" 
                  : "border-transparent text-slate-400"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-4 space-y-4">
          {activeTab === "overview" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Dynamic Insights */}
              <Card className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 dark:from-indigo-950/10 dark:to-[#172036] border-indigo-100/50 dark:border-white/5 p-4 shadow-sm">
                <div className="flex items-center gap-1.5 mb-3">
                  <Sparkles className="text-indigo-500" size={16} />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Executive Insights</h3>
                </div>
                <div className="space-y-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">
                  <p>• Organization is currently at {k.learning_compliance_pct}% compliance.</p>
                  <p>• {k.remaining_hours} hours remaining to achieve FY goal.</p>
                  {topDept.hours > 0 && (
                    <p>• {topDept.department} contributes {topDeptPct}% of completed learning hours.</p>
                  )}
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 italic mt-2">Auto-generated from live analytics.</p>
                </div>
              </Card>

              {/* Organization Compliance Donut */}
              <Card className="flex flex-col items-center p-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Organization Compliance</h3>
                <MobileComplianceDonut actual={k.total_actual_hours} target={k.total_target_hours} pct={k.learning_compliance_pct} />
                <div className="mt-2 text-center">
                  <p className="text-sm font-black text-slate-700 dark:text-slate-350">{k.total_actual_hours}h Completed / {k.total_target_hours}h Target</p>
                </div>
              </Card>

              {/* Department Contribution Donut */}
              <Card className="flex flex-col items-center p-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Department Contribution</h3>
                <MobileDeptContributionDonut data={mobileDeptData} />
              </Card>

              {/* Learning Goal Progress Bar */}
              <Card className="p-4 space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Learning Goal Progress</h3>
                <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span>Overall Progress</span>
                  <span>{goalProgressPct}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${goalProgressPct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Actual: {k.total_actual_hours}h</span>
                  <span>Remaining: {k.remaining_hours}h</span>
                </div>
              </Card>

              {/* Top Performers */}
              <Card className="p-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Top Performers</h3>
                <div className="divide-y divide-slate-50 dark:divide-white/5">
                  {data.top_learners_company.slice(0, 3).map((l: any) => <LearnerCard key={l.id} learner={l} />)}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "departments" && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1 px-1">Department Leaderboard</h3>
              {[...data.dept_learning_hours]
                .sort((a, b) => b.hours - a.hours)
                .map((d, index) => {
                  const medalColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
                  return (
                    <div key={d.department} className="bg-white dark:bg-[#172036] rounded-2xl border border-slate-100 dark:border-white/5 p-4 flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-slate-50 dark:bg-white/5")}>
                          {index < 3 ? <Award size={14} className={medalColors[index]} /> : index + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight">{d.department}</h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">
                            {d.employees} Employees &bull; {d.hours}h Learning
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
                          d.completion_rate >= 80 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                          d.completion_rate >= 50 ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                          "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                        )}>
                          {d.completion_rate}% Comp
                        </span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}

          {activeTab === "trends" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <Card className="p-4 space-y-4">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Trend Analysis</h3>
                  
                  {/* Toggle Selector */}
                  <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl justify-between">
                    {[
                      { id: "engagement", label: "Engagement" },
                      { id: "participation", label: "Participation" },
                      { id: "remaining", label: "Remaining" }
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setTrendChartType(type.id as any)}
                        className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                          trendChartType === type.id 
                            ? "bg-white dark:bg-[#0B1020] text-brand-600 dark:text-brand-400 shadow-sm"
                            : "text-slate-400"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[240px] w-full">
                  {trendChartType === "engagement" && <MonthlyTrendActualVsTarget data={data.monthly_trends} totalEmployees={k.total_employees} />}
                  {trendChartType === "participation" && <TargetVsActualDeptBar data={data.dept_learning_hours} targetPerEmployee={targetPerEmployee} />}
                  {trendChartType === "remaining" && <RemainingHoursDeptBar data={data.dept_learning_hours} targetPerEmployee={targetPerEmployee} />}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "employees" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Top Learners */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">Top Learners</h3>
                <div className="space-y-2">
                  {topLearnersList.map(emp => (
                    <div key={emp.id} className="bg-white dark:bg-[#172036] rounded-2xl border border-slate-100 dark:border-white/5 p-3.5 flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black shrink-0">
                          {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-855 dark:text-white truncate leading-tight">{emp.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{emp.department}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-700 dark:text-slate-350">{emp.total_hours}h / 16h</p>
                        <p className="text-[10px] font-black text-indigo-500 mt-0.5">{emp.completion_pct}% Comp</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Learners */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">Requires Attention (Bottom Learners)</h3>
                <div className="space-y-2">
                  {bottomLearnersList.map(emp => (
                    <div key={emp.id} className="bg-white dark:bg-[#172036] rounded-2xl border border-slate-100 dark:border-white/5 p-3.5 flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-black shrink-0">
                          {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-855 dark:text-white truncate leading-tight">{emp.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{emp.department}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-700 dark:text-slate-350">{emp.total_hours}h / 16h</p>
                        <p className="text-[10px] font-black text-rose-500 mt-0.5">{emp.completion_pct}% Comp</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }


  return (
    <div className="bg-[#F7F8FC] dark:bg-[#0B1020] min-h-screen px-4 lg:px-8 pt-6 pb-16 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* ── Premium Hero Header ───────────────────────────────────────────── */}
        <motion.div {...fade(0)}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 p-6 text-white shadow-xl shadow-indigo-200"
        >
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/5 rounded-full blur-2xl pointer-events-none"/>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none"/>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold uppercase tracking-widest mb-3">
                <Star size={12}/> Admin · Executive Dashboard
              </div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight mb-1">Team Analytics Dashboard</h1>
              <p className="text-indigo-200 text-sm font-medium max-w-xl">
                Data-driven workforce learning insights — track department progress, employee performance, and skill development trends.
              </p>
            </div>
            <div className="flex gap-3 text-center shrink-0">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3">
                <p className="text-2xl font-black">{k.total_actual_hours}h</p>
                <p className="text-[11px] text-indigo-200 font-semibold mt-0.5">Total Actual Hours</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3">
                <p className="text-2xl font-black">{k.learning_compliance_pct}%</p>
                <p className="text-[11px] text-indigo-200 font-semibold mt-0.5">Compliance Rate</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Sticky Analytics Filter Bar ──────────────────────────────────── */}
        <motion.div {...fade(0.04)}
          className="sticky top-0 z-30 bg-white/90 dark:bg-[#172036]/90 backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)]"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                <Filter size={16} className="text-indigo-500" />
                <span className="text-xs font-black uppercase tracking-wider">Analytics Filters</span>
              </div>
              <button 
                onClick={() => {
                  setFyFilter(`${currentFyStart}-${currentFyStart + 1}`);
                  setQFilter("All");
                  setMFilter("");
                  setDeptFilter("");
                  setCatFilter("");
                  setTypeFilter("");
                  setMgrFilter("");
                  setEmpFilter("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Reset Filters
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">FY</label>
                <select value={fyFilter} onChange={e => setFyFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20">
                  {[currentFyStart, currentFyStart - 1, currentFyStart - 2, currentFyStart - 3].map(y => <option key={y} value={`${y}-${y + 1}`}>FY {y}-{y + 1}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quarter</label>
                <select value={qFilter} onChange={e => setQFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="All">All Quarters</option>
                  <option value="Q1">Q1 (Apr-Jun)</option>
                  <option value="Q2">Q2 (Jul-Sep)</option>
                  <option value="Q3">Q3 (Oct-Dec)</option>
                  <option value="Q4">Q4 (Jan-Mar)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Month</label>
                <select value={mFilter} onChange={e => setMFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="">All Months</option>
                  {[["4","April"],["5","May"],["6","June"],["7","July"],["8","August"],["9","September"],["10","October"],["11","November"],["12","December"],["1","January"],["2","February"],["3","March"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Department</label>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="">All Departments</option>
                  {(filterDepartments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Category</label>
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="">All Categories</option>
                  {(filterCategories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Type</label>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="">All Types</option>
                  {["INTERNAL", "EXTERNAL", "ONLINE", "WORKSHOP", "CERTIFICATION"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Manager</label>
                <select value={mgrFilter} onChange={e => setMgrFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="">All Managers</option>
                  {(filterManagers ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Employee</label>
                <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="">All Employees</option>
                  {(filterEmployees ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.employee_code} - {e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Start</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2 text-xs font-bold text-slate-750 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">End</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2 text-xs font-bold text-slate-750 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── KPI Grid Section ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard title="Total Target Hours"        value={`${k.total_target_hours}h`}  sub={`${k.total_employees} employees`}   icon={Clock}        color="indigo" delay={0.08}/>
          <KpiCard title="Total Actual Hours"        value={`${k.total_actual_hours}h`}  sub="completed learning"                 icon={CheckCircle2} color="emerald" delay={0.12}/>
          <KpiCard title="Remaining Hours"           value={`${k.remaining_hours}h`}     sub="needed to meet goal"                icon={BookOpen}     color="amber"  delay={0.16}/>
          <KpiCard title="Learning Compliance"       value={`${k.learning_compliance_pct}%`} sub={`${k.employees_achieved_goal} met targets`} icon={Award}        color="violet" delay={0.20}/>
          <KpiCard title="Training Attendance"       value={`${k.total_attendance_pct}%`} sub="avg roster presence"               icon={TrendingUp}   color="cyan"   delay={0.24}/>
          <KpiCard title="Workforce Achieved"        value={k.employees_achieved_goal}   sub="reached goals"                      icon={CheckCircle2} color="emerald" delay={0.26}/>
          <KpiCard title="Workforce Below Goal"      value={k.employees_below_target}   sub="remedial needed"                    icon={Users}        color="rose"   delay={0.28}/>
          <KpiCard title="Missed Hours (Absence)"    value={`${k.missed_learning_hours}h`} sub="total absent training"             icon={Clock}        color="rose"   delay={0.30}/>
          <KpiCard title="Participation Rate"        value={`${k.training_participation_pct}%`} sub="with at least 1 course"       icon={Users}        color="cyan"   delay={0.32}/>
          <KpiCard title="Total Active Learners"     value={k.active_learners}            sub="employees with active enr"          icon={GraduationCap} color="indigo" delay={0.34}/>
        </div>

        {/* ── Executive Insights & Recommendations ────────────────────────── */}
        <motion.div {...fade(0.36)}>
          <Card className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 dark:from-indigo-950/10 dark:to-[#172036] border-indigo-100/50 dark:border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-indigo-500" size={18}/>
              <SectionTitle>Executive Insights & Actionable Recommendations</SectionTitle>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {(data.executive_insights ?? []).slice(0, 3).map((insight: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-350 text-sm font-medium leading-relaxed">
                    <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
                    <p className="flex-1">{insight.startsWith("• ") ? insight.substring(2) : insight}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {(data.executive_insights ?? []).slice(3).map((insight: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-350 text-sm font-medium leading-relaxed">
                    <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
                    <p className="flex-1">{insight.startsWith("• ") ? insight.substring(2) : insight}</p>
                  </div>
                ))}
                {(!data.executive_insights || data.executive_insights.length === 0) && (
                  <p className="text-sm text-slate-400 italic">No automated insights computed for the current filter scope.</p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Visualizations Row 1 (Goal Progress & Contribution) ───────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div {...fade(0.38)}>
            <Card className="flex flex-col items-center">
              <SectionTitle>Workforce Goal Progress (Actual vs Remaining)</SectionTitle>
              <WorkforceProgressDonut actual={k.total_actual_hours} remaining={k.remaining_hours}/>
              <div className="mt-2 text-center">
                <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{k.total_actual_hours}h / {k.total_target_hours}h</p>
                <p className="text-xs text-slate-400 font-semibold">Overall Goal Completion Progress</p>
              </div>
            </Card>
          </motion.div>
          <motion.div {...fade(0.40)}>
            <Card className="flex flex-col items-center">
              <SectionTitle>Department Learning Contribution (Actual Hours)</SectionTitle>
              <DeptContributionDonut data={data.dept_learning_hours}/>
              <div className="mt-2 text-center">
                <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{k.top_performing_department}</p>
                <p className="text-xs text-slate-400 font-semibold">Highest Learning Contributor</p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* ── Visualizations Row 2 (Target vs Actual & Remaining per Dept) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div {...fade(0.42)}>
            <Card>
              <SectionTitle>Target vs Actual Hours by Department</SectionTitle>
              <TargetVsActualDeptBar data={data.dept_learning_hours} targetPerEmployee={targetPerEmployee}/>
            </Card>
          </motion.div>
          <motion.div {...fade(0.44)}>
            <Card>
              <SectionTitle>Remaining Hours to target per department</SectionTitle>
              <RemainingHoursDeptBar data={data.dept_learning_hours} targetPerEmployee={targetPerEmployee}/>
            </Card>
          </motion.div>
        </div>

        {/* ── Monthly Trend ── */}
        <motion.div {...fade(0.46)}>
          <Card>
            <SectionTitle>Monthly actual vs target learning trends</SectionTitle>
            <MonthlyTrendActualVsTarget data={data.monthly_trends} totalEmployees={k.total_employees}/>
          </Card>
        </motion.div>

        {/* ── Rankings & Performer Analysis ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div {...fade(0.48)}>
            <Card>
              <SectionTitle>Top Performing Departments (by learning hours)</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-black uppercase text-slate-400">
                      <th className="py-2 text-left">Department</th>
                      <th className="py-2 text-right">Actual Hours</th>
                      <th className="py-2 text-right">Employees</th>
                      <th className="py-2 text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.dept_learning_hours]
                      .sort((a, b) => b.hours - a.hours)
                      .slice(0, 5)
                      .map((d: any) => (
                        <tr key={d.department} className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50">
                          <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{d.department}</td>
                          <td className="py-3 text-right font-black text-indigo-600 dark:text-indigo-400">{d.hours}h</td>
                          <td className="py-3 text-right text-slate-500">{d.employees}</td>
                          <td className="py-3 text-right">
                            <span className="inline-block text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded-lg">
                              {d.completion_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>

          <motion.div {...fade(0.50)}>
            <Card>
              <SectionTitle>Departments Requiring Attention (lowest learning hours)</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-black uppercase text-slate-400">
                      <th className="py-2 text-left">Department</th>
                      <th className="py-2 text-right">Actual Hours</th>
                      <th className="py-2 text-right">Employees</th>
                      <th className="py-2 text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.dept_learning_hours]
                      .sort((a, b) => a.hours - b.hours)
                      .slice(0, 5)
                      .map((d: any) => (
                        <tr key={d.department} className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50">
                          <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{d.department}</td>
                          <td className="py-3 text-right font-black text-slate-600 dark:text-slate-400">{d.hours}h</td>
                          <td className="py-3 text-right text-slate-500">{d.employees}</td>
                          <td className="py-3 text-right">
                            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-lg ${
                              d.completion_rate < 50 ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                            }`}>
                              {d.completion_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* ── KPI Export Center ──────────────────────────────────────────────── */}
        <motion.div {...fade(0.52)}>
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full mb-2">
                  <FileSpreadsheet size={12} /> KPI Export Center
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Export KPI Report Workbook</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  HR learning tracker workbook with employee, department, monthly and attendance summary sheets.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button disabled={exporting} onClick={() => handleKpiExport("KPI Report")} className="h-9 px-3 rounded-xl bg-violet-600 text-white text-xs font-black flex items-center gap-2 disabled:opacity-60 hover:bg-violet-750 transition-colors">
                  <FileSpreadsheet size={14} /> Export KPI Report
                </button>
                <button disabled={exporting} onClick={() => handleKpiExport("Excel")} className="h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172036] text-slate-700 dark:text-slate-300 text-xs font-black flex items-center gap-2 disabled:opacity-60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <FileSpreadsheet size={14} /> Export Excel
                </button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Original Sub-Charts Row (Course participation & Skill gap) ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div {...fade(0.54)}>
            <Card>
              <SectionTitle>Top Attended Courses</SectionTitle>
              <CourseParticipationBar data={data.course_participation}/>
            </Card>
          </motion.div>
          <motion.div {...fade(0.56)}>
            <Card>
              <SectionTitle>Skills Gap Analysis</SectionTitle>
              <SkillGapBar data={data.skill_gaps}/>
            </Card>
          </motion.div>
        </div>

        {/* ── Original Department Table ───────────────────────── */}
        <motion.div {...fade(0.58)}>
          <Card>
            <SectionTitle>Department Performance Details</SectionTitle>
            <div className="grid grid-cols-6 gap-2 pb-2 border-b border-slate-100 dark:border-white/5 mb-1">
              {["Department","Top Learner","Hours","Completion","Active","Pending Evals"].map(h => (
                <p key={h} className="text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</p>
              ))}
            </div>
            {data.department_summaries
              .map((dept: any) => <DeptRow key={dept.department} dept={dept}/>)
            }
            {data.department_summaries.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No department data available</p>
            )}
          </Card>
        </motion.div>

        {/* ── Employee Table + Top Learners ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div {...fade(0.60)} className="lg:col-span-2">
            <Card>
              <SectionTitle>Employee Learning Performance</SectionTitle>
              <div className="mb-4">
                <input
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  placeholder="Search employee table by name…"
                  className="text-sm border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 font-semibold text-slate-700 bg-white dark:bg-[#0B1020] dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-200 min-w-[240px]"
                />
              </div>
              <EmployeeTable rows={data.employee_table} deptFilter="" search={empSearch}/>
            </Card>
          </motion.div>

          <motion.div {...fade(0.62)}>
            <Card>
              <SectionTitle>Top Learners — Company Wide</SectionTitle>
              <div className="divide-y divide-slate-50 dark:divide-white/5">
                {data.top_learners_company.map((l: any) => <LearnerCard key={l.id} learner={l}/>)}
                {data.top_learners_company.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
