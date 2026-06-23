import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ClipboardCheck, Eye, PenTool, Search, 
  TrendingUp,
  ArrowRight, Sparkles, LayoutGrid, 
  AlertCircle, ShieldCheck, CheckCircle2, Timer,
  AlertTriangle, BarChart3, XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInHours, differenceInMinutes, isPast, parseISO, format } from "date-fns";

import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { usePagination } from "@/hooks/usePagination";
import { useAuthStore } from "@/store/authStore";
import { effectivenessService } from "@/services/effectiveness.service";
import type { EffectivenessStats } from "@/services/effectiveness.service";
import { cn, getAssetUrl } from "@/lib/utils";
import type { Effectiveness } from "@/types";
import { capitalize, formatDate } from "@/utils/formatters";
import EffectivenessForm from "./EffectivenessForm";
import EffectivenessReview from "./EffectivenessReview";

// ── Real-Time Countdown Hook ────────────────────────────────────────────────

const mobileChipStyles: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20",
  rose: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  violet: "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20",
};

function MobileKpiChip({ label, value, variant = "indigo" }: { label: string; value: string | number; variant?: string }) {
  return (
    <div className={cn(
      "shrink-0 inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-black shadow-sm",
      mobileChipStyles[variant] || mobileChipStyles.indigo
    )}>
      <span className="text-[10px] uppercase tracking-tight opacity-75">{label}</span>
      <span className="text-sm leading-none">{value}</span>
    </div>
  );
}

function RatingBadge({ rating }: { rating?: number | null }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
      <span className="tracking-[-1px]" aria-hidden="true">★★★★★</span>
      <span>{rating ? `${rating} / 5` : "No rating"}</span>
    </div>
  );
}

function useCountdown(deadline: string | null | undefined) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!deadline) return { label: "No deadline", urgent: false, expired: false, hoursLeft: null };
  const dt = parseISO(deadline);
  const hoursLeft = differenceInHours(dt, now);
  const minutesLeft = differenceInMinutes(dt, now) % 60;
  const expired = isPast(dt);

  if (expired) return { label: "Overdue", urgent: true, expired: true, hoursLeft: -1 };
  if (hoursLeft < 1) return { label: `${minutesLeft}m left`, urgent: true, expired: false, hoursLeft };
  if (hoursLeft < 6) return { label: `${hoursLeft}h ${minutesLeft}m left`, urgent: true, expired: false, hoursLeft };
  if (hoursLeft < 24) return { label: `${hoursLeft}h left`, urgent: true, expired: false, hoursLeft };
  const daysLeft = Math.ceil(hoursLeft / 24);
  return { label: `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`, urgent: false, expired: false, hoursLeft };
}

// ── Premium Stat Cards ──────────────────────────────────────────────────────

