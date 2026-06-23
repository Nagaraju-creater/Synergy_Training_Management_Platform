import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, List, Search,
  CheckCircle2, Clock, XCircle, AlertCircle, 
  Sparkles, LayoutGrid, Info, ShieldCheck, Users,
  TrendingUp, Filter, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { nominationsService } from "@/services/nominations.service";
import { trainingsService } from "@/services/trainings.service";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { usePagination } from "@/hooks/usePagination";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { Nomination } from "@/types";
import EmployeeNominationForm from "./EmployeeNominationForm";

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
        </div>
      </div>
    </motion.div>
  );
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending_manager_approval: "Waiting for Manager",
  pending_admin_approval:   "Pending Admin Approval",
  approved:                 "Approved",
  rejected_by_manager:      "Declined by Manager",
  rejected_by_admin:        "Declined by Admin",
};

const STATUS_VARIANT: Record<string, "warning" | "success" | "destructive" | "secondary"> = {
  pending_manager_approval: "warning",
  pending_admin_approval:   "warning",
  approved:                 "success",
  rejected_by_manager:      "destructive",
  rejected_by_admin:        "destructive",
};

const STATUS_ICON: Record<string, JSX.Element> = {
  pending_manager_approval: <Clock size={12} className="mr-1" />,
  pending_admin_approval:   <ShieldCheck size={12} className="mr-1" />,
  approved:                 <CheckCircle2 size={12} className="mr-1" />,
  rejected_by_manager:      <XCircle size={12} className="mr-1" />,
  rejected_by_admin:        <XCircle size={12} className="mr-1" />,
};

// ── Review schema ──────────────────────────────────────────────────────────────

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewer_notes: z.string().optional(),
});
type ReviewFormData = z.infer<typeof reviewSchema>;

// ── Component ──────────────────────────────────────────────────────────────────

