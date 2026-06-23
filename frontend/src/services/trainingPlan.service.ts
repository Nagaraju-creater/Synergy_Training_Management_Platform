import api from "@/lib/axios";
import type { ApiResponse, TrainingPlan, TrainingPlanStats, Training } from "@/types";

export const trainingPlanService = {
  list: (financialYear?: string, filters?: any) =>
    api.get<ApiResponse<TrainingPlan[]>>("/training-plans/", {
      params: { financial_year: financialYear, ...filters },
    }),

  getStats: (financialYear: string) =>
    api.get<ApiResponse<TrainingPlanStats>>("/training-plans/stats", {
      params: { financial_year: financialYear },
    }),

  create: (payload: Partial<TrainingPlan>) =>
    api.post<ApiResponse<TrainingPlan>>("/training-plans/", payload),

  update: (id: string, payload: Partial<TrainingPlan>) =>
    api.patch<ApiResponse<TrainingPlan>>(`/training-plans/${id}`, payload),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/training-plans/${id}`),

  convert: (id: string, payload: Partial<Training>) =>
    api.post<ApiResponse<TrainingPlan>>(`/training-plans/${id}/convert`, payload),
};
