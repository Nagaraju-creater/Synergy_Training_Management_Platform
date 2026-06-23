import api from "@/lib/axios";
import type { ApiResponse, AuthUser } from "@/types";
import type { AxiosRequestConfig } from "axios";

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponseData {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export const authService = {
  login: (payload: LoginPayload, config?: AxiosRequestConfig) =>
    api.post<ApiResponse<AuthResponseData>>("/auth/login", payload, config),

  logout: () => api.post<ApiResponse<null>>("/auth/logout"),

  refreshToken: () =>
    api.post<ApiResponse<{ access_token: string, token_type: string }>>("/auth/refresh"),

  forgotPassword: (email: string) =>
    api.post<ApiResponse<null>>("/auth/forgot-password", { email }),

  resetPassword: (payload: any) =>
    api.post<ApiResponse<null>>("/auth/reset-password", payload),
};
