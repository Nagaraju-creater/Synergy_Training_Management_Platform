import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, Plus, Search, MoreHorizontal, Edit2, 
  Trash2, Users, Clock, TrendingUp, LayoutGrid, AlertCircle
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts";

import { departmentsService } from "@/services/departments.service";
import { analyticsService } from "@/services/analytics.service";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { toast } from "@/components/ui/Toast";
import { usePagination } from "@/hooks/usePagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils";
import type { Department } from "@/types";

import { DepartmentDrawer } from "./components/DepartmentDrawer";
import { DepartmentDetailDrawer } from "./components/DepartmentDetailDrawer";

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

export default function MobileDepartmentsPage() {
  const qc = useQueryClient();
  const { page, perPage, nextPage, prevPage, reset } = usePagination();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [filterActive, setFilterActive] = useState<string>("All");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["departments", page, perPage, debouncedSearch],
    queryFn: () => departmentsService.list({
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
      setDeleteId(null);
      toast("success", "Department Deleted", "The department has been permanently removed.");
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

  // Mock workforce distribution data for mobile view
  const workforceData = data?.data.slice(0, 5).map((d: any) => ({
    name: d.name,
    value: d.employee_count
  })) || [];
  const chartColors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1020] pb-24 text-slate-900 dark:text-slate-100 overflow-x-hidden">
      
      {/* SECTION 1: Mobile Header (Max 80px) */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0B1020]/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 px-4 h-[72px] flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutGrid size={18} className="text-brand-500" /> Departments
          </h1>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{data?.meta?.total || 0} Total Records</p>
        </div>
        <Button onClick={handleAddNew} size="sm" className="h-9 rounded-xl font-bold text-xs bg-brand-600 hover:bg-brand-700 text-white px-4 shadow-md shadow-brand-500/20">
          <Plus size={14} className="mr-1.5" /> Add
        </Button>
      </header>

      <div className="p-4 space-y-5">
        
        {/* SECTION 2: Swipeable KPIs */}
        <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar flex gap-3 pb-1">
          <SwipeKPI title="Departments" value={data?.meta?.total || 0} icon={Building2} colorClass={{ bg: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" }} />
          <SwipeKPI title="Employees" value={stats?.total_employees || 0} icon={Users} colorClass={{ bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }} />
          <SwipeKPI title="Learning Hours" value={stats?.total_trainings || 0} icon={Clock} colorClass={{ bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }} />
          <SwipeKPI title="Avg Completion" value={`${stats?.avg_completion_rate || 0}%`} icon={TrendingUp} colorClass={{ bg: "bg-brand-500", text: "text-brand-600 dark:text-brand-400" }} />
        </div>

        {/* SECTION 3: Compact Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); reset(); }}
            className="h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-[#172036] border-slate-200 dark:border-white/5 text-sm font-medium shadow-sm w-full"
          />
        </div>

        {/* SECTION 4: Filter Chips */}
        <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar flex gap-2 pb-1">
          {["All", "Active", "High Workforce", "Low Learning", "Top Performing"].map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterActive(filter)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
                filterActive === filter
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 dark:bg-[#172036] dark:text-slate-300 dark:border-white/5"
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* SECTION 5: Top Departments Horizontal Leaderboard */}
        {data?.data && data.data.length > 0 && (
          <div className="bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 p-4 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Top Departments</h3>
            <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar flex gap-3">
              {data.data.slice(0, 4).map((d, i) => (
                <div key={d.id} className="min-w-[120px] bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl p-3 flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 font-black text-xs mb-2">
                    #{i + 1}
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate w-full">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 6: Compact Department Cards */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[110px] rounded-2xl bg-white dark:bg-[#172036] border border-slate-100 dark:border-white/5 p-4 animate-pulse" />
            ))
          ) : data?.data.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-[#172036] rounded-2xl border border-slate-100 dark:border-white/5">
              <AlertCircle size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">No departments found.</p>
            </div>
          ) : (
            data?.data.map((dept) => {
              // Mock health indicator based on completion
              const health = (dept as any).avg_completion > 80 ? "healthy" : (dept as any).avg_completion > 50 ? "attention" : "warning";
              const healthColors = {
                healthy: "bg-emerald-500",
                attention: "bg-amber-500",
                warning: "bg-rose-500"
              };

              return (
                <div key={dept.id} className="bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] p-4 flex flex-col gap-2 active:scale-[0.98] transition-transform" onClick={() => handleView(dept)}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{dept.name}</h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{dept.code}</p>
                      </div>
                    </div>
                    
                    {/* Actions Menu */}
                    <div onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mr-2 -mt-1 rounded-lg text-slate-400">
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-2xl p-1.5">
                          <DropdownMenuItem onClick={() => handleEdit(dept)} className="rounded-xl text-xs font-bold py-2.5">
                            <Edit2 size={14} className="mr-2 text-slate-400" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(dept.id)} className="rounded-xl text-xs font-bold py-2.5 text-rose-500 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-500/10">
                            <Trash2 size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Compact Metadata Row */}
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1"><Users size={10} /> {dept.employee_count || 0} Emps</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
                    <span className="flex items-center gap-1"><Clock size={10} /> {(dept as any).total_training_hours || 0}h</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
                    <span className="flex items-center gap-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", healthColors[health])} />
                      {health === "healthy" ? "Healthy" : health === "attention" ? "Needs Attention" : "Below Target"}
                    </span>
                  </div>

                  {/* Inline Progress Bar */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-1.5 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", healthColors[health])} style={{ width: `${(dept as any).avg_completion || 0}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{(dept as any).avg_completion || 0}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* SECTION 7: Workforce Donut Chart */}
        {workforceData.length > 0 && (
          <div className="bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 p-4 shadow-sm h-[200px] flex items-center justify-between">
             <div className="w-1/2 h-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={workforceData} innerRadius="60%" outerRadius="80%" paddingAngle={2} dataKey="value" stroke="none">
                     {workforceData.map((_, index) => (
                       <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', padding: '4px 8px' }} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="w-1/2 flex flex-col justify-center gap-2 pl-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Workforce</h3>
                {workforceData.slice(0, 3).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] font-bold">
                    <span className="truncate text-slate-600 dark:text-slate-300 pr-2">{d.name}</span>
                    <span className="text-slate-900 dark:text-white">{d.value}</span>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Pagination */}
        {data?.meta && data.meta.total_pages > 1 && (
          <div className="flex items-center justify-between py-2">
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

      {/* Drawers */}
      <DepartmentDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} department={selectedDepartment} />
      <DepartmentDetailDrawer open={isDetailOpen} onOpenChange={setIsDetailOpen} department={selectedDepartment} onEdit={handleEdit} />

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Department"
        description="This action cannot be undone."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
        confirmText="Confirm Deletion"
      />
    </div>
  );
}
