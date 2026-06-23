import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  Search, Edit2, Trash2, Users, BookOpen, TrendingUp, 
  Building2, MonitorPlay, Upload, X, BarChart3, Filter, Tag, ArrowRight, Clock, GraduationCap, Zap
} from "lucide-react";
import { motion } from "framer-motion";

import { learningHubService } from "@/services/learningHub.service";
import { departmentsService } from "@/services/departments.service";
import { trainingsService } from "@/services/trainings.service";
import { useAuthStore } from "@/store/authStore";
import { useMotivationalToast } from "@/components/ui/MotivationalToast";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/Dialog";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuItem 
} from "@/components/ui/DropdownMenu";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { toast } from "@/components/ui/Toast";
import { usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import type { LearningModule } from "@/types/learningHub";
import { formatDate } from "@/utils/formatters";

// Define a premium stat card for analytics
function PremiumStatCard({ title, value, icon: Icon, variant = "indigo", delay = 0 }: any) {
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
      className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-[24px] border border-slate-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all ring-1 ring-slate-200/50 dark:ring-white/5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", variants[variant])}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
      </div>
    </motion.div>
  );
}

function compactDate(value?: string | null) {
  if (!value) return "No updates";
  const dt = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - dt.getTime()) / 86_400_000);
  if (diffDays <= 0) return "Updated Today";
  if (diffDays === 1) return "Updated Yesterday";
  if (diffDays < 7) return `Updated ${diffDays}d ago`;
  return `Updated ${formatDate(value)}`;
}

function categoryLabel(name?: string) {
  if (!name) return "General";
  if (name.includes("&")) return name.split("&")[0].trim();
  return name.replace("Technical & Software", "Technical").replace("Quality & Compliance", "Quality");
}

