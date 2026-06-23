import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Building2, BookOpen, Plus, Search, Edit2, CalendarDays,
  LayoutGrid, ChevronLeft, ChevronRight, ClipboardList, Filter, Trash2, MoreHorizontal
} from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { trainingPlanService } from "@/services/trainingPlan.service";
import api from "@/lib/axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/Sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { TrainingPlan, Department, PaginatedResponse } from "@/types";

// ── Financial Year Calculation Helper ─────────────────────────────────────────
const getInitialFY = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 3) {
    return `FY ${year}-${String(year + 1).slice(2)}`;
  } else {
    return `FY ${year - 1}-${String(year).slice(2)}`;
  }
};

const FY_OPTIONS = ["FY 2024-25", "FY 2025-26", "FY 2026-27", "FY 2027-28"];

const getMonthsForFY = (fy: string) => {
  const startYear = parseInt(fy.split(" ")[1].split("-")[0]);
  const endYear = startYear + 1;
  return [
    { index: 3, year: startYear, name: "April" },
    { index: 4, year: startYear, name: "May" },
    { index: 5, year: startYear, name: "June" },
    { index: 6, year: startYear, name: "July" },
    { index: 7, year: startYear, name: "August" },
    { index: 8, year: startYear, name: "September" },
    { index: 9, year: startYear, name: "October" },
    { index: 10, year: startYear, name: "November" },
    { index: 11, year: startYear, name: "December" },
    { index: 0, year: endYear, name: "January" },
    { index: 1, year: endYear, name: "February" },
    { index: 2, year: endYear, name: "March" }
  ];
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

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

const planSchema = z.object({
  training_title: z.string().min(5, "Title must be at least 5 characters"),
  category_id: z.string().uuid("Category is required"),
  planned_date: z.string().min(1, "Planned date is required"),
  department_id: z.string().uuid().optional().nullable().or(z.literal("")),
  description: z.string().optional(),
  financial_year: z.string().min(1, "Financial Year is required"),
});

type PlanFormData = z.infer<typeof planSchema>;

export default function MobileTrainingPlanPage() {
  const qc = useQueryClient();
  const [financialYear, setFinancialYear] = useState(getInitialFY);
  const [activeTab, setActiveTab] = useState<"overview" | "calendar" | "plans">("overview");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Calendar State
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(3); // Default April
  const [selectedDayPlans, setSelectedDayPlans] = useState<{ date: string; plans: TrainingPlan[] } | null>(null);

  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      financial_year: financialYear,
    }
  });

  const createPlanMutation = useMutation({
    mutationFn: trainingPlanService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-plans"] });
      qc.invalidateQueries({ queryKey: ["analytics-summary"] });
      reset();
      setIsPlanFormOpen(false);
      toast("success", "Planned training created successfully");
    },
    onError: (err: any) => {
      toast("error", "Failed to create training plan", err.response?.data?.message || "Something went wrong");
    }
  });

  const handleSavePlan = handleSubmit((data) => {
    const formattedData = {
      ...data,
      department_id: data.department_id || null,
    };
    createPlanMutation.mutate(formattedData);
  });

  // Queries
  const { data: plansData, isLoading } = useQuery({
    queryKey: ["training-plans", financialYear, searchTerm, categoryFilter, departmentFilter, statusFilter],
    queryFn: () => trainingPlanService.list(financialYear, {
      search: searchTerm || undefined,
      category_id: categoryFilter || undefined,
      department_id: departmentFilter || undefined,
      status: statusFilter || undefined,
      per_page: 500, // Load all for the FY planner
    }),
    select: (res) => res.data.data,
  });

  const { data: depts } = useQuery({
    queryKey: ["departments-all"],
    queryFn: () => api.get<PaginatedResponse<Department>>("/departments/", { params: { per_page: 100 } }),
    select: (res) => res.data.data,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-all"],
    queryFn: () => api.get<PaginatedResponse<any>>("/categories/", { params: { per_page: 100 } }),
    select: (res) => res.data.data,
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    const plans = plansData || [];
    return {
      planned: plans.filter((p: any) => p.status === "Planned").length,
      converted: plans.filter((p: any) => p.status === "Converted").length,
      completed: plans.filter((p: any) => p.status === "Completed").length,
    };
  }, [plansData]);

  // Derived Calendar Data
  const months = getMonthsForFY(financialYear);
  const currentMonthData = months.find(m => m.index === selectedMonthIndex) || months[0];

  const handleNextMonth = () => {
    const currentIdx = months.findIndex(m => m.index === selectedMonthIndex);
    if (currentIdx < months.length - 1) setSelectedMonthIndex(months[currentIdx + 1].index);
  };

  const handlePrevMonth = () => {
    const currentIdx = months.findIndex(m => m.index === selectedMonthIndex);
    if (currentIdx > 0) setSelectedMonthIndex(months[currentIdx - 1].index);
  };

  // Distribution Chart
  const departmentCount = useMemo(() => {
    if (!plansData) return [];
    const counts: Record<string, number> = {};
    plansData.forEach((p: any) => {
      const deptName = p.department?.name || "Global";
      counts[deptName] = (counts[deptName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [plansData]);
  const chartColors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1020] pb-24 text-slate-900 dark:text-slate-100 overflow-x-hidden">
      
      {/* SECTION 1: Mobile Header (Max 80px) */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0B1020]/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 px-4 h-[72px] flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-1.5">
            <ClipboardList size={18} className="text-brand-500" /> Training Plan
          </h1>
          <select 
            value={financialYear} 
            onChange={(e) => setFinancialYear(e.target.value)}
            className="bg-transparent text-[10px] font-black uppercase text-slate-400 tracking-widest border-none p-0 focus:ring-0 appearance-none"
          >
            {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>
        <Button size="sm" className="h-9 rounded-xl font-bold text-xs bg-brand-600 hover:bg-brand-700 text-white px-4 shadow-md shadow-brand-500/20" onClick={() => setIsPlanFormOpen(true)}>
          <Plus size={14} className="mr-1.5" /> Plan
        </Button>
      </header>

      {/* SECTION 2: Tab Layout */}
      <div className="flex border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#172036] px-2 sticky top-[72px] z-20">
        {[
          { id: "overview", label: "Overview", icon: LayoutGrid },
          { id: "calendar", label: "Calendar", icon: CalendarDays },
          { id: "plans", label: "Plans", icon: BookOpen }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold uppercase tracking-widest relative transition-colors",
              activeTab === tab.id ? "text-brand-600 dark:text-brand-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* =========================================================================
            TAB 1: OVERVIEW
            ========================================================================= */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            
            {/* Swipeable KPIs */}
            <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar flex gap-3 pb-1">
              <SwipeKPI title="Planned" value={kpis.planned} icon={ClipboardList} colorClass={{ bg: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" }} />
              <SwipeKPI title="Converted" value={kpis.converted} icon={CalendarDays} colorClass={{ bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }} />
              <SwipeKPI title="Completed" value={kpis.completed} icon={BookOpen} colorClass={{ bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }} />
            </div>

            {/* FY Progress Card */}
            <div className="bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 p-4 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Financial Year Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-600 dark:text-slate-300">Planned to Converted</span>
                    <span className="text-amber-600 dark:text-amber-400">{kpis.converted}/{kpis.planned}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${kpis.planned > 0 ? (kpis.converted / kpis.planned) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-600 dark:text-slate-300">Converted to Completed</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{kpis.completed}/{kpis.converted}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${kpis.converted > 0 ? (kpis.completed / kpis.converted) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Department Distribution Donut */}
            {departmentCount.length > 0 && (
              <div className="bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 p-4 shadow-sm h-[200px] flex items-center justify-between">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={departmentCount} innerRadius="60%" outerRadius="80%" paddingAngle={2} dataKey="value" stroke="none">
                        {departmentCount.map((_, index) => <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', padding: '4px 8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 flex flex-col justify-center gap-2 pl-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dept Allocation</h3>
                  {departmentCount.slice(0, 3).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] font-bold">
                      <span className="truncate text-slate-600 dark:text-slate-300 pr-2">{d.name}</span>
                      <span className="text-slate-900 dark:text-white">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Trainings (Next 3) */}
            <div className="bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 p-4 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Upcoming Programs</h3>
              <div className="space-y-3">
                {plansData?.filter((p: any) => p.status === "Converted").slice(0, 3).map((plan: any) => (
                  <div key={plan.id} className="flex gap-3 relative pl-4 border-l-2 border-brand-100 dark:border-brand-500/20 py-1">
                    <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-brand-500" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 mb-0.5">{plan.planned_date}</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{plan.training_title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{plan.department?.name || "Global"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            TAB 2: CALENDAR
            ========================================================================= */}
        {activeTab === "calendar" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 p-4 shadow-sm">
            
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0" disabled={months.findIndex(m => m.index === selectedMonthIndex) === 0}>
                <ChevronLeft size={16} />
              </Button>
              <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                {currentMonthData.name} {currentMonthData.year}
              </h3>
              <Button variant="ghost" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0" disabled={months.findIndex(m => m.index === selectedMonthIndex) === months.length - 1}>
                <ChevronRight size={16} />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-[10px] font-black uppercase text-slate-400 py-1">{day}</div>
              ))}
              
              {/* Blank days before month start */}
              {Array.from({ length: getFirstDayOfMonth(currentMonthData.year, currentMonthData.index) }).map((_, i) => (
                <div key={`blank-${i}`} className="h-10" />
              ))}
              
              {/* Days */}
              {Array.from({ length: getDaysInMonth(currentMonthData.year, currentMonthData.index) }).map((_, i) => {
                const dayStr = String(i + 1).padStart(2, "0");
                const monthStr = String(currentMonthData.index + 1).padStart(2, "0");
                const dateStr = `${currentMonthData.year}-${monthStr}-${dayStr}`;
                const dayPlans = plansData?.filter((p: any) => p.planned_date.startsWith(dateStr));
                const hasPlans = dayPlans && dayPlans.length > 0;
                
                return (
                  <button 
                    key={i} 
                    onClick={() => hasPlans && setSelectedDayPlans({ date: dateStr, plans: dayPlans })}
                    className={cn(
                      "h-10 rounded-xl text-xs font-bold flex flex-col items-center justify-center relative active:scale-95 transition-transform",
                      hasPlans ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                    )}
                  >
                    {i + 1}
                    {hasPlans && (
                      <div className="absolute bottom-1.5 flex gap-0.5">
                        {dayPlans.slice(0, 3).map((p: any, idx: number) => (
                          <div key={idx} className={cn("w-1 h-1 rounded-full", p.status === "Completed" ? "bg-emerald-500" : p.status === "Converted" ? "bg-amber-500" : "bg-brand-500")} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            TAB 3: PLANS
            ========================================================================= */}
        {activeTab === "plans" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            
            {/* Search & Filter Drawer */}
            <div className="flex gap-2 sticky top-[120px] z-10 bg-slate-50 dark:bg-[#0B1020] py-1">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-[#172036] border-slate-200 dark:border-white/5 text-sm font-medium shadow-sm w-full"
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className={cn(
                    "h-10 w-10 rounded-xl shrink-0 p-0 shadow-sm border-slate-200 dark:border-white/5",
                    (statusFilter || departmentFilter || categoryFilter) ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400" : "bg-white dark:bg-[#172036]"
                  )}>
                    <Filter size={16} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-[32px] p-6 pb-12 bg-white dark:bg-[#0B1020]">
                  <SheetHeader className="mb-6">
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4">
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-12 rounded-xl">
                      <option value="">All Statuses</option>
                      <option value="Planned">Planned</option>
                      <option value="Converted">Converted</option>
                      <option value="Completed">Completed</option>
                    </Select>
                    <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="h-12 rounded-xl">
                      <option value="">All Departments</option>
                      {depts?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                    <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-12 rounded-xl">
                      <option value="">All Categories</option>
                      {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    {(statusFilter || departmentFilter || categoryFilter) && (
                      <SheetClose asChild>
                        <Button variant="outline" onClick={() => { setStatusFilter(""); setDepartmentFilter(""); setCategoryFilter(""); }} className="w-full h-12 rounded-xl border-rose-200 text-rose-500 mt-2">Clear Filters</Button>
                      </SheetClose>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Plans List */}
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#172036] animate-pulse" />)
            ) : (
              plansData?.map((plan: any) => (
                <div key={plan.id} className="bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 p-4 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{plan.training_title}</h3>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{plan.planned_date}</p>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                      plan.status === "Completed" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                      plan.status === "Converted" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                      "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
                    )}>
                      {plan.status}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1"><Building2 size={10} /> {plan.department?.name || "Global"}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-lg text-slate-400"><MoreHorizontal size={14} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32 rounded-xl p-1">
                        <DropdownMenuItem className="text-xs font-bold py-2"><Edit2 size={12} className="mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold py-2 text-rose-500"><Trash2 size={12} className="mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

      </div>

      {/* Selected Day Bottom Sheet (Calendar View) */}
      <Sheet open={!!selectedDayPlans} onOpenChange={(open) => !open && setSelectedDayPlans(null)}>
        <SheetContent side="bottom" className="rounded-t-[32px] p-6 bg-white dark:bg-[#0B1020]">
          <SheetHeader className="mb-4">
            <SheetTitle>{selectedDayPlans?.date}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            {selectedDayPlans?.plans.map(plan => (
              <div key={plan.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{plan.training_title}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-slate-500">{plan.department?.name || "Global"}</span>
                  <span className={cn("text-[9px] font-black uppercase", plan.status === "Completed" ? "text-emerald-500" : "text-amber-500")}>{plan.status}</span>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Plan Dialog */}
      <Dialog open={isPlanFormOpen} onOpenChange={setIsPlanFormOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-[28px] p-6 border-none shadow-2xl bg-white dark:bg-[#172036]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays size={20} className="text-brand-500" />
              Draft Training Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Specify planning parameters for this strategic annual training.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Training Title *</label>
              <Input 
                placeholder="e.g. Advanced Deep Learning"
                {...register("training_title")}
                className="h-10 bg-slate-50/50 dark:bg-white/5"
              />
              {errors.training_title && <p className="text-[10px] font-bold text-rose-500">{errors.training_title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category *</label>
                <Select 
                  {...register("category_id")}
                  className="h-10 bg-slate-50/50 dark:bg-white/5 text-xs font-bold"
                >
                  <option value="">Select Category</option>
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
                {errors.category_id && <p className="text-[10px] font-bold text-rose-500">{errors.category_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Date *</label>
                <Input 
                  type="date"
                  {...register("planned_date")}
                  className="h-10 bg-slate-50/50 dark:bg-white/5 text-xs font-bold"
                />
                {errors.planned_date && <p className="text-[10px] font-bold text-rose-500">{errors.planned_date.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department (Optional)</label>
                <Select 
                  {...register("department_id")}
                  className="h-10 bg-slate-50/50 dark:bg-white/5 text-xs font-bold"
                >
                  <option value="">Global / All</option>
                  {depts?.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Year *</label>
                <Input 
                  readOnly
                  {...register("financial_year")}
                  className="h-10 bg-slate-100 dark:bg-white/5 text-xs font-bold opacity-60 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objectives / Description</label>
              <Textarea 
                placeholder="Brief summary of skills to be covered..."
                {...register("description")}
                className="h-20 bg-slate-50/50 dark:bg-white/5 text-xs font-bold"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsPlanFormOpen(false)} className="flex-1 h-12 rounded-xl text-xs font-black">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-black" isLoading={createPlanMutation.isPending}>
                Save Plan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
