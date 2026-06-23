import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Filter, Users, User, Calendar, MoreVertical, GraduationCap, 
  ClipboardCheck, CheckCircle2, Clock
} from "lucide-react";

import api from "@/lib/axios";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/Sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/formatters";

// "?"? KPI Component "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
const SwipeKPI = ({ title, value, icon: Icon, colorClass }: any) => (
  <div className="min-w-[140px] flex flex-col p-3 bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 shadow-sm">
    <div className="flex items-center gap-2 mb-2">
      <div className={cn("p-1.5 rounded-lg bg-opacity-10 dark:bg-opacity-20", colorClass.bg, colorClass.text)}>
        <Icon size={14} strokeWidth={2.5} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{title}</span>
    </div>
    <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">{value}</span>
  </div>
);

// "?"? Main Page Component "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
export default function MobileEnrollmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [activeTrainingId, setActiveTrainingId] = useState<string | null>(null);
  
  // Queries
  const { data: trainings, isLoading } = useQuery({
    queryKey: ["trainings-management"],
    queryFn: () => api.get("/trainings/", { params: { per_page: 100 } }),
    select: (res) => res.data.data,
  });

  const { data: categories } = useQuery({
    queryKey: ["training-categories"],
    queryFn: () => api.get("/trainings/categories"),
    select: (res) => res.data.data || [],
  });

  const { data: activeParticipants, isLoading: isLoadingParticipants } = useQuery({
    queryKey: ["training-enrollments", activeTrainingId],
    queryFn: () => api.get("/enrollments", { params: { training_id: activeTrainingId, per_page: 100 } }),
    enabled: !!activeTrainingId,
    select: (res) => res.data?.data || res.data || [],
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    const list = trainings || [];
    let enrolled = 0;
    let pending = 0; // Mocking pending since API doesn't expose it at top level easily without full detail fetch
    let completed = 0; 
    
    list.forEach((t: any) => {
      enrolled += (t.enrolled_count || 0);
      if (t.status === "completed") completed++;
    });

    return {
      programs: list.length,
      enrolled,
      pending, 
      completed
    };
  }, [trainings]);

  // Derived Filtered List
  const filteredTrainings = useMemo(() => {
    return trainings?.filter((t: any) => {
      const matchesSearch = t.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "All" || t.category?.name === categoryFilter;
      const matchesStatus = statusFilter === "All" || t.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [trainings, searchTerm, categoryFilter, statusFilter]);

  const totalOpenSeats = useMemo(() => {
    return trainings?.reduce((acc: number, t: any) => acc + (t.available_seats || 0), 0) || 0;
  }, [trainings]);

  // Mock recent enrollments from the first few active programs
  const recentEnrollments = useMemo(() => {
    // Ideally this would be an API call /enrollments/recent, we mock it via trainings for now
    if (!trainings) return [];
    return trainings.slice(0, 4).map((t: any) => ({
      id: Math.random().toString(),
      program_name: t.title,
      employee_name: "Jane Doe", // Mock name since we don't have global recent participants API ready
      date: t.created_at || new Date().toISOString(),
      department: "Engineering"
    }));
  }, [trainings]);

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B1020] text-slate-900 dark:text-white pb-safe overflow-x-hidden flex flex-col relative">
      
      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0B1020]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            Enrollments
          </h1>
          <div className="flex gap-3 text-[10px] font-bold text-slate-500 mt-0.5">
            <span>{kpis.programs} Programs</span>
            <span>&bull;</span>
            <span>{kpis.enrolled} Enrolled</span>
            <span>&bull;</span>
            <span className="text-emerald-500">{totalOpenSeats} Open Seats</span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        <div className="px-4 py-4 space-y-6">
          
          {/* Swipeable KPIs */}
          <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar flex gap-3 pb-1">
            <SwipeKPI title="Programs" value={kpis.programs} icon={GraduationCap} colorClass={{ bg: "bg-brand-500", text: "text-brand-600 dark:text-brand-400" }} />
            <SwipeKPI title="Enrolled" value={kpis.enrolled} icon={Users} colorClass={{ bg: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" }} />
            <SwipeKPI title="Pending" value={kpis.pending} icon={Clock} colorClass={{ bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }} />
            <SwipeKPI title="Completed" value={kpis.completed} icon={CheckCircle2} colorClass={{ bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }} />
          </div>

          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input 
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 h-11 bg-white dark:bg-[#172036] border-slate-200 dark:border-white/5 rounded-xl text-sm"
              />
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 h-11 w-11 rounded-xl bg-white dark:bg-[#172036] border-slate-200 dark:border-white/5 text-slate-500">
                  <Filter size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[32px] max-h-[85vh] p-6 bg-white dark:bg-[#0B1020] border-t dark:border-white/5">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-xl font-black">Filter Enrollments</SheetTitle>
                </SheetHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Category</label>
                    <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-12 rounded-xl">
                      <option value="All">All Categories</option>
                      {categories?.map((c: any) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</label>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-12 rounded-xl">
                      <option value="All">All Statuses</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </Select>
                  </div>
                  <SheetClose asChild>
                    <Button className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black mt-2">
                      Apply Filters
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Recent Enrollments Horizontal Feed */}
          <div>
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 px-1">Recent Enrollments</h3>
            <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar flex gap-3 pb-2">
              {recentEnrollments.map((enrollment: any, idx: number) => (
                <div key={idx} className="min-w-[200px] flex items-center gap-3 p-3 bg-white dark:bg-[#172036] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <User size={14} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{enrollment.employee_name}</p>
                    <p className="text-[9px] text-slate-500 truncate">{enrollment.program_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* List Cards */}
          <div className="space-y-3 pb-8">
            {isLoading ? (
              <div className="text-center py-10 text-slate-500 font-bold text-sm">Loading programs...</div>
            ) : filteredTrainings?.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-bold text-sm">No programs found</div>
            ) : (
              filteredTrainings?.map((training: any) => {
                const max = training.max_participants || 0;
                const enrolled = training.enrolled_count || 0;
                const capacityPct = max > 0 ? (enrolled / max) * 100 : 0;
                
                let healthColor = "bg-emerald-500";
                let healthText = "text-emerald-600 dark:text-emerald-400";
                let healthBg = "bg-emerald-50 dark:bg-emerald-500/10";
                let healthLabel = "Open";

                if (training.status === "completed") {
                  healthColor = "bg-slate-400";
                  healthText = "text-slate-600 dark:text-slate-400";
                  healthBg = "bg-slate-100 dark:bg-white/5";
                  healthLabel = "Completed";
                } else if (capacityPct >= 100) {
                  healthColor = "bg-rose-500";
                  healthText = "text-rose-600 dark:text-rose-400";
                  healthBg = "bg-rose-50 dark:bg-rose-500/10";
                  healthLabel = "Full";
                } else if (capacityPct >= 80) {
                  healthColor = "bg-amber-500";
                  healthText = "text-amber-600 dark:text-amber-400";
                  healthBg = "bg-amber-50 dark:bg-amber-500/10";
                  healthLabel = "Near Capacity";
                }

                return (
                  <div key={training.id} className="bg-white dark:bg-[#172036] rounded-[20px] p-4 border border-[#EEF2FF] dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
                          {training.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-500 truncate">
                            {training.departments?.map((d: any) => d.name).join(", ") || "Global"}
                          </span>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-slate-400 hover:text-slate-900 rounded-full">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl bg-white dark:bg-[#0B1020] border-slate-100 dark:border-white/5 shadow-xl">
                          <DropdownMenuItem className="text-xs font-bold py-3 cursor-pointer" onClick={() => setActiveTrainingId(training.id)}>
                            <Users size={14} className="mr-2" /> View Participants
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs font-bold py-3 cursor-pointer">
                            <ClipboardCheck size={14} className="mr-2" /> Manage Enrollments
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-brand-500" />
                        {training.start_date ? formatDateTime(training.start_date) : "TBD"}
                      </div>
                      <div className={cn("px-2 py-0.5 rounded uppercase tracking-widest text-[8px]", healthBg, healthText)}>
                        {healthLabel}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black">
                        <span className="text-slate-500">{enrolled} / {max} Seats Filled</span>
                        <span className={healthText}>{Math.round(capacityPct)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", healthColor)} style={{ width: `${Math.min(capacityPct, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </main>

      {/* Participants Bottom Sheet */}
      <Sheet open={!!activeTrainingId} onOpenChange={(open) => !open && setActiveTrainingId(null)}>
        <SheetContent side="bottom" className="rounded-t-[32px] h-[85vh] p-0 bg-white dark:bg-[#0B1020] border-t dark:border-white/5 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 shrink-0">
            <SheetTitle className="text-xl font-black">Participants</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {isLoadingParticipants ? (
              <div className="text-center py-10 text-slate-500 font-bold text-sm">Loading participants...</div>
            ) : activeParticipants?.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-bold text-sm">No participants found.</div>
            ) : (
              activeParticipants?.map((participant: any) => (
                <div key={participant.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {participant.employee?.profile_image_url ? (
                      <img src={participant.employee.profile_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className="text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {participant.employee?.first_name} {participant.employee?.last_name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 truncate">
                      {participant.employee?.designation} &bull; {participant.employee?.department?.name || "Global"}
                    </p>
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                    participant.status === "enrolled" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                    participant.status === "pending" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                    "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400"
                  )}>
                    {participant.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