export default function ELearningPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  
  const is_admin = user?.role?.toLowerCase() === "admin";

  // --- Filtering & Pagination State ---
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [categoryId, setCategoryId] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [trainingId, setTrainingId] = useState("all");
  const [sortBy, setSortBy] = useState("recently_added");
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const { page, perPage, reset: resetPage } = usePagination();

  // --- Queries ---
  const { data: categories = [] } = useQuery({
    queryKey: ["learning-categories"],
    queryFn: () => learningHubService.listCategories(),
    select: (res) => res.data.data || [],
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: () => departmentsService.list({ page: 1, per_page: 100 }),
    select: (res) => res.data.data || [],
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["trainings-list-brief"],
    queryFn: () => trainingsService.list(1, 100),
    select: (res) => res.data.data || [],
  });

  const filters = {
    category_id: categoryId === "all" ? undefined : categoryId,
    department_id: departmentId === "all" ? undefined : departmentId,
    training_id: trainingId === "all" ? undefined : trainingId,
    search: debouncedSearch || undefined,
    sort_by: sortBy,
    quick_filter: quickFilter || undefined,
  };

  const { data: modulesResp, isLoading: modulesLoading } = useQuery({
    queryKey: ["learning-modules", page, perPage, filters],
    queryFn: () => learningHubService.listModules(page, perPage, filters),
    select: (res) => res.data,
  });
  const modules = modulesResp?.data || [];
  const totalCount = modulesResp?.meta?.total || 0;
  const totalMaterials = modules.reduce((sum: number, mod: any) => sum + Number(mod.material_count || 0), 0);
  const totalContributors = modules.reduce((sum: number, mod: any) => sum + Number(mod.contributor_count || 0), 0);
  const recentlyUpdated = [...modules]
    .sort((a: any, b: any) => new Date(b.last_updated_date || 0).getTime() - new Date(a.last_updated_date || 0).getTime())
    .slice(0, 5);
  const visibleCategories = [
    { id: "all", name: "All" },
    ...categories.slice(0, 8).map((cat: any) => ({ id: cat.id, name: categoryLabel(cat.name) })),
  ];

  const { data: analytics } = useQuery({
    queryKey: ["learning-analytics"],
    queryFn: () => learningHubService.getAnalytics(),
    enabled: is_admin,
    select: (res) => res.data.data,
  });

  // --- Modals Toggle ---
  const [isManageCatsOpen, setIsManageCatsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);
  const [moduleToEdit, setModuleToEdit] = useState<LearningModule | null>(null);
  const [preselectedModuleId, setPreselectedModuleId] = useState<string>("");

  // --- Form States ---
  // Create / Edit Module
  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
    category_id: "",
    department_id: "",
    training_id: ""
  });

  // Category Manager
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Upload Material Form
  const [uploadForm, setUploadForm] = useState({
    module_id: "",
    title: "",
    description: "",
    external_url: "",
    tags: "",
    file: null as File | null
  });

  // --- Mutations ---

  const { data: quickCounts } = useQuery({
    queryKey: ["learning-quick-counts"],
    queryFn: () => learningHubService.getQuickFilterCounts(),
    select: (res) => res.data.data,
  });

  const toggleBookmarkMutation = useMutation({
    mutationFn: learningHubService.toggleBookmark,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning-modules"] });
      qc.invalidateQueries({ queryKey: ["learning-quick-counts"] });
    },
    onError: () => {
      toast("error", "Error", "Failed to update bookmark.");
    }
  });

  const quickFiltersList = [
    { id: "my_modules", label: "My Modules", count: quickCounts?.my_modules ?? 0 },
    { id: "recent_uploads", label: "Recent Uploads", count: quickCounts?.recent_uploads ?? 0 },
    { id: "popular", label: "Popular", count: quickCounts?.popular ?? 0 },
    { id: "bookmarks", label: "Bookmarks", count: quickCounts?.bookmarks ?? 0 },
  ];


  const updateModuleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => learningHubService.updateModule(id, payload),
    onSuccess: () => {
      toast("success", "Module Updated", "Learning Module successfully updated.");
      setModuleToEdit(null);
      qc.invalidateQueries({ queryKey: ["learning-modules"] });
    },
    onError: (err: any) => {
      toast("error", "Failed to update module", err.response?.data?.detail || "An error occurred.");
    }
  });

  const deleteModuleMutation = useMutation({
    mutationFn: learningHubService.deleteModule,
    onSuccess: () => {
      toast("success", "Module Deleted", "The module has been successfully deleted.");
      setModuleToDelete(null);
      qc.invalidateQueries({ queryKey: ["learning-modules"] });
    },
    onError: (err: any) => {
      toast("error", "Failed to delete module", err.response?.data?.detail || "An error occurred.");
    }
  });

  const createCatMutation = useMutation({
    mutationFn: ({ name, description }: any) => learningHubService.createCategory(name, description),
    onSuccess: () => {
      toast("success", "Category Added", "New category added successfully.");
      setNewCatName("");
      setNewCatDesc("");
      qc.invalidateQueries({ queryKey: ["learning-categories"] });
    },
    onError: (err: any) => {
      toast("error", "Failed to add category", err.response?.data?.detail || "An error occurred.");
    }
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ id, name, description }: any) => learningHubService.updateCategory(id, name, description),
    onSuccess: () => {
      toast("success", "Category Updated", "Category details updated.");
      setEditingCatId(null);
      setNewCatName("");
      setNewCatDesc("");
      qc.invalidateQueries({ queryKey: ["learning-categories"] });
    },
    onError: (err: any) => {
      toast("error", "Failed to update category", err.response?.data?.detail || "An error occurred.");
    }
  });

  const deleteCatMutation = useMutation({
    mutationFn: learningHubService.deleteCategory,
    onSuccess: () => {
      toast("success", "Category Deleted", "Category removed successfully.");
      qc.invalidateQueries({ queryKey: ["learning-categories"] });
    },
    onError: (err: any) => {
      toast("error", "Failed to delete category", err.response?.data?.detail || "Category contains active modules.");
    }
  });

  const uploadMaterialMutation = useMutation({
    mutationFn: learningHubService.addMaterial,
    onSuccess: () => {
      toast("success", "Material Uploaded", "Successfully contributed learning material.");
      useMotivationalToast.getState().showToast("Knowledge shared successfully", "book");
      setIsUploadOpen(false);
      setUploadForm({ module_id: "", title: "", description: "", external_url: "", tags: "", file: null });
      qc.invalidateQueries({ queryKey: ["learning-modules"] });
      qc.invalidateQueries({ queryKey: ["learning-analytics"] });
    },
    onError: (err: any) => {
      toast("error", "Upload Failed", err.response?.data?.detail || "An error occurred.");
    }
  });

  // --- Handlers ---

  const handleEditModuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleToEdit) return;
    updateModuleMutation.mutate({
      id: moduleToEdit.id,
      payload: {
        title: moduleForm.title,
        description: moduleForm.description || null,
        category_id: moduleForm.category_id || null,
        department_id: moduleForm.department_id || null,
        training_id: moduleForm.training_id || null,
      }
    });
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.module_id || !uploadForm.title) {
      toast("warning", "Missing fields", "Please fill in Module and Material Title.");
      return;
    }
    if (!uploadForm.file && !uploadForm.external_url) {
      toast("warning", "File or Link Required", "You must select a file to upload or enter an external URL.");
      return;
    }
    uploadMaterialMutation.mutate({
      module_id: uploadForm.module_id,
      title: uploadForm.title,
      description: uploadForm.description || undefined,
      external_url: uploadForm.external_url || undefined,
      tags: uploadForm.tags || undefined,
      file: uploadForm.file || undefined
    });
  };

  const startEditModule = (mod: LearningModule) => {
    setModuleToEdit(mod);
    setModuleForm({
      title: mod.title,
      description: mod.description || "",
      category_id: mod.category_id || "",
      department_id: mod.department_id || "",
      training_id: mod.training_id || ""
    });
  };

  // Color mappings for Category Badges
  const getCategoryColor = (catName: string = "") => {
    const colors: Record<string, string> = {
      "Technical & Software": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20",
      "Tools & Productivity": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20",
      "Quality & Compliance": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20",
      "Security & IT Awareness": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20",
      "Health, Safety & Environment": "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200/50 dark:border-teal-500/20",
      "Leadership & Management": "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200/50 dark:border-violet-500/20",
      "Customer Service": "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200/50 dark:border-pink-500/20",
    };
    return colors[catName] || "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-3 sm:space-y-8 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-20">
      
      {/* Mobile Summary Strip */}
      <div className="sm:hidden rounded-2xl border border-slate-200/60 bg-white p-3 shadow-sm dark:border-white/5 dark:bg-slate-900/60">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">Learning Hub</h1>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400">Modules</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{totalCount}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400">Materials</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{totalMaterials}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400">Contributors</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{totalContributors}</p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => {
              setUploadForm({ module_id: "", title: "", description: "", external_url: "", tags: "", file: null });
              setPreselectedModuleId("");
              setIsUploadOpen(true);
            }}
            className="h-9 shrink-0 rounded-full bg-indigo-600 px-3 text-[11px] font-black text-white shadow-sm"
          >
            <Upload size={13} className="mr-1.5" />
            Upload
          </Button>
        </div>
      </div>
      
      {/* ── Page Header ── */}
      <div className="hidden sm:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/5 dark:bg-white/[0.02] p-6 rounded-[32px] border border-slate-200/50 dark:border-white/5 shadow-inner">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Collaborative Knowledge</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            E-Learning & Awareness Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
            Training-driven learning modules — automatically created when trainings are added. Upload materials, share knowledge, and track contributions.
          </p>
        </div>
        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          <Button 
            onClick={() => {
              setUploadForm({ module_id: "", title: "", description: "", external_url: "", tags: "", file: null });
              setPreselectedModuleId("");
              setIsUploadOpen(true);
            }}
            className="flex-1 sm:flex-initial rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3.5 shadow-lg shadow-indigo-600/10 flex items-center gap-2 group transition-all"
          >
            <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform" />
            Upload Material
          </Button>
          
          {is_admin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-12 w-12 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold">
                  <BarChart3 size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 p-2 rounded-2xl border-slate-200/60 dark:border-white/10" align="end">
                <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-400">Admin Actions</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 mx-1" />
                <DropdownMenuItem 
                  onClick={() => setIsManageCatsOpen(true)}
                  className="rounded-xl py-2 cursor-pointer font-semibold text-[13px]"
                >
                  <Tag className="mr-2 h-4 w-4 text-emerald-500" />
                  Manage Categories
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="rounded-xl py-2 cursor-pointer font-semibold text-[13px]"
                >
                  <BarChart3 className="mr-2 h-4 w-4 text-amber-500" />
                  {showAnalytics ? "Hide Analytics Panel" : "View Analytics Panel"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── Admin Dashboard Statistics ── */}
      {is_admin && showAnalytics && analytics && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.4 }}
          className="space-y-6 overflow-hidden bg-slate-500/5 border border-slate-200/50 dark:border-white/5 p-6 rounded-[32px]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Hub Governance & Statistics</h2>
            </div>
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50">Admin Only</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PremiumStatCard title="Total Learning Modules" value={analytics.total_modules} icon={BookOpen} variant="indigo" />
            <PremiumStatCard title="Total Contributed Materials" value={analytics.total_materials} icon={Upload} variant="emerald" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            
            {/* Top Viewed Materials */}
            <div className="bg-white dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-200/50 dark:border-white/5 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Most Viewed Materials</h3>
              </div>
              <div className="space-y-3">
                {analytics.most_viewed?.map((m: any) => (
                  <div key={m.id} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{m.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 truncate">Module: {m.module_title}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none font-bold text-[10px]">
                      {m.views} views
                    </Badge>
                  </div>
                ))}
                {analytics.most_viewed?.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No view logs yet.</p>
                )}
              </div>
            </div>

            {/* Top Contributors */}
            <div className="bg-white dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-200/50 dark:border-white/5 space-y-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Top Contributors</h3>
              </div>
              <div className="space-y-3">
                {analytics.most_active_contributors?.map((u: any) => (
                  <div key={u.user_id} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="min-w-0 flex-1 pr-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {u.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{u.full_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <Badge className="shrink-0 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-bold text-[10px]">
                      {u.material_count} uploads
                    </Badge>
                  </div>
                ))}
                {analytics.most_active_contributors?.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No contributions yet.</p>
                )}
              </div>
            </div>

            {/* Recent Uploads */}
            <div className="bg-white dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-200/50 dark:border-white/5 space-y-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-indigo-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Recent Uploads</h3>
              </div>
              <div className="space-y-3">
                {analytics.recent_uploads?.map((u: any) => (
                  <div key={u.id} className="flex flex-col p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate flex-1 pr-2">{u.title}</p>
                      <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap mt-0.5">{formatDate(u.uploaded_at)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                      <span className="truncate max-w-[120px]">By: {u.uploaded_by}</span>
                      <span className="truncate max-w-[120px]">Module: {u.module_title}</span>
                    </div>
                  </div>
                ))}
                {analytics.recent_uploads?.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No uploads yet.</p>
                )}
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* Mobile Search & Filters */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <Input
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-xl border-slate-200/60 bg-white pl-9 pr-8 text-xs font-semibold shadow-sm dark:border-white/5 dark:bg-slate-900/60"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={14} />
              </button>
            )}
          </div>

          <Sheet open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl border-slate-200/60 bg-white dark:border-white/5 dark:bg-slate-900/60">
                <Filter size={16} />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-slate-950">
              <SheetHeader className="text-left">
                <SheetTitle className="text-base font-black">Filter Learning Modules</SheetTitle>
                <SheetDescription className="text-xs">Refine by category, department, training, and sort order.</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); resetPage(); }} className="h-11 rounded-xl text-xs font-semibold">
                  <option value="all">All Categories</option>
                  {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </Select>
                <Select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); resetPage(); }} className="h-11 rounded-xl text-xs font-semibold">
                  <option value="all">All Departments</option>
                  {departments.map((dept: any) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </Select>
                <Select value={trainingId} onChange={(e) => { setTrainingId(e.target.value); resetPage(); }} className="h-11 rounded-xl text-xs font-semibold">
                  <option value="all">All Related Trainings</option>
                  {trainings.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </Select>
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-11 rounded-xl text-xs font-semibold">
                  <option value="recently_added">Recently Updated</option>
                  <option value="most_viewed">Most Viewed</option>
                  <option value="alphabetical">Alphabetical</option>
                </Select>
                <Button onClick={() => setAdvancedFiltersOpen(false)} className="h-10 w-full rounded-xl bg-indigo-600 text-xs font-black text-white">
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          {visibleCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategoryId(cat.id); resetPage(); }}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-[11px] font-black transition-all",
                categoryId === cat.id
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search & Filters Panel ── */}
      <div className="hidden sm:block bg-white dark:bg-slate-900/45 p-6 rounded-[28px] border border-slate-200/60 dark:border-white/5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
          <Filter size={16} className="text-slate-400" />
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Filter & Sort Materials</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search bar */}
          <div className="relative group lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <Input 
              placeholder="Search modules or materials..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-800/20 border-slate-200/60 dark:border-white/5 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500/30 font-semibold text-xs transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <Select 
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); resetPage(); }}
            className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
          >
            <option value="all">All Categories</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </Select>

          {/* Department Filter */}
          <Select 
            value={departmentId}
            onChange={(e) => { setDepartmentId(e.target.value); resetPage(); }}
            className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
          >
            <option value="all">All Departments</option>
            {departments.map((dept: any) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </Select>

          {/* Training Filter */}
          <Select 
            value={trainingId}
            onChange={(e) => { setTrainingId(e.target.value); resetPage(); }}
            className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
          >
            <option value="all">All Related Trainings</option>
            {trainings.map((t: any) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 gap-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Showing {modules.length} of {totalCount} Modules
          </p>
          
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <span className="text-xs text-slate-400 font-bold">Sort:</span>
            <Select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)} 
              className="h-9 w-40 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-white/5 font-semibold text-[11px]"
            >
              <option value="recently_added">Recently Updated</option>
              <option value="most_viewed">Most Viewed</option>
              <option value="alphabetical">Alphabetical</option>
            </Select>
          </div>
        </div>

      </div>

      {/* Mobile Recently Updated */}
      {recentlyUpdated.length > 0 && (
        <div className="sm:hidden space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Recently Updated</h2>
            <span className="text-[10px] font-bold text-slate-400">{modules.length} modules</span>
          </div>
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
            {recentlyUpdated.map((mod: any) => (
              <button
                key={mod.id}
                onClick={() => navigate(`/elearning/${mod.id}`)}
                className="w-56 shrink-0 rounded-2xl border border-slate-200/60 bg-white p-3 text-left shadow-sm dark:border-white/5 dark:bg-slate-900/60"
              >
                <Badge variant="outline" className={cn("mb-2 rounded-full px-2 py-0 text-[9px] font-bold", getCategoryColor(mod.category?.name))}>
                  {categoryLabel(mod.category?.name)}
                </Badge>
                <p className="line-clamp-1 text-sm font-black text-slate-900 dark:text-white">{mod.title}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  {mod.material_count || 0} Files • {compactDate(mod.last_updated_date)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="-mx-3 sm:mx-0 flex gap-2 overflow-x-auto px-3 sm:px-0 pb-1 sm:pb-2 sm:mb-4 [scrollbar-width:none] sticky top-[72px] sm:top-4 z-10 pt-2 sm:pt-0">
        {quickFiltersList.map((item) => (
          <button 
            key={item.id} 
            onClick={() => { setQuickFilter(quickFilter === item.id ? null : item.id); resetPage(); }}
            className={cn("h-8 sm:h-9 shrink-0 rounded-full border px-3 text-[11px] sm:text-xs font-black transition-all flex items-center gap-1.5 shadow-sm",
              quickFilter === item.id 
                ? "border-indigo-600 bg-indigo-600 text-white shadow-md scale-105"
                : "border-slate-200/80 bg-white/90 backdrop-blur-md text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            {item.label}
            <span className={cn("text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md", quickFilter === item.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Learning Modules Grid ── */}
      {modulesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 sm:h-64 rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200/40 dark:border-white/5" />
          ))}
        </div>
      ) : modules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
          {modules.map((mod: any, idx: number) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="relative group bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 hover:border-indigo-500/20 dark:hover:border-indigo-500/20 rounded-2xl sm:rounded-[28px] p-3 sm:p-6 shadow-sm hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[128px] sm:h-72 group"
            >
              
              {/* Badge & Admin Tools */}
              <div className="flex justify-between items-start gap-2">
                <Badge variant="outline" className={cn("rounded-full px-2 sm:px-2.5 py-0.5 border text-[9px] sm:text-[10px] font-bold", getCategoryColor(mod.category?.name))}>
                  <span className="sm:hidden">{categoryLabel(mod.category?.name)}</span>
                  <span className="hidden sm:inline">{mod.category?.name || "General"}</span>
                </Badge>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleBookmarkMutation.mutate({ module_id: mod.id }); }}
                    className={cn("p-1.5 rounded-lg transition-colors border shadow-sm", mod.is_bookmarked ? "bg-amber-50 border-amber-200 text-amber-500 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 dark:bg-slate-900 dark:border-white/10 dark:hover:text-slate-300")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={mod.is_bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                  </button>
                  {is_admin && (
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); startEditModule(mod); }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setModuleToDelete(mod.id); }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-500 hover:text-rose-700 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-2 sm:mt-4 flex-1">
                <h3 className="line-clamp-1 sm:line-clamp-none text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {mod.title}
                </h3>
                <p className="hidden sm:block text-xs text-slate-400 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed font-semibold">
                  {mod.description || "No description provided."}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 sm:hidden">
                  {mod.department?.name || mod.department?.code || "All Departments"}
                </p>
              </div>

              {/* Middle Row: Meta details */}
              <div className="hidden sm:grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-white/5 pt-4 mt-4 text-[10px] text-slate-400 font-bold">
                <div className="flex flex-col">
                  <span className="text-slate-400/60 uppercase text-[8px] tracking-widest mb-0.5">Files</span>
                  <span className="text-slate-700 dark:text-slate-300 font-extrabold flex items-center gap-1">
                    <MonitorPlay size={10} className="text-indigo-500" />
                    {mod.material_count || 0} items
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400/60 uppercase text-[8px] tracking-widest mb-0.5">Contributors</span>
                  <span className="text-slate-700 dark:text-slate-300 font-extrabold flex items-center gap-1">
                    <Users size={10} className="text-emerald-500" />
                    {mod.contributor_count || 0}
                  </span>
                </div>
                <div className="flex flex-col col-span-1">
                  <span className="text-slate-400/60 uppercase text-[8px] tracking-widest mb-0.5">Updated</span>
                  <span className="text-slate-700 dark:text-slate-300 font-extrabold truncate">
                    {mod.last_updated_date ? formatDate(mod.last_updated_date) : "N/A"}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-[11px] font-bold text-slate-400 sm:hidden">
                {mod.material_count || 0} Files • {mod.contributor_count || 0} Contributors • {compactDate(mod.last_updated_date)}
              </div>

              {/* Department & Training tags */}
              <div className="hidden sm:flex flex-wrap items-center gap-2 mt-4 pt-1">
                {mod.department && (
                  <div className="flex items-center gap-1 text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                    <Building2 size={8} />
                    {mod.department.code}
                  </div>
                )}
                {mod.training && (
                  <div className="flex items-center gap-1 text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold truncate max-w-[180px]">
                    <GraduationCap size={8} />
                    {mod.training.title}
                  </div>
                )}
              </div>

              {/* View Button overlaying the whole card layout at bottom */}
              <button 
                onClick={() => navigate(`/elearning/${mod.id}`)}
                className="mt-2 sm:mt-4 w-full sm:w-full py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-slate-700 hover:text-white dark:text-slate-300 font-bold text-xs shadow-sm group-hover:shadow-md transition-all flex items-center justify-center gap-1"
              >
                <span className="sm:hidden">Open Module</span>
                <span className="hidden sm:inline">View Module</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>

            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-5 sm:py-16 px-4 bg-white dark:bg-slate-900/20 border border-slate-200/50 dark:border-white/5 rounded-2xl sm:rounded-[32px] flex flex-col items-center justify-center gap-1.5 sm:gap-3">
          <Zap className="hidden sm:block w-12 h-12 text-indigo-300" />
          <h3 className="text-sm sm:text-lg font-black text-slate-800 dark:text-white">
            {quickFilter === "bookmarks" ? "No bookmarked learning resources yet." 
             : quickFilter === "my_modules" ? "You don't have any active modules yet."
             : quickFilter === "recent_uploads" ? "No recent uploads found."
             : "No learning materials found."}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">Try another filter or adjust your search criteria.</p>
        </div>
      )}

      {/* ── MODAL: Edit Module (Admin only — modules auto-created from trainings) ── */}
      <Dialog open={!!moduleToEdit} onOpenChange={(open) => {
        if (!open) setModuleToEdit(null);
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 rounded-3xl border-slate-200/60 dark:border-white/10 p-6 custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Edit Learning Module
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-400">
              Update category, description, or other metadata for this auto-generated module.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditModuleSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Module Title</label>
              <Input 
                value={moduleForm.title}
                disabled
                className="h-11 rounded-xl bg-slate-100 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs opacity-70 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400">Title is synced from the linked training and cannot be changed here.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
              <Input 
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                placeholder="Briefly describe what materials this holds"
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
              <Select 
                value={moduleForm.category_id}
                onChange={(e) => setModuleForm({ ...moduleForm, category_id: e.target.value })}
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              >
                <option value="">Select Category...</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <Button type="button" variant="ghost" onClick={() => setModuleToEdit(null)} className="rounded-xl font-bold text-xs h-11 px-5">
                Cancel
              </Button>
              <Button type="submit" disabled={updateModuleMutation.isPending} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-11 px-6 shadow-md shadow-indigo-600/10">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Manage Categories ── */}
      <Dialog open={isManageCatsOpen} onOpenChange={setIsManageCatsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 rounded-3xl border-slate-200/60 dark:border-white/10 p-6 custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Manage Learning Categories</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-400">Create, edit, or remove categories governing materials.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            
            {/* Create Category form */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 space-y-3">
              <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {editingCatId ? "Edit Category" : "Add New Category"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input 
                  placeholder="Category Name" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
                />
                <Input 
                  placeholder="Description (optional)" 
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                {editingCatId && (
                  <Button variant="ghost" onClick={() => { setEditingCatId(null); setNewCatName(""); setNewCatDesc(""); }} className="h-9 px-3 rounded-lg text-xs font-bold">
                    Cancel
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    if (!newCatName) return;
                    if (editingCatId) {
                      updateCatMutation.mutate({ id: editingCatId, name: newCatName, description: newCatDesc });
                    } else {
                      createCatMutation.mutate({ name: newCatName, description: newCatDesc });
                    }
                  }}
                  className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-xs font-bold"
                >
                  {editingCatId ? "Save" : "Add Category"}
                </Button>
              </div>
            </div>

            {/* Categories list */}
            <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {categories.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate max-w-sm">{c.description || "No description."}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => {
                        setEditingCatId(c.id);
                        setNewCatName(c.name);
                        setNewCatDesc(c.description || "");
                      }}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete category "${c.name}"?`)) {
                          deleteCatMutation.mutate(c.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 text-rose-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">No categories registered.</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/5">
              <Button onClick={() => setIsManageCatsOpen(false)} className="rounded-xl font-bold text-xs h-10 px-5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Upload Material ── */}
      <Dialog open={isUploadOpen} onOpenChange={(open) => {
        if (!open) {
          setIsUploadOpen(false);
          setPreselectedModuleId("");
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 rounded-3xl border-slate-200/60 dark:border-white/10 p-6 custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Upload Learning Material</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-400">Contribute guides, SOP files, or reference links to the training module.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Learning Module *</label>
              <Select 
                value={uploadForm.module_id || preselectedModuleId}
                onChange={(e) => setUploadForm({ ...uploadForm, module_id: e.target.value })}
                required
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              >
                <option value="">Select Module...</option>
                {modules.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Material Title *</label>
              <Input 
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g. Pivot Tables Advanced Guide"
                required
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
              <Input 
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Explain what this document covers"
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tags</label>
              <Input 
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                placeholder="excel, pivot-tables, guide (comma separated)"
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              />
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Option A: File Upload</label>
                <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5 relative">
                  <Upload size={14} className="text-slate-400 ml-1 shrink-0" />
                  <input 
                    type="file" 
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setUploadForm({ ...uploadForm, file });
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-500 font-semibold truncate max-w-[280px]">
                    {uploadForm.file ? uploadForm.file.name : "Select PDF, PPT, DOC, XLS, MP4, ZIP, PNG, JPG..."}
                  </span>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-slate-400 uppercase">OR</span>
                <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Option B: External URL</label>
                <Input 
                  value={uploadForm.external_url}
                  onChange={(e) => setUploadForm({ ...uploadForm, external_url: e.target.value })}
                  placeholder="https://docs.google.com/spreadsheets/..."
                  className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)} className="rounded-xl font-bold text-xs h-11 px-5">
                Cancel
              </Button>
              <Button type="submit" disabled={uploadMaterialMutation.isPending} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-11 px-6 shadow-md shadow-indigo-600/10">
                {uploadMaterialMutation.isPending ? "Uploading..." : "Upload Material"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Dialog for Module Delete ── */}
      <ConfirmationDialog
        open={!!moduleToDelete}
        onOpenChange={(open) => { if (!open) setModuleToDelete(null); }}
        title="Delete Learning Module?"
        description="Are you absolutely sure? This will permanently remove the module and all its uploaded learning materials. This action cannot be undone."
        confirmText="Permanently Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (moduleToDelete) deleteModuleMutation.mutate(moduleToDelete);
        }}
      />
    </div>
  );
}
