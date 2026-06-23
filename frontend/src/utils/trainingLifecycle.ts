import type { Training } from "@/types";

export type LifecycleStatus =
  | "scheduled"
  | "enrollment_open"
  | "enrollment_closed"
  | "attendance_ready"
  | "ongoing"
  | "completed"
  | "cancelled";

export interface LifecycleMeta {
  status: LifecycleStatus;
  label: string;
  subLabel: string;
  /** Tailwind color key used by the calendar */
  color: "blue" | "amber" | "purple" | "green" | "gray" | "red" | "emerald" | "orange";
  /** ms until status changes — used to schedule a re-render */
  msUntilNext: number | null;
  canEnroll: boolean;
  countdownMs: number | null;
}

/**
 * Computes the real-time lifecycle status of a training from its dates/times.
 * Always call with `now = new Date()` so callers can control time for testing.
 */
export function computeLifecycle(training: Training, now: Date): LifecycleMeta {
  // ── Cancelled fast-path ────────────────────────────────────────────────────
  if (training.status === "cancelled") {
    return {
      status: "cancelled",
      label: "Cancelled",
      subLabel: "This session was cancelled",
      color: "red",
      msUntilNext: null,
      canEnroll: false,
      countdownMs: null,
    };
  }

  const nowMs = now.getTime();

  const parseDate = (d?: string | null): Date | null => {
    if (!d) return null;
    
    // Explicitly construct local datetimes to avoid UTC offset bugs
    if (d.includes('T')) {
      const [datePart, timePart] = d.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(val => parseInt(val, 10) || 0);
      return new Date(year, month - 1, day, hours, minutes, seconds, 0);
    }
    
    // Date-only string fallback
    const [year, month, day] = d.split('-').map(Number);
    if (year && month && day) return new Date(year, month - 1, day, 0, 0, 0, 0);
    
    return null;
  };

  const parseEnrollDeadline = (d?: string | null): Date | null => {
    if (!d) return null;
    
    // Explicitly construct local datetimes to avoid UTC offset bugs
    if (d.includes('T')) {
      const [datePart, timePart] = d.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(val => parseInt(val, 10) || 0);
      return new Date(year, month - 1, day, hours, minutes, seconds, 0);
    }
    
    // Date-only string fallback -> assume 23:59:00 local
    const parts = d.split('-').map(Number);
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year && month && day) {
        return new Date(year, month - 1, day, 23, 59, 0, 0);
      }
    }
    return null;
  };

  const enrollDeadline = parseEnrollDeadline(training.enrollment_deadline);
  const startDate = parseDate(training.start_date);
  const endDate = parseDate(training.end_date);

  if (enrollDeadline) {
    const isClosed = nowMs >= enrollDeadline.getTime();
    console.log("NOW", now);
    console.log("DEADLINE", enrollDeadline);
    console.log("CLOSED", isClosed);
  }

  // Build start datetime
  let startDatetime: Date | null = null;
  if (startDate) {
    if (training.start_time) {
      const timeStr = training.start_time.toLowerCase();
      let h = 0, m = 0;
      if (timeStr.includes('am') || timeStr.includes('pm')) {
        const [timePart, ampm] = timeStr.split(' ');
        const [hStr, mStr] = timePart.split(':');
        h = parseInt(hStr, 10);
        m = parseInt(mStr, 10);
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
      } else {
        const [hStr, mStr] = timeStr.split(':');
        h = parseInt(hStr, 10);
        m = parseInt(mStr, 10);
      }
      startDatetime = new Date(startDate);
      startDatetime.setHours(h, m, 0, 0);
    } else {
      startDatetime = new Date(startDate);
      startDatetime.setHours(0, 0, 0, 0);
    }
  }

  // Build end datetime
  let endDatetime: Date | null = null;
  if (endDate) {
    endDatetime = new Date(endDate);
    endDatetime.setHours(23, 59, 59, 999);
  } else if (startDatetime && training.duration_hours) {
    endDatetime = new Date(startDatetime.getTime() + training.duration_hours * 3_600_000);
  }

  const getMsUntil = (target: Date | null) => (target && target.getTime() > nowMs ? target.getTime() - nowMs : null);

  const msUntilDeadline = getMsUntil(enrollDeadline);
  const msUntilStart = getMsUntil(startDatetime);
  const msUntilEnd = getMsUntil(endDatetime);

  // Helper to find the next state transition
  const getNextTransition = (options: (number | null)[]) => {
    const valid = options.filter((x): x is number => x !== null && x > 0);
    return valid.length > 0 ? Math.min(...valid) : null;
  };

  // 1. COMPLETED: now > training end
  if (endDatetime && nowMs > endDatetime.getTime()) {
    return {
      status: "completed",
      label: "Completed",
      subLabel: "Training has ended",
      color: "emerald",
      msUntilNext: null,
      canEnroll: false,
      countdownMs: null,
    };
  }

  // 2. ONGOING: training start <= now <= training end
  if (startDatetime && nowMs >= startDatetime.getTime()) {
    return {
      status: "ongoing",
      label: "Ongoing",
      subLabel: "Session in progress",
      color: "orange",
      msUntilNext: msUntilEnd,
      canEnroll: false,
      countdownMs: null,
    };
  }

  // 3. ATTENDANCE READY: within 30 mins of training start
  if (startDatetime && nowMs >= startDatetime.getTime() - 30 * 60_000 && nowMs < startDatetime.getTime()) {
    return {
      status: "attendance_ready",
      label: "Attendance Ready",
      subLabel: "Starting soon",
      color: "blue",
      msUntilNext: msUntilStart,
      canEnroll: false,
      countdownMs: msUntilStart,
    };
  }

  // 4. ENROLLMENT CLOSED: now >= enrollmentDeadlineDateTime
  if (enrollDeadline && nowMs >= enrollDeadline.getTime()) {
    // If we're within 30 mins, it's already caught by ATTENDANCE_READY.
    // Transition to ATTENDANCE_READY when it hits 30 mins before start.
    const attendanceReadyTime = startDatetime ? new Date(startDatetime.getTime() - 30 * 60_000) : null;
    const msUntilAttendance = getMsUntil(attendanceReadyTime);

    return {
      status: "enrollment_closed",
      label: "Enrollment Closed",
      subLabel: "Deadline has passed",
      color: "blue",
      msUntilNext: getNextTransition([msUntilAttendance, msUntilStart]),
      canEnroll: false,
      countdownMs: null,
    };
  }

  // 5. ENROLLMENT OPEN: now < enrollmentDeadlineDateTime
  if (enrollDeadline && nowMs < enrollDeadline.getTime()) {
    return {
      status: "enrollment_open",
      label: "Enrollment Open",
      subLabel: "Enrollment is active",
      color: "blue",
      msUntilNext: msUntilDeadline,
      canEnroll: true,
      countdownMs: msUntilDeadline,
    };
  }

  // 6. SCHEDULED: fallback (e.g. no deadline)
  return {
    status: "scheduled",
    label: "Scheduled",
    subLabel: "Upcoming training",
    color: "blue",
    msUntilNext: getNextTransition([msUntilStart]),
    canEnroll: true,
    countdownMs: msUntilStart,
  };
}

/** Formats a countdown in milliseconds to human-readable "X h Y m" */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Now";
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

