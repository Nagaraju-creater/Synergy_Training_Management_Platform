import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  GraduationCap, 
  Users, 
  ChevronRight,
  MonitorPlay,
  ArrowRight,
  Calendar,
  User,
  LayoutList,
  LayoutGrid as GridIcon,
  X,
  Sparkles,
  ClipboardCheck,
  BookmarkCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import api from "@/lib/axios";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatEligibility } from "@/utils/formatters";
import { useAuthStore } from "@/store/authStore";
import { TrainingLifecycleBadge } from "@/components/ui/TrainingLifecycleBadge";
import TrainingCatalog from "./Catalog";
import MyEnrollments from "./MyEnrollments";

// ─────────────────────────────────────────────────────────────────────────────

// ── Training Wallpapers Mapping ──────────────────────────────────────────────
const CATEGORY_WALLPAPERS: Record<string, string> = {
  "AI & Data Science": "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
  "Leadership & Management": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=800",
  "Technology & Software": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800",
  "Soft Skills": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=800",
  "Compliance & Ethics": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800",
  "Business Essentials": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800",
  "Default": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800"
};

function getTrainingWallpaper(categoryName: string = "") {
  return CATEGORY_WALLPAPERS[categoryName] || CATEGORY_WALLPAPERS["Default"];
}

// ── Enrollment Card Component ────────────────────────────────────────────────
function TrainingEnrollmentCard({ 
  training, 
  isExpanded, 
  onToggle, 
  enrollments, 
  loading, 
  error,
  errorDetail,
  onRetry,
  searchQuery,
  onSearchChange,
  delay = 0 
}: { 
  training: any, 
  isExpanded: boolean, 
  onToggle: () => void,
  enrollments: any[],
  loading: boolean,
  error: boolean,
  errorDetail: any,
  onRetry: () => void,
  searchQuery: string,
  onSearchChange: (val: string) => void,
  delay?: number 
}) {
  const wallpaper = getTrainingWallpaper(training.category?.name);
  const enrolledCount = training.enrolled_count || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn(
        "group flex flex-col bg-white dark:bg-[#172036] rounded-[32px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_12px_rgba(15,23,42,0.02)] transition-all overflow-hidden relative",
        isExpanded && "ring-2 ring-brand-500 shadow-[0_20px_50px_rgba(79,70,229,0.15)] md:col-span-2 lg:col-span-2 xl:col-span-3"
      )}
    >
      <div className="flex flex-col">
        {/* Main Content Area */}
        <div className="flex flex-col">
          <div className="h-48 w-full relative overflow-hidden shrink-0">
            <img src={wallpaper} alt={training.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute top-4 left-4">
              <TrainingLifecycleBadge 
                  training={training} 
                  size="xs" 
                  showCountdown 
                  className="backdrop-blur-md bg-white/90 dark:bg-[#111827]/90 shadow-lg border-white/20 dark:border-white/10" 
              />
            </div>
            <div className="absolute bottom-5 left-6 right-6">
              <h3 className="text-white font-black text-xl tracking-tight leading-tight line-clamp-2">{training.title}</h3>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <Calendar size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 truncate">{training.start_date ? new Date(training.start_date).toLocaleDateString() : "TBD"}</span>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <MonitorPlay size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mode</span>
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 truncate">{training.delivery_mode}</span>
                  </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-y border-slate-50 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <User size={18} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trainer</span>
                    <span className="text-[13px] font-black text-slate-900 dark:text-white leading-none">{training.trainer_name || "Internal Expert"}</span>
                </div>
              </div>

              <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eligibility</span>
                  <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 leading-none mt-1">
                    {formatEligibility(training.is_global, training.eligible_departments)}
                  </span>
              </div>
              
              <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{enrolledCount}</span>
                    <Users size={14} className="text-brand-500" />
                  </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <Button 
                onClick={onToggle}
                variant="outline"
                className={cn(
                  "rounded-full h-10 px-6 font-black text-[10px] uppercase tracking-widest transition-all gap-2 border-slate-200 dark:border-white/10 hover:border-brand-500 hover:text-brand-600 shadow-sm",
                  isExpanded && "bg-brand-500 text-white border-brand-500 hover:bg-brand-600 hover:text-white"
                )}
              >
                <Users size={14} />
                {isExpanded ? "Close Roster" : "View Participants"}
                <span className="ml-1 opacity-50">({enrolledCount})</span>
                <ChevronRight 
                  size={14} 
                  className={cn("transition-transform duration-300", isExpanded ? "rotate-90" : "rotate-0")} 
                />
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded Participant Section (Vertical) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-slate-50/50 dark:bg-white/[0.01] border-t border-slate-100 dark:border-white/5"
            >
              <div className="flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
                   <div className="relative flex-grow max-w-sm group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <Input 
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search roster..." 
                        className="pl-9 h-8 rounded-xl bg-white dark:bg-[#0B1020] border-slate-200 dark:border-white/10 text-[10px] font-bold" 
                      />
                   </div>
                   <Badge className="bg-brand-500/10 text-brand-600 border-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                      Roster Info
                   </Badge>
                </div>

                <div className="p-6 overflow-y-auto max-h-[400px] custom-scrollbar">
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 animate-pulse">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-3/4 bg-slate-100 dark:bg-white/10 rounded" />
                            <div className="h-2 w-1/2 bg-slate-100 dark:bg-white/10 rounded" />
                            <div className="h-1 w-full bg-slate-100 dark:bg-white/10 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                       <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500 mb-4">
                          <X size={24} />
                       </div>
                       <h3 className="text-sm font-black text-slate-800 dark:text-white mb-1">Connection Interrupted</h3>
                       <p className="text-[11px] font-bold text-slate-500 mb-6 max-w-[240px] mx-auto">
                         {(errorDetail as any)?.response?.data?.detail || (errorDetail as any)?.message || "The roster data could not be retrieved at this time."}
                       </p>
                       <Button 
                         size="sm" 
                         variant="outline"
                         onClick={onRetry} 
                         className="h-9 rounded-xl text-[10px] font-black px-6 uppercase border-red-200 text-red-600 hover:bg-red-50"
                       >
                         Retry Sync
                       </Button>
                    </div>
                  ) : enrollments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                       <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-300 mb-3">
                          <Users size={24} />
                       </div>
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No participants enrolled yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {enrollments.map((e: any) => {
                        const fullName = e.employee_name || (e.employee ? `${e.employee.first_name ?? ''} ${e.employee.last_name ?? ''}`.trim() : 'Unknown');
                        const nameParts = fullName.trim().split(' ');
                        const initials = nameParts.length >= 2 ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}` : fullName.slice(0, 2);
                        const department = e.employee?.department?.name || '';
                        const progress = e.progress ?? 0;
                        const statusVariant = (({ enrolled: 'info', completed: 'success', pending: 'warning', rejected: 'destructive', withdrawn: 'secondary' } as Record<string, any>)[e.status]) || 'secondary';

                        return (
                          <div key={e.id} className="flex items-center gap-3 p-3 bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100 dark:border-white/5 hover:shadow-md transition-all group/emp">
                            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600 font-black text-[10px] border border-brand-500/10 uppercase shrink-0 group-hover/emp:bg-brand-500 group-hover/emp:text-white transition-colors">
                              {initials.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <p className="font-bold text-slate-900 dark:text-white text-[11px] truncate leading-tight">{fullName}</p>
                                <Badge variant={statusVariant} className="rounded-md font-black text-[7px] uppercase tracking-tighter px-1.5 py-0.5 shrink-0">
                                  {e.status}
                                </Badge>
                              </div>
                               <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest mb-1.5">{department || "General"} • {e.employee?.designation || "Member"}</p>
                              <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all", progress >= 100 ? "bg-emerald-500" : "bg-brand-500")} style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-white dark:bg-black/10 flex justify-end">
                   <Button 
                      onClick={() => window.location.href = `/trainings/details/${training.id}`}
                      variant="link"
                      className="text-[10px] font-black uppercase tracking-widest text-brand-600 p-0 h-auto flex items-center gap-1 hover:no-underline"
                    >
                      Management Console <ArrowRight size={10} />
                    </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function DesktopEnrollmentsPage() {
  const { user } = useAuthStore();
  const role = user?.role?.toLowerCase() || "";
  const isAdmin = role.includes("admin") || role.includes("trainer");
  const isManager = role.includes("manager");
  const canManage = isAdmin || isManager;
  const [activeTab, setActiveTab] = useState(canManage ? "management" : "catalog");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedTrainingId, setExpandedTrainingId] = useState<string | null>(null);
  const [trainingSearch, setTrainingSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: trainings, isLoading: trainingsLoading, isError: trainingsError } = useQuery({
    queryKey: ["trainings-management"],
    queryFn: () => api.get("/trainings/", { params: { per_page: 100 } }),
    select: (res) => res.data.data,
    enabled: canManage && activeTab === "management",
  });

  const { data: availableTrainings } = useQuery({
    queryKey: ["trainings-count"],
    queryFn: () => api.get("/trainings/", { params: { status: "scheduled", page: 1, per_page: 100 } }),
    select: (res) => res.data.data,
  });

  const { data: myEnrollments } = useQuery({
    queryKey: ["my-enrollments-count", user?.employee?.id],
    queryFn: () => api.get("/enrollments/", { params: { employee_id: user?.employee?.id, page: 1, per_page: 100 } }),
    enabled: !!user?.employee?.id,
    select: (res) => res.data.data,
  });

  const filteredTrainings = trainings?.filter((t: any) => {
    const title = t?.title || "";
    const matchesSearch = title.toLowerCase().includes(trainingSearch.toLowerCase());
    const matchesCategory = categoryFilter === "All" || t?.category?.name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const { data: categories } = useQuery({
    queryKey: ["training-categories"],
    queryFn: () => api.get("/trainings/categories"),
    select: (res) => res.data.data || [],
  });

  const { data: trainingEnrollments, isLoading: enrollmentsLoading, isError: enrollmentsError, error: enrollmentsErrorDetail, refetch: refetchEnrollments } = useQuery({
    queryKey: ["training-enrollments", expandedTrainingId],
    queryFn: async () => {
      // Ensure we hit the endpoint without potential double-slash or redirect issues
      const res = await api.get("/enrollments", {
        params: { 
          training_id: expandedTrainingId, 
          per_page: 100, 
          page: 1 
        }
      });
      return res;
    },
    enabled: !!expandedTrainingId,
    select: (res) => {
      const payload = res.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    },
    staleTime: 5000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    refetchOnWindowFocus: false,
    throwOnError: false,
  });

  const filteredEnrollments = (trainingEnrollments || []).filter((e: any) => {
    if (!searchQuery) return true;
    const name = (e?.employee_name || "").toLowerCase();
    const code = (e?.employee?.employee_code || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

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
                <BookmarkCheck size={12} className="text-brand-500 dark:text-brand-400" /> Learning Ecosystem
              </motion.div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tighter mb-1 leading-tight text-slate-900 dark:text-white">
                Enrollment Hub
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg font-medium leading-relaxed">
                Explore mission-critical programs, monitor team participation, and evaluate the effectiveness of professional development tracks.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="group flex flex-col bg-white/80 dark:bg-[#172036]/80 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-2 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                   Scheduled
                </span>
                <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{availableTrainings?.length || '0'}</span>
              </div>
              {!isAdmin && (
                <div className="group flex flex-col bg-white/80 dark:bg-[#172036]/80 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-2 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                     My Learning
                  </span>
                  <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{myEnrollments?.length || '0'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Segmented Navigation ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white/50 dark:bg-white/5 p-1 rounded-2xl w-fit border border-[#EEF2FF] dark:border-white/5 shadow-sm backdrop-blur-md mb-2">
          {!isAdmin && (
            <>
              <button 
                onClick={() => setActiveTab("catalog")}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === 'catalog' 
                    ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                <GridIcon size={14} /> Catalog
              </button>
              <button 
                onClick={() => setActiveTab("my")}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === 'my' 
                    ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                <Sparkles size={14} /> My Progress
              </button>
            </>
          )}
          {canManage && (
            <button 
              onClick={() => setActiveTab("management")}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'management' 
                  ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <ClipboardCheck size={14} /> {isManager ? "Team Matrix" : "Governance"}
            </button>
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
              {activeTab === "catalog" && <TrainingCatalog />}
              {activeTab === "my" && <MyEnrollments />}
              {activeTab === "management" && (
                <div className="space-y-6">
                  {/* Management Filters */}
                  <div className="bg-white dark:bg-[#172036] rounded-[24px] p-4 border border-[#EEF2FF] dark:border-white/5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                     <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-200/60 dark:border-white/10">
                        <button 
                          onClick={() => setViewMode("grid")}
                          className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-white dark:bg-[#0B1020] shadow-sm text-brand-600" : "text-slate-400")}
                        >
                           <GridIcon size={16} />
                        </button>
                        <button 
                          onClick={() => setViewMode("list")}
                          className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white dark:bg-[#0B1020] shadow-sm text-brand-600" : "text-slate-400")}
                        >
                           <LayoutList size={16} />
                        </button>
                     </div>

                     <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-64 group">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={16} />
                           <Input 
                             value={trainingSearch}
                             onChange={(e) => setTrainingSearch(e.target.value)}
                             placeholder="Search programs..." 
                             className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-xs font-bold" 
                           />
                        </div>
                        <Select 
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="h-10 w-48 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-xs font-bold font-black uppercase tracking-widest px-4"
                        >
                           <option value="All">All Categories</option>
                           {categories?.map((c: any) => (
                             <option key={c.id} value={c.name}>{c.name}</option>
                           ))}
                        </Select>
                     </div>
                  </div>

                  {/* Enrollment Content */}
                  {trainingsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {[1,2,3,4,5,6].map(i => (
                          <div key={i} className="h-[420px] rounded-[32px] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-6 space-y-4 animate-pulse">
                             <div className="h-44 w-full bg-slate-100 dark:bg-white/5 rounded-2xl" />
                             <div className="h-6 w-3/4 bg-slate-100 dark:bg-white/5 rounded-lg" />
                             <div className="h-20 w-full bg-slate-100 dark:bg-white/5 rounded-xl" />
                             <div className="h-10 w-full bg-slate-100 dark:bg-white/5 rounded-xl" />
                          </div>
                       ))}
                    </div>
                  ) : trainingsError ? (
                    <div className="bg-red-50 dark:bg-red-900/10 rounded-[32px] border border-red-100 dark:border-red-900/20 p-12 text-center space-y-4 shadow-sm">
                       <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-500">
                          <Plus size={32} className="rotate-45" />
                       </div>
                       <div className="space-y-1">
                          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Connectivity Issue</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">We couldn't retrieve the training data. Please check your connection or try again later.</p>
                       </div>
                       <Button variant="outline" className="rounded-xl font-bold text-xs px-8 border-red-200 text-red-600 hover:bg-red-50" onClick={() => window.location.reload()}>
                          Retry Connection
                       </Button>
                    </div>
                  ) : !filteredTrainings || filteredTrainings.length === 0 ? (
                    <div className="bg-white dark:bg-[#172036] rounded-[32px] border border-[#EEF2FF] dark:border-white/5 p-20 text-center space-y-4 shadow-sm">
                       <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-300">
                          <GraduationCap size={40} />
                       </div>
                       <div className="space-y-1">
                          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">No training programs detected</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Try adjusting your search or filters to find specific enrollments.</p>
                       </div>
                       <Button variant="outline" className="rounded-xl font-bold text-xs px-8" onClick={() => { setTrainingSearch(""); setCategoryFilter("All"); }}>
                          Clear All Filters
                       </Button>
                    </div>
                  ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500">
                      {filteredTrainings.map((t: any, i: number) => (
                        <TrainingEnrollmentCard 
                          key={t.id} 
                          training={t} 
                          delay={i * 0.05} 
                          isExpanded={expandedTrainingId === t.id}
                          onToggle={() => setExpandedTrainingId(expandedTrainingId === t.id ? null : t.id)}
                          enrollments={filteredEnrollments}
                          loading={enrollmentsLoading}
                          error={enrollmentsError}
                          errorDetail={enrollmentsErrorDetail}
                          onRetry={refetchEnrollments}
                          searchQuery={searchQuery}
                          onSearchChange={setSearchQuery}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 overflow-hidden shadow-sm">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                             <tr>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Program</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Trainer</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Enrollment</th>
                                <th className="px-8 py-4 text-right"></th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                             {filteredTrainings.map((t: any) => {
                               const enrolled = t?.enrolled_count || 0;
                               const isExpanded = expandedTrainingId === t.id;
                               return (
                                 <Fragment key={t.id}>
                                   <tr className={cn("hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer group", isExpanded && "bg-brand-50/30 dark:bg-brand-500/5")} onClick={() => setExpandedTrainingId(isExpanded ? null : t.id)}>
                                      <td className="px-8 py-4">
                                         <span className="font-black text-slate-900 dark:text-white text-sm">{t?.title || "Untitled Program"}</span>
                                      </td>
                                      <td className="px-8 py-4">
                                         <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t?.trainer_name || "Internal"}</span>
                                      </td>
                                      <td className="px-8 py-4">
                                         <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t?.start_date ? new Date(t.start_date).toLocaleDateString() : "TBD"}</span>
                                      </td>
                                      <td className="px-8 py-4">
                                         <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                              <Users size={12} />
                                            </div>
                                            <span className="text-xs font-black text-brand-600 dark:text-brand-400">{enrolled} <span className="text-[9px] text-slate-400 uppercase tracking-widest ml-0.5">Enrolled</span></span>
                                         </div>
                                      </td>
                                      <td className="px-8 py-4 text-right">
                                         <ChevronRight size={16} className={cn("text-slate-300 transition-transform duration-300", isExpanded && "rotate-90 text-brand-500")} />
                                      </td>
                                   </tr>
                                   {isExpanded && (
                                     <tr>
                                       <td colSpan={5} className="bg-slate-50/50 dark:bg-white/[0.01] p-0">
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="p-8 border-t border-slate-100 dark:border-white/5">
                                               <div className="flex items-center justify-between mb-6">
                                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                    <Users size={14} /> Participant Roster ({filteredEnrollments.length})
                                                  </h4>
                                                  <div className="relative w-64">
                                                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                     <Input 
                                                       value={searchQuery}
                                                       onChange={(e) => setSearchQuery(e.target.value)}
                                                       placeholder="Filter list..." 
                                                       className="pl-9 h-8 rounded-lg bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-[10px] font-bold" 
                                                     />
                                                  </div>
                                               </div>

                                               {enrollmentsLoading ? (
                                                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                                     {[1,2,3,4].map(i => <div key={i} className="w-64 h-24 shrink-0 bg-white dark:bg-white/5 rounded-2xl animate-pulse" />)}
                                                  </div>
                                               ) : (
                                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                     {filteredEnrollments.map((e: any) => (
                                                        <div key={e.id} className="flex items-center gap-3 p-3 bg-white dark:bg-[#1e293b] rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                                                           <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600 font-black text-[9px] uppercase">
                                                              {e.employee_name?.slice(0, 2).toUpperCase() || "??"}
                                                           </div>
                                                           <div className="min-w-0 flex-1">
                                                              <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">{e.employee_name}</p>
                                                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate">{e.employee?.department?.name || "Member"}</p>
                                                           </div>
                                                           <div className="h-1 w-8 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shrink-0">
                                                              <div className="h-full bg-brand-500" style={{ width: `${e.progress}%` }} />
                                                           </div>
                                                        </div>
                                                     ))}
                                                  </div>
                                               )}
                                               
                                               <div className="mt-6 flex justify-end">
                                                  <Button 
                                                    onClick={() => window.location.href = `/trainings/details/${t.id}`}
                                                    className="h-8 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[9px] font-black uppercase tracking-widest px-4 shadow-lg shadow-brand-500/20"
                                                  >
                                                    Full Console View
                                                  </Button>
                                               </div>
                                            </div>
                                          </motion.div>
                                       </td>
                                     </tr>
                                   )}
                                 </Fragment>
                               );
                             })}
                          </tbody>
                       </table>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
