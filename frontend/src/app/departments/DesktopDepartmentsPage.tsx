import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, 
  Plus, 
  Search, 
  MoreHorizontal,
  Edit2,
  Trash2,
  Users,
  Clock,
  ExternalLink,
  TrendingUp,
  LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { departmentsService } from "@/services/departments.service";
import { analyticsService } from "@/services/analytics.service";
import { Table, type Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { toast } from "@/components/ui/Toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/DropdownMenu";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import type { Department } from "@/types";

import { DepartmentDrawer } from "./components/DepartmentDrawer";
import { DepartmentDetailDrawer } from "./components/DepartmentDetailDrawer";

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
          <span className="text-[10px] font-bold text-slate-300">Total</span>
        </div>
      </div>
      <div className={cn("absolute bottom-0 left-6 right-6 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity", 
        variant === "indigo" ? "bg-indigo-500/20" : 
        variant === "emerald" ? "bg-emerald-500/20" : 
        variant === "amber" ? "bg-amber-500/20" : "bg-rose-500/20"
      )} />
    </motion.div>
  );
}

export default function DesktopDepartmentsPage() {
  const qc = useQueryClient();
  const { page, perPage, nextPage, prevPage, reset } = usePagination();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["departments", page, perPage, debouncedSearch],
    queryFn: () =>
      departmentsService.list({
        page,
        per_page: perPage,
        search: debouncedSearch || undefined,
      }),
    select: (res) => res.data,
  });

  const { data: stats } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsService.getSummary(),
    select: (res) => res.data.data,
  });

  const deleteMutation = useMutation({
    mutationFn: departmentsService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["analytics-summary"] });
      setDeleteId(null);
      toast("success", "Department Deleted", "The department was permanently removed.");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.detail || "An error occurred.";
      toast("error", "Failed to delete", msg);
    }
  });

  const handleEdit = (dept: Department) => {
    setSelectedDepartment(dept);
    setIsDetailOpen(false);
    setIsDrawerOpen(true);
  };

  const handleAddNew = () => {
    setSelectedDepartment(null);
    setIsDrawerOpen(true);
  };

  const handleView = (dept: Department) => {
    setSelectedDepartment(dept);
    setIsDetailOpen(true);
  };


  const columns: Column<Department>[] = [
    { 
      key: "name",  
      label: "Department", 
      className: "min-w-[300px]",
      render: (r) => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 rounded-[14px] bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
            <Building2 size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-900 dark:text-white leading-tight">{r.name}</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-0.5 font-mono">{r.code}</span>
          </div>
        </div>
      )
    },
    { 
      key: "description", 
      label: "Overview",
      className: "max-w-[400px]",
      render: (r) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
          {r.description || "No description provided."}
        </span>
      )
    },
    { 
      key: "employee_count", 
      label: "Workforce",
      render: (r) => (
        <div className="flex items-center gap-2 py-1">
          <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
            <Users size={14} />
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{r.employee_count || 0}</span>
        </div>
      )
    },
    { 
      key: "total_training_hours", 
      label: "Learning Hours",
      render: (r) => (
        <div className="flex items-center gap-2 py-1">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Clock size={14} />
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{(r.total_training_hours || 0).toFixed(1)}</span>
        </div>
      )
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
              <MoreHorizontal size={18} className="text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-xl border-slate-200 dark:border-white/10">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Department Actions</DropdownMenuLabel>
            <DropdownMenuItem className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5" onClick={() => handleView(r)}>
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600">
                <ExternalLink size={14} />
              </div>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5" onClick={() => handleEdit(r)}>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Edit2 size={14} />
              </div>
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 opacity-50" />
            <DropdownMenuItem 
              className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5 text-destructive focus:text-destructive focus:bg-red-50 dark:focus:bg-red-950/20"
              onClick={() => setDeleteId(r.id)}
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
                <Trash2 size={14} />
              </div>
              Remove Unit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

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
                <Building2 size={12} className="text-brand-500 dark:text-brand-400" /> Organizational Units
              </motion.div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tighter mb-1 leading-tight text-slate-900 dark:text-white">
                Department Management
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg font-medium leading-relaxed">
                Structure your organization, monitor departmental headcounts, and analyze learning performance across units.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              <Button onClick={handleAddNew} className="h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all font-bold text-xs text-white">
                <Plus size={16} className="mr-2" /> 
                Create Department
              </Button>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <PremiumStatCard
            title="Total Departments"
            value={data?.meta?.total ?? 0}
            icon={Building2}
            insight="+2"
            insightLabel="This Quarter"
            variant="indigo"
            delay={0.1}
          />
          <PremiumStatCard
            title="Active Workforce"
            value={stats?.total_employees ?? 0}
            icon={Users}
            insight="98.5%"
            insightLabel="Allocation"
            variant="emerald"
            delay={0.2}
          />
          <PremiumStatCard
            title="Avg Learning Time"
            value={data?.data?.length ? (data.data.reduce((acc, d) => acc + (d.total_training_hours || 0), 0) / data.data.length).toFixed(1) : "0.0"}
            icon={Clock}
            insight="Hours"
            insightLabel="Per Unit"
            variant="amber"
            delay={0.3}
          />
        </div>

        {/* ── Integrated Admin Suite (Toolbar + Table) ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500">

          {/* STICKY HEADER BLOCK */}
          <div className="sticky top-0 z-20 bg-white dark:bg-[#172036] rounded-t-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            
            {/* Filter Bar */}
            <div className="bg-white dark:bg-[#172036] border-b border-[#EEF2FF] dark:border-white/[0.07] px-5 py-3 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative flex-1 lg:max-w-sm group">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                  </div>
                  <Input
                    placeholder="Search departments..."
                    className="pl-9 h-9 w-full bg-slate-50 dark:bg-white/[0.04] border-slate-200/60 dark:border-white/[0.06] focus-visible:bg-white dark:focus-visible:bg-[#0B1020] focus-visible:ring-2 focus-visible:ring-indigo-500/20 rounded-xl transition-all font-medium text-[13px] placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); reset(); }}
                  />
                  {searchTerm && (
                    <button onClick={() => { setSearchTerm(""); reset(); }} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                      <span className="text-xs">✕</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 lg:ml-auto">
                   <div className="hidden sm:flex items-center gap-1.5 h-9 px-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    <LayoutGrid size={11} strokeWidth={2.5} />
                    View Modes
                  </div>
                  
                  {data?.meta && (
                    <div className="flex items-center gap-1.5 h-9 px-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="text-slate-700 dark:text-white">{data.meta.total}</span>
                      <span>Records</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column Header Row */}
            <div className="hidden md:flex bg-slate-50 dark:bg-white/[0.02] border-b border-[#EEF2FF] dark:border-white/[0.07] px-2">
              <div className="flex-[3] min-w-[300px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Department Profile</div>
              <div className="flex-[4] min-w-[400px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Functional Overview</div>
              <div className="flex-1 min-w-[120px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Workforce</div>
              <div className="flex-1 min-w-[150px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Learning Hrs</div>
              <div className="w-[56px]" />
            </div>
          </div>

          {/* Table Content */}
          <div className="relative z-0">
            <Table
              columns={columns}
              data={data?.data ?? []}
              isLoading={isLoading}
              keyExtractor={(r) => r.id}
              hideHeader
              emptyTitle="No departments found"
              emptyDescription="Start by creating your first organizational unit."
              className="border-none shadow-none rounded-none"
            />
          </div>

          {/* Pagination Footer */}
          {data?.meta && data.meta.total_pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-[#EEF2FF] dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] rounded-b-[24px]">
              <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 sm:mb-0">
                Showing <span className="text-slate-800 dark:text-white">{data.data.length}</span> of <span className="text-slate-800 dark:text-white">{data.meta.total}</span> units
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="h-8 px-3.5 rounded-lg font-bold text-xs text-slate-500" disabled={data.meta.page === 1} onClick={prevPage}>
                  ← Previous
                </Button>
                <div className="flex items-center justify-center h-8 px-3 rounded-lg bg-indigo-600 text-white text-[11px] font-black min-w-[56px]">
                  {data.meta.page} / {data.meta.total_pages}
                </div>
                <Button variant="ghost" size="sm" className="h-8 px-3.5 rounded-lg font-bold text-xs text-slate-500" disabled={data.meta.page === data.meta.total_pages} onClick={nextPage}>
                  Next →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isDrawerOpen && (
          <DepartmentDrawer 
            open={isDrawerOpen} 
            onOpenChange={setIsDrawerOpen} 
            department={selectedDepartment} 
          />
        )}
      </AnimatePresence>

      <DepartmentDetailDrawer
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        department={selectedDepartment}
        onEdit={handleEdit}
      />

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Remove Department"
        description="This action is permanent and will detach all associated employees. Organizational hierarchy will be affected. Proceed with caution."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
        confirmText="Confirm Removal"
      />
    </div>
  );
}
