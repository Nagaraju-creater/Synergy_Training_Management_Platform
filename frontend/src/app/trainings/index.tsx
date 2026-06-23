import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, Search, MoreHorizontal, Edit2, Trash2, 
  Calendar, Clock, User, GraduationCap, Users, 
  Archive, ArrowRight, Target, LayoutGrid, List,
  BookOpen, Sparkles, TrendingUp, Building2, MonitorPlay,
  Upload, Download, AlertTriangle, CheckCircle, XCircle, History, Info, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { trainingsService } from "@/services/trainings.service";
import { attendanceService } from "@/services/attendance.service";
import { computeLifecycle } from "@/utils/trainingLifecycle";
import { useAuthStore } from "@/store/authStore";
import { useDebounce } from "@/hooks/useDebounce";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/DropdownMenu";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { toast } from "@/components/ui/Toast";
import { usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import type { Training } from "@/types";
import { formatDate, formatEligibility } from "@/utils/formatters";
import { TrainingForm } from "./components/TrainingForm";
import MyEnrollments from "../enrollments/MyEnrollments";
import { TrainingLifecycleBadge } from "@/components/ui/TrainingLifecycleBadge";
import { AdminNominatePanel } from "./components/AdminNominatePanel";

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
      className="relative group bg-white dark:bg-[#172036] p-3.5 md:p-5 rounded-[20px] md:rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:shadow-[0_15px_30px_rgba(15,23,42,0.08)] md:hover:-translate-y-1 transition-all ring-1 ring-slate-200/50 dark:ring-white/5"
    >
      <div className="flex items-center justify-between mb-2.5 md:mb-4">
        <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center border transition-all group-hover:scale-105 group-hover:shadow-lg", variants[variant])}>
          <Icon size={16} className="md:w-5 md:h-5" strokeWidth={2.5} />
        </div>
        {insight && (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-0.5 md:gap-1 text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-tight">
              <TrendingUp size={9} className="md:w-2.5 md:h-2.5" />
              {insight}
            </div>
            {insightLabel && <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{insightLabel}</span>}
          </div>
        )}
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5 md:mb-1">{title}</p>
        <div className="flex items-baseline gap-0.5 md:gap-1">
          <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
          <span className="text-[8px] md:text-[10px] font-bold text-slate-300">Total</span>
        </div>
      </div>
    </motion.div>
  );
}

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

// ── Eligibility Checkers ─────────────────────────────────────────────────────

const isAttendanceLinkAvailable = (training: Training) => {
  if (!training) return false;
  const status = computeLifecycle(training, new Date()).status;
  return status === "attendance_ready" || status === "ongoing";
};


// ── Training Card Component ──────────────────────────────────────────────────

