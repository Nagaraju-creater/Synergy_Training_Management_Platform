import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Calendar, ArrowRight, PlayCircle, MonitorPlay, UsersRound, Users, Presentation, Sparkles, Filter } from "lucide-react";
import { trainingsService } from "@/services/trainings.service";
import { enrollmentsService } from "@/services/enrollments.service";
import { useAuthStore } from "@/store/authStore";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toast";
import { formatDate, formatEligibility } from "@/utils/formatters";
import type { Training } from "@/types";
import { motion } from "framer-motion";
import { TrainingLifecycleBadge } from "@/components/ui/TrainingLifecycleBadge";
import { computeLifecycle } from "@/utils/trainingLifecycle";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const getDeliveryModeIcon = (mode: string) => {
  switch(mode.toLowerCase()) {
    case 'online': return <MonitorPlay size={14} />;
    case 'in_person': return <UsersRound size={14} />;
    case 'hybrid': return <Presentation size={14} />;
    default: return <PlayCircle size={14} />;
  }
};

const getGradientForType = (type: string) => {
  switch(type.toLowerCase()) {
    case 'technical': return "from-blue-500 to-indigo-600";
    case 'compliance': return "from-emerald-500 to-teal-600";
    case 'soft_skills': return "from-orange-400 to-amber-500";
    case 'leadership': return "from-violet-500 to-fuchsia-600";
    default: return "from-brand-500 to-violet-500";
  }
};