export default function NominationsPage() {
  const { user } = useAuthStore();
  const role = (typeof user?.role === "string" ? user.role : (user?.role as any)?.name ?? "").toLowerCase();
  const isAdmin   = role === "admin" || role === "trainer";
  const isManager = role === "manager";
  const isEmployee = !isAdmin && !isManager;

  type Tab = "catalog" | "mine" | "team" | "pending_admin" | "all" | "new";
  const defaultTab: Tab = isEmployee ? "catalog" : isAdmin ? "pending_admin" : "team";
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);
  const [nominatingTrainingId, setNominatingTrainingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { page, perPage } = usePagination();
  const qc = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: myNomResp } = useQuery({
    queryKey: ["nominations-my", page, perPage],
    queryFn: () => nominationsService.listMy(page, perPage),
    select: (res) => res.data,
    enabled: isEmployee,
  });

  const { data: teamNomResp } = useQuery({
    queryKey: ["nominations-team", page, perPage],
    queryFn: () => nominationsService.listTeam(page, perPage),
    select: (res) => res.data,
    enabled: isManager,
  });

  const { data: allNomResp } = useQuery({
    queryKey: ["nominations-all", page, perPage],
    queryFn: () => nominationsService.listAll(page, perPage),
    select: (res) => res.data,
    enabled: isAdmin,
  });

  const nominationsResp = isEmployee ? myNomResp : isManager ? teamNomResp : allNomResp;

  const { data: catalogResp, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ["nomination-catalog"],
    queryFn: () => trainingsService.list(1, 50, { status: "scheduled" }),
    enabled: isEmployee && activeTab === "catalog",
    select: (res) => res.data,
  });

  // ── Review form ─────────────────────────────────────────────────────────────
  const {
    register: regReview,
    handleSubmit: handleReviewSubmit,
    reset: resetReview,
    formState: { errors: reviewErrors },
  } = useForm<ReviewFormData>({ resolver: zodResolver(reviewSchema) });

  const reviewMutation = useMutation({
    mutationFn: (payload: ReviewFormData) =>
      nominationsService.review(selectedNomination!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nominations-my"] });
      qc.invalidateQueries({ queryKey: ["nominations-team"] });
      qc.invalidateQueries({ queryKey: ["nominations-all"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      setSelectedNomination(null);
      resetReview();
      toast("success", "Decision Recorded", "The nomination status has been successfully updated.");
    },
  });

  const onReviewSubmit = (data: ReviewFormData) => reviewMutation.mutate(data);

  // ── Derived data ────────────────────────────────────────────────────────────
  const allNominations = nominationsResp?.data ?? [];
  const filtered = allNominations.filter((n: Nomination) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.training_title?.toLowerCase().includes(q) ||
      n.employee_name?.toLowerCase().includes(q) ||
      n.status?.toLowerCase().includes(q)
    );
  });

  const pendingManagerItems = filtered.filter((n: Nomination) => n.status === "pending_manager_approval");
  const pendingAdminItems   = filtered.filter((n: Nomination) => n.status === "pending_admin_approval");
  const myNominationItems   = filtered;

  const pendingManagerCount = allNominations.filter((n: Nomination) => n.status === "pending_manager_approval").length;
  const pendingAdminCount   = allNominations.filter((n: Nomination) => n.status === "pending_admin_approval").length;
  const approvedCount       = allNominations.filter((n: Nomination) => n.status === "approved").length;
  const totalCount          = nominationsResp?.meta?.total || 0;

  const activeRows: Nomination[] = (() => {
    if (isEmployee)   return myNominationItems;
    if (isManager)    return activeTab === "team" ? filtered : pendingManagerItems;
    if (activeTab === "pending_admin") return pendingAdminItems;
    return filtered;
  })();

  const canReview = (n: Nomination) => {
    if (isAdmin)   return n.status === "pending_admin_approval";
    if (isManager) return n.status === "pending_manager_approval";
    return false;
  };

  const columns: Column<Nomination>[] = [
    {
      key: "training_title",
      label: "Program",
      className: "min-w-[280px]",
      render: (r) => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-white/5">
            <Sparkles size={18} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-900 dark:text-white leading-tight line-clamp-1">{r.training_title || "Unknown Program"}</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-0.5 font-mono">{r.training_id?.slice(0, 8)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "employee_name",
      label: "Nominee",
      hidden: isEmployee,
      className: "min-w-[180px]",
      render: (r) => (
        <div className="flex items-center gap-2.5 py-1">
          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-brand-500/10 flex items-center justify-center text-[11px] font-black text-indigo-600 dark:text-brand-400 border border-indigo-100 dark:border-brand-500/20">
            {r.employee_name?.charAt(0) || "?"}
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{r.employee_name || "Unknown"}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Stage",
      render: (r) => {
        const s = r.status?.toLowerCase() ?? "";
        return (
          <div className="py-1">
            <Badge variant={STATUS_VARIANT[s] ?? "secondary"} className="font-black text-[10px] px-2.5 py-0.5 rounded-lg tracking-tight uppercase flex items-center w-fit">
              {STATUS_ICON[s]}
              {STATUS_LABELS[s] ?? s.replace(/_/g, " ")}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "reason",
      label: "Rationale",
      className: "min-w-[200px]",
      render: (r) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium italic line-clamp-1 py-1">
          {r.reason ? `"${r.reason}"` : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (r) =>
        canReview(r) ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg font-bold text-[10px] uppercase tracking-widest bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 text-brand-600 dark:text-brand-400"
            onClick={() => {
              setSelectedNomination(r);
              resetReview({ status: "approved", reviewer_notes: "" });
            }}
          >
            Review Request
          </Button>
        ) : null,
    },
  ];

  const tabsConfig = (() => {
    if (isEmployee) return [
      { id: "catalog" as Tab, label: "Ecosystem", icon: <LayoutGrid size={14} /> },
      { id: "mine"    as Tab, label: "My Requests", icon: <List size={14} /> },
    ];
    if (isManager) return [
      { id: "team"    as Tab, label: "Team Matrix", icon: <Users size={14} />, badge: totalCount },
      { id: "pending" as Tab, label: `Pending Review`, icon: <Clock size={14} />, badge: pendingManagerCount },
    ];
    return [
      { id: "pending_admin" as Tab, label: "Governance Approval", icon: <ShieldCheck size={14} />, badge: pendingAdminCount },
      { id: "all"           as Tab, label: "Global Repository",   icon: <List size={14} />,        badge: totalCount },
      { id: "new"           as Tab, label: "Manual Entry",    icon: <Plus size={14} /> },
    ];
  })();

  const resolvedActiveRows = activeTab === ("pending" as Tab) ? pendingManagerItems : activeRows;

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] transition-colors duration-500 px-4 lg:px-8 pt-4 lg:pt-8 pb-12">
      <div className="max-w-[1600px] mx-auto space-y-4 animate-in fade-in duration-700">
        
        {/* ── Premium Hero Header ─────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white via-indigo-50/30 to-slate-50 dark:from-[#172036] dark:via-indigo-950/10 dark:to-[#0B1020] border border-[#EEF2FF] dark:border-white/5 p-4 lg:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-400/5 dark:bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-400/5 dark:bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/5 border border-[#EEF2FF] dark:border-white/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest mb-4 backdrop-blur-md shadow-sm"
              >
                <Sparkles size={12} className="text-brand-500 dark:text-brand-400" /> Skill Acquisition Pipeline
              </motion.div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tighter mb-1 leading-tight text-slate-900 dark:text-white">
                Training Nominations
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg font-medium leading-relaxed">
                Streamline the approval workflow for mission-critical training programs, ensuring the right talent is matched with the right development tracks.
              </p>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isEmployee && <>
            <PremiumStatCard title="Total Requests" value={totalCount} icon={List} variant="indigo" delay={0.1} />
            <PremiumStatCard title="Active/Pending" value={allNominations.filter((n:Nomination) => n.status.includes("pending")).length} icon={Clock} variant="amber" delay={0.2} />
            <PremiumStatCard title="Approved Tracks" value={approvedCount} icon={CheckCircle2} variant="emerald" delay={0.3} />
          </>}
          {isManager && <>
            <PremiumStatCard title="Team Volume" value={totalCount} icon={Users} variant="indigo" delay={0.1} />
            <PremiumStatCard title="Needs Review" value={pendingManagerCount} icon={Clock} variant="amber" delay={0.2} />
            <PremiumStatCard title="Certified Approved" value={approvedCount} icon={CheckCircle2} variant="emerald" delay={0.3} />
          </>}
          {isAdmin && <>
            <PremiumStatCard title="Global Nominations" value={totalCount} icon={List} variant="indigo" delay={0.1} />
            <PremiumStatCard title="Governance Queue" value={pendingAdminCount} icon={ShieldCheck} variant="amber" delay={0.2} />
            <PremiumStatCard title="Final Approvals" value={approvedCount} icon={CheckCircle2} variant="emerald" delay={0.3} />
          </>}
        </div>

        {/* ── Navigation & Filter ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-1 bg-white/50 dark:bg-white/5 p-1 rounded-2xl w-fit border border-[#EEF2FF] dark:border-white/5 shadow-sm backdrop-blur-md">
            {tabsConfig.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 relative",
                  activeTab === tab.id 
                    ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                {tab.icon}
                {tab.label}
                {"badge" in tab && (tab as any).badge > 0 && (
                  <span className={cn(
                    "ml-1 min-w-[18px] h-4.5 px-1.5 rounded-lg text-[9px] font-black flex items-center justify-center transition-colors",
                    activeTab === tab.id ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-white/10 text-slate-400"
                  )}>
                    {(tab as any).badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab !== "catalog" && activeTab !== "new" && (
            <div className="relative group w-full md:w-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requests..."
                className="h-9 pl-9 pr-4 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#172036] w-full md:w-72 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-[13px] font-medium shadow-sm"
              />
            </div>
          )}
        </div>

        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "catalog" && isEmployee && (() => {
                const nominatedTrainingIds = new Set((myNomResp?.data ?? []).map((n: any) => n.training_id));
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoadingCatalog ? (
                      [1, 2, 3].map((i) => <div key={i} className="h-64 rounded-[24px] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 animate-pulse" />)
                    ) : catalogResp?.data?.length ? (
                      catalogResp.data.map((t: any) => {
                        const alreadyNominated = nominatedTrainingIds.has(t.id);
                        return (
                          <motion.div
                            whileHover={!alreadyNominated ? { y: -5 } : {}}
                            key={t.id}
                            className={cn(
                              "bg-white dark:bg-[#172036] border border-[#EEF2FF] dark:border-white/5 rounded-[24px] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all group relative overflow-hidden",
                              alreadyNominated && "opacity-60"
                            )}
                          >
                            <div className="flex justify-between items-start mb-6">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-brand-500/10 border border-indigo-100 dark:border-brand-500/20 flex items-center justify-center text-indigo-600 dark:text-brand-400">
                                <Sparkles size={24} />
                              </div>
                              <Badge variant="secondary" className="px-3 py-1 font-black text-[9px] uppercase tracking-widest rounded-lg">
                                {t.category?.name || "Global Track"}
                              </Badge>
                            </div>
                            <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">{t.title}</h3>
                            <div className="space-y-2 mb-8 font-medium">
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Clock size={14} className="text-slate-400" />
                                <span>Starts: {t.start_date ? new Date(t.start_date).toLocaleDateString() : "TBD"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Zap size={14} className="text-slate-400" />
                                <span>Duration: {t.duration_hours} Credit Hours</span>
                              </div>
                            </div>
                            {alreadyNominated ? (
                              <div className="w-full h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
                                <CheckCircle2 size={15} /> Request Logged
                              </div>
                            ) : (
                              <Button
                                className="w-full rounded-xl font-black text-xs uppercase tracking-widest bg-brand-600 hover:bg-brand-700 h-11 shadow-lg shadow-brand-500/20 text-white"
                                onClick={() => setNominatingTrainingId(t.id)}
                              >
                                Request Nomination
                              </Button>
                            )}
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-24 text-center border-2 border-dashed border-[#EEF2FF] dark:border-white/10 rounded-[32px] bg-white/50 dark:bg-white/[0.02] backdrop-blur-sm">
                        <AlertCircle size={56} className="mx-auto mb-5 text-slate-300 dark:text-slate-700" />
                        <h4 className="text-2xl font-black text-slate-800 dark:text-slate-200">No Programs Detected</h4>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto mt-2">
                          There are currently no scheduled trainings available for nomination in the global directory.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {activeTab === "new" && isAdmin && (
                <div className="max-w-3xl mx-auto bg-white dark:bg-[#172036] border border-[#EEF2FF] dark:border-white/5 rounded-[32px] p-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-brand-500" />
                  <div className="flex items-center gap-5 mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <Plus size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">Manual Nomination</h2>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Inject a specific employee nomination into the governance pipeline.</p>
                    </div>
                  </div>
                  <EmployeeNominationForm onSuccess={() => setActiveTab("all")} />
                </div>
              )}

              {activeTab !== "catalog" && activeTab !== "new" && (
                <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500 overflow-hidden">
                   {/* STICKY HEADER BLOCK */}
                  <div className="sticky top-0 z-20 bg-white dark:bg-[#172036] rounded-t-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    <div className="bg-white dark:bg-[#172036] border-b border-[#EEF2FF] dark:border-white/[0.07] px-5 py-3 shadow-sm flex items-center justify-between">
                       <div className="flex items-center gap-2">
                        <div className="h-9 px-3 bg-brand-50 dark:bg-brand-500/10 rounded-xl border border-brand-100 dark:border-brand-500/20 text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Filter size={11} strokeWidth={2.5} />
                          Governance Queue
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex bg-slate-50 dark:bg-white/[0.02] border-b border-[#EEF2FF] dark:border-white/[0.07] px-2">
                      <div className="flex-[2.5] min-w-[280px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Target Program</div>
                      {!isEmployee && <div className="flex-[2] min-w-[180px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Nominee</div>}
                      <div className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Stage</div>
                      <div className="flex-[2] min-w-[200px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Rationale</div>
                      <div className="w-[140px]" />
                    </div>
                  </div>

                  <div className="relative z-0">
                    <Table
                      columns={columns}
                      data={resolvedActiveRows}
                      isLoading={false}
                      keyExtractor={(r) => r.id}
                      hideHeader
                      emptyTitle="No nominations detected"
                      className="border-none shadow-none rounded-none"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Nominate self dialog ──────────────────────────────────────────── */}
      <Dialog open={!!nominatingTrainingId} onOpenChange={(open) => !open && setNominatingTrainingId(null)}>
        <DialogContent className="max-w-2xl rounded-[32px] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-[#0B1020]">
          <div className="bg-slate-950 p-8 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
              <Sparkles size={240} />
            </div>
            <div className="relative z-10">
              <DialogTitle className="text-3xl font-black mb-2">Request Nomination</DialogTitle>
              <DialogDescription className="text-slate-400 text-lg">
                Tell us why this training is essential for your professional growth journey.
              </DialogDescription>
            </div>
          </div>
          <div className="p-8">
            <EmployeeNominationForm
              preSelectedTrainingId={nominatingTrainingId || ""}
              onSuccess={() => {
                setNominatingTrainingId(null);
                setActiveTab("mine");
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Review dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!selectedNomination} onOpenChange={(open) => !open && setSelectedNomination(null)}>
        <DialogContent className="max-w-xl rounded-[32px] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-[#0B1020]">
          <div className="bg-brand-600 p-8 text-white relative overflow-hidden">
             <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
                <ShieldCheck size={180} />
             </div>
             <div className="relative z-10">
               <DialogTitle className="text-2xl font-black mb-1">Review Request</DialogTitle>
               <p className="opacity-80 text-sm font-medium">
                 Assessing request from <span className="font-bold underline decoration-2">{selectedNomination?.employee_name}</span> for <span className="font-bold">{selectedNomination?.training_title}</span>
               </p>
             </div>
          </div>

          <form onSubmit={handleReviewSubmit(onReviewSubmit)} className="space-y-6 p-8">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <Info size={16} className="text-brand-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Pipeline Stage</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                  {STATUS_LABELS[selectedNomination?.status ?? ""] ?? selectedNomination?.status}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
              <p className="text-[10px] text-brand-600 dark:text-brand-400 uppercase tracking-widest font-black">Employee Rationale</p>
              <p className="text-sm italic text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                "{selectedNomination?.reason || "No reason provided"}"
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Decision Action</label>
              <Select {...regReview("status")} error={!!reviewErrors.status} className="h-11 rounded-xl font-bold text-xs bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                <option value="approved">✅ Approve Request — {isManager ? "Escalate to Admin" : "Final Certification"}</option>
                <option value="rejected">❌ Reject Request — Decline Nomination</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reviewer Feedback</label>
              <Textarea
                {...regReview("reviewer_notes")}
                placeholder="Detailed rationale for this decision..."
                rows={3}
                className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium p-4 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" type="button" className="flex-1 h-11 rounded-xl font-bold text-xs" onClick={() => setSelectedNomination(null)}>
                Discard
              </Button>
              <Button type="submit" className="flex-1 h-11 rounded-xl font-bold text-xs bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 text-white" isLoading={reviewMutation.isPending}>
                Log Decision
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