function TrainingCard({ training, isAdmin, onEdit, onArchive, onDelete, onGenerateLink, delay = 0 }: { 
  training: Training, 
  isAdmin: boolean, 
  onEdit: (t: Training) => void,
  onArchive: (id: string) => void,
  onDelete: (id: string) => void,
  onGenerateLink: (t: Training) => void,
  delay?: number
}) {
  const wallpaper = getTrainingWallpaper(training.category?.name);
  const maxSeats = training.max_participants || 0;
  const seatsAvailable = training.available_seats || 0;
  const enrolledCount = maxSeats - seatsAvailable;
  const seatsPercent = maxSeats ? (enrolledCount / maxSeats) * 100 : 0;
  const status = computeLifecycle(training, new Date()).status;
  const canEditOrDelete = ["scheduled", "enrollment_open", "enrollment_closed", "attendance_ready", "ongoing"].includes(status);
  const canDelete = canEditOrDelete || status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="group flex bg-white dark:bg-[#172036] rounded-2xl md:rounded-[32px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_12px_rgba(15,23,42,0.02)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] md:hover:-translate-y-1 transition-all overflow-hidden relative p-2.5 md:p-0 flex-row md:flex-col gap-3 md:gap-0"
    >
      {/* Header Image / Mobile Thumbnail */}
      <div className="w-20 h-20 md:w-full md:h-40 relative overflow-hidden rounded-xl md:rounded-none shrink-0">
        <img 
          src={wallpaper} 
          alt={training.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent hidden md:block" />
        
        {/* Floating Badges overlay (Desktop) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 hidden md:flex">
          <TrainingLifecycleBadge training={training} size="xs" showCountdown className="bg-black/30 backdrop-blur-md border-white/20 text-white" />
          {training.is_mandatory && (
            <Badge variant="warning" className="h-5 px-2 text-[9px] font-black uppercase tracking-widest rounded-full backdrop-blur-md bg-opacity-80">
              Mandatory
            </Badge>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white hidden md:flex">
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">{training.category?.name || "General"}</span>
              <h4 className="text-sm font-black tracking-tight line-clamp-1">{training.title}</h4>
           </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-0 md:p-6 flex-1 flex flex-col justify-between min-w-0 md:space-y-4">
        
        {/* Mobile Header Title */}
        <div className="flex md:hidden items-start justify-between gap-1">
          <div className="min-w-0">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {training.category?.name || "General"}
            </span>
            <h4 className="text-xs font-black tracking-tight text-slate-900 dark:text-white line-clamp-1 mt-0.5">
              {training.title}
            </h4>
          </div>
          <div className="shrink-0 flex items-center gap-1">
            {training.is_mandatory && (
              <Badge variant="warning" className="h-4 px-1.5 text-[8px] font-extrabold uppercase tracking-tight rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                M
              </Badge>
            )}
            <TrainingLifecycleBadge training={training} size="xs" className="text-[8px] scale-90 origin-right" />
          </div>
        </div>

        {/* Description (Hidden on Mobile) */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-medium leading-relaxed italic hidden md:block">
          "{training.description || "No curriculum description provided for this session."}"
        </p>

        {/* Mobile Compact Metadata */}
        <div className="flex md:hidden flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1">
          <span>{training.trainer_name || "Trainer"}</span>
          <span className="opacity-30">•</span>
          <span>{formatDate(training.start_date)}</span>
          <span className="opacity-30">•</span>
          <span>{training.duration_hours}h</span>
          <span className="opacity-30">•</span>
          <span className="text-brand-500">{training.training_type || "Hybrid"}</span>
        </div>

        {/* Metadata Grid (Desktop) */}
        <div className="hidden md:grid grid-cols-2 gap-y-3 gap-x-2 border-y border-slate-50 dark:border-white/5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
               <User size={14} />
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Trainer</span>
               <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{training.trainer_name || "SGS Faculty"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
               <Calendar size={14} />
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Schedule</span>
               <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{formatDate(training.start_date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
               <Clock size={14} />
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Duration</span>
               <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{training.duration_hours}h Session</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600">
               <MonitorPlay size={14} />
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Mode</span>
               <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{training.training_type || "Hybrid"}</span>
            </div>
          </div>
        </div>

        {/* Eligibility & Seats (Desktop) */}
        <div className="space-y-3 hidden md:block">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
             <div className="flex items-center gap-1.5 text-slate-400">
                <Building2 size={12} className="text-indigo-500" />
                Eligibility: <span className="text-slate-900 dark:text-white">{formatEligibility(training.is_global, training.eligible_departments)}</span>
             </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
               <span className="text-slate-400">Seats Utilization</span>
               <span className={cn(seatsAvailable < 5 ? "text-rose-500" : "text-emerald-500")}>
                 {seatsAvailable} Remaining
               </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${seatsPercent}%` }}
                 className={cn(
                   "h-full transition-all rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                   seatsPercent > 90 ? "bg-rose-500" : seatsPercent > 70 ? "bg-amber-500" : "bg-emerald-500"
                 )}
               />
            </div>
          </div>
        </div>

        {/* Mobile Seats Indicator */}
        <div className="flex md:hidden items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          <span>Seats Left:</span>
          <span className={cn(seatsAvailable < 5 ? "text-rose-500" : "text-emerald-500")}>
            {seatsAvailable} / {maxSeats}
          </span>
        </div>

        {/* Generate Link CTA for Admin */}
        {isAdmin && (
          <div className="w-full mt-1.5 md:mt-0">
            {!isAttendanceLinkAvailable(training) ? (
              <Button 
                id="ux1j6n"
                disabled
                className="w-full h-7.5 md:h-10 rounded-lg md:rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[8px] md:text-[9px] cursor-not-allowed border-none"
              >
                Attendance link not available yet
              </Button>
            ) : (
              <Button 
                id="yj1xw8"
                onClick={() => onGenerateLink(training)}
                className="w-full h-7.5 md:h-10 rounded-lg md:rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[8px] md:text-[9px] shadow-lg shadow-indigo-500/20 transition-all"
              >
                Generate Attendance Link
              </Button>
            )}
          </div>
        )}

        {/* Card Actions */}
        <div className="pt-1.5 md:pt-2 flex items-center gap-1.5 md:gap-2">
           <Button 
            className="flex-1 h-7.5 md:h-10 rounded-lg md:rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-lg shadow-brand-500/20"
            onClick={() => window.location.href = `/trainings/details/${training.id}`}
           >
             Console
           </Button>
           
           {isAdmin && (
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="outline" className="h-7.5 w-7.5 md:h-10 md:w-10 p-0 rounded-lg md:rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-center">
                   <MoreHorizontal size={14} className="text-slate-400 md:w-[18px] md:h-[18px]" />
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border-slate-200 dark:border-white/10">
                 <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Management</DropdownMenuLabel>
                 <DropdownMenuItem disabled={!canEditOrDelete} className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5" onClick={() => onEdit(training)}>
                   <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                     <Edit2 size={14} />
                   </div>
                   Edit Curriculum
                 </DropdownMenuItem>
                 <DropdownMenuItem disabled={!canEditOrDelete} className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5" onClick={() => onArchive(training.id)}>
                   <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-600">
                     <Archive size={14} />
                   </div>
                   Archive Program
                 </DropdownMenuItem>
                 <DropdownMenuSeparator className="my-1.5 opacity-50" />
                 <DropdownMenuItem 
                   disabled={!canDelete}
                   className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5 text-destructive focus:text-destructive focus:bg-red-50"
                   onClick={() => onDelete(training.id)}
                 >
                   <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-600">
                     <Trash2 size={14} />
                   </div>
                   Delete Entity
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
           )}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────

// ── Mobile Compact Training Card (120–140px, no image thumbnail) ─────────────

function MobileCompactTrainingCard({ training, isAdmin, onEdit, onArchive, onDelete, onGenerateLink }: {
  training: Training,
  isAdmin: boolean,
  onEdit: (t: Training) => void,
  onArchive: (id: string) => void,
  onDelete: (id: string) => void,
  onGenerateLink: (t: Training) => void,
}) {
  const maxSeats = training.max_participants || 0;
  const seatsAvailable = training.available_seats || 0;
  const enrolledCount = maxSeats - seatsAvailable;
  const seatsPercent = maxSeats ? (enrolledCount / maxSeats) * 100 : 0;
  const status = computeLifecycle(training, new Date()).status;

  const getActionLabel = () => {
    if (status === "completed") return "View";
    if (status === "enrollment_open") return isAdmin ? "Manage" : "Enroll";
    if (status === "ongoing") return "Continue";
    return "Details";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] p-3 flex flex-col gap-1.5"
    >
      {/* Row 1: Category + Title + Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[9px] font-black uppercase tracking-wider text-brand-500">
            {training.category?.name || "General"}
          </span>
          <h4 className="text-[13px] font-black text-slate-900 dark:text-white line-clamp-1 leading-tight mt-0.5">
            {training.title}
          </h4>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-0.5 mt-0.5">
          <TrainingLifecycleBadge training={training} size="xs" className="text-[8px] scale-90 origin-right" />
          {training.is_mandatory && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[8px] font-extrabold uppercase tracking-tight">
              Mandatory
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Compact Metadata */}
      <div className="flex items-center gap-2 text-[10px] font-semibold flex-wrap">
        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <Calendar size={10} className="text-indigo-500 shrink-0" />
          {formatDate(training.start_date)}
        </span>
        <span className="text-slate-200 dark:text-white/10">·</span>
        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <Clock size={10} className="text-emerald-500 shrink-0" />
          {training.duration_hours}h
        </span>
        <span className="text-slate-200 dark:text-white/10">·</span>
        <span className="text-brand-500 font-bold text-[9px] uppercase tracking-wide">
          {training.training_type || "Hybrid"}
        </span>
        {training.trainer_name && (
          <>
            <span className="text-slate-200 dark:text-white/10">·</span>
            <span className="text-slate-400 dark:text-slate-500 text-[9px] truncate max-w-[80px]">{training.trainer_name}</span>
          </>
        )}
      </div>

      {/* Row 3: Seats bar + Action button */}
      <div className="flex items-center gap-2 mt-0.5">
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                seatsPercent > 90 ? "bg-rose-500" : seatsPercent > 70 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${Math.min(seatsPercent, 100)}%` }}
            />
          </div>
          <span className={cn("text-[9px] font-bold", seatsAvailable < 5 && maxSeats > 0 ? "text-rose-500" : "text-slate-400")}>
            {maxSeats > 0 ? `${seatsAvailable}/${maxSeats} seats` : "Open enrollment"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            className="h-7 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-wider text-[9px] shadow-sm transition-all"
            onClick={() => window.location.href = `/trainings/details/${training.id}`}
          >
            {getActionLabel()}
          </Button>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-7 w-7 p-0 rounded-xl border-slate-200 dark:border-white/10 flex items-center justify-center">
                  <MoreHorizontal size={11} className="text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl p-1 shadow-xl border-slate-200 dark:border-white/10">
                <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-xs px-2.5 py-2" onClick={() => onEdit(training)}>
                  <Edit2 size={11} className="text-indigo-500" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-xs px-2.5 py-2" onClick={() => onGenerateLink(training)}>
                  <Sparkles size={11} className="text-amber-500" /> Att. Link
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 opacity-50" />
                <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-xs px-2.5 py-2" onClick={() => onArchive(training.id)}>
                  <Archive size={11} className="text-slate-500" /> Archive
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-xs px-2.5 py-2 text-destructive focus:text-destructive" onClick={() => onDelete(training.id)}>
                  <Trash2 size={11} className="text-red-500" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function TrainingsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const role = user?.role?.toLowerCase() || "";
  const isAdmin = role.includes("admin") || role.includes("trainer");
  const { page, perPage, nextPage, prevPage, reset } = usePagination();

  // ── States ───────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState("");
  const typeFilter = "";
  const [categoryFilter, setCategoryFilter] = useState("");
  const departmentFilter = "";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"catalog" | "my" | "admin-nominate">(isAdmin ? "catalog" : "my");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [attendanceLinkDialog, setAttendanceLinkDialog] = useState<{ training: Training; session: any } | null>(null);

  // States to preserve generated session data
  const [attendanceLink, setAttendanceLink] = useState<string | null>(null);

  // Bulk Import & Export States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState("skip");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importTab, setImportTab] = useState<"upload" | "history">("upload");
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const resetImportState = () => {
    setImportFile(null);
    setParsedData(null);
    setDuplicateStrategy("skip");
    setIsParsing(false);
    setIsImporting(false);
    setImportTab("upload");
  };

  const handleExportTrainings = async () => {
    try {
      setExporting(true);
      const res = await trainingsService.exportExcel();
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `training_catalog_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast("success", "Trainings exported successfully");
    } catch (error) {
      console.error(error);
      toast("error", "Failed to export trainings");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await trainingsService.downloadTemplate();
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "training_import_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast("success", "Excel template downloaded");
    } catch (error) {
      console.error(error);
      toast("error", "Failed to download template");
    }
  };

  const handleFileUpload = async (file: File) => {
    setImportFile(file);
    setIsParsing(true);
    setParsedData(null);
    try {
      const res = await trainingsService.parseImportFile(file);
      if (res.data?.success === false) {
        toast("error", res.data?.message || "Parsing failed");
        setImportFile(null);
      } else {
        setParsedData(res.data.data);
        toast("success", "File parsed and validated successfully!");
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error?.response?.data?.message || "Failed to parse template. Please check file formatting.";
      toast("error", errMsg);
      setImportFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData || !parsedData.records) return;
    setIsImporting(true);
    try {
      const res = await trainingsService.confirmImport(parsedData.records, duplicateStrategy);
      if (res.data?.success === false) {
        toast("error", res.data?.message || "Import failed");
      } else {
        const d = res.data.data;
        toast("success", `Successfully imported ${d.successfully_imported} trainings! (${d.skipped_duplicates} skipped, ${d.failed_records} failed)`);
        qc.invalidateQueries({ queryKey: ["trainings"] });
        resetImportState();
        setIsImportModalOpen(false);
      }
    } catch (error: any) {
      console.error(error);
      toast("error", error?.response?.data?.message || "Import confirmation failed");
    } finally {
      setIsImporting(false);
    }
  };

  const fetchImportHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await trainingsService.getImportHistory();
      setImportHistory(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast("error", "Failed to load import history");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["trainings", page, perPage, debouncedSearch, statusFilter, typeFilter, categoryFilter, departmentFilter],
    queryFn: () => trainingsService.list(page, perPage, {
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      training_type: typeFilter || undefined,
      category_id: categoryFilter || undefined,
      department_id: departmentFilter || undefined,
    }),
    select: (res) => res.data,
  });

  const { data: categories } = useQuery({
    queryKey: ["training-categories"],
    queryFn: () => trainingsService.listCategories(),
    select: (res) => res.data.data,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const generateLinkMutation = useMutation({
    mutationFn: async (training: Training) => {
      const res = await attendanceService.getAttendanceSession(training.id);
      const session = res.data.data || res.data;
      const slug = session.training_slug || training.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "session";
      const link = `${window.location.origin}/attendance-roster/${slug}-${session.secure_token}`;
      return {
        data: {
          link,
          session,
          training
        }
      };
    },
    onSuccess: (response) => {
      // 7. VERIFY RESPONSE STORAGE
      setAttendanceLink(response.data.link);

      setAttendanceLinkDialog({ training: response.data.training, session: response.data.session });
      toast("success", "Successfully generated attendance roster session");
    },
    onError: () => {
      toast("error", "Failed to generate attendance session.");
    }
  });

  const upsertMutation = useMutation({
    mutationFn: (data: any) => selectedTraining 
      ? trainingsService.update(selectedTraining.id, data)
      : trainingsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainings"] });
      qc.invalidateQueries({ queryKey: ["calendar-trainings"] });
      qc.invalidateQueries({ queryKey: ["active-session"] });
      qc.invalidateQueries({ queryKey: ["upcoming-sessions"] });
      qc.invalidateQueries({ queryKey: ["attendance-history"] });
      qc.invalidateQueries({ queryKey: ["attendance-analytics"] });
      qc.invalidateQueries({ queryKey: ["employee-dashboard"] });
      qc.invalidateQueries({ queryKey: ["manager-dashboard-unified"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setIsFormOpen(false);
      setSelectedTraining(null);
      toast("success", selectedTraining ? "Training Updated" : "Training Created");
    },
    onError: (err: any) => {
      toast("error", "Action Failed", err.response?.data?.message || "Something went wrong");
    }
  });

  const archiveMutation = useMutation({
    mutationFn: trainingsService.archive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainings"] });
      setArchiveId(null);
      toast("success", "Training Archived");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: trainingsService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainings"] });
      setDeleteId(null);
      toast("success", "Training Deleted");
    }
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleEdit = (training: Training) => {
    setSelectedTraining(training);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedTraining(null);
    setIsFormOpen(true);
  };

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns: Column<Training>[] = [
    { 
      key: "title", 
      label: "Program Name", 
      className: "min-w-[300px]",
      render: (r) => (
        <div className="flex items-center gap-3 py-1">
           <div className="w-10 h-10 rounded-[14px] bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20 shrink-0">
              <BookOpen size={20} />
           </div>
           <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight mb-0.5">
                {r.title}
                {r.is_mandatory && <Badge variant="warning" className="h-4 px-1.5 text-[8px] font-black uppercase tracking-tighter">Mandatory</Badge>}
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight flex items-center gap-1">
                <User size={10} className="text-brand-500" /> {r.trainer_name || "SGS Faculty"}
              </span>
           </div>
        </div>
      )
    },
    {
      key: "category",
      label: "Discipline",
      render: (r) => (
        <div className="py-1">
          <Badge variant="secondary" className="rounded-lg font-bold px-2.5 py-0.5 bg-slate-100 dark:bg-white/5 border-none text-[11px]">
            {r.category?.name || "General"}
          </Badge>
        </div>
      )
    },
    {
      key: "status",
      label: "Lifecycle",
      render: (r) => (
        <div className="py-1">
          <TrainingLifecycleBadge training={r} size="sm" showCountdown />
        </div>
      ),
    },
    {
      key: "schedule",
      label: "Timeline",
      render: (r) => (
        <div className="flex flex-col text-[11px] py-1 space-y-0.5">
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
            <Calendar size={12} className="text-brand-500" /> {formatDate(r.start_date)}
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Clock size={12} /> {r.duration_hours}h Session
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (r) => {
        const status = computeLifecycle(r, new Date()).status;
        const canEditOrDelete = ["scheduled", "enrollment_open", "enrollment_closed", "attendance_ready", "ongoing"].includes(status);
        const canDelete = canEditOrDelete || status === "completed";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
                <MoreHorizontal size={18} className="text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl border-slate-200 dark:border-white/10 p-1.5">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Program Control</DropdownMenuLabel>
              <DropdownMenuItem className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5" onClick={() => window.location.href = `/trainings/details/${r.id}`}>
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600">
                   <ArrowRight size={14} />
                </div>
                View Console
              </DropdownMenuItem>
              
              {isAdmin && (
                <>
                  <DropdownMenuSeparator className="my-1.5 opacity-50" />
                  {isAttendanceLinkAvailable(r) ? (
                    <DropdownMenuItem 
                      id="yj1xw8"
                      className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5 text-indigo-600 focus:text-indigo-700" 
                      onClick={() => generateLinkMutation.mutate(r)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                        <Sparkles size={14} />
                      </div>
                      Generate Attendance Link
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem 
                      id="ux1j6n"
                      disabled
                      className="gap-3 rounded-xl font-bold text-sm px-3 py-2.5 text-slate-400 opacity-60 cursor-not-allowed"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
                        <Clock size={14} />
                      </div>
                      Attendance link not available yet
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="my-1.5 opacity-50" />
                  <DropdownMenuItem disabled={!canEditOrDelete} className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5" onClick={() => handleEdit(r)}>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                      <Edit2 size={14} />
                    </div>
                    Edit Curriculum
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!canEditOrDelete} className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5" onClick={() => setArchiveId(r.id)}>
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-600">
                      <Archive size={14} />
                    </div>
                    Archive Record
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    disabled={!canDelete}
                    className="gap-3 cursor-pointer rounded-xl font-bold text-sm px-3 py-2.5 text-destructive focus:text-destructive focus:bg-red-50 dark:focus:bg-red-950/20"
                    onClick={() => setDeleteId(r.id)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-600">
                      <Trash2 size={14} />
                    </div>
                    Purge Entity
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] transition-colors duration-500 px-3 md:px-4 lg:px-8 pt-3 md:pt-4 lg:pt-8 pb-[88px] md:pb-12">
      <div className="max-w-[1600px] mx-auto space-y-2.5 md:space-y-3 animate-in fade-in duration-700">
        
        {/* ── Mobile Hero Strip ──────────────────────────────────── */}
        <div className="md:hidden bg-gradient-to-r from-indigo-600 via-brand-600 to-violet-600 rounded-2xl p-3.5 shadow-lg shadow-indigo-500/25 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 mb-0.5">My Learning</p>
                <h2 className="text-[15px] font-black text-white tracking-tight">
                  {isAdmin ? "Training Catalog" : "Skill Discovery"}
                </h2>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={handleAddNew}
                    className="h-7 px-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-black text-[9px] uppercase tracking-wider border border-white/20 backdrop-blur-md transition-all"
                  >
                    <Plus size={11} className="mr-1" /> New
                  </Button>
                  <Button
                    onClick={() => setIsImportModalOpen(true)}
                    className="h-7 w-7 p-0 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-md transition-all flex items-center justify-center"
                  >
                    <Upload size={11} />
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Available", value: data?.meta?.total ?? "—" },
                { label: "Scheduled", value: data?.meta?.status_counts?.scheduled ?? "—" },
                { label: "Live Now", value: data?.meta?.status_counts?.ongoing ?? "—" },
                { label: "Rating", value: "4.8★" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/15 backdrop-blur-md rounded-xl p-2 text-center border border-white/10">
                  <div className="text-[13px] font-black text-white leading-tight">{String(stat.value)}</div>
                  <div className="text-[7px] font-bold uppercase tracking-wider text-white/70 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Desktop Hero Header ─────────────────────────────── */}
        <div className="hidden md:block relative overflow-hidden rounded-[20px] md:rounded-[24px] bg-gradient-to-br from-white via-indigo-50/30 to-slate-50 dark:from-[#172036] dark:via-indigo-950/10 dark:to-[#0B1020] border border-[#EEF2FF] dark:border-white/5 p-4 md:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-400/5 dark:bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-400/5 dark:bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/5 border border-[#EEF2FF] dark:border-white/10 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest mb-4 backdrop-blur-md shadow-sm"
              >
                <GraduationCap size={12} className="text-brand-500 dark:text-brand-400" /> Professional Explorer
              </motion.div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tighter mb-1 leading-tight text-slate-900 dark:text-white">
                {isAdmin ? "Training Orchestration" : "Skill Discovery"}
              </h1>
              <p className="hidden md:block text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg font-medium leading-relaxed">
                {isAdmin 
                  ? "Design, schedule, and orchestrate all corporate development initiatives and curriculum tracks." 
                  : "Accelerate your career trajectory by discovering and mastering mission-critical organizational skills."}
              </p>
            </div>
            
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2.5">
                <Button onClick={handleAddNew} className="h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all font-bold text-xs text-white">
                  <Plus size={16} className="mr-2" /> 
                  New Program
                </Button>
                <Button onClick={() => setIsImportModalOpen(true)} className="h-10 px-5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/15 transition-all font-bold text-xs">
                  <Upload size={16} className="mr-2" />
                  Import Trainings
                </Button>
                <Button onClick={handleExportTrainings} disabled={exporting} className="h-10 px-5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/15 transition-all font-bold text-xs disabled:opacity-50">
                  {exporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                  Export Trainings
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <PremiumStatCard
            title={isAdmin ? "Total Programs" : "My XP Points"}
            value={isAdmin ? (data?.meta?.total ?? 0) : (user?.employee?.leaderboard_points?.[0]?.points ?? 0)}
            icon={isAdmin ? GraduationCap : Target}
            insight={isAdmin ? "+4" : "Rank #12"}
            insightLabel="This Month"
            variant="indigo"
            delay={0.1}
          />
          <PremiumStatCard
            title="Scheduled Events"
            value={data?.meta?.status_counts?.scheduled ?? 0}
            icon={Calendar}
            insight="Upcoming"
            variant="amber"
            delay={0.2}
          />
          <PremiumStatCard
            title="Active Sessions"
            value={data?.meta?.status_counts?.ongoing ?? 0}
            icon={Users}
            insight="Live Now"
            variant="emerald"
            delay={0.3}
          />
          <PremiumStatCard
            title="Avg Rating"
            value="4.8"
            icon={Sparkles}
            insight="Stars"
            variant="rose"
            delay={0.4}
          />
        </div>

        {/* ── Mobile: Segmented Control + Quick Actions ────────────── */}
        <div className="md:hidden space-y-2">
          {/* Segmented Control */}
          <div className="flex h-10 bg-slate-100 dark:bg-white/[0.07] rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab("catalog")}
              className={cn(
                "flex-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                activeTab === "catalog"
                  ? "bg-white dark:bg-[#172036] text-brand-600 dark:text-brand-400 shadow-sm"
                  : "text-slate-400"
              )}
            >
              Catalog
            </button>
            {isAdmin ? (
              <button
                onClick={() => setActiveTab("admin-nominate")}
                className={cn(
                  "flex-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                  activeTab === "admin-nominate"
                    ? "bg-white dark:bg-[#172036] text-brand-600 dark:text-brand-400 shadow-sm"
                    : "text-slate-400"
                )}
              >
                Nominate
              </button>
            ) : (
              <button
                onClick={() => setActiveTab("my")}
                className={cn(
                  "flex-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                  activeTab === "my"
                    ? "bg-white dark:bg-[#172036] text-brand-600 dark:text-brand-400 shadow-sm"
                    : "text-slate-400"
                )}
              >
                My Progress
              </button>
            )}
          </div>

          {/* Quick Actions Row */}
          <div className="flex overflow-x-auto gap-2 pb-0.5 scrollbar-none -mx-3 px-3">
            {([
              { label: "Enrollments", icon: BookOpen, href: "/enrollments" },
              { label: "Calendar", icon: Calendar, href: "/dashboard" },
              { label: "Attendance", icon: CheckCircle, href: "/attendance" },
              { label: "Learning Hub", icon: MonitorPlay, href: "/elearning" },
              { label: "Certificates", icon: GraduationCap, href: "#" },
            ] as { label: string; icon: any; href: string }[]).map((action) => (
              <button
                key={action.label}
                onClick={() => { window.location.href = action.href; }}
                className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-xl bg-white dark:bg-[#172036] border border-[#EEF2FF] dark:border-white/5 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider shadow-sm whitespace-nowrap"
              >
                <action.icon size={11} className="text-brand-500" />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Desktop Tab Switcher ─────────────────────────────────── */}
        {isAdmin ? (
          <div className="hidden md:flex items-center gap-1 bg-white/50 dark:bg-white/5 p-1 rounded-2xl w-fit border border-[#EEF2FF] dark:border-white/5 shadow-sm backdrop-blur-md">
            <button 
              onClick={() => setActiveTab("catalog")}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'catalog' 
                  ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <LayoutGrid size={14} /> Catalog
            </button>
            <button 
              onClick={() => setActiveTab("admin-nominate")}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'admin-nominate' 
                  ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <Target size={14} /> Direct Nominate
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1 bg-white/50 dark:bg-white/5 p-1 rounded-2xl w-fit border border-[#EEF2FF] dark:border-white/5 shadow-sm backdrop-blur-md">
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
            <button 
              onClick={() => setActiveTab("catalog")}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'catalog' 
                  ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <LayoutGrid size={14} /> Discovery Catalog
            </button>
          </div>
        )}

        {activeTab === "my" && !isAdmin ? (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <MyEnrollments />
          </div>
        ) : activeTab === "admin-nominate" && isAdmin ? (
          <div className="animate-in slide-in-from-bottom-4 duration-500 mt-6">
             <AdminNominatePanel />
          </div>
        ) : (
          <>
            {/* ── MOBILE CATALOG ──────────────────────────────────── */}
            <div className="md:hidden space-y-2 mt-2">
              {/* Mobile Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <Input
                  placeholder="Search trainings..."
                  className="pl-9 h-9 bg-white dark:bg-[#172036] border-[#EEF2FF] dark:border-white/5 rounded-xl text-[13px] font-medium shadow-sm"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); reset(); }}
                />
              </div>

              {/* Mobile Filter Chips */}
              <div className="flex overflow-x-auto gap-1.5 pb-0.5 scrollbar-none -mx-3 px-3">
                {[
                  { id: "", label: "All" },
                  { id: "scheduled", label: "Scheduled" },
                  { id: "ongoing", label: "Live" },
                  { id: "enrollment_open", label: "Open" },
                  { id: "completed", label: "Completed" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setStatusFilter(f.id); reset(); }}
                    className={cn(
                      "shrink-0 px-3 h-7 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border",
                      statusFilter === f.id
                        ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                        : "bg-white dark:bg-[#172036] text-slate-500 dark:text-slate-400 border-[#EEF2FF] dark:border-white/10"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
                {categories?.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCategoryFilter(categoryFilter === c.id ? "" : c.id); reset(); }}
                    className={cn(
                      "shrink-0 px-3 h-7 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border",
                      categoryFilter === c.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white dark:bg-[#172036] text-slate-500 dark:text-slate-400 border-[#EEF2FF] dark:border-white/10"
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Mobile Training Card List */}
              <div className="space-y-2">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-[130px] rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                  ))
                ) : data?.data && data.data.length > 0 ? (
                  data.data.map((training) => (
                    <MobileCompactTrainingCard
                      key={training.id}
                      training={training}
                      isAdmin={isAdmin}
                      onEdit={handleEdit}
                      onArchive={(id) => setArchiveId(id)}
                      onDelete={(id) => setDeleteId(id)}
                      onGenerateLink={(t) => generateLinkMutation.mutate(t)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-[#172036] rounded-2xl border border-[#EEF2FF] dark:border-white/5">
                    <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 mb-3">
                      <BookOpen size={24} />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">No Trainings Found</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs max-w-[200px] mt-1 font-medium">No programs match your current filter.</p>
                  </div>
                )}
              </div>

              {/* Mobile Pagination */}
              {data?.meta && data.meta.total_pages > 1 && (
                <div className="flex items-center justify-between pt-1 pb-2">
                  <Button variant="ghost" size="sm" className="h-8 rounded-lg font-bold text-xs text-slate-500" disabled={data.meta.page === 1} onClick={prevPage}>
                    ← Prev
                  </Button>
                  <div className="flex items-center justify-center h-8 px-3 rounded-lg bg-indigo-600 text-white text-[11px] font-black min-w-[56px]">
                    {data.meta.page} / {data.meta.total_pages}
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 rounded-lg font-bold text-xs text-slate-500" disabled={data.meta.page === data.meta.total_pages} onClick={nextPage}>
                    Next →
                  </Button>
                </div>
              )}
            </div>

            {/* ── DESKTOP CATALOG ─────────────────────────────────── */}
            <div className="hidden md:block bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500 mt-6">
            
            {/* STICKY HEADER BLOCK */}
            <div className="sticky top-0 z-20 bg-white dark:bg-[#172036] rounded-t-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              
              {/* Status Tabs */}
              <div className="flex border-b border-[#EEF2FF] dark:border-white/[0.07] px-6 pt-4 overflow-x-auto gap-1 bg-white dark:bg-[#172036] rounded-t-[24px] scrollbar-none">
                {[
                  { id: "", label: "All", count: data?.meta?.status_counts?.all ?? 0, colorClass: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20" },
                  { id: "scheduled", label: "Scheduled", count: data?.meta?.status_counts?.scheduled ?? 0, colorClass: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
                  { id: "ongoing", label: "Ongoing", count: data?.meta?.status_counts?.ongoing ?? 0, colorClass: "text-orange-600 bg-orange-500/10 border-orange-500/20" },
                  { id: "completed", label: "Completed", count: data?.meta?.status_counts?.completed ?? 0, colorClass: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" }
                ].map((tab) => {
                  const isActive = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setStatusFilter(tab.id); reset(); }}
                      className={cn(
                        "px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 -mb-[1px] shrink-0 outline-none",
                        isActive 
                          ? "border-brand-500 text-brand-600 dark:text-brand-400 font-black" 
                          : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      )}
                    >
                      {tab.label}
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-full border transition-all",
                        isActive ? tab.colorClass : "text-slate-400 bg-slate-100 dark:bg-white/5 border-transparent"
                      )}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Filter Bar */}
              <div className="bg-white dark:bg-[#172036] border-b border-[#EEF2FF] dark:border-white/[0.07] px-5 py-3 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="relative flex-1 lg:max-w-sm group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={14} />
                    <Input 
                      placeholder="Search programs, skills..." 
                      className="pl-9 h-9 w-full bg-slate-50 dark:bg-white/[0.04] border-slate-200/60 dark:border-white/[0.06] focus-visible:bg-white dark:focus-visible:bg-[#0B1020] focus-visible:ring-2 focus-visible:ring-brand-500/20 rounded-xl transition-all font-medium text-[13px]"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); reset(); }}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 lg:ml-auto">
                    {/* View Toggle */}
                    <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl mr-2">
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setViewMode("grid")}
                        className={cn(
                          "h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1.5 transition-all",
                          viewMode === "grid" ? "bg-white dark:bg-[#172036] shadow-sm text-brand-600" : "text-slate-400"
                        )}
                       >
                         <LayoutGrid size={12} /> Grid
                       </Button>
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setViewMode("list")}
                        className={cn(
                          "h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1.5 transition-all",
                          viewMode === "list" ? "bg-white dark:bg-[#172036] shadow-sm text-brand-600" : "text-slate-400"
                        )}
                       >
                         <List size={12} /> List
                       </Button>
                    </div>

                    <Select 
                      value={categoryFilter} 
                      onChange={(e) => { setCategoryFilter(e.target.value); reset(); }}
                      className="h-9 w-40 rounded-xl text-[11px] font-bold bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/10"
                    >
                      <option value="">All Categories</option>
                      {categories?.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>

                    {data?.meta && (
                      <div className="hidden sm:flex items-center gap-1.5 h-9 px-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="text-slate-700 dark:text-white">{data.meta.total}</span>
                        <span>Programs</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Column Headers (Only in List View) */}
              <AnimatePresence>
                {viewMode === "list" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="hidden md:flex bg-slate-50 dark:bg-white/[0.02] border-b border-[#EEF2FF] dark:border-white/[0.07] px-2 overflow-hidden"
                  >
                    <div className="flex-[3] min-w-[300px] px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Curriculum Profile</div>
                    <div className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Discipline</div>
                    <div className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Engagement</div>
                    <div className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Timeline</div>
                    <div className="w-[56px]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative z-0 min-h-[400px]">
              {viewMode === "list" ? (
                <Table
                  columns={columns}
                  data={data?.data ?? []}
                  isLoading={isLoading}
                  keyExtractor={(r) => r.id}
                  hideHeader
                  emptyTitle={searchTerm ? "No programs match your search" : "Catalog is currently evolving"}
                  className="border-none shadow-none rounded-none"
                />
              ) : (
                <div className="p-3 md:p-8">
                   {isLoading ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 md:gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                           <div key={i} className="h-24 md:h-[450px] rounded-2xl md:rounded-[32px] bg-slate-100 dark:bg-white/5 animate-pulse" />
                        ))}
                     </div>
                   ) : data?.data && data.data.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 md:gap-6">
                        {data.data.map((training, idx) => (
                          <TrainingCard 
                            key={training.id} 
                            training={training} 
                            isAdmin={isAdmin}
                            onEdit={handleEdit}
                            onArchive={(id) => setArchiveId(id)}
                            onDelete={(id) => setDeleteId(id)}
                            onGenerateLink={(t) => generateLinkMutation.mutate(t)}
                            delay={idx * 0.05}
                          />
                        ))}
                     </div>
                   ) : (
                     <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-[24px] bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 mb-6">
                           <BookOpen size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Curriculum Empty</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xs mt-2 font-medium">No programs match your current filter selection.</p>
                     </div>
                   )}
                </div>
              )}
            </div>
            
            {data?.meta && data.meta.total_pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-[#EEF2FF] dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] rounded-b-[24px]">
                <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 sm:mb-0">
                   Displaying <span className="text-slate-800 dark:text-white">{data.data.length}</span> of <span className="text-slate-800 dark:text-white">{data.meta.total}</span> initiatives
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" className="h-8 px-3.5 rounded-lg font-bold text-xs text-slate-500" disabled={data.meta.page === 1} onClick={prevPage}>
                    ← Previous
                  </Button>
                  <div className="flex items-center justify-center h-8 px-3 rounded-lg bg-indigo-600 text-white text-[11px] font-black min-w-[56px]">
                    {data.meta.page} / {data.meta.total_pages}
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 px-3.5 rounded-lg font-bold text-xs text-slate-500" disabled={data.meta.page === data.meta.total_pages} onClick={nextPage}>
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </div>
          </>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-none shadow-2xl bg-white dark:bg-[#0B1020]">
          <div className="bg-slate-950 p-10 text-white relative overflow-hidden">
             <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
                <GraduationCap size={240} />
             </div>
             <div className="relative z-10">
               <DialogTitle className="text-3xl font-black mb-2">{selectedTraining ? "Refine Curriculum" : "Architect New Program"}</DialogTitle>
               <DialogDescription className="text-slate-400 text-lg">
                 {selectedTraining ? "Modify curriculum details and scheduling parameters for this training block." : "Define the foundational elements of this professional development track."}
               </DialogDescription>
             </div>
          </div>
          
          <div className="p-10">
            <TrainingForm 
              initialData={selectedTraining} 
              onSubmit={(data) => upsertMutation.mutate(data)}
              onCancel={() => setIsFormOpen(false)}
              isLoading={upsertMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!archiveId}
        onOpenChange={(open) => !open && setArchiveId(null)}
        title="Archive Initiative"
        description="This will move the program to historical records. Active enrollments will be preserved as completed/withdrawn."
        onConfirm={() => archiveId && archiveMutation.mutate(archiveId)}
        isLoading={archiveMutation.isPending}
      />

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Purge Record"
        description="WARNING: This will permanently erase all program data and enrollment history. This action is irreversible."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
        confirmText="Confirm Purge"
      />

      {/* Attendance Session Link Generation Dialog */}
      <Dialog open={!!attendanceLinkDialog} onOpenChange={(open) => !open && setAttendanceLinkDialog(null)}>
        <DialogContent className="max-w-md rounded-[28px] p-6 border-none shadow-2xl bg-white dark:bg-[#172036]">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={20} className="text-indigo-500" /> Secure Attendance Session
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              The secure attendance marking roster for <strong>{attendanceLinkDialog?.training?.title}</strong> is active. Share this link with the trainer/coordinator.
            </DialogDescription>
          </DialogHeader>

          {attendanceLinkDialog && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-white/5">
                <input 
                  id="njlwm2"
                  type="text" 
                  readOnly 
                  value={attendanceLink || ""} 
                  className="flex-1 bg-transparent text-xs text-slate-600 dark:text-slate-400 font-mono outline-none select-all"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  onClick={async () => {
                    const link = attendanceLink || "";
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
                  onClick={async () => {
                    const link = attendanceLink || "";
                    if (link) {
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: `${attendanceLinkDialog.training.title} Attendance`,
                            text: `Please mark attendance for ${attendanceLinkDialog.training.title}`,
                            url: link,
                          });
                        } catch (err) {
                          await navigator.clipboard.writeText(link);
                          toast("success", "Link copied to clipboard!");
                        }
                      } else {
                        await navigator.clipboard.writeText(link);
                        toast("success", "Link copied to clipboard!");
                      }
                    } else {
                      toast("error", "Attendance link not generated yet.");
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider h-10 shadow-lg shadow-indigo-500/20"
                >
                  Share Link
                </Button>
                <Button 
                  onClick={() => {
                    if (attendanceLink) {
                      window.open(attendanceLink, "_blank", "noopener,noreferrer");
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

      {/* Training Import Center Dialog */}
      <Dialog 
        open={isImportModalOpen} 
        onOpenChange={(open) => {
          if (!open) {
            resetImportState();
          }
          setIsImportModalOpen(open);
        }}
      >
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto rounded-[32px] p-0 border-none shadow-2xl bg-white dark:bg-[#0B1020] text-slate-800 dark:text-slate-200">
          <div className="bg-slate-950 p-8 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-15 rotate-12">
              <Upload size={200} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-black mb-1.5 flex items-center gap-2">
                  <Upload className="text-brand-500" /> Training Import Center
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  Bulk import historical and upcoming training programs. Ensure correct formatting in the spreadsheet.
                </DialogDescription>
              </div>
              <Button 
                onClick={handleDownloadTemplate} 
                className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all font-bold text-xs text-white flex items-center gap-2"
              >
                <Download size={14} /> Download Template
              </Button>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-100 dark:border-white/5 pb-px">
              <button
                onClick={() => setImportTab("upload")}
                className={cn(
                  "pb-4 px-4 font-bold text-sm transition-all border-b-2 relative -bottom-[2px] flex items-center gap-2",
                  importTab === "upload"
                    ? "border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <Upload size={16} /> Bulk Import
              </button>
              <button
                onClick={() => {
                  setImportTab("history");
                  fetchImportHistory();
                }}
                className={cn(
                  "pb-4 px-4 font-bold text-sm transition-all border-b-2 relative -bottom-[2px] flex items-center gap-2",
                  importTab === "history"
                    ? "border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <History size={16} /> Import History Logs
              </button>
            </div>

            {importTab === "upload" ? (
              <div className="space-y-6">
                {/* File Upload Drag & Drop Area */}
                {!importFile && !isParsing && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-brand-500", "bg-brand-50/5");
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-brand-500", "bg-brand-50/5");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-brand-500", "bg-brand-50/5");
                      if (e.dataTransfer.files?.length) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".xlsx,.xls";
                      input.onchange = (e: any) => {
                        if (e.target.files?.length) {
                          handleFileUpload(e.target.files[0]);
                        }
                      };
                      input.click();
                    }}
                    className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-10 text-center hover:border-brand-500 dark:hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <div className="h-16 w-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <Upload className="text-slate-400 group-hover:text-brand-500" size={24} />
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-white mb-1">Drag & Drop Excel File</h3>
                    <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto mb-4">
                      Accepts .xlsx or .xls formatted worksheets matching the template structure.
                    </p>
                    <Button variant="outline" className="rounded-xl font-bold text-xs h-9 px-4 border-slate-200 dark:border-white/10">
                      Browse Files
                    </Button>
                  </div>
                )}

                {/* Parsing / Loading State */}
                {isParsing && (
                  <div className="border border-slate-100 dark:border-white/5 rounded-2xl p-10 text-center space-y-4">
                    <Loader2 className="animate-spin text-brand-600 dark:text-brand-400 mx-auto" size={32} />
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">Validating Template Data</h4>
                      <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto">
                        Verifying mandatory fields, parsing date/time formats, detecting duplicate initiatives, and resolving department aliases.
                      </p>
                    </div>
                  </div>
                )}

                {/* Preview & Confirm Area */}
                {importFile && parsedData && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">Records Found</div>
                        <div className="text-xl font-black text-slate-800 dark:text-white">{parsedData.summary.records_found}</div>
                      </div>
                      <div className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-950/20 bg-emerald-50/20 dark:bg-emerald-950/10">
                        <div className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-1">
                          <CheckCircle size={10} /> Valid Records
                        </div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{parsedData.summary.valid_records}</div>
                      </div>
                      <div className="p-4 rounded-2xl border border-amber-100 dark:border-amber-950/20 bg-amber-50/20 dark:bg-amber-950/10">
                        <div className="text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> Warnings
                        </div>
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400">{parsedData.summary.warnings}</div>
                      </div>
                      <div className="p-4 rounded-2xl border border-rose-100 dark:border-rose-950/20 bg-rose-50/20 dark:bg-rose-950/10">
                        <div className="text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-1">
                          <XCircle size={10} /> Failed Records
                        </div>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400">{parsedData.summary.failed_records}</div>
                      </div>
                    </div>

                    {/* Duplicate Strategy & Settings Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-2.5">
                        <Info size={16} className="text-brand-500" />
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-xs">Duplicate Strategy</h4>
                          <p className="text-slate-400 text-[10px] font-medium">Configure strategy for dealing with existing trainings.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <select 
                          value={duplicateStrategy} 
                          onChange={(e: any) => setDuplicateStrategy(e.target.value)} 
                          className="h-9 w-48 rounded-xl font-bold text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-[#172036]"
                        >
                          <option value="skip">Skip Duplicates</option>
                          <option value="update">Update Fields</option>
                          <option value="replace">Replace Existing</option>
                        </select>
                        <Button 
                          onClick={resetImportState}
                          variant="ghost" 
                          className="h-9 rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500"
                        >
                          Reset Upload
                        </Button>
                      </div>
                    </div>

                    {/* Import Validation Grid Preview */}
                    <div className="border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto max-h-[35vh]">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                              <th className="p-3 font-black text-slate-400 uppercase tracking-wider w-16">Row</th>
                              <th className="p-3 font-black text-slate-400 uppercase tracking-wider">Training Details</th>
                              <th className="p-3 font-black text-slate-400 uppercase tracking-wider">Schedule & Venue</th>
                              <th className="p-3 font-black text-slate-400 uppercase tracking-wider">Department & Type</th>
                              <th className="p-3 font-black text-slate-400 uppercase tracking-wider text-right w-28">Validation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {parsedData.records.map((r: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50/40 dark:hover:bg-white/[0.02] transition-colors align-top">
                                <td className="p-3 font-bold text-slate-500">Row {r.index + 1}</td>
                                <td className="p-3 space-y-1">
                                  <div className="font-bold text-slate-900 dark:text-white leading-tight">{r.title}</div>
                                  {r.description && <div className="text-slate-400 text-[10px] line-clamp-1">{r.description}</div>}
                                  
                                  {/* Error/Warning List */}
                                  {r.errors.length > 0 && (
                                    <div className="mt-1.5 space-y-0.5">
                                      {r.errors.map((err: string, idx: number) => (
                                        <div key={idx} className="text-rose-500 font-bold text-[9px] flex items-center gap-1">
                                          <XCircle size={10} /> {err}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {r.warnings.length > 0 && (
                                    <div className="mt-1.5 space-y-0.5">
                                      {r.warnings.map((warn: string, idx: number) => (
                                        <div key={idx} className="text-amber-500 font-bold text-[9px] flex items-center gap-1">
                                          <AlertTriangle size={10} /> {warn}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 space-y-0.5">
                                  <div className="font-medium text-slate-700 dark:text-slate-300">{r.training_date} @ {r.start_time}</div>
                                  <div className="text-slate-400 text-[10px]">{r.mode} {r.venue ? `(${r.venue})` : ""}</div>
                                </td>
                                <td className="p-3 space-y-0.5">
                                  <div className="font-medium text-slate-700 dark:text-slate-300">{r.department}</div>
                                  <div className="text-slate-400 text-[10px]">{r.training_type} | {r.status}</div>
                                </td>
                                <td className="p-3 text-right">
                                  {r.errors.length > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[9px] font-bold">
                                      <XCircle size={10} /> Invalid
                                    </span>
                                  ) : r.warnings.length > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold">
                                      <AlertTriangle size={10} /> Duplicate
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                                      <CheckCircle size={10} /> Valid
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Submit Bar */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                      <Button 
                        onClick={resetImportState} 
                        variant="outline" 
                        className="h-10 rounded-xl font-bold text-xs border-slate-200 dark:border-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleConfirmImport}
                        disabled={isImporting || parsedData.summary.valid_records === 0}
                        className="h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 font-bold text-xs text-white shadow-lg shadow-brand-500/20 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isImporting && <Loader2 size={12} className="animate-spin" />}
                        Confirm Import ({parsedData.summary.valid_records} valid)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Import History Logs Tab */
              <div className="space-y-6 animate-in fade-in duration-300">
                {isHistoryLoading ? (
                  <div className="p-10 text-center">
                    <Loader2 className="animate-spin text-brand-600 dark:text-brand-400 mx-auto mb-2" size={24} />
                    <span className="text-slate-400 text-xs font-medium">Retrieving import audits...</span>
                  </div>
                ) : importHistory.length === 0 ? (
                  <div className="border border-slate-100 dark:border-white/5 rounded-2xl p-10 text-center">
                    <History size={32} className="text-slate-300 dark:text-white/10 mx-auto mb-3" />
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-0.5">No Import History Available</h4>
                    <p className="text-slate-400 text-xs font-medium">Logs of past bulk Excel uploads will appear here.</p>
                  </div>
                ) : (
                  <div className="border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto max-h-[45vh]">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                            <th className="p-3 font-black text-slate-400 uppercase tracking-wider">Date & Time</th>
                            <th className="p-3 font-black text-slate-400 uppercase tracking-wider">Filename</th>
                            <th className="p-3 font-black text-slate-400 uppercase tracking-wider">Imported By</th>
                            <th className="p-3 font-black text-slate-400 uppercase tracking-wider text-right w-24">Imported</th>
                            <th className="p-3 font-black text-slate-400 uppercase tracking-wider text-right w-24">Skipped</th>
                            <th className="p-3 font-black text-slate-400 uppercase tracking-wider text-right w-24">Failed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {importHistory.map((h: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/40 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                                {new Date(h.created_at || h.import_date).toLocaleString()}
                              </td>
                              <td className="p-3 font-bold text-slate-900 dark:text-white">{h.source_file || "Imported Spreadsheet"}</td>
                              <td className="p-3 text-slate-500">{h.imported_by_name || "System"}</td>
                              <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">{h.records_imported}</td>
                              <td className="p-3 text-right font-bold text-amber-500">{h.records_skipped}</td>
                              <td className="p-3 text-right font-bold text-rose-500">{h.records_failed}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}