import api from "@/lib/axios";
import type { Effectiveness, PaginatedResponse, ApiResponse } from "@/types";

export interface EffectivenessStats {
  total_pending: number;
  total_submitted: number;
  total_reviewed: number;
  total_overdue: number;
  due_today: number;
  completion_percentage: number;
  total: number;
}

export const effectivenessService = {
  list: (page = 1, perPage = 20, filters = {}) =>
    api.get<PaginatedResponse<Effectiveness>>("/effectiveness/", {
      params: { page, per_page: perPage, ...filters },
    }),

  getById: (id: string) =>
    api.get<ApiResponse<Effectiveness>>(`/effectiveness/${id}`),

  submit: (payload: any) =>
    api.post<ApiResponse<Effectiveness>>("/effectiveness/", payload),

  update: (id: string, payload: any) =>
    api.patch<ApiResponse<Effectiveness>>(`/effectiveness/${id}`, payload),

  review: (id: string, payload: any) =>
    api.post<ApiResponse<Effectiveness>>(`/effectiveness/${id}/review`, payload),

  getStats: () =>
    api.get<ApiResponse<EffectivenessStats>>("/effectiveness/stats"),

  uploadSignature: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<ApiResponse<{ url: string }>>("/effectiveness/signature", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
};
