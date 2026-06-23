import api from "@/lib/axios";
import type { Nomination, PaginatedResponse } from "@/types";

export const nominationsService = {
  /** Employee: returns only the authenticated employee's own nominations */
  listMy: (page = 1, perPage = 20) =>
    api.get<PaginatedResponse<Nomination>>("/nominations/my", {
      params: { page, per_page: perPage },
    }),

  /** Manager: returns only nominations where manager_id == current user */
  listTeam: (page = 1, perPage = 20) =>
    api.get<PaginatedResponse<Nomination>>("/nominations/team", {
      params: { page, per_page: perPage },
    }),

  /** Admin: returns all nominations in the system */
  listAll: (page = 1, perPage = 20) =>
    api.get<PaginatedResponse<Nomination>>("/nominations/", {
      params: { page, per_page: perPage },
    }),

  /** Kept for backwards-compat — prefer the role-specific methods above */
  list: (page = 1, perPage = 20) =>
    api.get<PaginatedResponse<Nomination>>("/nominations/", {
      params: { page, per_page: perPage },
    }),

  create: (data: any) => api.post("/nominations/", data),

  review: (id: string, data: any) => api.patch(`/nominations/${id}/review`, data),
};
