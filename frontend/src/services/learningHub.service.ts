import api from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types";
import type { 
  LearningCategory, 
  LearningModule, 
  LearningMaterial, 
  LearningHubAnalytics 
} from "@/types/learningHub";

export const learningHubService = {
  // Categories
  listCategories: () => 
    api.get<ApiResponse<LearningCategory[]>>("/learning-hub/categories"),

  createCategory: (name: string, description?: string) => 
    api.post<ApiResponse<LearningCategory>>("/learning-hub/categories", { name, description }),

  updateCategory: (id: string, name: string, description?: string) => 
    api.put<ApiResponse<LearningCategory>>(`/learning-hub/categories/${id}`, { name, description }),

  deleteCategory: (id: string) => 
    api.delete(`/learning-hub/categories/${id}`),

  // Modules
  listModules: (page = 1, perPage = 20, filters?: any) =>
    api.get<PaginatedResponse<LearningModule>>("/learning-hub/modules", {
      params: { page, per_page: perPage, ...filters },
    }),

  getModule: (id: string) => 
    api.get<ApiResponse<LearningModule>>(`/learning-hub/modules/${id}`),

  createModule: (payload: { title: string; description?: string; category_id?: string; department_id?: string; training_id?: string }) =>
    api.post<ApiResponse<LearningModule>>("/learning-hub/modules", payload),

  updateModule: (id: string, payload: { title?: string; description?: string; category_id?: string; department_id?: string | null; training_id?: string | null }) =>
    api.put<ApiResponse<LearningModule>>(`/learning-hub/modules/${id}`, payload),

  deleteModule: (id: string) => 
    api.delete(`/learning-hub/modules/${id}`),

  // Materials
  addMaterial: (payload: { module_id: string; title: string; description?: string; external_url?: string; tags?: string; file?: File }) => {
    const formData = new FormData();
    formData.append("module_id", payload.module_id);
    formData.append("title", payload.title);
    if (payload.description) formData.append("description", payload.description);
    if (payload.external_url) formData.append("external_url", payload.external_url);
    if (payload.tags) formData.append("tags", payload.tags);
    if (payload.file) formData.append("file", payload.file);

    return api.post<ApiResponse<LearningMaterial>>("/learning-hub/materials", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  updateMaterial: (id: string, payload: { title?: string; description?: string; external_url?: string; tags?: string; is_approved?: boolean; file?: File }) => {
    const formData = new FormData();
    if (payload.title) formData.append("title", payload.title);
    if (payload.description !== undefined) formData.append("description", payload.description || "");
    if (payload.external_url !== undefined) formData.append("external_url", payload.external_url || "");
    if (payload.tags !== undefined) formData.append("tags", payload.tags || "");
    if (payload.is_approved !== undefined) formData.append("is_approved", String(payload.is_approved));
    if (payload.file) formData.append("file", payload.file);

    return api.put<ApiResponse<LearningMaterial>>(`/learning-hub/materials/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteMaterial: (id: string) => 
    api.delete(`/learning-hub/materials/${id}`),

  trackView: (id: string) => 
    api.post<ApiResponse<void>>(`/learning-hub/materials/${id}/view`),

  // Analytics
  getAnalytics: () => 
    api.get<ApiResponse<LearningHubAnalytics>>("/learning-hub/analytics"),

  // Admin: Sync modules for existing trainings
  syncModules: () =>
    api.post<ApiResponse<{ modules_created: number }>>("/learning-hub/sync-modules"),

  // Quick Filters & Bookmarks
  getQuickFilterCounts: () =>
    api.get<ApiResponse<{ my_modules: number; recent_uploads: number; popular: number; bookmarks: number }>>("/learning-hub/modules/quick-counts"),

  toggleBookmark: (payload: { module_id?: string; material_id?: string }) =>
    api.post<ApiResponse<{ status: string }>>("/learning-hub/bookmarks", payload),
};
