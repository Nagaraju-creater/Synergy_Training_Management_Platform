import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Search, Briefcase, CheckCircle2 } from "lucide-react";

import { employeesService } from "@/services/employees.service";
import { trainingsService } from "@/services/trainings.service";
import { nominationsService } from "@/services/nominations.service";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";

export function AdminNominatePanel() {
  const qc = useQueryClient();
  const [employeeId, setEmployeeId] = useState("");
  const [trainingId, setTrainingId] = useState("");
  const [reason, setReason] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  // Fetch employees
  const { data: empData, isLoading: isLoadingEmps } = useQuery({
    queryKey: ["employees", searchTerm],
    queryFn: () => employeesService.list({ page: 1, per_page: 50, search: searchTerm }),
    select: (res) => res.data.data,
  });

  // Fetch trainings (active/scheduled)
  const { data: trainData, isLoading: isLoadingTrains } = useQuery({
    queryKey: ["trainings", "scheduled"],
    queryFn: () => trainingsService.list(1, 100, { status: "scheduled" }),
    select: (res) => res.data.data,
  });

  const nominateMutation = useMutation({
    mutationFn: (data: { employee_id: string; training_id: string; reason: string }) => 
      nominationsService.create(data),
    onSuccess: () => {
      toast("success", "Nomination created and auto-approved!");
      setEmployeeId("");
      setTrainingId("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["trainings"] });
      qc.invalidateQueries({ queryKey: ["nominations"] });
    },
    onError: (err: any) => {
      toast("error", "Nomination Failed", err.response?.data?.message || "Could not create nomination");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !trainingId) {
      toast("error", "Please select both an employee and a training program");
      return;
    }
    nominateMutation.mutate({
      employee_id: employeeId,
      training_id: trainingId,
      reason,
    });
  };

  return (
    <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm overflow-hidden min-h-[500px]">
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <UserPlus size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Direct Nomination</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Nominate any employee for an upcoming training. Admin nominations are automatically approved and bypass manager review.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">1. Select Employee</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <Input 
                placeholder="Search employee name..." 
                className="pl-10 mb-3 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 p-1 space-y-1 bg-slate-50 dark:bg-white/[0.02]">
              {isLoadingEmps ? (
                <div className="p-4 text-center text-sm text-slate-400">Loading employees...</div>
              ) : empData?.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">No employees found</div>
              ) : (
                empData?.map((emp) => (
                  <div 
                    key={emp.id}
                    onClick={() => setEmployeeId(emp.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      employeeId === emp.id 
                        ? "bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30" 
                        : "hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs">
                        {emp.first_name[0]}{emp.last_name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{emp.first_name} {emp.last_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Briefcase size={10} />
                          {emp.department?.name || "No Department"}
                        </div>
                      </div>
                    </div>
                    {employeeId === emp.id && <CheckCircle2 size={18} className="text-indigo-600" />}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">2. Select Training Program</label>
            <Select 
              value={trainingId} 
              onChange={(e) => setTrainingId(e.target.value)}
              className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
              disabled={isLoadingTrains}
            >
              <option value="">-- Choose a scheduled training --</option>
              {trainData?.map((t) => (
                <option key={t.id} value={t.id}>{t.title} ({new Date(t.start_date || "").toLocaleDateString()})</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">3. Reason (Optional)</label>
            <textarea 
              rows={3}
              className="w-full rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3 text-sm focus-visible:ring-2 focus-visible:ring-brand-500/20 outline-none transition-all"
              placeholder="Why is this employee being nominated?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/5">
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-500/20"
              disabled={nominateMutation.isPending || !employeeId || !trainingId}
            >
              {nominateMutation.isPending ? "Processing..." : "Submit Nomination"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
