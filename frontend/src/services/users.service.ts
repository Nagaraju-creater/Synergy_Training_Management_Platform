import api from "@/lib/axios";
import type { ApiResponse, PaginatedResponse, User } from "@/types";

export const usersService = {
  list: (page = 1, perPage = 20) =>
    api.get<PaginatedResponse<User>>("/users/", { params: { page, per_page: perPage } }),

  getMe: () => api.get<ApiResponse<User>>("/users/me"),

  getById: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`),

  create: (payload: Partial<User> & { password: string }) =>
    api.post<ApiResponse<User>>("/users/", payload),

  update: (id: string, payload: Partial<User>) =>
    api.patch<ApiResponse<User>>(`/users/${id}`, payload),

  changePassword: (payload: any) =>
    api.post<ApiResponse<null>>("/users/change-password", payload),

  updateMe: (payload: Partial<User>) =>
    api.patch<ApiResponse<User>>("/users/me", payload),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<ApiResponse<User>>("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },

  delete: (id: string) => api.delete(`/users/${id}`),
};
