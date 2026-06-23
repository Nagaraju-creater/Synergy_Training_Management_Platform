import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000/api/v1`,
  timeout: 12_000,  // 12 s — fast failure feedback for the user
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ── Request: attach Bearer token ──────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: handle 401 globally with Refresh Token ──────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 or 403 and we haven't tried refreshing yet
    // DO NOT refresh if the request was to login, refresh, or logout
    const isAuthPath = originalRequest.url?.includes("/auth/login") || 
                       originalRequest.url?.includes("/auth/refresh") ||
                       originalRequest.url?.includes("/auth/logout");

    if ([401, 403].includes(error.response?.status) && !originalRequest._retry && !isAuthPath) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh the access token
        // Use a clean axios instance to avoid infinite loops if refresh fails
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        const newAccessToken = data.data.access_token;
        
        // Update store
        useAuthStore.getState().setAccessToken(newAccessToken);
        
        // Update header and retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed (cookie expired or invalid)
        useAuthStore.getState().logout();
        // Only hard-redirect if the user is on a protected route.
        // Do NOT redirect if already on a public auth page (login, forgot-password, reset-password).
        // Also do NOT redirect for public attendance roster links.
        const publicPaths = ["/login", "/forgot-password", "/auth/reset-password", "/attendance-roster"];
        const isOnPublicPage = publicPaths.some((p) => window.location.pathname.includes(p));
        if (!isOnPublicPage) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