export default function TrainingCatalog() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["trainings-catalog", debouncedSearch],
    queryFn: () => trainingsService.list(1, 50, { search: debouncedSearch || undefined, status: "scheduled" }),
    select: (res) => res.data.data,
  });

  const enrollMutation = useMutation({
    mutationFn: (trainingId: string) => {
      if (!user?.employee?.id) throw new Error("User profile not found");
      return enrollmentsService.enroll(trainingId, user.employee.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      qc.invalidateQueries({ queryKey: ["trainings-catalog"] });
      setSelectedTraining(null);
      toast("success", "Enrollment Successful", "You have been enrolled in the training program.");
    },
    onError: (err: any) => {
      toast("error", "Enrollment Failed", err.response?.data?.message || "Could not complete enrollment.");
    }
  });

  return (
    <div className="space-y-8">
      {/* ── Filters Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#172036] p-4 rounded-[20px] shadow-sm border border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400 ml-2" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Filter Courses</span>
        </div>
        <div className="relative w-full md:w-[320px] group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={16} />
          <Input 
            placeholder="Search by title or topic..." 
            className="pl-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 border-transparent focus-visible:border-brand-500/50 focus-visible:ring-4 focus-visible:ring-brand-500/10 focus-visible:bg-white dark:focus-visible:bg-[#0F172A] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-80 bg-slate-100 dark:bg-white/5 animate-pulse rounded-[24px]" />
          ))}
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {data?.map((training) => {
            const gradient = getGradientForType(training.training_type || "general");

            return (
              <motion.div variants={itemVariants} key={training.id}>
                <div className="group relative flex flex-col h-full bg-white dark:bg-[#172036] rounded-[24px] overflow-hidden border border-slate-200 dark:border-white/5 hover:border-brand-300 dark:hover:border-brand-500/50 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300 hover:-translate-y-1">
                  
                  {/* Card Thumbnail / Header */}
                  <div className={`h-32 w-full bg-gradient-to-br ${gradient} p-5 relative overflow-hidden flex flex-col justify-between`}>
                    <div className="absolute inset-0 bg-black/10" />
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                    
                    <div className="relative z-10 flex justify-between items-start w-full">
                      <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md font-bold tracking-widest text-[9px] uppercase">
                        {training.training_type || "Course"}
                      </Badge>
                      {training.is_mandatory && (
                        <Badge variant="destructive" className="bg-red-500/90 text-white border-none backdrop-blur-md font-bold tracking-widest text-[9px] uppercase shadow-sm">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                    {/* Lifecycle badge on card header */}
                    <div className="relative z-10 flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-white/90 text-[10px] font-bold uppercase tracking-widest">
                        {getDeliveryModeIcon(training.delivery_mode)}
                        {training.delivery_mode.replace('_', ' ')}
                      </div>
                      <TrainingLifecycleBadge training={training} size="xs" showCountdown className="bg-white/20 backdrop-blur-md border-white/20 text-white" />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors line-clamp-2 leading-tight mb-2">
                      {training.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1 font-medium">
                      {training.description || "Learn the essential skills for this topic."}
                    </p>

                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5 mt-auto">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <div className="p-1.5 rounded-md bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                          <Calendar size={12} />
                        </div>
                        {formatDate(training.start_date)}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <Users size={12} />
                        </div>
                        {formatEligibility(training.is_global, training.eligible_departments)}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                    {/* Smart enroll button — disabled when lifecycle blocks enrollment */}
                  {(() => {
                    // Always use local clock — server_time is UTC-naive and drifts when
                    // interpreted as local time (e.g. IST = UTC+5:30 → 5.5h behind)
                    const meta = computeLifecycle(training, new Date());
                    const disabled = !meta.canEnroll || training.available_seats === 0;
                    const label = !meta.canEnroll
                      ? meta.status === "enrollment_closed" ? "Enrollment Closed"
                        : meta.status === "ongoing" ? "Session Live"
                        : meta.status === "completed" ? "Training Ended"
                        : "Unavailable"
                      : training.available_seats === 0 ? "Course Full" : "Enroll Now";
                    return (
                      <Button
                        className="w-full rounded-xl gap-2 font-bold transition-all shadow-none group-hover:shadow-md hover:-translate-y-0.5"
                        onClick={() => !disabled && setSelectedTraining(training)}
                        disabled={disabled}
                        variant={disabled ? "secondary" : "default"}
                      >
                        {label}
                        {!disabled && <ArrowRight size={16} />}
                      </Button>
                    );
                  })()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {data?.length === 0 && !isLoading && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-[32px] border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02]"
        >
          <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-4">
            <Search size={24} className="text-brand-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2">No courses found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium">We couldn't find any courses matching your filters. Try adjusting your search term.</p>
        </motion.div>
      )}

      {/* Enrollment Confirmation Dialog */}
      <Dialog open={!!selectedTraining} onOpenChange={(open) => !open && setSelectedTraining(null)}>
        <DialogContent className="sm:rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <Sparkles className="text-brand-500" size={20} /> Enroll in Course
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              You are about to register for <strong className="text-slate-800 dark:text-slate-200">{selectedTraining?.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedTraining && (
            <div className="space-y-4 py-4">
              <div className="p-5 bg-slate-50 dark:bg-[#0B1020] rounded-2xl border border-slate-100 dark:border-white/5 space-y-4 shadow-inner">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">Start Date</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{formatDate(selectedTraining.start_date)}</span>
                </div>
                <div className="w-full h-px bg-slate-200 dark:bg-white/5" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">Duration</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{selectedTraining.duration_hours} Hours</span>
                </div>
                <div className="w-full h-px bg-slate-200 dark:bg-white/5" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">Delivery Mode</span>
                  <span className="font-black text-slate-800 dark:text-slate-200 capitalize flex items-center gap-1.5">
                    {getDeliveryModeIcon(selectedTraining.delivery_mode)}
                    {selectedTraining.delivery_mode.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 text-center font-medium px-4">
                By enrolling, you commit to attending this session. You can cancel your registration prior to the start date.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setSelectedTraining(null)} className="rounded-xl font-bold">Cancel</Button>
            <Button 
              onClick={() => selectedTraining && enrollMutation.mutate(selectedTraining.id)}
              isLoading={enrollMutation.isPending}
              className="rounded-xl font-bold px-6 shadow-brand-500/25 shadow-lg"
            >
              Confirm Enrollment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
