import api from "@/lib/axios";
import type { Department, PaginatedResponse, ApiResponse, DepartmentAnalyticsData } from "@/types";

export const departmentsService = {
  list: async (params?: { page?: number; per_page?: number; search?: string }) => {
    return api.get<PaginatedResponse<Department>>("/departments/", { params });
  },

  get: async (id: string) => {
    return api.get<ApiResponse<Department>>(`/departments/${id}`);
  },

  create: async (data: Partial<Department>) => {
    return api.post<ApiResponse<Department>>("/departments/", data);
  },

  update: async (id: string, data: Partial<Department>) => {
    return api.patch<ApiResponse<Department>>(`/departments/${id}`, data);
  },

  delete: async (id: string) => {
    return api.delete(`/departments/${id}`);
  },

  getAnalytics: async (id: string) => {
    return api.get<ApiResponse<DepartmentAnalyticsData[]>>(`/departments/${id}/analytics`);
  },
};
