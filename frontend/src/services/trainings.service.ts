import api from "@/lib/axios";
import type { ApiResponse, PaginatedResponse, Training } from "@/types";

export const trainingsService = {
  list: (page = 1, perPage = 20, filters?: any) =>
    api.get<PaginatedResponse<Training>>("/trainings/", {
      params: { page, per_page: perPage, ...filters },
    }),

  getById: (id: string) => api.get<ApiResponse<Training>>(`/trainings/${id}`),

  create: (payload: Partial<Training>) =>
    api.post<ApiResponse<Training>>("/trainings/", payload),

  update: (id: string, payload: Partial<Training>) =>
    api.patch<ApiResponse<Training>>(`/trainings/${id}`, payload),

  archive: (id: string) => api.post(`/trainings/${id}/archive`),

  delete: (id: string) => api.delete(`/trainings/${id}`),

  listCategories: () => api.get<PaginatedResponse<any>>("/trainings/categories"),

  uploadDocument: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/trainings/${id}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },

  exportExcel: () =>
    api.get("/reports/export/excel", { responseType: "blob" }),

  downloadTemplate: () =>
    api.get("/trainings/import/template", { responseType: "blob" }),

  parseImportFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<ApiResponse<any>>("/trainings/import/parse", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  confirmImport: (records: any[], duplicateStrategy: string) =>
    api.post<ApiResponse<any>>("/trainings/import/confirm", {
      records,
      duplicate_strategy: duplicateStrategy,
    }),

  downloadMasterTemplate: () =>
    api.get("/trainings/import/master-template", { responseType: "blob" }),

  parseMasterFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<ApiResponse<any>>("/trainings/import/master-parse", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  confirmMasterImport: (sheets: Record<string, any[]>, duplicateStrategy: string) =>
    api.post<ApiResponse<any>>("/trainings/import/master-confirm", {
      sheets,
      duplicate_strategy: duplicateStrategy,
    }),

  getImportHistory: () =>
    api.get<ApiResponse<any[]>>("/trainings/import/history"),
};
