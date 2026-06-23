import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Activity, Clock, Search, Filter, Calendar, 
  Building2, FileText, BarChart3, AlertCircle 
} from "lucide-react";
import {
  BarChart, Bar, XAxis, CartesianGrid, ResponsiveContainer, Tooltip
} from "recharts";
import { format } from "date-fns";

import { attendanceService } from "@/services/attendance.service";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";

// "?"? KPI Component "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
const SwipeKPI = ({ title, value, icon: Icon, colorClass }: any) => (
  <div className="min-w-[140px] flex flex-col p-3 bg-white dark:bg-[#172036] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
    <div className="flex items-center gap-2 mb-2">
      <div className={cn("p-1.5 rounded-lg bg-opacity-10 dark:bg-opacity-20", colorClass.bg, colorClass.text)}>
        <Icon size={14} strokeWidth={2.5} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{title}</span>
    </div>
    <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">{value}</span>
  </div>
);

export default function MobileAdminAttendancePage() {
  const fyStart = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "records" | "analytics">("overview");
  const [search, setSearch] = useState("");

  // Reset scroll to top of the dashboard main container when activeTab changes
  useEffect(() => {
    const scrollContainer = document.querySelector("main");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "instant" as any });
    }
  }, [activeTab]);
  
  // Basic empty filters for the drawer
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter] = useState("");
  const [financialYear] = useState(`${fyStart}-${fyStart + 1}`);

  const filters = {
    status: statusFilter || undefined,
    department_id: departmentFilter || undefined,
    financial_year: financialYear || undefined,
  };

  const { data: summary } = useQuery({
    queryKey: ["admin-attendance-summary", filters],
    queryFn: () => attendanceService.getAdminSummary(filters).then(r => r.data.data),
    staleTime: 20_000,
  });

  const { data: liveSessions, isLoading: loadingLive } = useQuery({
    queryKey: ["admin-live-sessions"],
    queryFn: () => attendanceService.getLiveSessions().then(r => r.data.data),
    staleTime: 20_000,
  });

  const { data: logsData, isLoading: loadingLogs } = useQuery({
    queryKey: ["admin-attendance-logs", 1, search, filters],
    queryFn: () => attendanceService.getAdminLogs({
      page: 1, per_page: 50,
      search: search || undefined,
      ...filters,
    }).then(r => r.data),
    staleTime: 20_000,
  } as any);

  const logs = (logsData as any)?.data ?? [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1020] text-slate-900 dark:text-white overflow-x-hidden relative">
      
      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0B1020]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 px-4 pt-3 pb-0 flex flex-col h-[88px] justify-between">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              Attendance
            </h1>
            <div className="flex gap-3 text-[10px] font-bold text-slate-500 mt-0.5">
              <span>Today: {summary?.total_records || 0} Records</span>
              <span className="text-emerald-500">{summary?.total_present || 0} Present</span>
              <span className="text-rose-500">{summary?.total_absent || 0} Absent</span>
            </div>
          </div>
          <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white rounded-full font-bold text-xs h-8 px-3">
            + Sessions
          </Button>
        </div>

        {/* ── TABS ────────────────────────────────────────────────────────────── */}
        <div className="flex gap-6 overflow-x-auto hide-scrollbar text-xs font-bold -mb-[1px]">
          {["overview", "sessions", "records", "analytics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "pb-3 capitalize border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab 
                  ? "border-brand-500 text-brand-600 dark:text-brand-400" 
                  : "border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────────── */}
      <div className="pt-4 px-4 pb-12">
        
        {/* ================================================================= */}
        {/* OVERVIEW TAB */}
        {/* ================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Horizontal Swipe KPIs */}
            <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar flex gap-3 pb-1">
              <SwipeKPI title="Present" value={summary?.total_present || 0} icon={Users} colorClass={{ bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }} />
              <SwipeKPI title="Absent" value={summary?.total_absent || 0} icon={AlertCircle} colorClass={{ bg: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" }} />
              <SwipeKPI title="Late" value={summary?.total_late || 0} icon={Clock} colorClass={{ bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }} />
              <SwipeKPI title="Excused" value={summary?.total_excused || 0} icon={FileText} colorClass={{ bg: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" }} />
            </div>

            {/* Attendance Health Card */}
            <div className="bg-white dark:bg-[#172036] rounded-[20px] p-4 border border-slate-100 dark:border-white/5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Attendance Health</h3>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                  {summary?.attendance_percentage || 0}%
                </span>
                <span className="text-[10px] font-bold text-slate-500">Overall Rate</span>
              </div>
              <div className="h-2 w-full flex rounded-full overflow-hidden gap-0.5 bg-slate-100 dark:bg-white/5">
                <div className="bg-emerald-500 h-full" style={{ width: `${(summary?.total_present / summary?.total_records) * 100 || 0}%` }} />
                <div className="bg-rose-500 h-full" style={{ width: `${(summary?.total_absent / summary?.total_records) * 100 || 0}%` }} />
                <div className="bg-amber-500 h-full" style={{ width: `${(summary?.total_late / summary?.total_records) * 100 || 0}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-[9px] font-black uppercase text-slate-400">
                <span className="text-emerald-500">Present</span>
                <span className="text-amber-500">Late</span>
                <span className="text-rose-500">Absent</span>
              </div>
            </div>

            {/* Live Sessions Feed */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Live Sessions</h3>
              <div className="space-y-3">
                {loadingLive ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-bold">Loading live sessions...</div>
                ) : !liveSessions?.length ? (
                  <div className="bg-white dark:bg-[#172036] rounded-2xl p-6 text-center border border-dashed border-slate-200 dark:border-white/10">
                    <Activity size={24} className="mx-auto text-slate-400 mb-2 opacity-50" />
                    <p className="text-xs font-bold text-slate-500">No active sessions right now</p>
                    <Button variant="link" className="text-brand-500 text-[10px] font-black h-auto p-0 mt-1">Create Attendance Session</Button>
                  </div>
                ) : (
                  liveSessions.map((session: any) => (
                    <div key={session.id} className="flex items-center gap-3 p-3 bg-white dark:bg-[#172036] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Activity size={16} className="text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{session.training?.title}</p>
                        <p className="text-[10px] font-bold text-slate-500 truncate">{session.marked_count}/{session.total_participants} Participants &bull; {session.status}</p>
                      </div>
                      <div className="shrink-0 px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded">
                        Active
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SESSIONS TAB */}
        {/* ================================================================= */}
        {activeTab === "sessions" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Reuse live sessions for demo, ideally this would be all scheduled/past sessions too */}
            {!liveSessions?.length && !loadingLive ? (
               <div className="text-center py-10 text-slate-500 text-xs font-bold">No sessions found.</div>
            ) : (
              liveSessions?.map((session: any) => (
                <div key={session.id} className="bg-white dark:bg-[#172036] rounded-[20px] p-4 border border-slate-100 dark:border-white/5 shadow-sm">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1 truncate">{session.training?.title}</h3>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 mb-4">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {session.date ? format(new Date(session.date), "dd MMM yyyy") : "Today"}</span>
                    <span>{session.marked_count}/{session.total_participants} Marked</span>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 h-9 text-xs font-bold bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      View Roster
                    </Button>
                    <Button variant="outline" className="flex-1 h-9 text-xs font-bold dark:border-white/10">
                      Records
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* RECORDS TAB */}
        {/* ================================================================= */}
        {activeTab === "records" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Sticky Search & Filter */}
            <div className="flex gap-2 sticky top-[88px] z-30 bg-[#F8FAFC]/80 dark:bg-[#0B1020]/80 backdrop-blur-xl py-2 -mx-4 px-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <Input 
                  placeholder="Search Attendance..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 h-10 bg-white dark:bg-[#172036] border-slate-200 dark:border-white/5 rounded-xl text-xs"
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-xl bg-white dark:bg-[#172036] border-slate-200 dark:border-white/5 text-slate-500">
                    <Filter size={16} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-[32px] max-h-[85vh] p-6 bg-white dark:bg-[#0B1020] border-t dark:border-white/5">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-lg font-black">Filter Records</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</label>
                      <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 rounded-xl text-xs">
                        <option value="">All Statuses</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                      </Select>
                    </div>
                    <SheetClose asChild>
                      <Button className="w-full h-11 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black mt-2 text-xs">
                        Apply Filters
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Compact Logs List */}
            <div className="space-y-2 pt-2">
              {loadingLogs ? (
                 <div className="text-center py-10 text-slate-500 text-xs font-bold">Loading records...</div>
              ) : !logs.length ? (
                 <div className="text-center py-10 text-slate-500 text-xs font-bold">No records found.</div>
              ) : (
                logs.map((log: any) => {
                  let badgeColors = "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400";
                  if (log.status === "Present") badgeColors = "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
                  if (log.status === "Absent") badgeColors = "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400";
                  if (log.status === "Late") badgeColors = "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";

                  return (
                    <div key={log.record_id} className="flex items-center justify-between p-3.5 bg-white dark:bg-[#172036] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm h-[88px]">
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight">
                            {log.employee_name}
                          </h4>
                          <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 truncate mt-0.5 leading-tight">
                            {log.training_title}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 leading-none">
                          <span className="flex items-center gap-0.5 shrink-0"><Building2 size={10} /> {log.department_name || "Global"}</span>
                          <span className="shrink-0">&bull;</span>
                          <span className="flex items-center gap-0.5 shrink-0"><Calendar size={10} /> {log.session_date ? format(new Date(log.session_date), "dd MMM yyyy") : "-"}</span>
                        </div>
                      </div>
                      <div className="shrink-0 ml-3 flex items-center">
                        <div className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm", badgeColors)}>
                          {log.status}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ANALYTICS TAB */}
        {/* ================================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
            {/* Department Performance */}
            <div className="bg-white dark:bg-[#172036] rounded-[20px] p-5 border border-slate-100 dark:border-white/5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Building2 size={14} /> Department Performance
              </h3>
              <div className="space-y-3">
                {summary?.department_attendance?.slice(0, 5).map((dept: any) => (
                  <div key={dept.label} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[10px] font-bold mb-1">
                        <span className="text-slate-700 dark:text-slate-300 truncate">{dept.label}</span>
                        <span className="text-slate-500">{dept.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, dept.pct)}%` }}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Chart Trend (Mock data mapping to preserve layout) */}
            <div className="bg-white dark:bg-[#172036] rounded-[20px] p-5 border border-slate-100 dark:border-white/5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <BarChart3 size={14} /> Attendance Trend
              </h3>
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.trend_data?.slice(-7) || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', background: '#0B1020', color: '#fff', fontSize: '10px' }} formatter={(v) => [`${v}%`, "Attendance Rate"]} />
                    <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Most Attended Trainings */}
            <div className="bg-white dark:bg-[#172036] rounded-[20px] p-5 border border-slate-100 dark:border-white/5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <BarChart3 size={14} /> Top Programs
              </h3>
              <div className="space-y-3">
                {summary?.most_attended_trainings?.slice(0, 5).map((training: any, idx: number) => (
                  <div key={training.title} className="flex gap-3 items-center">
                    <div className="w-5 font-black text-slate-300 dark:text-slate-700 text-xs">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">{training.title}</p>
                    </div>
                    <div className="text-[10px] font-black text-brand-500 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded">
                      {training.pct}%
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
