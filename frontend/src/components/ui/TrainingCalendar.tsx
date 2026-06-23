import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, LayoutGroup } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
  User as UserIcon, Video, Building2, CalendarDays, Sparkles,
  Radio, CheckCircle2, AlertCircle, Hourglass, XCircle, CalendarClock,
} from "lucide-react";
import { trainingsService } from "@/services/trainings.service";
import { Badge } from "@/components/ui/Badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipArrow } from "@/components/ui/Tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import type { Training } from "@/types";
import { formatDate } from "@/utils/formatters";
import { computeLifecycle, formatCountdown } from "@/utils/trainingLifecycle";

// ── Lifecycle visual config ─────────────────────────────────────────────────
const LC_CONFIG = {
  scheduled:         { icon: CalendarClock, bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",   border: "border-blue-500/20",   pill: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",   accent: "bg-blue-500",   header: "bg-blue-500",   live: false },
  enrollment_open:   { icon: CheckCircle2,  bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",   border: "border-blue-500/20",   pill: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",   accent: "bg-blue-500",   header: "bg-blue-500",   live: false },
  enrollment_closed: { icon: AlertCircle,   bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",   border: "border-blue-500/20",   pill: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",   accent: "bg-blue-500",   header: "bg-blue-500",   live: false },
  attendance_ready:  { icon: Hourglass,     bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",   border: "border-blue-500/20",   pill: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",   accent: "bg-blue-500",   header: "bg-blue-500",   live: true  },
  ongoing:           { icon: Radio,         bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20", pill: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20", accent: "bg-orange-500", header: "bg-orange-500", live: true },
  completed:         { icon: CheckCircle2,  bg: "bg-emerald-500/10",text: "text-emerald-600 dark:text-emerald-400",border: "border-emerald-500/20",pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",accent: "bg-emerald-500",header: "bg-emerald-500",live: false },
  cancelled:         { icon: XCircle,       bg: "bg-red-500/10",    text: "text-red-600 dark:text-red-400",     border: "border-red-500/20",    pill: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",     accent: "bg-red-500",    header: "bg-red-500",    live: false },
} as const;



// ── Calendar day highlight based on lifecycle ───────────────────────────────
function getDayHighlight(trainings: Training[], now: Date) {
  if (!trainings.length) return null;
  // Priority: ongoing > attendance_ready > enrollment_closed > scheduled
  const statuses = trainings.map(t => computeLifecycle(t, now).status);
  if (statuses.includes("ongoing")) return "ring-2 ring-emerald-400/60 bg-emerald-50/20 dark:bg-emerald-500/5";
  if (statuses.includes("attendance_ready")) return "ring-2 ring-purple-400/60 bg-purple-50/20 dark:bg-purple-500/5";
  if (statuses.includes("enrollment_closed")) return "ring-1 ring-amber-400/40 bg-amber-50/10 dark:bg-amber-500/5";
  return null;
}

// ── Rich Tooltip Card ────────────────────────────────────────────────────────
const TrainingHoverCard = ({ training, now }: { training: Training; now: Date }) => {
  const meta = computeLifecycle(training, now);
  const cfg = LC_CONFIG[meta.status];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="w-full sm:w-[560px] max-w-[95vw] sm:max-w-none mx-auto mb-4 sm:mb-0 max-h-[85vh] sm:max-h-[none] overflow-y-auto overflow-x-hidden sm:overflow-hidden custom-scrollbar bg-white/95 dark:bg-[#1e293b]/98 backdrop-blur-3xl border border-slate-200/60 dark:border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] rounded-[28px] pointer-events-auto ring-1 ring-black/5 flex flex-col"
    >
      {/* Status color bar */}
      <div className={cn("h-1.5 w-full", cfg.header)} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={training.is_mandatory ? "warning" : "secondary"} className="text-[9px] h-4.5 font-black tracking-widest rounded-md px-2">
                {training.is_mandatory ? "MANDATORY" : "OPTIONAL"}
              </Badge>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{training.training_type || "INTERNAL"}</span>
            </div>
            <h4 className="font-black text-xl leading-tight text-slate-900 dark:text-white">{training.title}</h4>
          </div>
          {/* Lifecycle badge */}
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest shrink-0",
            cfg.bg, cfg.text, cfg.border
          )}>
            {cfg.live ? (
              <span className="relative flex w-1.5 h-1.5">
                <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", cfg.accent)} />
                <span className={cn("relative inline-flex rounded-full w-1.5 h-1.5", cfg.accent)} />
              </span>
            ) : <Icon size={11} />}
            {meta.label}
          </div>
        </div>

        {/* Sub-label / countdown */}
        <div className={cn("flex items-center gap-2 text-[11px] font-bold px-3 py-2 rounded-xl", cfg.bg, cfg.text)}>
          <Icon size={12} />
          <span>{meta.subLabel}</span>
          {meta.countdownMs !== null && meta.countdownMs > 0 && (
            <span className="ml-auto font-black">{formatCountdown(meta.countdownMs)}</span>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
          {[
            { icon: UserIcon,    label: "Trainer",  value: training.trainer_name || "Internal Expert" },
            { icon: CalendarDays,label: "Date",     value: training.start_date ? formatDate(training.start_date) : "TBD" },
            { icon: Clock,       label: "Schedule", value: `${training.start_time || "TBD"} · ${training.duration_hours}h` },
            {
              icon: training.delivery_mode === "online" ? Video : Building2,
              label: "Venue",
              value: `${training.delivery_mode || "in_person"} · ${training.venue || "HQ"}`,
            },
          ].map(({ icon: Ic, label, value }) => (
            <div key={label} className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center text-brand-500 shadow-sm border border-slate-100 dark:border-transparent shrink-0">
                <Ic size={14} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 capitalize">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Enrollment deadline */}
        {training.enrollment_deadline && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
            <Clock size={11} />
            <span>Enrollment deadline: <span className="text-slate-600 dark:text-slate-300">{formatDate(training.enrollment_deadline)}</span></span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Calendar helpers ─────────────────────────────────────────────────────────
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Main Component ───────────────────────────────────────────────────────────
export function TrainingCalendar({ compact = false }: { compact?: boolean }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(() => new Date());

  // Tick every minute so live statuses update
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data: trainingsResp, isLoading } = useQuery({
    queryKey: ["calendar-trainings"],
    queryFn: () => trainingsService.list(1, 100),
    select: (res) => res.data.data,
    refetchInterval: 5 * 60_000, // refresh every 5 mins
    staleTime: 2 * 60_000,
  });

  const trainings = trainingsResp || [];
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday   = () => setCurrentDate(new Date());

  const blanks = Array(getFirstDayOfMonth(year, month)).fill(null);
  const days   = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);

  const trainingsByDate = useMemo(() => {
    return (trainings || []).reduce((acc, t) => {
      if (t.start_date) {
        const key = t.start_date.split(/[\sT]/)[0];
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
      }
      return acc;
    }, {} as Record<string, Training[]>);
  }, [trainings]);

  const isToday = useCallback((d: number) => {
    const t = new Date();
    return d === t.getDate() && month === t.getMonth() && year === t.getFullYear();
  }, [month, year]);

  const hasSomething = days.some(d =>
    trainingsByDate[`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`]?.length
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("relative group/calendar w-full")}>
        <LayoutGroup>
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between mb-4 bg-white/50 dark:bg-white/[0.02] p-3 rounded-[20px] border border-slate-200/60 dark:border-white/5 shadow-sm",
            compact && "mb-2 p-1.5"
          )}>
            <div className="flex items-center gap-3 pl-2">
              {!compact && (
                <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <CalendarIcon size={18} />
                </div>
              )}
              <div>
                <h3 className={cn("text-base font-black text-slate-900 dark:text-white leading-none tracking-tight", compact && "text-xs")}>
                  {MONTHS[month]} <span className="text-brand-500 font-bold ml-1">{year}</span>
                </h3>
                {!compact && (
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    Live Training Schedule
                  </p>
                )}
              </div>
            </div>

            {/* Legend (non-compact) */}
            {!compact && (
              <div className="hidden lg:flex items-center gap-3 mr-auto ml-6">
                {([
                  ["bg-blue-500",   "Scheduled"],
                  ["bg-orange-500",  "Ongoing"],
                  ["bg-emerald-500", "Completed"],
                ] as [string, string][]).map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", color)} />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={cn("flex items-center gap-1.5 bg-slate-100/50 dark:bg-white/5 p-1.5 rounded-xl border border-slate-200/50 dark:border-white/10", compact && "gap-1 p-1")}>
              <button onClick={prevMonth} className={cn("p-2 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-all text-slate-400 hover:text-brand-500 shadow-sm active:scale-95", compact && "p-1")}>
                <ChevronLeft size={compact ? 12 : 16} />
              </button>
              <button onClick={goToday} className={cn("text-[10px] font-black px-4 py-2 hover:bg-brand-500 hover:text-white bg-white dark:bg-white/5 rounded-lg transition-all uppercase tracking-widest text-slate-500 shadow-sm active:scale-95", compact && "px-2 py-1 text-[8px]")}>
                {compact ? "Now" : "Today"}
              </button>
              <button onClick={nextMonth} className={cn("p-2 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-all text-slate-400 hover:text-brand-500 shadow-sm active:scale-95", compact && "p-1")}>
                <ChevronRight size={compact ? 12 : 16} />
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className={cn(
            "bg-white dark:bg-[#111827] border border-slate-200/60 dark:border-white/5 rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.04)]",
            compact && "rounded-2xl shadow-none"
          )}>
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-200/50 dark:border-white/5">
              {DAYS.map(day => (
                <div key={day} className={cn("py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400", compact && "py-1.5 text-[8px]")}>
                  {compact ? day.charAt(0) : day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-slate-100/50 dark:bg-white/5">
              {blanks.map((_, i) => (
                <div key={`blank-${i}`} className={cn("h-24 lg:h-28 bg-slate-50/30 dark:bg-transparent opacity-40", compact && "h-11")} />
              ))}

              {days.map(d => {
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const dayTrainings = trainingsByDate[dateStr] || [];
                const today = isToday(d);
                const highlight = getDayHighlight(dayTrainings, now);

                return (
                  <div
                    key={d}
                    className={cn(
                      "relative flex flex-col bg-white dark:bg-[#111827] transition-all group/day",
                      compact ? "h-24" : "h-24 lg:h-28",
                      today && "bg-brand-50/20 dark:bg-brand-500/[0.03]",
                      highlight
                    )}
                  >
                    {/* Day number */}
                    <div className={cn("flex justify-between items-start p-2.5", compact && "p-1.5")}>
                      <span className={cn(
                        "text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg transition-all",
                        today
                          ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-110"
                          : "text-slate-300 group-hover/day:text-slate-600 dark:group-hover/day:text-slate-400",
                        compact && "w-4 h-4 text-[9px] rounded-md"
                      )}>
                        {d}
                      </span>
                      {dayTrainings.length > 0 && compact && (
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                      )}
                    </div>

                    {/* Event pills */}
                    <div className="flex-1 flex flex-col gap-1 px-1.5 pb-1.5 overflow-hidden">
                      {dayTrainings.slice(0, 2).map(t => {
                        const meta = computeLifecycle(t, now);
                        const cfg = LC_CONFIG[meta.status];
                        return (
                          <Sheet key={t.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SheetTrigger asChild>
                                  <motion.div
                                    layoutId={`pill-${t.id}`}
                                    className={cn(
                                      "cursor-pointer text-[9px] font-bold px-1.5 py-1 rounded-lg border transition-all hover:scale-[1.03] active:scale-95 shadow-sm flex items-center gap-1.5 overflow-hidden leading-tight",
                                      cfg.pill
                                    )}
                                  >
                                    {/* Status dot / live pulse */}
                                    {cfg.live ? (
                                      <span className="relative flex shrink-0 w-1.5 h-1.5">
                                        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", cfg.accent)} />
                                        <span className={cn("relative inline-flex rounded-full w-1.5 h-1.5", cfg.accent)} />
                                      </span>
                                    ) : (
                                      <div className={cn("w-1 h-2.5 rounded-full shrink-0", cfg.accent)} />
                                    )}
                                    <span className="line-clamp-2 whitespace-normal flex-1">{t.title}</span>
                                  </motion.div>
                                </SheetTrigger>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                align="center"
                                sideOffset={12}
                                collisionPadding={20}
                                className="hidden sm:block p-0 border-none bg-transparent shadow-none z-[100] max-w-[600px]"
                              >
                                <TrainingHoverCard training={t} now={now} />
                                <TooltipArrow className="fill-white dark:fill-[#1e293b]" />
                              </TooltipContent>
                            </Tooltip>
                            <SheetContent side="bottom" className="sm:hidden p-0 border-none bg-transparent shadow-none max-w-[100vw]">
                              <TrainingHoverCard training={t} now={now} />
                            </SheetContent>
                          </Sheet>
                        );
                      })}

                      {dayTrainings.length > 2 && (
                        <button className="text-[9px] font-black text-slate-400 hover:text-brand-500 uppercase tracking-tighter pt-0.5 flex items-center justify-center gap-1 transition-colors">
                          +{dayTrainings.length - 2} <ChevronRight size={9} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </LayoutGroup>

        {/* Empty state */}
        {!isLoading && !compact && !hasSomething && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 bg-white/10 backdrop-blur-[2px]">
            <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-2xl mb-4">
              <Sparkles size={32} className="text-brand-500 animate-pulse" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 bg-white/80 dark:bg-slate-900/80 px-4 py-2 rounded-full border border-slate-200 dark:border-white/10">
              Schedule Empty
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
