import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Search, Filter, MoreHorizontal, Edit2, Trash2, 
  UserPlus, Users, Briefcase, Download, Upload,
  UserCheck, UserMinus, Building2, MapPin, TrendingUp
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

import { employeesService } from "@/services/employees.service";
import { analyticsService } from "@/services/analytics.service";
import api from "@/lib/axios";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { toast } from "@/components/ui/Toast";
import { usePagination } from "@/hooks/usePagination";
import type { Employee, Department, PaginatedResponse } from "@/types";
import { cn, getAssetUrl } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

import { EmployeeDrawer } from "./components/EmployeeDrawer";
import { EmployeeDetailDrawer } from "./components/EmployeeDetailDrawer";
import { ImportModal } from "./components/ImportModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/Sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";

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

export default function MobileEmployeesPage() {
  const qc = useQueryClient();
  const { page, perPage, nextPage, prevPage, reset } = usePagination();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [managerFilter, setManagerFilter] = useState<string>("");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  const { user } = useAuthStore();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const isManager = user?.role?.toLowerCase() === "manager";
  const managerId = isManager ? user?.employee?.id : undefined;

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: employeesService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["analytics-summary"] });
      setDeleteId(null);
      toast("success", "Employee Deleted", "The employee record was permanently removed.");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.detail || "An error occurred.";
      toast("error", "Failed to delete", msg);
    }
  });

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1020] pb-24 text-slate-900 dark:text-slate-100 overflow-x-hidden">
      
      {/* SECTION 1: Mobile Hero Header (Max 80px) */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0B1020]/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 px-4 h-[72px] flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-brand-500" /> Employees
          </h1>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stats?.total_employees || 0} Total Records</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-white/10 bg-transparent">
                <MoreHorizontal size={16} className="text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
              <DropdownMenuItem onClick={() => setIsImportOpen(true)} className="rounded-xl text-xs font-bold py-2.5">
                <Upload size={14} className="mr-2 text-slate-400" /> Import Data
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl text-xs font-bold py-2.5">
                <Download size={14} className="mr-2 text-slate-400" /> Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleAddNew} size="sm" className="h-9 rounded-xl font-bold text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 shadow-md shadow-brand-500/20">
            <UserPlus size={14} className="mr-1.5" /> Add
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-5">
        
        {/* SECTION 2: Swipeable KPIs */}
        <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar flex gap-3 pb-1">
          <SwipeKPI title="Total Employees" value={stats?.total_employees || 0} icon={Users} colorClass={{ bg: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" }} />
          <SwipeKPI title="Active" value={stats?.total_employees || 0} icon={UserCheck} colorClass={{ bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }} />
          <SwipeKPI title="Departments" value={depts?.length || 0} icon={Briefcase} colorClass={{ bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }} />
          <SwipeKPI title="New This Month" value={2} icon={TrendingUp} colorClass={{ bg: "bg-brand-500", text: "text-brand-600 dark:text-brand-400" }} />
        </div>

        {/* SECTION 3: Search & Filter Drawer */}
        <div className="flex gap-2 relative z-10">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); reset(); }}
              className="h-11 pl-10 pr-4 rounded-xl bg-white dark:bg-[#172036] border-slate-200 dark:border-white/5 text-sm font-medium shadow-sm w-full"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className={cn(
                "h-11 w-11 rounded-xl shrink-0 p-0 shadow-sm border-slate-200 dark:border-white/5",
                (statusFilter || departmentFilter || managerFilter) ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400" : "bg-white dark:bg-[#172036]"
              )}>
                <Filter size={16} />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[32px] p-6 pb-12 bg-white dark:bg-[#0B1020] border-t border-slate-200 dark:border-white/10">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-lg font-black text-slate-900 dark:text-white">Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Status</label>
                  <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); reset(); }} className="h-12 rounded-xl">
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Department</label>
                  <Select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); reset(); }} className="h-12 rounded-xl">
                    <option value="">All Departments</option>
                    {depts?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                </div>
                {isAdmin && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Reporting To</label>
                    <Select value={managerFilter} onChange={(e) => { setManagerFilter(e.target.value); reset(); }} className="h-12 rounded-xl">
                      <option value="">All Managers</option>
                      {managers?.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                    </Select>
                  </div>
                )}
                {(statusFilter || departmentFilter || managerFilter) && (
                  <SheetClose asChild>
                    <Button 
                      variant="outline" 
                      onClick={() => { setStatusFilter(""); setDepartmentFilter(""); setManagerFilter(""); reset(); }}
                      className="w-full h-12 rounded-xl border-rose-200 text-rose-500 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10 mt-2 font-bold"
                    >
                      Clear Filters
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* SECTION 4: Compact Employee Cards */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[100px] rounded-2xl bg-white dark:bg-[#172036] border border-slate-100 dark:border-white/5 p-4 animate-pulse" />
            ))
          ) : data?.data.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#172036] rounded-2xl border border-slate-100 dark:border-white/5">
              <UserMinus size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">No employees found.</p>
            </div>
          ) : (
            data?.data.map((emp) => (
              <div key={emp.id} className="bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] p-3.5 flex gap-3 active:scale-[0.98] transition-transform" onClick={() => handleView(emp)}>
                <div className="w-12 h-12 shrink-0 rounded-xl bg-slate-100 dark:bg-white/5 overflow-hidden flex items-center justify-center text-xs font-black text-slate-400 relative">
                  {emp.profile_image_url ? (
                    <img src={getAssetUrl(emp.profile_image_url)} alt={emp.first_name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{emp.first_name[0]}{emp.last_name[0]}</span>
                  )}
                  {emp.status === "active" && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white dark:bg-[#172036] rounded-full flex items-center justify-center border border-white dark:border-[#172036]">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{emp.first_name} {emp.last_name}</h3>
                    
                    {/* SECTION 5: Actions Three-Dot Menu */}
                    <div onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mr-1 -mt-1 rounded-lg text-slate-400">
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-2xl p-1.5">
                          <DropdownMenuItem onClick={() => handleEdit(emp)} className="rounded-xl text-xs font-bold py-2.5">
                            <Edit2 size={14} className="mr-2 text-slate-400" /> Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(emp.id)} className="rounded-xl text-xs font-bold py-2.5 text-rose-500 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-500/10">
                            <Trash2 size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400 truncate mb-1.5">{emp.designation || "No Role Assigned"}</p>
                  
                  <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Building2 size={10} /> {emp.department?.name || "Unassigned"}</span>
                    <span className="flex items-center gap-1"><MapPin size={10} /> {emp.location || "N/A"}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.total_pages > 1 && (
          <div className="flex items-center justify-between py-4">
            <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl text-xs font-bold shadow-sm" disabled={data.meta.page === 1} onClick={prevPage}>
              Previous
            </Button>
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{data.meta.page} / {data.meta.total_pages}</span>
            <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl text-xs font-bold shadow-sm" disabled={data.meta.page === data.meta.total_pages} onClick={nextPage}>
              Next
            </Button>
          </div>
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

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Employee"
        description="This action cannot be undone."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
        confirmText="Confirm Deletion"
      />
    </div>
  );
}
