import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Building2, BookOpen, Plus, Search, Edit2, CalendarDays, ArrowRight,
  LayoutGrid, ChevronLeft, ChevronRight, ClipboardList, GraduationCap, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { trainingPlanService } from "@/services/trainingPlan.service";
import { trainingsService } from "@/services/trainings.service";
import api from "@/lib/axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { TrainingPlan, Department, PaginatedResponse } from "@/types";
import { TrainingForm } from "../trainings/components/TrainingForm";

// ── Validation Schema for Plan CRUD ──────────────────────────────────────────
const planSchema = z.object({
  training_title: z.string().min(5, "Title must be at least 5 characters"),
  category_id: z.string().uuid("Category is required"),
  planned_date: z.string().min(1, "Planned date is required"),
  department_id: z.string().uuid().optional().nullable().or(z.literal("")),
  description: z.string().optional(),
  financial_year: z.string().min(1, "Financial Year is required"),
});

type PlanFormData = z.infer<typeof planSchema>;

// ── Financial Year Calculation Helper ─────────────────────────────────────────
const getInitialFY = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed, 3 is April
  if (month >= 3) {
    return `FY ${year}-${String(year + 1).slice(2)}`;
  } else {
    return `FY ${year - 1}-${String(year).slice(2)}`;
  }
};

const FY_OPTIONS = [
  "FY 2024-25",
  "FY 2025-26",
  "FY 2026-27",
  "FY 2027-28",
  "FY 2028-29",
];

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

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const formatDateStr = (year: number, month: number, day: number) => {
  const yyyy = year;
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ── UI Components ────────────────────────────────────────────────────────────
function PremiumStatCard({ title, value, icon: Icon, color = "indigo", delay = 0 }: any) {
  const variants: any = {
    indigo: "text-indigo-600 bg-indigo-50/50 border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20",
    emerald: "text-emerald-600 bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    amber: "text-amber-600 bg-amber-50/50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20",
    rose: "text-rose-600 bg-rose-50/50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20",
    slate: "text-slate-600 bg-slate-50/50 border-slate-100 dark:bg-slate-500/10 dark:border-slate-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-[#172036] p-5 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm hover:shadow-md transition-all ring-1 ring-slate-200/50 dark:ring-white/5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", variants[color])}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
      </div>
    </motion.div>
  );
}

