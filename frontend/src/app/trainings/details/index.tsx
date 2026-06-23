import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Calendar, Clock, MapPin, ChevronLeft, Users, 
  FileText, Download, Upload, Video,
  Edit2, Archive, Share2, MoreHorizontal, GraduationCap,
  Building2, Sparkles, TrendingUp, BookOpen, User,
  CheckCircle2, Clock3, AlertCircle, ArrowRight,
  Search, ExternalLink, Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, 
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

import { trainingsService } from "@/services/trainings.service";
import { enrollmentsService } from "@/services/enrollments.service";
import { attendanceService } from "@/services/attendance.service";
import { learningHubService } from "@/services/learningHub.service";
import { computeLifecycle } from "@/utils/trainingLifecycle";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { cn, getAssetUrl } from "@/lib/utils";
import { formatDate, formatEligibility } from "@/utils/formatters";
import { TrainingLifecycleBadge } from "@/components/ui/TrainingLifecycleBadge";
import { TrainingForm } from "../components/TrainingForm";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/Dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/DropdownMenu";

// ── Constants & Helpers ──────────────────────────────────────────────────────

const CATEGORY_WALLPAPERS: Record<string, string> = {
  "AI & Data Science": "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200",
  "Leadership & Management": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=1200",
  "Technology & Software": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200",
  "Soft Skills": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=1200",
  "Compliance & Ethics": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1200",
  "Business Essentials": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1200",
  "Default": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1200"
};

function getTrainingWallpaper(categoryName: string = "") {
  return CATEGORY_WALLPAPERS[categoryName] || CATEGORY_WALLPAPERS["Default"];
}

const isAttendanceLinkAvailable = (training: any) => {
  if (!training) return false;
  const status = computeLifecycle(training, new Date()).status;
  return status === "attendance_ready" || status === "ongoing";
};


function PremiumDetailCard({ title, value, icon: Icon, color = "brand", children }: any) {
  const colors: any = {
    brand: "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  };
  
  return (
    <div className="bg-white dark:bg-[#172036] rounded-[24px] p-6 border border-[#EEF2FF] dark:border-white/5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", colors[color])}>
           <Icon size={20} />
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <h4 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h4>
        {children}
      </div>
    </div>
  );
}

