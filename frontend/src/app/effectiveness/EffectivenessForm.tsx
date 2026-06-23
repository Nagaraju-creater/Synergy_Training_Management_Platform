import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Star, ClipboardCheck, Lightbulb, 
  Target, MessageSquare, Info,
  CheckCircle2, ArrowRight, Lock, Eye
} from "lucide-react";

import { effectivenessService } from "@/services/effectiveness.service";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const schema = z.object({
  enrollment_id: z.string().uuid(),
  training_id: z.string().uuid(),
  level: z.enum(["reaction", "learning", "behavior", "results"]),
  learnings_summary: z.string().min(20, "Please provide more details about your learnings"),
  work_application: z.string().min(20, "Please explain how this helps at work"),
  suggestions: z.string().optional(),
  rating: z.preprocess((v) => Number(v), z.number().min(1).max(5)),
});

type FormData = z.infer<typeof schema>;

interface Props {
  enrollmentId: string;
  trainingId: string;
  trainingTitle: string;
  effectivenessId?: string;       // If provided, PATCH the existing PENDING record
  effectivenessStatus?: string;   // If "submitted" or "reviewed", render read-only
  onSuccess?: () => void;
}

export default function EffectivenessForm({
  enrollmentId,
  trainingId,
  trainingTitle,
  effectivenessId,
  effectivenessStatus,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  // Read-only mode when status is submitted or reviewed
  const isReadOnly =
    effectivenessStatus === "submitted" ||
    effectivenessStatus === "reviewed" ||
    effectivenessStatus === "overdue";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      enrollment_id: enrollmentId,
      training_id: trainingId,
      level: "reaction",
      rating: 5,
    },
  });

  const rating = watch("rating");

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      if (effectivenessId) {
        // PATCH the auto-created PENDING record with form data
        const { enrollment_id, training_id, ...updateFields } = data;
        return effectivenessService.update(effectivenessId, updateFields);
      }
      return effectivenessService.submit(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["effectiveness"] });
      qc.invalidateQueries({ queryKey: ["effectiveness-pending"] });
      qc.invalidateQueries({ queryKey: ["effectiveness-stats"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      toast("success", "Evaluation Submitted", "Thank you for your valuable feedback!");
      onSuccess?.();
    },
    onError: (err: any) => {
      toast("error", "Submission Failed", err.response?.data?.message || "Something went wrong");
    }
  });

  const StarRating = () => (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={isReadOnly}
          className={cn(
            "transition-all duration-200 transform hover:scale-110 outline-none",
            isReadOnly && "cursor-default hover:scale-100"
          )}
          onMouseEnter={() => !isReadOnly && setHoveredStar(star)}
          onMouseLeave={() => !isReadOnly && setHoveredStar(null)}
          onClick={() => !isReadOnly && setValue("rating", star)}
        >
          <Star
            size={28}
            className={`transition-colors ${
              star <= (hoveredStar ?? rating)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
      <span className="ml-3 text-sm font-bold text-muted-foreground uppercase tracking-widest">
        {rating === 5 ? "Excellent" : rating === 4 ? "Great" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Poor"}
      </span>
    </div>
  );

  // Read-only banner
  if (isReadOnly) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Read-only notice */}
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-2xl border",
          effectivenessStatus === "reviewed"
            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
            : effectivenessStatus === "overdue"
              ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20"
              : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
        )}>
          {effectivenessStatus === "reviewed" ? (
            <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : effectivenessStatus === "overdue" ? (
            <Lock size={20} className="text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
            <Eye size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <div>
            <p className={cn(
              "text-sm font-bold",
              effectivenessStatus === "reviewed"
                ? "text-emerald-800 dark:text-emerald-200"
                : effectivenessStatus === "overdue"
                  ? "text-rose-800 dark:text-rose-200"
                  : "text-amber-800 dark:text-amber-200"
            )}>
              {effectivenessStatus === "reviewed"
                ? "This assessment has been reviewed and certified."
                : effectivenessStatus === "overdue"
                  ? "Submission window has closed — this assessment is overdue."
                  : "This evaluation has already been submitted and is pending manager review."}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              This form is now read-only. Contact your manager for any changes.
            </p>
          </div>
        </div>

        {/* Header Info */}
        <div className="p-6 rounded-3xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#172036] flex items-center justify-center text-brand-600 shadow-sm shrink-0">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Post-Training Impact Assessment</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{trainingTitle}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-center text-slate-500 dark:text-slate-400 text-sm font-medium">
          <Lock size={20} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          Form content is locked after submission.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-8 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="p-6 rounded-3xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#172036] flex items-center justify-center text-brand-600 shadow-sm shrink-0">
          <ClipboardCheck size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Post-Training Impact Assessment</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{trainingTitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Rating & Level */}
        <div className="space-y-6">
          <div className="space-y-2.5">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Overall Satisfaction</label>
            <div className="p-5 rounded-2xl bg-card dark:bg-[#172036] border border-border/50 shadow-sm">
              <StarRating />
            </div>
            {errors.rating && <p className="text-xs text-destructive ml-1">{errors.rating.message}</p>}
          </div>

          <div className="space-y-2.5">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Evaluation Focus</label>
            <Select {...register("level")} error={!!errors.level} className="h-12 rounded-xl font-bold shadow-sm">
              <option value="reaction">Reaction — Program Satisfaction</option>
              <option value="learning">Learning — Knowledge Acquisition</option>
              <option value="behavior">Behavior — On-the-job Application</option>
              <option value="results">Results — Direct Business Impact</option>
            </Select>
            <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground font-medium">
              <Info size={10} />
              <span>Based on the Kirkpatrick 4-Level Evaluation Model</span>
            </div>
          </div>
        </div>

        {/* Learnings */}
        <div className="space-y-2.5">
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
            <Lightbulb size={12} className="text-brand-500" /> Key Takeaways
          </label>
          <Textarea
            {...register("learnings_summary")}
            placeholder="What were the top 3 things you learned? How did they change your perspective?"
            rows={5}
            className="rounded-2xl border-border/50 focus:ring-brand-500 shadow-sm p-4 text-sm font-medium leading-relaxed"
            error={!!errors.learnings_summary}
          />
          {errors.learnings_summary && <p className="text-xs text-destructive ml-1">{errors.learnings_summary.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Application */}
        <div className="space-y-2.5">
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
            <Target size={12} className="text-brand-500" /> Work Application
          </label>
          <Textarea
            {...register("work_application")}
            placeholder="Describe a specific task or process where you will apply these new skills..."
            rows={4}
            className="rounded-2xl border-border/50 focus:ring-brand-500 shadow-sm p-4 text-sm font-medium leading-relaxed"
            error={!!errors.work_application}
          />
          {errors.work_application && <p className="text-xs text-destructive ml-1">{errors.work_application.message}</p>}
        </div>

        {/* Suggestions */}
        <div className="space-y-2.5">
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
            <MessageSquare size={12} className="text-brand-500" /> Future Improvements
          </label>
          <Textarea
            {...register("suggestions")}
            placeholder="How can we make this training even more effective for future participants?"
            rows={4}
            className="rounded-2xl border-border/50 focus:ring-brand-500 shadow-sm p-4 text-sm font-medium leading-relaxed"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-tighter">Your feedback directly impacts our curriculum</span>
        </div>
        <Button
          type="submit"
          isLoading={mutation.isPending}
          className="w-full sm:w-auto h-12 px-10 rounded-2xl font-black bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-100 flex items-center gap-2"
        >
          Submit Final Evaluation <ArrowRight size={18} />
        </Button>
      </div>
    </form>
  );
}