function PremiumStatCard({ 
  title, value, icon: Icon, sub, variant = "indigo", delay = 0, pulse = false 
}: {
  title: string; value: number | string; icon: any; sub?: string;
  variant?: "indigo" | "emerald" | "amber" | "rose" | "violet"; delay?: number; pulse?: boolean;
}) {
  const variants: Record<string, string> = {
    indigo: "text-indigo-600 bg-indigo-50/50 border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20",
    emerald: "text-emerald-600 bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    amber: "text-amber-600 bg-amber-50/50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20",
    rose: "text-rose-600 bg-rose-50/50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20",
    violet: "text-violet-600 bg-violet-50/50 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20",
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
        {pulse && (
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
          {sub && <span className="text-xs font-bold text-slate-400">{sub}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ── Pending Card with Real-Time Countdown ──────────────────────────────────

function PendingEffectivenessCard({ r, onClick }: { r: any; onClick: () => void }) {
  const dl = useCountdown(r.submission_deadline);
  const trainingTitle = r.training_title || r.training?.title || "Training Program";
  const trainerName = r.training?.trainer_name || r.trainer_name;
  const trainingDate = r.training?.start_date
    ? format(parseISO(r.training.start_date), "MMM dd, yyyy")
    : null;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        "group flex flex-col bg-white dark:bg-[#172036] border rounded-2xl sm:rounded-[24px] p-3 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] hover:shadow-[0_15px_30px_rgba(15,23,42,0.08)] transition-all duration-300",
        dl.urgent && !dl.expired
          ? "border-amber-300 dark:border-amber-500/40 ring-1 ring-amber-300/50 dark:ring-amber-500/20"
          : dl.expired
            ? "border-rose-300 dark:border-rose-500/40 ring-1 ring-rose-300/50 dark:ring-rose-500/20"
            : "border-[#EEF2FF] dark:border-white/5"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4 mb-2 sm:mb-5">
        <div className={cn(
          "hidden sm:flex w-12 h-12 rounded-[16px] items-center justify-center shrink-0 border",
          dl.expired
            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20"
            : dl.urgent
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
              : "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-100 dark:border-brand-500/20"
        )}>
          <ClipboardCheck size={24} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight line-clamp-2">
            {trainingTitle}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight sm:tracking-widest mt-1 sm:mt-1.5 flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-emerald-500" /> Completed — Assessment Pending
          </span>
        </div>
        <StatusBadge status={dl.expired ? "overdue" : "pending"} />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 mb-2 sm:mb-4 sm:p-3 rounded-xl sm:bg-slate-50 sm:dark:bg-white/[0.03] sm:border sm:border-slate-100 sm:dark:border-white/5">
        {trainingDate && (
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-tight sm:tracking-widest text-slate-400 mb-0.5">Type</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{trainingDate}</span>
          </div>
        )}
        {trainerName && (
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-tight sm:tracking-widest text-slate-400 mb-0.5">Trainer</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{trainerName}</span>
          </div>
        )}
        {r.submission_deadline && (
          <div className="flex flex-col col-span-2">
            <span className="text-[9px] font-black uppercase tracking-tight sm:tracking-widest text-slate-400 mb-0.5">Due Date</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              <span className="sm:hidden">{format(parseISO(r.submission_deadline), "MMM dd, yyyy")}</span>
              <span className="hidden sm:inline">{format(parseISO(r.submission_deadline), "MMM dd, yyyy 'at' h:mm a")}</span>
            </span>
          </div>
        )}
      </div>

      {/* Countdown Badge */}
      <div className={cn(
        "flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl mb-2 sm:mb-5 border text-[11px] font-bold",
        dl.expired
          ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
          : dl.urgent
            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
            : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
      )}>
        <Timer size={13} className={dl.urgent ? "animate-pulse" : ""} />
        <span>{dl.expired ? "⚠ Submission window has closed" : `⏱ ${dl.label} to complete`}</span>
      </div>

      {/* CTA */}
      <div className="mt-auto">
        <Button
          className={cn(
            "w-full font-bold rounded-xl h-9 sm:h-11 text-xs sm:text-sm shadow-lg",
            dl.expired
              ? "bg-slate-400 hover:bg-slate-500 text-white cursor-not-allowed"
              : "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20"
          )}
          disabled={dl.expired}
          onClick={onClick}
        >
          {dl.expired ? "Deadline Passed" : <>Start Assessment <ArrowRight size={14} className="ml-2" /></>}
        </Button>
      </div>
    </motion.div>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" },
    submitted: { label: "Submitted", cls: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" },
    reviewed: { label: "Reviewed", cls: "bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20" },
    overdue: { label: "Overdue", cls: "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20" },
  };
  const cfg = config[status?.toLowerCase()] || config["pending"];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function EffectivenessPage() {
  const { user } = useAuthStore();
  const role = user?.role?.toLowerCase() || "";
  const isAdmin = role === "admin";
  const isManager = role === "manager" || isAdmin;

  const [activeTab, setActiveTab] = useState(isAdmin ? "all" : isManager ? "reviews" : "pending");
  const [selectedPendingRecord, setSelectedPendingRecord] = useState<Effectiveness | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Effectiveness | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const { page, perPage } = usePagination();

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: pendingEffectiveness, isLoading: loadingPending } = useQuery({
    queryKey: ["effectiveness-pending", page, perPage],
    queryFn: () => effectivenessService.list(page, perPage, { status: "pending" }),
    select: (res) => res.data,
    enabled: !isAdmin && (!isManager || activeTab === "pending"),
  });

  const { data: evaluations, isLoading: loadingEvaluations } = useQuery({
    queryKey: ["effectiveness", page, perPage, activeTab],
    queryFn: () => effectivenessService.list(page, perPage, {
      status: activeTab === "reviews" ? "submitted" : undefined
    }),
    select: (res) => res.data,
    enabled: activeTab === "reviews" || activeTab === "all" || activeTab === "my-submissions" || !isManager,
  });

  // Admin stats from API
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ["effectiveness-stats"],
    queryFn: () => effectivenessService.getStats(),
    select: (res) => res.data.data as EffectivenessStats,
    enabled: isManager,
    refetchInterval: 60_000, // refresh every minute
  });

  const pendingCount = pendingEffectiveness?.meta?.total || 0;
  const completedCount = evaluations?.meta?.total || 0;
  const ratedEvaluations = evaluations?.data?.filter((e: any) => e.rating != null) || [];
  const scoredEvaluations = evaluations?.data?.filter((e: any) => e.manager_score != null) || [];
  const avgRating = ratedEvaluations.length
    ? (ratedEvaluations.reduce((acc: number, e: any) => acc + Number(e.rating || 0), 0) / ratedEvaluations.length).toFixed(1)
    : "0.0";
  const avgScore = Math.round(
    (scoredEvaluations.reduce((acc: number, e: any) => acc + Number(e.manager_score || 0), 0) || 0) /
    Math.max(scoredEvaluations.length || 1, 1)
  );
  const feedbackCount = pendingCount + completedCount;


  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] transition-colors duration-500 px-3 sm:px-4 lg:px-8 pt-3 sm:pt-4 lg:pt-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-12">
      <div className="max-w-[1600px] mx-auto space-y-2.5 sm:space-y-3 animate-in fade-in duration-700">

        {/* ── Premium Hero Header ─────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[24px] bg-white sm:bg-gradient-to-br sm:from-white sm:via-indigo-50/30 sm:to-slate-50 dark:bg-[#172036] dark:sm:from-[#172036] dark:sm:via-indigo-950/10 dark:sm:to-[#0B1020] border border-[#EEF2FF] dark:border-white/5 p-3 sm:p-4 lg:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500">
          <div className="hidden sm:block absolute -top-32 -right-32 w-80 h-80 bg-brand-400/5 dark:bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="hidden sm:block absolute -bottom-32 -left-32 w-64 h-64 bg-violet-400/5 dark:bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-6">
            <div className="max-w-xl">
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/5 border border-[#EEF2FF] dark:border-white/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest mb-4 backdrop-blur-md shadow-sm"
              >
                <Sparkles size={12} className="text-brand-500 dark:text-brand-400" /> ROI & Performance
              </motion.div>
              <h1 className="text-base sm:text-2xl lg:text-3xl font-black tracking-tight sm:tracking-tighter mb-1 leading-tight text-slate-900 dark:text-white">
                <span className="sm:hidden">Learning Effectiveness</span>
                <span className="hidden sm:inline">Effectiveness Matrix</span>
              </h1>
              <div className="sm:hidden grid grid-cols-3 gap-2 pt-1">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Pending</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{pendingCount}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Completed</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{completedCount}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Avg Score</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{avgScore}%</p>
                </div>
              </div>
              <p className="hidden sm:block text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg font-medium leading-relaxed">
                Track learning impact, measure behavioral changes in the workplace, and certify organizational ROI through formal Kirkpatrick assessments.
              </p>
            </div>
          </div>
        </div>

        {/* ── Admin KPI Stats (Manager/Admin only) ──────────────────────────── */}
        {isManager && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {loadingStats ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="h-28 rounded-[24px] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 animate-pulse" />
              ))
            ) : statsData ? (
              <>
                <PremiumStatCard title="Pending" value={statsData.total_pending} icon={ClipboardCheck} variant="amber" delay={0.05} />
                <PremiumStatCard title="Submitted" value={statsData.total_submitted} icon={CheckCircle2} variant="emerald" delay={0.1} />
                <PremiumStatCard title="Reviewed" value={statsData.total_reviewed} icon={ShieldCheck} variant="indigo" delay={0.15} />
                <PremiumStatCard title="Overdue" value={statsData.total_overdue} icon={XCircle} variant="rose" delay={0.2} pulse={statsData.total_overdue > 0} />
                <PremiumStatCard title="Completion" value={`${statsData.completion_percentage}%`} icon={BarChart3} variant="violet" delay={0.25} sub={`of ${statsData.total} total`} />
              </>
            ) : null}
          </div>
        )}

        {/* ── Employee Stat Cards (non-admin) ────────────────────────────────── */}
        {!isManager && (
          <>
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:hidden [scrollbar-width:none]">
            <MobileKpiChip label="Pending" value={pendingCount} variant="amber" />
            <MobileKpiChip label="Completed" value={completedCount} variant="emerald" />
            <MobileKpiChip label="Avg" value={`${avgScore}%`} variant="indigo" />
            <MobileKpiChip label="Feedback" value={feedbackCount} variant="violet" />
          </div>
          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <PremiumStatCard
              title="Pending Feedback"
              value={pendingCount}
              icon={ClipboardCheck}
              variant="amber"
              delay={0.1}
            />
            <PremiumStatCard
              title="Total Assessments"
              value={completedCount}
              icon={ShieldCheck}
              variant="indigo"
              delay={0.2}
            />
            <PremiumStatCard
              title="Avg Score"
              value={`${avgScore}%`}
              icon={TrendingUp}
              variant="emerald"
              delay={0.3}
            />
          </div>
          </>
        )}

        {/* ── Segmented Navigation ──────────────────────────────────────────────── */}
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 mt-2 sm:mt-4">
          <div className="flex h-10 items-center gap-1 bg-white/50 dark:bg-white/5 p-1 rounded-xl sm:rounded-2xl w-fit border border-[#EEF2FF] dark:border-white/5 shadow-sm backdrop-blur-md">
            {!isAdmin && (
              <button
                onClick={() => setActiveTab("pending")}
                className={cn(
                  "h-8 px-3 sm:px-6 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-widest transition-all flex items-center gap-1.5 sm:gap-2",
                  activeTab === "pending"
                    ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                <ClipboardCheck size={14} className="hidden sm:inline" /> Pending
                {(pendingEffectiveness?.meta?.total || 0) > 0 && (
                  <span className="ml-0.5 sm:ml-1 px-1.5 py-0.5 text-[9px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full">
                    {pendingEffectiveness?.meta?.total}
                  </span>
                )}
              </button>
            )}
            {isManager && (
              <button
                onClick={() => setActiveTab("reviews")}
                className={cn(
                  "h-8 px-3 sm:px-6 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-widest transition-all flex items-center gap-1.5 sm:gap-2",
                  activeTab === "reviews"
                    ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                <ShieldCheck size={14} className="hidden sm:inline" /> Team Reviews
              </button>
            )}
            <button
              onClick={() => setActiveTab(isAdmin ? "all" : "my-submissions")}
              className={cn(
                "h-8 px-3 sm:px-6 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-widest transition-all flex items-center gap-1.5 sm:gap-2",
                activeTab === (isAdmin ? "all" : "my-submissions")
                  ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <LayoutGrid size={14} className="hidden sm:inline" /> {isAdmin ? "Repository" : <><span className="sm:hidden">History</span><span className="hidden sm:inline">My History</span></>}
            </button>
          </div>

          <div className={cn("relative group flex justify-end transition-all", searchOpen ? "w-44" : "w-10", "sm:w-auto")}>
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              className={cn("sm:hidden h-10 w-10 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#172036] text-slate-500 dark:text-slate-300 shadow-sm place-items-center", searchOpen ? "hidden" : "grid")}
              aria-label="Search assessments"
            >
              <Search size={16} />
            </button>
            <Search className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors", searchOpen ? "block" : "hidden sm:block")} size={14} />
            <input
              type="text"
              placeholder="Filter records..."
              className={cn(
                "h-10 sm:h-9 pl-9 pr-3 sm:pr-4 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#172036] focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-[13px] font-medium shadow-sm",
                searchOpen ? "block w-44" : "hidden",
                "sm:block sm:w-64"
              )}
              autoFocus={searchOpen}
            />
          </div>
        </div>

        <div className="mt-2 sm:mt-4 pb-3 sm:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "pending" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
                  {loadingPending ? (
                    [1, 2, 3].map(i => <div key={i} className="h-28 sm:h-72 rounded-2xl sm:rounded-[24px] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 animate-pulse" />)
                  ) : pendingEffectiveness?.data?.length ? (
                    pendingEffectiveness.data.map((r: any) => (
                      <PendingEffectivenessCard
                        key={r.id}
                        r={r}
                        onClick={() => setSelectedPendingRecord(r)}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-5 sm:py-24 px-4 text-center border border-dashed sm:border-2 border-[#EEF2FF] dark:border-white/10 rounded-2xl sm:rounded-[32px] bg-white/50 dark:bg-white/[0.02] backdrop-blur-sm">
                      <Sparkles size={56} className="hidden sm:block mx-auto mb-5 text-brand-300 dark:text-brand-800/50" />
                      <h3 className="text-sm sm:text-2xl font-black text-slate-800 dark:text-slate-200 mb-1 sm:mb-2">No pending assessments</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-base font-medium max-w-sm mx-auto">Browse available trainings to continue learning.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
                  {loadingEvaluations ? (
                    [1, 2, 3].map(i => <div key={i} className="h-28 sm:h-64 rounded-2xl sm:rounded-[24px] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 animate-pulse" />)
                  ) : evaluations?.data?.length ? (
                    evaluations.data.map((r: Effectiveness, index: number) => (
                      <motion.div
                        whileHover={{ y: -4 }}
                        key={r.id}
                        className={cn("group flex flex-col bg-white dark:bg-[#172036] border border-[#EEF2FF] dark:border-white/5 rounded-2xl sm:rounded-[24px] p-3 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] hover:shadow-[0_15px_30px_rgba(15,23,42,0.08)] transition-all duration-300", index >= 5 && "hidden sm:flex")}
                      >
                        <div className="flex justify-between items-start mb-2 sm:mb-5">
                          <StatusBadge status={r.status} />
                          <div className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-tight sm:tracking-widest bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                            {capitalize(r.level)} Level
                          </div>
                        </div>

                        <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-lg leading-tight mb-2 sm:mb-4 line-clamp-2">
                          {(r as any).training?.title || "Program"}
                        </h3>

                        {/* Overdue warning */}
                        {r.status === "overdue" && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2 sm:mb-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[11px] font-bold">
                            <AlertTriangle size={12} />
                            <span>Submission window expired</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-6 sm:p-4 rounded-[16px] sm:bg-slate-50 sm:dark:bg-white/[0.04] sm:border sm:border-[#EEF2FF] sm:dark:border-white/5 sm:shadow-inner">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-tight sm:tracking-widest text-slate-400 dark:text-slate-500 mb-1 sm:mb-1.5">Rating</span>
                            <div className="hidden sm:flex items-center gap-1.5">
                              <TrendingUp size={16} className={r.rating && r.rating >= 4 ? "text-emerald-500" : "text-amber-500"} />
                              <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{r.rating ? `${r.rating}/5` : "—"}</span>
                            </div>
                            <div className="sm:hidden"><RatingBadge rating={r.rating} /></div>
                          </div>
                          <div className="flex flex-col sm:border-l sm:border-slate-200 sm:dark:border-white/10 sm:pl-4">
                            <span className="text-[9px] font-black uppercase tracking-tight sm:tracking-widest text-slate-400 dark:text-slate-500 mb-1 sm:mb-1.5">Final Score</span>
                            <span className={`text-sm sm:text-xl font-black leading-none ${r.manager_score != null && r.manager_score >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                              {r.manager_score != null ? `${r.manager_score}%` : "—"}
                            </span>
                          </div>
                        </div>

                        <div className="mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 sm:hidden">
                          Completed {(r as any).submitted_at ? formatDate((r as any).submitted_at) : r.reviewed_at ? formatDate(r.reviewed_at) : "recently"}
                        </div>

                        <div className="mt-auto">
                          <Button
                            variant={activeTab === "reviews" ? "default" : "outline"}
                            className={cn(
                              "w-full rounded-xl font-bold h-9 sm:h-11 text-xs sm:text-sm transition-all",
                              activeTab === "reviews"
                                ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                                : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                            )}
                            onClick={() => setSelectedEvaluation(r)}
                          >
                            {activeTab === "reviews" ? <PenTool size={14} className="mr-2" /> : <Eye size={14} className="mr-2" />}
                            {activeTab === "reviews" ? "Certify Impact" : "View Details"}
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-5 sm:py-24 px-4 text-center border border-dashed sm:border-2 border-[#EEF2FF] dark:border-white/10 rounded-2xl sm:rounded-[32px] bg-white/50 dark:bg-white/[0.02] backdrop-blur-sm">
                      <LayoutGrid size={56} className="hidden sm:block mx-auto mb-5 text-brand-300 dark:text-brand-800/50" />
                      <h3 className="text-sm sm:text-2xl font-black text-slate-800 dark:text-slate-200 mb-1 sm:mb-2">No assessment history</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-base font-medium max-w-sm mx-auto">Completed assessments will appear here.</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {!isManager && (
            <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-2xl border border-[#EEF2FF] bg-white p-3 shadow-[0_4px_20px_rgba(15,23,42,0.02)] dark:border-white/5 dark:bg-[#172036] sm:hidden">
              <div>
                <p className="text-[9px] font-black uppercase leading-tight text-slate-400">Assessments Completed</p>
                <p className="mt-1 text-lg font-black leading-none text-slate-900 dark:text-white">{completedCount}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase leading-tight text-slate-400">Average Rating</p>
                <p className="mt-1 text-lg font-black leading-none text-slate-900 dark:text-white">{avgRating}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase leading-tight text-slate-400">Impact Score</p>
                <p className="mt-1 text-lg font-black leading-none text-emerald-600 dark:text-emerald-400">{avgScore}%</p>
              </div>
            </div>
          )}

          {evaluations?.meta && evaluations.meta.total_pages > 1 && (
            <div className="mt-8 flex items-center justify-between px-2">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Showing <span className="text-slate-900 dark:text-white">{evaluations.data.length}</span> Assessments
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl h-10 px-5 font-bold border-slate-200 dark:border-white/10 text-xs">Previous</Button>
                <Button variant="outline" className="rounded-xl h-10 px-5 font-bold border-slate-200 dark:border-white/10 text-xs">Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Pending Assessment Dialog ── */}
      <Dialog open={!!selectedPendingRecord} onOpenChange={(open) => !open && setSelectedPendingRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-none shadow-2xl bg-white dark:bg-[#0B1020]">
          <div className="bg-slate-950 p-10 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
              <ClipboardCheck size={240} />
            </div>
            <div className="relative z-10">
              <DialogTitle className="text-3xl font-black mb-2">Impact Assessment</DialogTitle>
              <p className="text-slate-400 text-lg">Help us understand how this training translates to your daily performance.</p>
            </div>
          </div>
          <div className="p-10">
            {selectedPendingRecord && (
              <EffectivenessForm
                enrollmentId={selectedPendingRecord.enrollment_id}
                trainingId={(selectedPendingRecord as any).training_id}
                trainingTitle={(selectedPendingRecord as any).training_title || (selectedPendingRecord as any).training?.title}
                effectivenessId={selectedPendingRecord.id}
                effectivenessStatus={selectedPendingRecord.status}
                onSuccess={() => {
                  setSelectedPendingRecord(null);
                  setActiveTab("my-submissions");
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View / Review Dialog ── */}
      <Dialog open={!!selectedEvaluation} onOpenChange={(open) => !open && setSelectedEvaluation(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-none shadow-2xl bg-white dark:bg-[#0B1020]">
          <div className={cn("p-10 text-white relative overflow-hidden", activeTab === "reviews" ? "bg-brand-600" : "bg-slate-950")}>
            <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
              <ShieldCheck size={240} />
            </div>
            <div className="relative z-10">
              <DialogTitle className="text-3xl font-black mb-2">
                {activeTab === "reviews" ? "Performance Certification" : "Impact Insight"}
              </DialogTitle>
              <p className="text-white/70 text-lg">
                {activeTab === "reviews" ? "Verify and certify the application of skills in the workplace." : "Detailed breakdown of the training outcomes and application."}
              </p>
            </div>
          </div>
          <div className="p-10">
            {selectedEvaluation && (
              activeTab === "reviews" ? (
                <EffectivenessReview
                  evaluation={selectedEvaluation}
                  onSuccess={() => setSelectedEvaluation(null)}
                />
              ) : (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 shadow-sm text-center">
                      <label className="text-[10px] text-amber-700 dark:text-amber-500 font-black uppercase tracking-widest mb-2 block">Learner Rating</label>
                      <p className="text-4xl font-black text-amber-900 dark:text-amber-200">{selectedEvaluation.rating}<span className="text-lg opacity-50">/5</span></p>
                    </div>
                    <div className="p-6 rounded-3xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 shadow-sm text-center">
                      <label className="text-[10px] text-indigo-700 dark:text-indigo-500 font-black uppercase tracking-widest mb-2 block">Assessment Level</label>
                      <p className="text-2xl font-black text-indigo-900 dark:text-indigo-200 capitalize">{selectedEvaluation.level}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 shadow-sm text-center">
                      <label className="text-[10px] text-emerald-700 dark:text-emerald-500 font-black uppercase tracking-widest mb-2 block">Certified ROI Score</label>
                      <p className="text-4xl font-black text-emerald-900 dark:text-emerald-200">{selectedEvaluation.manager_score ?? "—"}<span className="text-lg opacity-50">%</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <h4 className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white tracking-tight"><Sparkles size={20} className="text-brand-500" /> Evidence of Learning</h4>
                      <div className="space-y-4">
                        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-[#EEF2FF] dark:border-white/5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Key Takeaways</label>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic font-medium">"{selectedEvaluation.learnings_summary}"</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-[#EEF2FF] dark:border-white/5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Workplace Application</label>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic font-medium">"{selectedEvaluation.work_application}"</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white tracking-tight"><ShieldCheck size={20} className="text-emerald-500" /> Management Certification</h4>
                      {selectedEvaluation.status === "reviewed" ? (
                        <div className="p-8 rounded-[32px] bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-500/20 shadow-xl shadow-emerald-500/5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={60} /></div>
                          <p className="text-base text-emerald-900 dark:text-emerald-100 leading-relaxed mb-8 font-medium italic">"{selectedEvaluation.manager_comments}"</p>
                          <div className="pt-6 border-t border-emerald-500/20 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Certified Date</span>
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{formatDate(selectedEvaluation.reviewed_at!)}</span>
                            </div>
                            {selectedEvaluation.digital_signature_url && (
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">E-Signature Valid</span>
                                <img
                                  src={getAssetUrl(selectedEvaluation.digital_signature_url)}
                                  alt="Signature"
                                  className="h-12 object-contain grayscale opacity-80"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-10 rounded-[32px] bg-slate-50 dark:bg-white/[0.02] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
                          <AlertCircle size={40} className="text-slate-300 dark:text-slate-700 mb-4" />
                          <h5 className="font-bold text-slate-600 dark:text-slate-400">Review Pending</h5>
                          <p className="text-xs text-slate-400 max-w-[200px] mt-1 font-medium">This assessment is awaiting formal certification by the department manager.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