export default function TrainingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantStatusFilter, setParticipantStatusFilter] = useState("all");
  const [attendanceLinkDialog, setAttendanceLinkDialog] = useState<{ training: any; session: any } | null>(null);
  const [isUploadMaterialOpen, setIsUploadMaterialOpen] = useState(false);
  const [uploadMaterialForm, setUploadMaterialForm] = useState({ title: "", description: "", external_url: "", tags: "", file: null as File | null });

  // States to preserve generated session data
  const [attendanceLink, setAttendanceLink] = useState<string | null>(null);

  const { data: training, isLoading, error } = useQuery({
    queryKey: ["training", id],
    queryFn: () => trainingsService.getById(id!),
    enabled: !!id,
    select: (res) => res.data.data,
  });

  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ["training-enrollments", id],
    queryFn: () => enrollmentsService.listByTraining(id!),
    enabled: !!id && (user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "trainer"),
    select: (res) => res.data.data,
  });

  const { data: attendanceSession } = useQuery({
    queryKey: ["attendance-session", id],
    queryFn: () => attendanceService.getAttendanceSession(id!).then(res => res.data.data || res.data),
    enabled: !!id && (user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "trainer"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => trainingsService.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", id] });
      setIsEditOpen(false);
      toast("success", "Training Curriculum Updated");
    }
  });

  const archiveMutation = useMutation({
    mutationFn: trainingsService.archive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", id] });
      setArchiveConfirmId(null);
      toast("success", "Training Archived");
    }
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => trainingsService.uploadDocument(id!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", id] });
      toast("success", "Document uploaded successfully");
    }
  });

  const uploadMaterialMutation = useMutation({
    mutationFn: (payload: any) => learningHubService.addMaterial(payload),
    onSuccess: () => {
      toast("success", "Material uploaded", "Your file has been added to the learning module.");
      setIsUploadMaterialOpen(false);
      setUploadMaterialForm({ title: "", description: "", external_url: "", tags: "", file: null });
    },
    onError: (err: any) => {
      toast("error", "Upload failed", err.response?.data?.detail || "An error occurred.");
    }
  });

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await attendanceService.getAttendanceSession(id!);
      const session = res.data.data || res.data;
      const slug = session.training_slug || session.training_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const link = `${window.location.origin}/attendance-roster/${slug}-${session.secure_token}`;
      return {
        data: {
          link,
          session
        }
      };
    },
    onSuccess: (response) => {
      setAttendanceLink(response.data.link);

      qc.setQueryData(["attendance-session", id], response.data.session);

      setAttendanceLinkDialog({ training, session: response.data.session });
      toast("success", "Successfully generated attendance roster session");
    },
    onError: () => {
      toast("error", "Failed to generate attendance session.");
    }
  });

  // Sync existing session data on page load/fetch
  useEffect(() => {
    if (attendanceSession?.secure_token) {
      const slug = attendanceSession.training_slug || attendanceSession.training_title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || "session";
      setAttendanceLink(`${window.location.origin}/attendance-roster/${slug}-${attendanceSession.secure_token}`);
    }
  }, [attendanceSession, id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB] dark:bg-[#0B1020]">
       <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Accessing Console...</p>
       </div>
    </div>
  );
  
  if (error || !training) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB] dark:bg-[#0B1020]">
       <div className="text-center">
          <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Program Not Found</h2>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/trainings")}>Back to Catalog</Button>
       </div>
    </div>
  );

  const wallpaper = getTrainingWallpaper(training.category?.name);
  const enrolledCount = enrollments?.length || 0;
  const maxSeats = training.max_participants || 20;
  const fillRate = Math.min(100, (enrolledCount / maxSeats) * 100);
  const status = computeLifecycle(training, new Date()).status;
  const isCompleted = status === "completed";
  
  // Prepare Department Data for Chart
  const deptMap: Record<string, number> = {};
  enrollments?.forEach((e: any) => {
    const dName = e.employee?.department?.name || "Other";
    deptMap[dName] = (deptMap[dName] || 0) + 1;
  });
  const deptData = Object.entries(deptMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

  const filteredEnrollments = enrollments?.filter((e: any) => {
    const fullName = `${e.employee?.first_name} ${e.employee?.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(participantSearch.toLowerCase()) || 
                          e.employee?.employee_code?.toLowerCase().includes(participantSearch.toLowerCase());
    const matchesStatus = participantStatusFilter === "all" || e.status === participantStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] pb-20 transition-colors duration-500">
      
      {/* ── Premium Hero Banner ────────────────────────────────────────────── */}
      <div className="relative h-[400px] w-full overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1 }}
          src={wallpaper} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F7FB] via-[#F5F7FB]/40 to-transparent dark:from-[#0B1020] dark:via-[#0B1020]/40" />
        
        {/* Navigation & Actions */}
        <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-20">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/trainings")}
            className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 rounded-xl px-4 h-10 font-bold"
          >
            <ChevronLeft size={18} className="mr-2" /> Back to Catalog
          </Button>

          <div className="flex items-center gap-2">
             <Button 
              variant="ghost" 
              size="icon" 
              onClick={async () => {
                const activeLink = attendanceLink || (attendanceSession?.secure_token ? `${window.location.origin}/attendance-roster/${(attendanceSession.training_slug || 'session')}-${attendanceSession.secure_token}` : null);
                
                if (activeLink) {
                  await navigator.clipboard.writeText(activeLink);
                  toast("success", "Shareable Attendance Roster Link copied!");
                } else {
                  toast("error", "Attendance link not generated yet.");
                }
              }}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 rounded-xl h-10 w-10"
             >
                <Share2 size={18} />
             </Button>
             {user?.role?.toLowerCase() === "admin" && (
               <>
                 <Button 
                  onClick={() => setIsEditOpen(true)}
                  disabled={isCompleted}
                  className="bg-white disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 hover:bg-slate-50 rounded-xl px-6 h-10 font-black uppercase tracking-widest text-[10px] shadow-xl"
                 >
                    <Edit2 size={14} className="mr-2" /> Edit Curriculum
                 </Button>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 rounded-xl h-10 w-10">
                        <MoreHorizontal size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-2xl border-slate-200 dark:border-white/10">
                       <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Advanced Controls</DropdownMenuLabel>
                       <DropdownMenuItem disabled={isCompleted} className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5" onClick={() => setArchiveConfirmId(id!)}>
                          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-600">
                             <Archive size={14} />
                          </div>
                          Archive Program
                       </DropdownMenuItem>
                       <DropdownMenuItem className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5 text-rose-600 focus:text-rose-600 focus:bg-rose-50">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                             <Download size={14} />
                          </div>
                          Export Data (.csv)
                       </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
               </>
             )}
          </div>
        </div>

        {/* Training Info Overlay */}
        <div className="absolute bottom-12 left-8 right-8 z-10">
           <div className="max-w-[1400px] mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="bg-white/20 backdrop-blur-md text-white border-white/30 px-3 py-1 font-black text-[10px] uppercase tracking-widest">
                       {training.category?.name || "General"}
                    </Badge>
                    <TrainingLifecycleBadge 
                      training={training} 
                      size="sm" 
                      showCountdown 
                      className="backdrop-blur-md bg-white/90 dark:bg-[#111827]/90 shadow-lg border-white/20 dark:border-white/10" 
                    />
                    {training.is_mandatory && (
                      <Badge className="bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1 border-none shadow-lg shadow-rose-500/20">
                        Critical / Mandatory
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white max-w-3xl leading-tight">
                    {training.title}
                  </h1>
                  <div className="flex items-center gap-6 text-slate-600 dark:text-slate-400 font-bold text-sm">
                    <div className="flex items-center gap-2">
                       <Calendar size={18} className="text-brand-500" /> {formatDate(training.start_date)}
                    </div>
                    <div className="flex items-center gap-2">
                       <User size={18} className="text-indigo-500" /> {training.trainer_name || "SGS Faculty"}
                    </div>
                    {training.delivery_mode === "online" && training.meeting_link && (
                       <Button size="sm" variant="link" className="p-0 text-brand-600 h-auto font-black uppercase text-[11px] tracking-widest" onClick={() => window.open(training.meeting_link, '_blank')}>
                         <Video size={14} className="mr-1.5" /> Join Live
                       </Button>
                    )}
                  </div>
                </div>

                {user?.role?.toLowerCase() === "admin" && isAttendanceLinkAvailable(training) && (
                  <Button 
                    onClick={() => generateLinkMutation.mutate()} 
                    disabled={generateLinkMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-12 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20"
                  >
                    <Sparkles size={14} className="mr-2" /> Generate Attendance Roster
                  </Button>
                )}
              </motion.div>
           </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 -mt-6 relative z-30 space-y-6">
        
        {/* ── Analytics Section ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PremiumDetailCard title="Enrollments" value={enrolledCount} icon={Users} color="brand">
             <div className="ml-auto w-16 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mt-1">
                <motion.div initial={{ width: 0 }} animate={{ width: `${fillRate}%` }} className="h-full bg-brand-500" />
             </div>
          </PremiumDetailCard>
          <PremiumDetailCard title="Attendance" value="94%" icon={CheckCircle2} color="emerald">
             <div className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-auto">On Track</div>
          </PremiumDetailCard>
          <PremiumDetailCard title="Duration" value={`${training.duration_hours}h`} icon={Clock3} color="amber">
             <span className="text-[10px] font-bold text-slate-400">Total</span>
          </PremiumDetailCard>
          <PremiumDetailCard title="Engagement" value="4.8" icon={Sparkles} color="rose">
             <span className="text-[10px] font-bold text-slate-400">Avg Rating</span>
          </PremiumDetailCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content Area (8/12) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Overview Card */}
            <div className="bg-white dark:bg-[#172036] rounded-[32px] p-8 border border-[#EEF2FF] dark:border-white/5 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                       <BookOpen size={20} />
                    </div>
                    Curriculum Overview
                  </h3>
               </div>
               <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed font-medium mb-8">
                  {training.description || "Detailed curriculum roadmap has not been published for this program yet. Contact the training administrator for technical syllabi."}
               </p>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-8 border-t border-slate-50 dark:border-white/5">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Primary Focus</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{training.category?.name || "General Discipline"}</p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Delivery Model</span>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                       <p className="font-bold text-slate-800 dark:text-slate-200 capitalize">{training.delivery_mode}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target Audience</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                       {formatEligibility(training.is_global, training.eligible_departments)}
                    </p>
                  </div>
               </div>
            </div>

            {/* Participants Table */}
            <div className="bg-white dark:bg-[#172036] rounded-[32px] border border-[#EEF2FF] dark:border-white/5 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-50 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Active Participants</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Personnel enrolled in this track</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <Input 
                          placeholder="Search talent..." 
                          className="h-9 w-[200px] pl-9 bg-slate-50 dark:bg-white/5 border-none rounded-xl text-xs font-bold"
                          value={participantSearch}
                          onChange={(e) => setParticipantSearch(e.target.value)}
                        />
                     </div>
                     <Select 
                        value={participantStatusFilter} 
                        onChange={(e) => setParticipantStatusFilter(e.target.value)}
                        className="h-9 w-[140px] bg-slate-50 dark:bg-white/5 border-none rounded-xl text-xs font-bold ring-0 focus-visible:ring-0"
                     >
                        <option value="all">All Status</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                     </Select>
                     <Badge variant="outline" className="rounded-xl px-4 py-1.5 border-slate-200 dark:border-white/10 font-black text-[10px] uppercase tracking-widest">
                        {filteredEnrollments?.length || 0} Members
                     </Badge>
                  </div>
               </div>
               
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-white/[0.02]">
                       <tr>
                          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Department</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                          <th className="px-8 py-4 text-right"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                       {loadingEnrollments ? (
                         [1,2,3].map(i => (
                           <tr key={i} className="animate-pulse">
                              <td colSpan={4} className="px-8 py-6 h-20 bg-slate-50/50" />
                           </tr>
                         ))
                       ) : filteredEnrollments?.map((e: any) => {
                         const initials = e.employee_name?.split(' ').map((n: string) => n[0]).join('') || 
                                          `${e.employee?.first_name?.[0] || ''}${e.employee?.last_name?.[0] || ''}`;
                         
                         return (
                           <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors group">
                              <td className="px-8 py-4">
                                 <div className="flex items-center gap-4">
                                    <div className="relative">
                                       {e.employee?.profile_image_url ? (
                                         <img 
                                           src={e.employee.profile_image_url} 
                                           alt={e.employee_name}
                                           className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10"
                                         />
                                       ) : (
                                         <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 font-black text-xs border border-brand-500/20">
                                            {initials || "U"}
                                         </div>
                                       )}
                                       <div className={cn(
                                         "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#172036]",
                                         e.status === 'enrolled' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                                         e.status === 'completed' ? "bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" :
                                         "bg-slate-300"
                                       )} />
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="font-bold text-slate-900 dark:text-white leading-tight text-sm">
                                          {e.employee_name || `${e.employee?.first_name} ${e.employee?.last_name}`}
                                       </span>
                                       <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                                          {e.employee?.designation || "Training Candidate"}
                                       </span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-4">
                                 <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                       {e.employee?.department?.name || "Corporate"}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                       {e.employee?.employee_code || "CODE-X"}
                                    </span>
                                 </div>
                              </td>
                              <td className="px-8 py-4">
                                 <Badge 
                                   variant={e.status === 'enrolled' ? 'success' : e.status === 'completed' ? 'info' : 'warning'} 
                                   className="rounded-lg font-black text-[9px] uppercase tracking-widest px-2.5 py-1 min-w-[80px] justify-center"
                                 >
                                    {e.status}
                                 </Badge>
                              </td>
                              <td className="px-8 py-4 text-right">
                                 <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-brand-500/10 hover:text-brand-600">
                                    <ArrowRight size={16} />
                                  </Button>
                              </td>
                           </tr>
                         );
                       })}
                       {filteredEnrollments?.length === 0 && (
                         <tr>
                            <td colSpan={4} className="px-8 py-12 text-center">
                               <div className="flex flex-col items-center gap-2 opacity-40">
                                  <Users size={32} />
                                  <p className="text-xs font-black uppercase tracking-widest">No participants found</p>
                               </div>
                            </td>
                         </tr>
                       )}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>

          {/* Sidebar Area (4/12) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Department Participation Chart */}
            <div className="bg-white dark:bg-[#172036] rounded-[32px] p-8 border border-[#EEF2FF] dark:border-white/5 shadow-sm">
               <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-500" />
                  Department Reach
               </h3>
               <div className="h-[200px] w-full">
                  {deptData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptData} layout="vertical" margin={{ left: -20, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }} 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} 
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                           {deptData.map((_, index) => (
                             <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                           ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-slate-50 dark:bg-white/5 rounded-[24px] border border-dashed border-slate-200 dark:border-white/10">
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No Enrollment Data</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Schedule & Venue Card */}
            <div className="bg-white dark:bg-[#172036] rounded-[32px] p-8 border border-[#EEF2FF] dark:border-white/5 shadow-sm space-y-6">
               <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Event Logistics</h3>
               
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                        <Clock size={20} />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time commitment</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{training.duration_hours} Training Hours</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                        <MapPin size={20} />
                     </div>
                     <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Venue / Access</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{training.venue || "Global Remote Access"}</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                        <Building2 size={20} />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department Scope</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatEligibility(training.is_global, training.eligible_departments)}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Attendance Session Control Card */}
            {(user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "trainer") && (
              <div className="bg-white dark:bg-[#172036] rounded-[32px] p-8 border border-[#EEF2FF] dark:border-white/5 shadow-sm space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Attendance Roster</h3>
                    {attendanceSession ? (
                      <Badge className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                        attendanceSession.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                      )}>
                        {attendanceSession.is_active ? "Active" : "Closed"}
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 text-[9px] font-black uppercase tracking-widest">
                        Checking...
                      </Badge>
                    )}
                 </div>
                 
                 <p className="text-xs text-slate-400 font-medium">
                   Share this attendance roster with the trainer or coordinator to mark candidate attendance.
                 </p>

                 {attendanceSession && (
                   <div className="space-y-2 pt-2">
                     <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                       <input 
                         type="text" 
                         readOnly 
                         value={attendanceSession.secure_token ? `${window.location.origin}/attendance-roster/${attendanceSession.training_slug || 'session'}-${attendanceSession.secure_token}` : ""} 
                         className="flex-1 bg-transparent text-xs text-slate-500 dark:text-slate-400 font-mono outline-none select-all"
                       />
                     </div>
                     <div className="flex gap-2">
                       <Button 
                         onClick={async () => {
                           const link = attendanceSession.secure_token ? `${window.location.origin}/attendance-roster/${attendanceSession.training_slug || 'session'}-${attendanceSession.secure_token}` : "";
                           await navigator.clipboard.writeText(link);
                           toast("success", "Roster link copied!");
                         }}
                         className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wider py-2.5 h-10 shadow-lg shadow-brand-500/20"
                       >
                         Copy Link
                       </Button>
                       <Button 
                         onClick={() => attendanceSession.secure_token && window.open(`/attendance-roster/${attendanceSession.training_slug || 'session'}-${attendanceSession.secure_token}`, "_blank")}
                         variant="outline"
                         className="rounded-xl text-xs font-black uppercase tracking-wider py-2.5 h-10 border-slate-200 dark:border-white/10"
                       >
                         Open
                       </Button>
                     </div>
                   </div>
                 )}
              </div>
            )}

            {/* ── Learning Resources Card ── */}
            <div className="bg-white dark:bg-[#172036] rounded-[32px] p-8 border border-[#EEF2FF] dark:border-white/5 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <BookOpen size={16} className="text-indigo-500" />
                  </div>
                  Learning Resources
                </h3>
                {training.learning_module_id && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
                    <Zap size={8} className="mr-1" /> Auto-Linked
                  </Badge>
                )}
              </div>

              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Every training has a dedicated learning module. Upload SOPs, guides, and reference materials here for participants.
              </p>

              {training.learning_module_id ? (
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate(`/elearning/${training.learning_module_id}`)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider h-10 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={14} />
                    Open Learning Module
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadMaterialForm({ title: "", description: "", external_url: "", tags: "", file: null });
                      setIsUploadMaterialOpen(true);
                    }}
                    className="w-full rounded-xl text-xs font-black uppercase tracking-wider h-10 border-slate-200 dark:border-white/10 flex items-center justify-center gap-2"
                  >
                    <Upload size={14} />
                    Upload Material
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center animate-pulse">
                    <Zap size={14} className="text-slate-400" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Module Being Created...</p>
                </div>
              )}
            </div>

            {/* Documents Section */}
            <div className="bg-white dark:bg-[#172036] rounded-[32px] p-8 border border-[#EEF2FF] dark:border-white/5 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Assets</h3>
                  <label className="cursor-pointer">
                    <Input type="file" className="hidden" onChange={handleFileUpload} />
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center hover:bg-brand-500/20 transition-all">
                      <Upload size={14} />
                    </div>
                  </label>
               </div>
               <div className="space-y-3">
                  {training.documents && training.documents.length > 0 ? (
                    training.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 hover:border-brand-500/30 transition-all group">
                         <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-white dark:bg-white/5 shadow-sm group-hover:scale-110 transition-transform">
                               <FileText size={16} className="text-slate-400" />
                            </div>
                            <div className="flex flex-col min-w-0">
                               <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{doc.title}</span>
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">PDF ASSET</span>
                            </div>
                         </div>
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => window.open(getAssetUrl(doc.file_path), '_blank')}>
                            <Download size={14} className="text-brand-500" />
                         </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-slate-50/50 dark:bg-white/[0.01] rounded-[24px] border border-dashed border-slate-200 dark:border-white/10">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Empty</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-none shadow-2xl bg-white dark:bg-[#0B1020]">
          <div className="bg-slate-950 p-10 text-white relative overflow-hidden">
             <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
                <GraduationCap size={240} />
             </div>
             <div className="relative z-10">
               <DialogTitle className="text-3xl font-black mb-2">Modify Curriculum</DialogTitle>
               <DialogDescription className="text-slate-400 text-lg">Update program parameters and scheduling for this training track.</DialogDescription>
             </div>
          </div>
          <div className="p-10">
            <TrainingForm 
              initialData={training} 
              onSubmit={(data) => updateMutation.mutate(data)}
              onCancel={() => setIsEditOpen(false)}
              isLoading={updateMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!archiveConfirmId}
        onOpenChange={(open) => !open && setArchiveConfirmId(null)}
        title="Archive Initiative"
        description="Moving this program to historical records. All data will be preserved but active discoveries will cease."
        onConfirm={() => archiveMutation.mutate(id!)}
        isLoading={archiveMutation.isPending}
      />

      {/* Attendance Session Link Generation Dialog */}
      <Dialog open={!!attendanceLinkDialog} onOpenChange={(open) => !open && setAttendanceLinkDialog(null)}>
        <DialogContent className="max-w-md rounded-[28px] p-6 border-none shadow-2xl bg-white dark:bg-[#172036]">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={20} className="text-indigo-500" /> Training Attendance Roster
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Secure attendance roster for <strong>{attendanceLinkDialog?.training?.title}</strong> is active. Share this link.
            </DialogDescription>
          </DialogHeader>

          {attendanceLinkDialog && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-white/5">
                <input 
                  type="text" 
                  readOnly 
                  value={attendanceLink || ""} 
                  className="flex-1 bg-transparent text-xs text-slate-600 dark:text-slate-400 font-mono outline-none select-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={async () => {
                    const link = attendanceLink;
                    if (link) {
                      await navigator.clipboard.writeText(link);
                      toast("success", "Roster link copied!");
                    } else {
                      toast("error", "Attendance link not generated yet.");
                    }
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider h-10 shadow-lg shadow-brand-500/20"
                >
                  Copy Link
                </Button>
                <Button 
                  onClick={() => {
                    const link = attendanceLink;
                    if (link) {
                      window.open(link, "_blank");
                      setAttendanceLinkDialog(null);
                    } else {
                      toast("error", "Attendance link not generated yet.");
                    }
                  }}
                  variant="outline"
                  className="rounded-xl text-[10px] font-black uppercase tracking-wider h-10 border-slate-200 dark:border-white/10"
                >
                  Open Attendance Roster
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Material to Learning Module Dialog */}
      <Dialog open={isUploadMaterialOpen} onOpenChange={(open) => { if (!open) setIsUploadMaterialOpen(false); }}>
        <DialogContent className="max-w-md rounded-[28px] p-6 border-none shadow-2xl bg-white dark:bg-[#172036]">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Upload size={18} className="text-indigo-500" /> Upload Learning Material
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Add a file or link to the <strong>{training?.title}</strong> learning module.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!training?.learning_module_id || !uploadMaterialForm.title) return;
              if (!uploadMaterialForm.file && !uploadMaterialForm.external_url) {
                toast("warning", "File or URL required", "Please select a file or enter an external URL.");
                return;
              }
              uploadMaterialMutation.mutate({
                module_id: training.learning_module_id,
                title: uploadMaterialForm.title,
                description: uploadMaterialForm.description || undefined,
                external_url: uploadMaterialForm.external_url || undefined,
                tags: uploadMaterialForm.tags || undefined,
                file: uploadMaterialForm.file || undefined,
              });
            }}
            className="space-y-4 pt-3"
          >
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Material Title *</label>
              <input
                value={uploadMaterialForm.title}
                onChange={(e) => setUploadMaterialForm({ ...uploadMaterialForm, title: e.target.value })}
                placeholder="e.g. Safety Procedures Guide"
                required
                className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
              <input
                value={uploadMaterialForm.description}
                onChange={(e) => setUploadMaterialForm({ ...uploadMaterialForm, description: e.target.value })}
                placeholder="Brief description of the material"
                className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Option A: File Upload</label>
                <div className="relative flex items-center gap-3 bg-white dark:bg-white/5 p-2.5 rounded-xl border border-slate-200 dark:border-white/10">
                  <Upload size={14} className="text-slate-400 ml-1 shrink-0" />
                  <input
                    type="file"
                    onChange={(e) => setUploadMaterialForm({ ...uploadMaterialForm, file: e.target.files?.[0] || null })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-500 font-semibold truncate">
                    {uploadMaterialForm.file ? uploadMaterialForm.file.name : "Select PDF, PPT, DOC, XLS, MP4, ZIP, Image..."}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
                <span className="text-[9px] font-black text-slate-400 uppercase">OR</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Option B: External URL</label>
                <input
                  value={uploadMaterialForm.external_url}
                  onChange={(e) => setUploadMaterialForm({ ...uploadMaterialForm, external_url: e.target.value })}
                  placeholder="https://docs.google.com/..."
                  className="w-full h-11 px-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setIsUploadMaterialOpen(false)} className="flex-1 rounded-xl font-black text-xs h-10">
                Cancel
              </Button>
              <Button type="submit" disabled={uploadMaterialMutation.isPending} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-10 shadow-lg shadow-indigo-500/20">
                {uploadMaterialMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
