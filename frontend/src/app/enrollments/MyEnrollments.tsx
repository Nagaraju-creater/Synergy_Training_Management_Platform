import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, LogOut, AlertTriangle, Info, BookX, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { enrollmentsService } from "@/services/enrollments.service";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { formatDate } from "@/utils/formatters";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import type { Enrollment } from "@/types";
import { motion } from "framer-motion";

// ── Withdraw dialog with required reason ────────────────────────────────────
interface WithdrawDialogProps {
  enrollment: Enrollment | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}

function WithdrawDialog({ enrollment, onClose, onConfirm, isLoading }: WithdrawDialogProps) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const isValid = reason.trim().length >= 10;

  const handleConfirm = () => {
    setTouched(true);
    if (isValid) onConfirm(reason.trim());
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason("");
      setTouched(false);
      onClose();
    }
  };

  return (
    <Dialog open={!!enrollment} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-[24px] p-0 overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl">
        <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 mb-1 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <LogOut size={20} />
            </div>
            <DialogTitle className="text-xl font-black text-white">Withdraw Course</DialogTitle>
          </div>
          <DialogDescription className="text-red-100 text-sm mt-2 ml-13 font-medium relative z-10">
            {enrollment?.training_title || "this training"}
          </DialogDescription>
        </div>

        <div className="p-6 space-y-5 bg-white dark:bg-[#172036]">
          <div className="flex items-start gap-3 p-4 rounded-[16px] bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 shadow-sm">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-800 dark:text-amber-400">Before you withdraw</p>
              <p className="text-amber-700 dark:text-amber-500/80 mt-1 text-xs leading-relaxed font-medium">
                Withdrawal is only allowed <strong>before the training start date</strong>.
                Your spot will be released immediately.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              Reason for withdrawal <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Briefly explain why you need to withdraw..."
              rows={4}
              className={`w-full rounded-[16px] border px-4 py-3 text-sm resize-none outline-none transition-all shadow-sm
                focus:ring-4 focus:ring-red-500/10 focus:border-red-500
                bg-slate-50 dark:bg-white/[0.02] text-slate-800 dark:text-slate-200 placeholder:text-slate-400
                ${touched && !isValid
                  ? "border-red-400 focus:border-red-500 bg-red-50/50 dark:bg-red-950/10"
                  : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                }`}
            />
            <div className="flex items-center justify-between px-1">
              {touched && !isValid ? (
                <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                  <Info size={12} /> Min 10 characters required
                </p>
              ) : (
                <span />
              )}
              <span className={`text-xs font-bold ${reason.trim().length >= 10 ? "text-emerald-500" : "text-slate-400"}`}>
                {reason.trim().length} chars
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-0 flex gap-3 bg-white dark:bg-[#172036] sm:justify-between">
          <Button
            variant="outline"
            type="button"
            className="flex-1 rounded-xl font-bold border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={!isValid && touched}
            className="flex-1 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white border-transparent shadow-lg shadow-red-500/20"
          >
            Confirm Withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Animation Variants ──────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// ── Status Helpers ──────────────────────────────────────────────────────────
const getStatusInfo = (status: string, startDate?: string) => {
  if (status === "completed") return { color: "emerald", label: "Completed", icon: <CheckCircle2 size={14}/>, progress: 100 };
  if (status === "withdrawn" || status === "rejected") return { color: "slate", label: "Withdrawn", icon: <LogOut size={14}/>, progress: 0 };
  
  if (startDate && new Date(startDate) <= new Date() && status === "enrolled") {
    return { color: "amber", label: "In Progress", icon: <PlayCircle size={14}/>, progress: 50 };
  }
  
  return { color: "blue", label: "Upcoming", icon: <Clock size={14}/>, progress: 0 };
};

// ── Main component ───────────────────────────────────────────────────────────
export default function MyEnrollments() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [withdrawing, setWithdrawing] = useState<Enrollment | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-enrollments", user?.employee?.id],
    queryFn: () => enrollmentsService.list(1, 50, { employee_id: user?.employee?.id }),
    enabled: !!user?.employee?.id,
    select: (res) => res.data.data,
  });

  const withdrawMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      enrollmentsService.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
      qc.invalidateQueries({ queryKey: ["trainings-catalog"] });
      qc.invalidateQueries({ queryKey: ["employee-dashboard"] });
      setWithdrawing(null);
      toast("success", "Withdrawn Successfully", "Your enrollment has been withdrawn.");
    },
    onError: (err: any) => {
      toast("error", "Withdrawal Failed", err.response?.data?.detail || err.response?.data?.message || "Could not process withdrawal.");
    },
  });

  const canWithdraw = (r: any) => {
    if (r.status === "withdrawn" || r.status === "completed" || r.status === "rejected") return false;
    if (r.training_start_date) {
      const start = new Date(r.training_start_date);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start <= today) return false;
    }
    return r.status === "enrolled" || r.status === "pending";
  };

  return (
    <div className="space-y-6">
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[100px] md:h-48 bg-slate-100 dark:bg-white/5 animate-pulse rounded-2xl md:rounded-[24px]" />
          ))}
        </div>
      ) : data?.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-dashed rounded-[32px] border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02]"
        >
          <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-brand-500/10 flex items-center justify-center mb-6 shadow-inner">
            <BookX size={32} className="text-brand-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-3">No enrolled courses yet</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium mb-8 text-sm md:text-base">
            You haven't enrolled in any courses. Check out the available courses tab to start learning and growing your skills.
          </p>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-6"
        >
          {data?.map((enrollment) => {
            const { color, label, icon, progress } = getStatusInfo(enrollment.status, enrollment.training_start_date);
            const colorClasses: Record<string, string> = {
              emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
              amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
              blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
              slate: "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10",
            };

            return (
              <motion.div variants={itemVariants} key={enrollment.id}>
                {/* ── Mobile Compact Progress Card (< 100px) ── */}
                <div className="md:hidden bg-white dark:bg-[#172036] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[13px] font-black text-slate-900 dark:text-white leading-tight line-clamp-1">
                        {enrollment.training_title || "Untitled Course"}
                      </h3>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold mt-0.5">
                        <Calendar size={10} className="text-brand-500 shrink-0" />
                        {enrollment.training_start_date ? formatDate(enrollment.training_start_date) : "Date TBD"}
                      </span>
                    </div>
                    <div className={`shrink-0 px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${colorClasses[color]}`}>
                      {icon} {label}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            progress === 100 ? "bg-emerald-500" : progress > 0 ? "bg-amber-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">{progress}% complete</span>
                    </div>
                    {canWithdraw(enrollment) ? (
                      <button
                        className="shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all bg-transparent"
                        onClick={() => setWithdrawing(enrollment)}
                      >
                        <LogOut size={10} /> Withdraw
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-300 dark:text-white/20 font-bold uppercase shrink-0">—</span>
                    )}
                  </div>
                </div>

                {/* ── Desktop Progress Card (unchanged) ── */}
                <div className="hidden md:flex flex-col group bg-white dark:bg-[#172036] rounded-[24px] overflow-hidden border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-lg transition-all duration-300">
                  
                  <div className="p-6 flex flex-col sm:flex-row justify-between gap-4 border-b border-slate-100 dark:border-white/5">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
                        {enrollment.training_title || "Untitled Course"}
                      </h3>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-brand-500" />
                          {enrollment.training_start_date ? formatDate(enrollment.training_start_date) : "Date TBD"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="shrink-0">
                      <div className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm w-fit ${colorClasses[color]}`}>
                        {icon} {label}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50/50 dark:bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="w-full sm:w-1/2 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <span>Course Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            progress === 100 ? "bg-emerald-500" : progress > 0 ? "bg-amber-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex justify-end">
                      {canWithdraw(enrollment) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/50 font-bold rounded-xl gap-2 transition-all"
                          onClick={() => setWithdrawing(enrollment)}
                        >
                          <LogOut size={14} /> Withdraw
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          className="w-full sm:w-auto font-bold rounded-xl opacity-50"
                        >
                          No Actions
                        </Button>
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <WithdrawDialog
        enrollment={withdrawing}
        onClose={() => setWithdrawing(null)}
        onConfirm={(reason) =>
          withdrawing && withdrawMutation.mutate({ id: withdrawing.id, reason })
        }
        isLoading={withdrawMutation.isPending}
      />
    </div>
  );
}
