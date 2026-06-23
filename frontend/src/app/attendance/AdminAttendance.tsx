import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users, Activity, Clock, AlertCircle, Search,
  CheckCircle2, Radio, Building2,
  RefreshCw
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { format } from "date-fns";
import { attendanceService } from "@/services/attendance.service";
import { trainingsService } from "@/services/trainings.service";
import { departmentsService } from "@/services/departments.service";
import { employeesService } from "@/services/employees.service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/SkeletonLoader";

const POLL_INTERVAL = 5_000;
const PIE_COLORS = ["#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { cls: string; Icon: any }> = {
    PRESENT: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", Icon: CheckCircle2 },
    LATE:    { cls: "bg-amber-500/10 text-amber-600 border-amber-500/20",   Icon: Clock },
    ABSENT:  { cls: "bg-rose-500/10 text-rose-600 border-rose-500/20",     Icon: AlertCircle },
    PARTIAL: { cls: "bg-violet-500/10 text-violet-600 border-violet-500/20", Icon: CheckCircle2 },
  };
  const { cls, Icon } = cfg[status] ?? cfg.ABSENT;
  return (
    <Badge className={cn("px-2.5 py-1 rounded-lg border font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5", cls)}>
      <Icon size={12} /> {status === "PARTIAL" ? "EXCUSED" : status}
    </Badge>
  );
};

const KpiCard = ({ title, value, sub, icon: Icon, color, pulse }: any) => {
  const colors: Record<string, string> = {
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    amber:  "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20",
    rose:   "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#172036] p-5 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", colors[color])}>
          <Icon size={20} />
        </div>
        {pulse && (
          <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        )}
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
      {sub && <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{sub}</p>}
    </motion.div>
  );
};