export default function DesktopTrainingPlanPage() {
  const queryClient = useQueryClient();
  const [financialYear, setFinancialYear] = useState(getInitialFY);
  const [viewMode, setViewMode] = useState<"year" | "month">("year");
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(3); // April default

  // Selected date for Quick Add
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Dialog Open States
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedPlanForConvert, setSelectedPlanForConvert] = useState<TrainingPlan | null>(null);
  const [isConvertFormOpen, setIsConvertFormOpen] = useState(false);
  
  // Detail Modal for Day in Year View
  const [selectedDayPlans, setSelectedDayPlans] = useState<{ date: string; plans: TrainingPlan[] } | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: plansData } = useQuery({
    queryKey: ["training-plans", financialYear, searchTerm, categoryFilter, departmentFilter, statusFilter],
    queryFn: () => trainingPlanService.list(financialYear, {
      search: searchTerm || undefined,
      category_id: categoryFilter || undefined,
      department_id: departmentFilter || undefined,
      status: statusFilter || undefined,
    }).then(res => res.data.data || []),
  });

  const { data: statsData } = useQuery({
    queryKey: ["training-plans-stats", financialYear],
    queryFn: () => trainingPlanService.getStats(financialYear).then(res => res.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ["training-categories"],
    queryFn: () => trainingsService.listCategories(),
    select: (res: any) => res.data.data,
  });

  const { data: depts } = useQuery({
    queryKey: ["departments-all"],
    queryFn: () => api.get<PaginatedResponse<Department>>("/departments/", { params: { per_page: 100 } }),
    select: (res: any) => res.data.data,
  });

  // ── Form Setup for Quick Add/Edit Plan ──────────────────────────────────────
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      financial_year: financialYear,
    }
  });

  useEffect(() => {
    setValue("financial_year", financialYear);
  }, [financialYear, setValue]);

  useEffect(() => {
    if (editingPlan) {
      reset({
        training_title: editingPlan.training_title,
        category_id: editingPlan.category_id,
        planned_date: editingPlan.planned_date,
        department_id: editingPlan.department_id || "",
        description: editingPlan.description || "",
        financial_year: editingPlan.financial_year,
      });
    } else {
      reset({
        training_title: "",
        category_id: "",
        planned_date: selectedDate || "",
        department_id: "",
        description: "",
        financial_year: financialYear,
      });
    }
  }, [editingPlan, selectedDate, reset, financialYear]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createPlanMutation = useMutation({
    mutationFn: trainingPlanService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plans"] });
      queryClient.invalidateQueries({ queryKey: ["training-plans-stats"] });
      setIsPlanFormOpen(false);
      setSelectedDate(null);
      toast("success", "Planned training created successfully");
    },
    onError: (err: any) => {
      toast("error", "Failed to create training plan", err.response?.data?.message || "Something went wrong");
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TrainingPlan> }) => trainingPlanService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plans"] });
      queryClient.invalidateQueries({ queryKey: ["training-plans-stats"] });
      setIsPlanFormOpen(false);
      setEditingPlan(null);
      toast("success", "Planned training updated successfully");
    },
    onError: (err: any) => {
      toast("error", "Failed to update training plan", err.response?.data?.message || "Something went wrong");
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: trainingPlanService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plans"] });
      queryClient.invalidateQueries({ queryKey: ["training-plans-stats"] });
      setDeleteId(null);
      toast("success", "Planned training deleted successfully");
    },
    onError: (err: any) => {
      toast("error", "Failed to delete training plan", err.response?.data?.message || "Something went wrong");
    }
  });

  const convertPlanMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => trainingPlanService.convert(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plans"] });
      queryClient.invalidateQueries({ queryKey: ["training-plans-stats"] });
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      setIsConvertFormOpen(false);
      setSelectedPlanForConvert(null);
      toast("success", "Planned training converted to live program!");
    },
    onError: (err: any) => {
      toast("error", "Failed to convert training", err.response?.data?.message || "Something went wrong");
    }
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSavePlan = handleSubmit((data) => {
    const formattedData = {
      ...data,
      department_id: data.department_id || null,
    };
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, payload: formattedData });
    } else {
      createPlanMutation.mutate(formattedData);
    }
  });

  const handleEdit = (plan: TrainingPlan) => {
    setEditingPlan(plan);
    setIsPlanFormOpen(true);
  };

  const handleQuickAdd = (dateStr: string) => {
    setEditingPlan(null);
    setSelectedDate(dateStr);
    setIsPlanFormOpen(true);
  };

  const handleConvertTrigger = (plan: TrainingPlan) => {
    setSelectedPlanForConvert(plan);
    setIsConvertFormOpen(true);
  };

  const handleConvertSubmit = (data: any) => {
    if (selectedPlanForConvert) {
      convertPlanMutation.mutate({ id: selectedPlanForConvert.id, payload: data });
    }
  };

  // Maps mapped_date -> plans list
  const plansMap = useMemo(() => {
    const map: Record<string, TrainingPlan[]> = {};
    plansData?.forEach(p => {
      if (!map[p.planned_date]) map[p.planned_date] = [];
      map[p.planned_date].push(p);
    });
    return map;
  }, [plansData]);

  // Current months set based on FY selection
  const months = useMemo(() => getMonthsForFY(financialYear), [financialYear]);

  // Month Index Finder for Jump Action
  const activeMonth = useMemo(() => {
    return months.find(m => m.index === selectedMonthIndex) || months[0];
  }, [months, selectedMonthIndex]);

  // Year View render cell
  const renderYearCalendarCell = (year: number, monthIndex: number, day: number) => {
    const dateStr = formatDateStr(year, monthIndex, day);
    const dayPlans = plansMap[dateStr] || [];
    
    return (
      <div 
        key={day} 
        onClick={() => {
          if (dayPlans.length > 0) {
            setSelectedDayPlans({ date: dateStr, plans: dayPlans });
          } else {
            handleQuickAdd(dateStr);
          }
        }}
        className={cn(
          "h-7 w-7 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold cursor-pointer transition-all border border-transparent hover:border-indigo-400 hover:bg-indigo-50/20 dark:hover:bg-indigo-500/10 relative",
          dayPlans.length > 0 ? "bg-slate-100/50 dark:bg-white/[0.04] text-slate-900 dark:text-white" : "text-slate-400"
        )}
      >
        <span>{day}</span>
        {dayPlans.length > 0 && (
          <div className="absolute bottom-1 flex gap-0.5 justify-center">
            {dayPlans.slice(0, 3).map((p) => {
              const dotColor = p.status === "Converted" ? "bg-orange-500" : p.status === "Completed" ? "bg-emerald-500" : "bg-blue-500";
              return <span key={p.id} className={cn("w-1 h-1 rounded-full", dotColor)} />;
            })}
          </div>
        )}
      </div>
    );
  };

  // Convert payload mapping for pre-populating TrainingForm
  const convertInitialData = useMemo(() => {
    if (!selectedPlanForConvert) return null;
    return {
      title: selectedPlanForConvert.training_title,
      description: selectedPlanForConvert.description,
      category_id: selectedPlanForConvert.category_id,
      start_date: selectedPlanForConvert.planned_date,
      end_date: selectedPlanForConvert.planned_date,
      departments: selectedPlanForConvert.department_id ? [{ id: selectedPlanForConvert.department_id }] : [],
      is_global: !selectedPlanForConvert.department_id,
    } as any;
  }, [selectedPlanForConvert]);

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] transition-colors duration-500 px-4 lg:px-8 pt-4 lg:pt-8 pb-12">
      <div className="max-w-[1600px] mx-auto space-y-4 animate-in fade-in duration-700">
        
        {/* ── Premium Hero Header ─────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white via-indigo-50/30 to-slate-50 dark:from-[#172036] dark:via-indigo-950/10 dark:to-[#0B1020] border border-[#EEF2FF] dark:border-white/5 p-4 lg:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-400/5 dark:bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-400/5 dark:bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 id-x38721 rounded-full bg-white/80 dark:bg-white/5 border border-[#EEF2FF] dark:border-white/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest mb-4 backdrop-blur-md shadow-sm"
              >
                <ClipboardList size={12} className="text-brand-500 dark:text-brand-400" /> Annual Strategic Planner
              </motion.div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tighter mb-1 leading-tight text-slate-900 dark:text-white">
                Training Plan Orchestration
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg font-medium leading-relaxed">
                Design and coordinate corporate development initiatives for the upcoming fiscal calendar.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Select 
                value={financialYear} 
                onChange={(e) => setFinancialYear(e.target.value)}
                className="h-10 w-44 rounded-xl text-xs font-black bg-white dark:bg-[#172036] border-slate-200 dark:border-white/10 shadow-sm"
              >
                {FY_OPTIONS.map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </Select>
              <Button 
                onClick={() => handleQuickAdd("")} 
                className="h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 text-white font-black text-xs"
              >
                <Plus size={16} className="mr-2" />
                Schedule Plan
              </Button>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PremiumStatCard
            title="Total Planned"
            value={statsData?.total_planned ?? 0}
            icon={BookOpen}
            color="indigo"
            delay={0.1}
          />
          <PremiumStatCard
            title="Converted Trainings"
            value={statsData?.converted ?? 0}
            icon={ArrowRight}
            color="amber"
            delay={0.2}
          />
          <PremiumStatCard
            title="Completed Trainings"
            value={statsData?.completed ?? 0}
            icon={Users}
            color="emerald"
            delay={0.3}
          />
          <PremiumStatCard
            title="Pending Scheduled"
            value={statsData?.pending ?? 0}
            icon={Clock}
            color="slate"
            delay={0.4}
          />
        </div>

        {/* ── Planning Workspace Board ────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm mt-6">
          <div className="p-5 border-b border-[#EEF2FF] dark:border-white/[0.07] flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode("year")}
                className={cn(
                  "h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1.5 transition-all",
                  viewMode === "year" ? "bg-white dark:bg-[#172036] shadow-sm text-brand-600" : "text-slate-400"
                )}
              >
                <LayoutGrid size={12} /> FY Year View
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode("month")}
                className={cn(
                  "h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1.5 transition-all",
                  viewMode === "month" ? "bg-white dark:bg-[#172036] shadow-sm text-brand-600" : "text-slate-400"
                )}
              >
                <CalendarDays size={12} /> Monthly Planner
              </Button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 md:ml-auto">
              <div className="relative group min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={13} />
                <Input 
                  placeholder="Search planned tracks..." 
                  className="pl-8 h-9 bg-slate-50 dark:bg-white/[0.04] border-slate-200/60 dark:border-white/[0.06] focus-visible:bg-white rounded-xl text-xs font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 w-40 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/10"
              >
                <option value="">All Categories</option>
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>

              <Select 
                value={departmentFilter} 
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="h-9 w-40 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/10"
              >
                <option value="">All Departments</option>
                {depts?.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>

              <Select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-32 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/10"
              >
                <option value="">All Status</option>
                <option value="Planned">Planned</option>
                <option value="Converted">Converted</option>
                <option value="Completed">Completed</option>
              </Select>
            </div>
          </div>

          <div className="p-6">
            {viewMode === "year" ? (
              /* ── YEAR VIEW GRID (12 MONTHS starting from April) ────────────────── */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {months.map(m => {
                  const daysInMonth = getDaysInMonth(m.year, m.index);
                  const firstDay = getFirstDayOfMonth(m.year, m.index);
                  const blanks = Array(firstDay).fill(null);
                  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                  return (
                    <motion.div 
                      key={m.name}
                      whileHover={{ scale: 1.01 }}
                      className="bg-slate-50/50 dark:bg-white/[0.01] rounded-[20px] border border-[#EEF2FF] dark:border-white/5 p-4 flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-white/5 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-1.5">
                          <CalendarDays size={13} className="text-indigo-500" /> {m.name} {m.year}
                        </h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedMonthIndex(m.index);
                            setViewMode("month");
                          }}
                          className="h-6 px-2 text-[8px] rounded-md font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                        >
                          Planner
                        </Button>
                      </div>

                      {/* Calendar mini-headers */}
                      <div className="grid grid-cols-7 gap-1 text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1 text-center">
                        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                      </div>

                      {/* Calendar days grid */}
                      <div className="grid grid-cols-7 gap-1 text-center justify-items-center">
                        {blanks.map((_, i) => (
                          <div key={`blank-${i}`} className="h-7 w-7" />
                        ))}
                        {days.map(d => renderYearCalendarCell(m.year, m.index, d))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* ── MONTH VIEW INTERACTIVE PLANNER ───────────────────────────────── */
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => {
                        const currentPos = months.findIndex(m => m.index === selectedMonthIndex);
                        const prevPos = (currentPos - 1 + 12) % 12;
                        setSelectedMonthIndex(months[prevPos].index);
                      }}
                      className="h-8 w-8 rounded-lg border-slate-200 dark:border-white/10"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white min-w-[120px] text-center">
                      {activeMonth.name} {activeMonth.year}
                    </h3>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => {
                        const currentPos = months.findIndex(m => m.index === selectedMonthIndex);
                        const nextPos = (currentPos + 1) % 12;
                        setSelectedMonthIndex(months[nextPos].index);
                      }}
                      className="h-8 w-8 rounded-lg border-slate-200 dark:border-white/10"
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>

                {/* Big Interactive Grid */}
                <div className="grid grid-cols-7 gap-2 bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-3xl p-4">
                  {/* Calendar Headers */}
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => (
                    <div key={d} className="text-center font-black uppercase tracking-widest text-[9px] text-slate-400 py-1">{d}</div>
                  ))}

                  {/* Calendar Days */}
                  {Array(getFirstDayOfMonth(activeMonth.year, activeMonth.index)).fill(null).map((_, i) => (
                    <div key={`blank-${i}`} className="min-h-[120px] bg-slate-100/10 rounded-xl" />
                  ))}

                  {Array.from({ length: getDaysInMonth(activeMonth.year, activeMonth.index) }, (_, i) => i + 1).map(day => {
                    const dateStr = formatDateStr(activeMonth.year, activeMonth.index, day);
                    const dayPlans = plansMap[dateStr] || [];

                    return (
                      <div 
                        key={day} 
                        onClick={(e) => {
                          if (e.target === e.currentTarget) handleQuickAdd(dateStr);
                        }}
                        className="min-h-[120px] bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-white/5 p-2 flex flex-col space-y-1.5 transition-all group relative hover:border-indigo-400 hover:shadow-sm cursor-pointer"
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                          <span>{day}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleQuickAdd(dateStr)}
                            className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-opacity"
                          >
                            <Plus size={10} className="text-slate-400" />
                          </Button>
                        </div>

                        {/* List of cards */}
                        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide max-h-[85px]">
                          {dayPlans.map(plan => {
                            const badgeColor = plan.status === "Converted" ? "bg-orange-500/10 text-orange-600 border-orange-200" : plan.status === "Completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-blue-500/10 text-blue-600 border-blue-200";
                            return (
                              <div 
                                key={plan.id}
                                onClick={(e) => { e.stopPropagation(); handleEdit(plan); }}
                                className={cn("p-1 px-2 border rounded-lg text-[9px] font-bold select-none cursor-pointer flex flex-col gap-0.5 hover:shadow-sm leading-tight transition-all", badgeColor)}
                              >
                                <span className="truncate">{plan.training_title}</span>
                                <div className="flex items-center justify-between text-[7px] opacity-85">
                                  <span>{plan.category?.name || "General"}</span>
                                  {plan.status === "Planned" && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleConvertTrigger(plan); }}
                                      className="ml-auto font-black text-indigo-600 hover:text-indigo-800 tracking-tight"
                                    >
                                      Convert →
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Statistics / Departments List ────────────────────────────────── */}
        <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm p-6 mt-6">
          <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-indigo-500" /> Department Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {statsData?.department_wise_counts && statsData.department_wise_counts.length > 0 ? (
              statsData.department_wise_counts.map(d => (
                <div key={d.department_name} className="p-4 bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 truncate">{d.department_name}</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-800 dark:text-white">{d.count}</span>
                    <span className="text-[9px] text-slate-400 font-bold">Planned Track{d.count > 1 ? "s" : ""}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs font-bold text-slate-400 col-span-full italic">No department distributions recorded for this financial year.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Plan Form Dialog ──────────────────────────────────────────────── */}
      <Dialog open={isPlanFormOpen} onOpenChange={setIsPlanFormOpen}>
        <DialogContent className="max-w-md rounded-[28px] p-6 border-none shadow-2xl bg-white dark:bg-[#172036]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays size={20} className="text-brand-500" />
              {editingPlan ? "Refine Training Plan" : "Draft Training Plan"}
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

            <div className="flex gap-2 justify-end pt-3">
              {editingPlan && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteId(editingPlan.id)}
                  className="h-10 px-4 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  Delete
                </Button>
              )}
              {editingPlan && editingPlan.status === "Planned" && (
                <Button 
                  type="button" 
                  onClick={() => { setIsPlanFormOpen(false); handleConvertTrigger(editingPlan); }}
                  className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs"
                >
                  Convert
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                className="h-10 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs"
              >
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Day Details Dialog (Year View) ─────────────────────────────── */}
      <Dialog open={!!selectedDayPlans} onOpenChange={(open) => !open && setSelectedDayPlans(null)}>
        <DialogContent className="max-w-md rounded-[28px] p-6 border-none shadow-2xl bg-white dark:bg-[#172036]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays size={20} className="text-indigo-500" />
              Plans: {selectedDayPlans?.date}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-4 max-h-[300px] overflow-y-auto pr-1">
            {selectedDayPlans?.plans.map(plan => {
              const statusColor = plan.status === "Converted" ? "bg-orange-500/10 text-orange-600 border-orange-200" : plan.status === "Completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-blue-500/10 text-blue-600 border-blue-200";
              return (
                <div key={plan.id} className={cn("p-3 border rounded-xl flex items-center justify-between gap-3 shadow-sm", statusColor)}>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black truncate">{plan.training_title}</span>
                    <span className="text-[8px] font-bold opacity-80 uppercase tracking-widest mt-0.5">{plan.category?.name || "General"}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setSelectedDayPlans(null); handleEdit(plan); }}
                      className="h-8 w-8 hover:bg-slate-50 rounded-lg"
                    >
                      <Edit2 size={13} />
                    </Button>
                    {plan.status === "Planned" && (
                      <Button 
                        size="sm" 
                        onClick={() => { setSelectedDayPlans(null); handleConvertTrigger(plan); }}
                        className="h-8 text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white rounded-lg px-2"
                      >
                        Convert
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-3">
            <Button 
              onClick={() => { 
                if (selectedDayPlans) {
                  const d = selectedDayPlans.date;
                  setSelectedDayPlans(null);
                  handleQuickAdd(d);
                }
              }}
              className="h-10 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs"
            >
              Add Planned Training
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Conversion Dialog (Eagerly loads TrainingForm) ───────────────── */}
      <Dialog open={isConvertFormOpen} onOpenChange={setIsConvertFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-none shadow-2xl bg-white dark:bg-[#0B1020]">
          <div className="bg-slate-950 p-10 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
              <GraduationCap size={240} />
            </div>
            <div className="relative z-10">
              <DialogTitle className="text-3xl font-black mb-2">Publish Planned Training</DialogTitle>
              <DialogDescription className="text-slate-400 text-lg">
                Complete the operational and trainer details to convert <strong>{selectedPlanForConvert?.training_title}</strong> into a live scheduled training.
              </DialogDescription>
            </div>
          </div>
          
          <div className="p-10">
            {convertInitialData && (
              <TrainingForm 
                initialData={convertInitialData} 
                onSubmit={handleConvertSubmit}
                onCancel={() => setIsConvertFormOpen(false)}
                isLoading={convertPlanMutation.isPending}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────── */}
      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Purge Training Plan"
        description="Are you sure you want to remove this planned training from the annual calendar? This is irreversible."
        onConfirm={() => {
          if (deleteId) {
            deletePlanMutation.mutate(deleteId);
            setIsPlanFormOpen(false);
          }
        }}
        isLoading={deletePlanMutation.isPending}
        variant="destructive"
        confirmText="Remove Plan"
      />
    </div>
  );
}
