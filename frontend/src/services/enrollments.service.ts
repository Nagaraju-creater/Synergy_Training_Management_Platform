import api from "@/lib/axios";
import type { Enrollment, PaginatedResponse } from "@/types";

export const enrollmentsService = {
  list: (page = 1, perPage = 10, params?: any) =>
    api.get<PaginatedResponse<Enrollment>>("/enrollments/", {
      params: { page, per_page: perPage, ...params },
    }),

  getById: (id: string) => api.get<Enrollment>(`/enrollments/${id}`),

  enroll: (trainingId: string, employeeId: string) =>
    api.post("/enrollments/", { training_id: trainingId, employee_id: employeeId }),

  cancel: (id: string, reason: string) => api.post(`/enrollments/${id}/cancel`, { reason }),

  update: (id: string, data: any) => api.patch(`/enrollments/${id}`, data),

  listByTraining: (trainingId: string) =>
    api.get<PaginatedResponse<Enrollment>>("/enrollments/", {
      params: { training_id: trainingId, per_page: 100 },
    }),
};
