import api from "@/lib/axios";

export const attendanceService = {
  markAttendance: (data: { training_id: string; device_info?: string; ip_address?: string }) =>
    api.post("/attendance/mark", data),

  getMyAttendance: () =>
    api.get("/attendance/me"),

  getAttendanceSession: (trainingId: string) =>
    api.get(`/attendance/session/${trainingId}`),

  getActiveSession: () =>
    api.get("/attendance/me/active"),

  getUpcomingSessions: () =>
    api.get("/attendance/me/upcoming"),

  listAttendance: (params: any) =>
    api.get("/attendance", { params }),

  getAnalytics: (params: any) =>
    api.get("/attendance/analytics", { params }),

  // ── Admin real-time dashboard endpoints ──────────────────────────────────
  getAdminSummary: (params?: {
    employee_id?: string;
    training_id?: string;
    department_id?: string;
    status?: string;
    financial_year?: string;
    start_date?: string;
    end_date?: string;
  }) => api.get("/attendance/admin/summary", { params }),

  getLiveSessions: () =>
    api.get("/attendance/admin/live-sessions"),

  getAdminLogs: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    employee_id?: string;
    department_id?: string;
    training_id?: string;
    start_date?: string;
    end_date?: string;
    financial_year?: string;
  }) => api.get("/attendance/admin/logs", { params }),

  // ── Shareable Attendance Link endpoints ─────────────────────────
  getPublicSessionDetails: (sessionId: string) =>
    api.get(`/attendance/session-link/${sessionId}`),

  submitPublicAttendance: (sessionId: string, data: {
    submitted_by?: string;
    records: { employee_id: string; status: string }[];
  }) =>
    api.post(`/attendance/session-link/${sessionId}/submit`, data),
};
