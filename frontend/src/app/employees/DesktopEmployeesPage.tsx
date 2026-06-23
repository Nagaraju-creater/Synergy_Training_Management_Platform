import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  UserPlus, 
  Users, 
  Briefcase,
  ExternalLink,
  Download,
  Upload,
  UserCheck,
  UserMinus,
  TrendingUp,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { employeesService } from "@/services/employees.service";
import { analyticsService } from "@/services/analytics.service";
import api from "@/lib/axios";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuthStore } from "@/store/authStore";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/DropdownMenu";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { toast } from "@/components/ui/Toast";
import { usePagination } from "@/hooks/usePagination";
import type { Employee, Department, PaginatedResponse } from "@/types";
import { cn, getAssetUrl } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// Drawer Components
import { EmployeeDrawer } from "./components/EmployeeDrawer";
import { EmployeeDetailDrawer } from "./components/EmployeeDetailDrawer";
import { ImportModal } from "./components/ImportModal";

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
      {/* Subtle Bottom Accent */}
      <div className={cn("absolute bottom-0 left-6 right-6 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity", 
        variant === "indigo" ? "bg-indigo-500/20" : 
        variant === "emerald" ? "bg-emerald-500/20" : 
        variant === "amber" ? "bg-amber-500/20" : "bg-rose-500/20"
      )} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DesktopEmployeesPage() {
  const qc = useQueryClient();
  const { page, perPage, nextPage, prevPage, reset } = usePagination();

  // ── States ───────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [managerFilter, setManagerFilter] = useState<string>("");

  // Drawers & Modals
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // Selected Employee
  const { user } = useAuthStore();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const isManager = user?.role?.toLowerCase() === "manager";
  const managerId = isManager ? user?.employee?.id : undefined;

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["employees", page, perPage, debouncedSearch, statusFilter, departmentFilter, managerFilter || managerId],
    queryFn: () => employeesService.list({
      page,
      per_page: perPage,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      department_id: departmentFilter || undefined,
      manager_id: managerFilter || managerId,
      sort_by: "first_name",
      sort_order: "asc",
    }),
    select: (res) => res.data,
  });

  const { data: depts } = useQuery({
    queryKey: ["departments-all"],
    queryFn: () => api.get<PaginatedResponse<Department>>("/departments/", { params: { per_page: 100 } }),
    select: (res) => res.data.data,
  });

  const { data: managers } = useQuery({
    queryKey: ["managers-all"],
    queryFn: () => employeesService.getManagers(),
    select: (res) => res.data.data || [],
  });

  const { data: stats } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsService.getSummary(),
    select: (res) => res.data.data,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: employeesService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["analytics-summary"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setDeleteId(null);
      toast("success", "Employee Deleted", "The employee record was permanently removed.");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.detail || "An error occurred.";
      toast("error", "Failed to delete", msg);
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => employeesService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["analytics-summary"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast("success", "Status Updated", "Employee status has been successfully changed.");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.detail || "An error occurred.";
      toast("error", "Failed to update status", msg);
    }
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailOpen(false);
    setIsDrawerOpen(true);
  };

  const handleAddNew = () => {
    setSelectedEmployee(null);
    setIsDrawerOpen(true);
  };

  const handleView = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailOpen(true);
  };


  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns: Column<Employee>[] = [
    {
      key: "full_name",
      label: "Employee",
      className: "min-w-[280px]",
      render: (r) => (
        <div className="flex items-center gap-3 py-1">
          <div className="relative group/avatar">
            <div className="w-10 h-10 rounded-[14px] bg-slate-100 dark:bg-white/5 overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 group-hover/avatar:ring-brand-500/50 transition-all">
              {r.profile_image_url ? (
                <img src={getAssetUrl(r.profile_image_url)} alt={r.first_name} className="w-full h-full object-cover" />
              ) : (
                <span className="uppercase">{r.first_name[0]}{r.last_name[0]}</span>
              )}
            </div>
            {r.status === "active" && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white dark:bg-[#172036] rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-900 dark:text-white truncate leading-tight group-hover:text-brand-600 transition-colors">
              {r.first_name} {r.last_name}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-0.5">
               <span className="font-mono bg-slate-50 dark:bg-white/5 px-1 rounded border border-slate-100 dark:border-white/5">{r.employee_code}</span>
               <span className="truncate opacity-80">{r.email}</span>
            </div>
          </div>
        </div>
      ),
    },
    { 
      key: "designation", 
      label: "Role",
      render: (r) => (
        <div className="flex flex-col py-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{r.designation || "No Title"}</span>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{r.department?.name ?? "Unassigned"}</span>
        </div>
      )
    },
    {
      key: "manager",
      label: "Reporting To",
      render: (r) => (
        r.manager ? (
          <div className="flex items-center gap-2 py-1">
             <div className="w-5 h-5 rounded-md bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-[9px] font-black text-brand-600">
               {r.manager.first_name[0]}
             </div>
             <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
               {r.manager.first_name} {r.manager.last_name}
             </span>
          </div>
        ) : <span className="text-slate-300 text-[10px] font-medium tracking-tight">Direct Report</span>
      )
    },
    {
      key: "location",
      label: "Workplace",
      render: (r) => (
        <div className="flex flex-col py-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{r.location || "Remote"}</span>
          <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black opacity-60">{r.legal_entity || "Global"}</span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (r) => {
        const variants: any = {
          active: { label: "Active", variant: "success", icon: <UserCheck size={8} /> },
          on_leave: { label: "On Leave", variant: "warning", icon: <Clock size={8} /> },
          terminated: { label: "Inactive", variant: "secondary", icon: <UserMinus size={8} /> },
        };
        const s = variants[r.status || "active"] || variants.active;
        return (
          <Badge variant={s.variant} className="gap-1.5 font-black uppercase tracking-widest text-[8px] h-5 px-2 rounded-full border-none shadow-none bg-opacity-70">
            {s.icon}
            {s.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
              <MoreHorizontal size={18} className="text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl shadow-xl border-slate-200 dark:border-white/10 animate-in fade-in zoom-in-95">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Quick Actions</DropdownMenuLabel>
            <DropdownMenuItem className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5" onClick={() => handleView(r)}>
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600">
                <ExternalLink size={14} />
              </div>
              Profile Detail
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5" onClick={() => handleEdit(r)}>
               <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Edit2 size={14} />
              </div>
              Edit Record
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-1.5 opacity-50" />
            
            {r.status === "active" ? (
              <DropdownMenuItem className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5 text-amber-600 focus:text-amber-600 focus:bg-amber-50 dark:focus:bg-amber-950/20" onClick={() => statusMutation.mutate({ id: r.id, status: "terminated" })}>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
                  <UserMinus size={14} />
                </div>
                Suspend Access
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5 text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/20" onClick={() => statusMutation.mutate({ id: r.id, status: "active" })}>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center">
                  <UserCheck size={14} />
                </div>
                Restore Access
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator className="my-1.5 opacity-50" />
            
            <DropdownMenuItem 
              className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5 text-destructive focus:text-destructive focus:bg-red-50 dark:focus:bg-red-950/20"
              onClick={() => setDeleteId(r.id)}
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
                <Trash2 size={14} />
              </div>
              Purge Record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] transition-colors duration-500 px-4 lg:px-8 pt-4 lg:pt-8 pb-12">
      <div className="max-w-[1600px] mx-auto pb-10 space-y-3 animate-in fade-in duration-700">
        
        {/* ── Refined Hero Header ─────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white via-indigo-50/30 to-slate-50 dark:from-[#172036] dark:via-indigo-950/10 dark:to-[#0B1020] border border-[#EEF2FF] dark:border-white/5 p-4 lg:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500">
          {/* Soft Blurred Gradient Blobs */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-400/5 dark:bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-400/5 dark:bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/5 border border-[#EEF2FF] dark:border-white/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest mb-4 backdrop-blur-md shadow-sm"
              >
                <Users size={12} className="text-brand-500 dark:text-brand-400" /> Workforce Management
              </motion.div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tighter mb-1 leading-tight text-slate-900 dark:text-white">
                Employee Management
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg font-medium leading-relaxed">
                Orchestrate your workforce, manage permissions, and maintain organizational hierarchy with a unified administrative suite.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex bg-white/50 dark:bg-white/5 p-1 rounded-xl border border-[#EEF2FF] dark:border-white/10 shadow-sm backdrop-blur-md">
                <Button variant="ghost" className="h-9 px-4 rounded-lg font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/5" onClick={() => employeesService.exportCSV()}>
                  <Download size={14} className="mr-2" />
                  Export
                </Button>
                <Button variant="ghost" className="h-9 px-4 rounded-lg font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/5" onClick={() => setIsImportOpen(true)}>
                  <Upload size={14} className="mr-2" />
                  Import
                </Button>
              </div>
              <Button onClick={handleAddNew} className="h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all font-bold text-xs text-white">
                <Plus size={16} className="mr-2" /> 
                Add Employee
              </Button>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PremiumStatCard
            title="Total Employees"
            value={stats?.total_employees ?? 0}
            icon={Users}
            insight="+12"
            insightLabel="This Month"
            variant="indigo"
            delay={0.1}
          />
          <PremiumStatCard
            title="Active Workforce"
            value={stats?.total_employees ?? 0}
            icon={UserCheck}
            insight="98.5%"
            insightLabel="Retention"
            variant="emerald"
            delay={0.2}
          />
          <PremiumStatCard
            title="Departments"
            value={depts?.length ?? 0}
            icon={Briefcase}
            insight="+4"
            insightLabel="New Roles"
            variant="indigo"
            delay={0.3}
          />
          <PremiumStatCard
            title="New This Month"
            value={stats?.trainings_this_month ?? 0}
            icon={UserPlus}
            insight="Onboarding"
            insightLabel="Status"
            variant="amber"
            delay={0.4}
          />
        </div>

        {/* ── Integrated Admin Suite (Toolbar + Table) ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500">

          {/* ═══════════════════════════════════════════════════════════════
              STICKY HEADER BLOCK — Filter Bar + Column Headers.
              z-[110] ensures it floats above both Topbar (z-30) and Rows.
              Solid background is CRITICAL to prevent row bleed.
              ═══════════════════════════════════════════════════════════════ */}
          <div className="sticky top-0 z-20 bg-white dark:bg-[#172036] rounded-t-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">

            {/* ── Enhanced Filter Bar ──────────────────────────────────── */}
            <div className="bg-white dark:bg-[#172036] border-b border-[#EEF2FF] dark:border-white/[0.07] px-5 py-3 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">

                {/* Search Input */}
                <div className="relative flex-1 lg:max-w-sm group">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                  </div>
                  <Input
                    placeholder="Search workforce..."
                    className="pl-9 h-9 w-full bg-slate-50 dark:bg-white/[0.04] border-slate-200/60 dark:border-white/[0.06] focus-visible:bg-white dark:focus-visible:bg-[#0B1020] focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-300 rounded-xl transition-all font-medium text-[13px] placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); reset(); }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => { setSearchTerm(""); reset(); }}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  )}
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                  {/* Filter label pill */}
                  <div className="hidden sm:flex items-center gap-1.5 h-9 px-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    <Filter size={11} strokeWidth={2.5} />
                    Filters
                    {(statusFilter || departmentFilter || managerFilter) && (
                      <span className="ml-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center">
                        {[statusFilter, departmentFilter, managerFilter].filter(Boolean).length}
                      </span>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div className="relative">
                    <Select
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value); reset(); }}
                      className={cn(
                        "h-9 w-full sm:w-[120px] rounded-xl font-bold text-[12px] border transition-all pr-8",
                        statusFilter
                          ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="on_leave">On Leave</option>
                      <option value="terminated">Terminated</option>
                    </Select>
                  </div>

                  {/* Department Filter */}
                  <div className="relative">
                    <Select
                      value={departmentFilter}
                      onChange={(e) => { setDepartmentFilter(e.target.value); reset(); }}
                      className={cn(
                        "h-9 w-full sm:w-[140px] rounded-xl font-bold text-[12px] border transition-all pr-8",
                        departmentFilter
                          ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <option value="">Departments</option>
                      {depts?.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Reporting To Filter (Admin only) */}
                  {isAdmin && (
                    <div className="relative">
                      <Select
                        value={managerFilter}
                        onChange={(e) => { setManagerFilter(e.target.value); reset(); }}
                        className={cn(
                          "h-9 w-full sm:w-[140px] rounded-xl font-bold text-[12px] border transition-all pr-8",
                          managerFilter
                            ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                            : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                        )}
                      >
                        <option value="">Reporting To</option>
                        {managers?.map(m => (
                          <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Clear / Reset */}
                  {(statusFilter || departmentFilter || managerFilter || searchTerm) && (
                    <button
                      onClick={() => { setStatusFilter(""); setDepartmentFilter(""); setManagerFilter(""); setSearchTerm(""); reset(); }}
                      className="h-9 px-3 rounded-xl text-[11px] font-black text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all uppercase tracking-widest"
                    >
                      Clear
                    </button>
                  )}

                  {/* Results count */}
                  {data?.meta && (
                    <div className="hidden lg:flex items-center gap-1.5 h-9 px-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="text-slate-700 dark:text-white">{data.meta.total}</span>
                      <span>Records</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Premium Column Header Row ───────────────────────────────────── */}
            <div className="hidden md:flex bg-slate-50 dark:bg-white/[0.02] border-b border-[#EEF2FF] dark:border-white/[0.07] px-2">
              <div className="flex-[2] min-w-[280px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Employee Profile</div>
              <div className="flex-1 min-w-[160px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Department & Role</div>
              <div className="flex-1 min-w-[180px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Direct Manager</div>
              <div className="flex-1 min-w-[160px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Workplace</div>
              <div className="w-[120px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 text-center">Status</div>
              <div className="w-[56px]" />
            </div>
          </div>

          {/* ── Employee Rows ───────────────────────────────────────────── */}
          <div className="relative z-0">
            <Table
              columns={columns}
              data={data?.data ?? []}
              isLoading={isLoading}
              keyExtractor={(r) => r.id}
              hideHeader
              emptyTitle={searchTerm ? "No employees found" : "Your workforce is waiting"}
              emptyDescription={searchTerm ? "We couldn't find any employees matching your search criteria." : "Start by adding your first employee or using the bulk import tool."}
              className="border-none shadow-none rounded-none"
            />
          </div>

          {/* ── Pagination Footer ─────────────────────────────────────── */}
          {data?.meta && data.meta.total_pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-[#EEF2FF] dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] rounded-b-[28px]">
              <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 sm:mb-0">
                Showing <span className="text-slate-800 dark:text-white">{data.data.length}</span> of <span className="text-slate-800 dark:text-white">{data.meta.total}</span> employees
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
        
        {/* ── Empty State Helper ─────────────────────────────────────────── */}
        {!isLoading && data?.data.length === 0 && !searchTerm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
             <div className="w-20 h-20 rounded-[24px] bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 mb-6">
                <UserPlus size={32} />
             </div>
             <h3 className="text-xl font-black text-slate-900 dark:text-white">Build your team</h3>
             <p className="text-slate-500 dark:text-slate-400 max-w-xs mt-2 font-medium">Add employees individually or import your entire organization via CSV.</p>
             <Button onClick={handleAddNew} className="mt-8 gap-2 rounded-xl h-11 px-6 font-bold shadow-lg shadow-brand-500/20">
                <Plus size={18} /> Get Started
             </Button>
          </motion.div>
        )}
      </div>

      {/* Drawers & Modals */}
      <ErrorBoundary>
        <AnimatePresence>
          {isDrawerOpen && (
            <EmployeeDrawer 
              open={isDrawerOpen} 
              onOpenChange={setIsDrawerOpen} 
              employee={selectedEmployee} 
            />
          )}
        </AnimatePresence>
      </ErrorBoundary>
      
      <ErrorBoundary>
        <EmployeeDetailDrawer 
          open={isDetailOpen} 
          onOpenChange={setIsDetailOpen} 
          employee={selectedEmployee} 
          onEdit={handleEdit}
        />
      </ErrorBoundary>
      
      <ImportModal 
        open={isImportOpen} 
        onOpenChange={setIsImportOpen} 
       />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Purge Employee Record"
        description="This action is permanent. All performance history, training logs, and profile data will be permanently erased. Proceed with extreme caution."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
        confirmText="Confirm Permanent Deletion"
      />
      </div>
    </div>
  );
}
