import api from "@/lib/axios";
import type { 
  AnalyticsCharts, AnalyticsSummary, ApiResponse, 
  EmployeeDashboardData, ManagerDashboardData, AdminDashboardData,
  ManagerSummary, ManagerCharts, TeamDataResponse, PendingReviewRow, ManagerDashboardActivity,
  UnifiedManagerDashboard
} from "@/types";

export const analyticsService = {
  getSummary: () => api.get<ApiResponse<AnalyticsSummary>>("/analytics/summary"),
  getCharts: () => api.get<ApiResponse<AnalyticsCharts>>("/analytics/charts"),
  getEmployeeDashboard: () => api.get<ApiResponse<EmployeeDashboardData>>("/analytics/employee"),
  getManagerDashboard: () => api.get<ApiResponse<ManagerDashboardData>>("/analytics/manager"),
  getAdminDashboard: () => api.get<ApiResponse<AdminDashboardData>>("/analytics/admin"),
  
  // Manager Dashboard V2
  getManagerSummary: () => api.get<ApiResponse<ManagerSummary>>("/analytics/manager/dashboard/summary"),
  getManagerCharts: () => api.get<ApiResponse<ManagerCharts>>("/analytics/manager/dashboard/charts"),
  getManagerTeam: (page: number = 1, limit: number = 10) => 
    api.get<ApiResponse<TeamDataResponse>>(`/analytics/manager/dashboard/team?page=${page}&limit=${limit}`),
  getManagerActivity: () => api.get<ApiResponse<ManagerDashboardActivity[]>>("/analytics/manager/dashboard/activity"),
  getManagerPendingReviews: () => api.get<ApiResponse<PendingReviewRow[]>>("/analytics/manager/dashboard/pending-reviews"),
  getUnifiedManagerDashboard: () => api.get<ApiResponse<UnifiedManagerDashboard>>("/analytics/manager/dashboard/unified"),
  getTeamAnalytics: (params?: any) => api.get<ApiResponse<any>>("/analytics/team", { params }),
  exportTeamKpiReport: (params?: any) =>
    api.get("/analytics/team/kpi-export", {
      params,
      responseType: "blob",
    }),
};


