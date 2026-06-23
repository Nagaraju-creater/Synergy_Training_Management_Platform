/**
 * TrainingLifecycleBadge
 * ─────────────────────
 * A self-updating badge that computes and displays real-time lifecycle status
 * for a training. Internally schedules a re-render whenever the status changes
 * (e.g. enrollment deadline passes, session starts, session ends).
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, CheckCircle2, CalendarClock,
  XCircle, Hourglass, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Training } from "@/types";
import { computeLifecycle, formatCountdown, type LifecycleMeta } from "@/utils/trainingLifecycle";

// ── Per-status visual config ────────────────────────────────────────────────
const STATUS_CONFIG = {
  scheduled: {
    icon: CalendarClock,
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
    live: false,
  },
  enrollment_open: {
    icon: CheckCircle2,
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
    live: false,
  },
  enrollment_closed: {
    icon: AlertCircle,
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
    live: false,
  },
  attendance_ready: {
    icon: Hourglass,
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
    live: true,
  },
  ongoing: {
    icon: Radio,
    bg: "bg-orange-500/10 dark:bg-orange-500/15",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-500/20",
    dot: "bg-orange-500",
    live: true,
  },
  completed: {
    icon: CheckCircle2,
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
    live: false,
  },
  cancelled: {
    icon: XCircle,
    bg: "bg-red-500/10 dark:bg-red-500/15",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-500/20",
    dot: "bg-red-500",
    live: false,
  },
} as const;

// ── Hook: real-time lifecycle ────────────────────────────────────────────────
function useLifecycle(training: Training): LifecycleMeta {
  // Always use the client's local clock as "now".
  // server_time is a naive UTC datetime — if interpreted as local time it drifts
  // by the user's UTC offset (e.g. IST = UTC+5:30 → 5.5h drift), which would
  // cause enrollment to appear open/closed at the wrong time.
  const [now, setNow] = useState(() => new Date());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meta = computeLifecycle(training, now);

  useEffect(() => {
    // Clear any previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    if (meta.msUntilNext !== null && meta.msUntilNext > 0) {
      // Schedule a re-render exactly when status should change
      // Cap at ~24.8 days to prevent 32-bit int overflow in setTimeout
      const maxTimeout = 2147483647;
      const delay = Math.min(meta.msUntilNext, maxTimeout);
      timerRef.current = setTimeout(() => setNow(new Date()), delay);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [meta.status, meta.msUntilNext]);

  // For countdowns — update every minute
  useEffect(() => {
    if (!["scheduled", "enrollment_open", "attendance_ready"].includes(meta.status)) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [meta.status]);

  return meta;
}

// ── Badge sizes ──────────────────────────────────────────────────────────────
type BadgeSize = "xs" | "sm" | "md";

interface Props {
  training: Training;
  size?: BadgeSize;
  showCountdown?: boolean;
  className?: string;
}

export function TrainingLifecycleBadge({
  training,
  size = "sm",
  showCountdown = false,
  className,
}: Props) {
  const meta = useLifecycle(training);
  const config = STATUS_CONFIG[meta.status];
  const Icon = config.icon;

  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.5 gap-1 rounded-md",
    sm: "text-[10px] px-2 py-1 gap-1.5 rounded-lg",
    md: "text-xs px-3 py-1.5 gap-2 rounded-xl",
  };

  const iconSize = { xs: 10, sm: 11, md: 13 }[size];
  const dotSize = { xs: "w-1 h-1", sm: "w-1.5 h-1.5", md: "w-2 h-2" }[size];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={meta.status}
        initial={{ opacity: 0, scale: 0.85, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 4 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn(
          "inline-flex items-center font-black uppercase tracking-widest border select-none",
          config.bg,
          config.text,
          config.border,
          sizeClasses[size],
          className
        )}
      >
        {/* Live pulse dot */}
        {config.live ? (
          <span className="relative flex shrink-0">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                config.dot
              )}
            />
            <span className={cn("relative inline-flex rounded-full", dotSize, config.dot)} />
          </span>
        ) : (
          <Icon size={iconSize} className="shrink-0" />
        )}

        <span>{meta.label}</span>

        {/* Optional countdown */}
        {showCountdown && meta.countdownMs !== null && meta.countdownMs > 0 && (
          <span className="opacity-60 font-bold normal-case tracking-normal">
            · {formatCountdown(meta.countdownMs)}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Re-export hook for custom consumers
export { useLifecycle };