const LiveSessionCard = ({ session }: { session: any }) => {
  const pct = session.participation_rate ?? 0;
  const now = new Date();
  const closes = new Date(session.closes_at);
  const minsLeft = Math.max(0, Math.round((closes.getTime() - now.getTime()) / 60000));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-[#172036] rounded-[20px] border border-emerald-500/20 dark:border-emerald-500/10 p-5 shadow-sm relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-brand-500" />
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
            <Radio size={10} className="inline mr-1 animate-pulse" />Live Session
          </p>
          <h4 className="font-black text-slate-900 dark:text-white text-sm line-clamp-1">
            {session.training_title}
          </h4>
          {session.trainer_name && (
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{session.trainer_name}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          <Badge className={cn(
            "border text-[9px] font-black",
            session.attendance_submitted
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            {session.attendance_submitted ? "Submitted" : "Open"}
          </Badge>
          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px] font-black">
            {minsLeft}m left
          </Badge>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
          <span>Submitted / Enrolled</span>
          <span className="text-slate-700 dark:text-slate-200">{session.submitted_count}/{session.enrolled_count}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-emerald-500"
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-black">
          <span className="text-slate-400 uppercase">{session.marked_count} attended</span>
          <span className="text-emerald-600">{pct.toFixed(1)}%</span>
        </div>
      </div>
    </motion.div>
  );
};

const AnalyticsList = ({ title, items, emptyLabel }: { title: string; items: any[]; emptyLabel: string }) => (
  <div className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm">
    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">{title}</h3>
    {items.length === 0 ? (
      <div className="py-8 text-center">
        <Activity size={24} className="text-slate-300 mx-auto mb-2" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emptyLabel}</p>
      </div>
    ) : (
      <div className="space-y-4">
        {items.map((item: any, index: number) => {
          const label = item.department ?? item.label ?? "Unassigned";
          const pct = item.attendance_percentage ?? item.participation_rate ?? 0;
          const total = item.total ?? 0;
          return (
            <div key={`${label}-${index}`} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{label}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">
                  {pct}% {total ? `- ${total} rows` : ""}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default function AdminAttendanceDashboard() {
  const fyStart = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [trainingFilter, setTrainingFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [financialYear, setFinancialYear] = useState(`${fyStart}-${fyStart + 1}`);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const filters = {
    status: statusFilter || undefined,
    training_id: trainingFilter || undefined,
    department_id: departmentFilter || undefined,
    employee_id: employeeFilter || undefined,
    financial_year: financialYear || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  };

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ["admin-attendance-summary", filters],
    queryFn: () => attendanceService.getAdminSummary(filters).then(r => r.data.data),
    refetchInterval: POLL_INTERVAL,
    staleTime: 20_000,
  });

  const { data: liveSessions, isLoading: loadingLive } = useQuery({
    queryKey: ["admin-live-sessions"],
    queryFn: () => attendanceService.getLiveSessions().then(r => r.data.data),
    refetchInterval: POLL_INTERVAL,
    staleTime: 20_000,
  });

  const { data: logsData, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["admin-attendance-logs", page, search, filters],
    queryFn: () => attendanceService.getAdminLogs({
      page, per_page: PER_PAGE,
      search: search || undefined,
      ...filters,
    }).then(r => r.data),
    refetchInterval: POLL_INTERVAL,
    staleTime: 20_000,
    keepPreviousData: true,
  } as any);
  const { data: trainings } = useQuery({
    queryKey: ["attendance-filter-trainings"],
    queryFn: () => trainingsService.list(1, 100).then(r => r.data.data),
    staleTime: 60_000,
  });
  const { data: departments } = useQuery({
    queryKey: ["attendance-filter-departments"],
    queryFn: () => departmentsService.list({ page: 1, per_page: 100 }).then(r => r.data.data),
    staleTime: 60_000,
  });
  const { data: employees } = useQuery({
    queryKey: ["attendance-filter-employees"],
    queryFn: () => employeesService.list({ page: 1, per_page: 100 }).then(r => r.data.data),
    staleTime: 60_000,
  });

  const logs = (logsData as any)?.data ?? [];
  const totalLogs = (logsData as any)?.meta?.total ?? 0;
  const totalPages = Math.ceil(totalLogs / PER_PAGE);

  return (
    <div className="space-y-6">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        {loadingSummary ? (
          [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-[24px]" />)
        ) : (
          <>
            <KpiCard
              title="Total Attendance"
              value={`${summary?.attendance_percentage ?? 0}%`}
              sub="Present from roster rows"
              icon={Users}
              color="indigo"
            />
            <KpiCard
              title="Present"
              value={summary?.total_present ?? 0}
              sub={`${summary?.total_records ?? 0} roster records`}
              icon={CheckCircle2}
              color="emerald"
            />
            <KpiCard
              title="Absent"
              value={summary?.total_absent ?? 0}
              sub="Roster submitted"
              icon={AlertCircle}
              color="rose"
            />
            <KpiCard
              title="Late"
              value={summary?.total_late ?? 0}
              sub={`${summary?.late_percentage ?? 0}% of rows`}
              icon={Clock}
              color="amber"
            />
            <KpiCard
              title="Excused"
              value={summary?.total_excused ?? 0}
              sub="Roster submitted"
              icon={Activity}
              color="indigo"
            />
            <KpiCard
              title="Participation"
              value={`${summary?.participation_rate ?? 0}%`}
              sub="Present + late"
              icon={Users}
              color="emerald"
              pulse={(summary?.active_sessions_count ?? 0) > 0}
            />
          </>
        )}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Attendance Breakdown</h3>
          {loadingSummary ? <Skeleton className="h-48" /> : (
            <div className="relative h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary?.completion_data ?? []} innerRadius={50} outerRadius={72} paddingAngle={5} dataKey="value" stroke="none">
                    {(summary?.completion_data ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 dark:text-white">{summary?.participation_rate ?? 0}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Participation</span>
              </div>
            </div>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {["Present","Late","Absent","Excused"].map((n, i) => (
              <div key={n} className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                {n}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Attendance Trend</h3>
          {loadingSummary ? <Skeleton className="h-48" /> : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.trend_data ?? []} margin={{ bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 11, fontWeight: 700 }} formatter={(v: any) => [`${v}%`, "Rate"]} />
                  <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <Radio size={10} className="inline mr-1 text-emerald-500 animate-pulse" />Live Sessions
            </h3>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black">
              {liveSessions?.length ?? 0} active
            </Badge>
          </div>
          {loadingLive ? (
            [1,2].map(i => <Skeleton key={i} className="h-28 rounded-[20px]" />)
          ) : liveSessions?.length > 0 ? (
            liveSessions.map((s: any) => <LiveSessionCard key={s.session_id} session={s} />)
          ) : (
            <div className="bg-white dark:bg-[#172036] rounded-[20px] border border-dashed border-slate-200 dark:border-white/10 p-6 text-center">
              <Activity size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No live sessions</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Logs Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsList
          title="Department Attendance"
          items={summary?.department_attendance ?? []}
          emptyLabel="No department attendance yet"
        />
        <AnalyticsList
          title="Most Attended Trainings"
          items={summary?.most_attended_trainings ?? []}
          emptyLabel="No training attendance yet"
        />
      </div>

      <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#EEF2FF] dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Attendance Logs</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{totalLogs} records</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search employee or training..."
                className="h-9 pl-9 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-xs font-bold w-56"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="PARTIAL">Excused</option>
            </select>
            <select value={trainingFilter} onChange={e => { setTrainingFilter(e.target.value); setPage(1); }} className="h-9 max-w-44 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-xs font-bold text-slate-700 dark:text-slate-300 outline-none">
              <option value="">All Trainings</option>
              {(trainings ?? []).map((training: any) => <option key={training.id} value={training.id}>{training.title}</option>)}
            </select>
            <select value={departmentFilter} onChange={e => { setDepartmentFilter(e.target.value); setPage(1); }} className="h-9 max-w-44 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-xs font-bold text-slate-700 dark:text-slate-300 outline-none">
              <option value="">All Departments</option>
              {(departments ?? []).map((department: any) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
            <select value={employeeFilter} onChange={e => { setEmployeeFilter(e.target.value); setPage(1); }} className="h-9 max-w-44 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-xs font-bold text-slate-700 dark:text-slate-300 outline-none">
              <option value="">All Employees</option>
              {(employees ?? []).map((employee: any) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>)}
            </select>
            <select value={financialYear} onChange={e => { setFinancialYear(e.target.value); setPage(1); }} className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-xs font-bold text-slate-700 dark:text-slate-300 outline-none">
              <option value="">All FY</option>
              {[fyStart, fyStart - 1, fyStart - 2].map(year => <option key={year} value={`${year}-${year + 1}`}>FY {year}-{year + 1}</option>)}
            </select>
            <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="h-9 w-36 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-xs font-bold" />
            <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="h-9 w-36 rounded-xl bg-slate-50 dark:bg-white/5 border-none text-xs font-bold" />
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-xl text-xs font-bold"
              onClick={() => { refetchSummary(); refetchLogs(); }}
            >
              <RefreshCw size={13} /> Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-[#EEF2FF] dark:border-white/5">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Training</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Marked By</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2FF] dark:divide-white/5">
              {loadingLogs ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}>
                    <td colSpan={7} className="px-6 py-3">
                      <Skeleton className="h-8 w-full rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Activity size={32} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No attendance records available yet.</p>
                  </td>
                </tr>
              ) : (
                logs.map((row: any) => (
                  <tr key={row.record_id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{row.employee_name}</span>
                        {row.employee_code && (
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{row.employee_code}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {row.department_name ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                          <Building2 size={12} className="text-indigo-400" />
                          {row.department_name}
                        </div>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-xs line-clamp-1 max-w-[180px]">
                        {row.training_title}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-4">
                      {row.marked_at ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {format(new Date(row.marked_at), "hh:mm a")}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium uppercase">
                            {format(new Date(row.marked_at), "dd MMM yyyy")}
                          </span>
                        </div>
                      ) : <span className="text-xs text-slate-300 font-bold">—</span>}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                      {row.marked_by}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {row.session_date ? format(new Date(row.session_date), "dd MMM yyyy") : "N/A"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#EEF2FF] dark:border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Page {page} of {totalPages} · {totalLogs} records
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs font-bold"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs font-bold"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
