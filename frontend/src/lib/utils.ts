import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAssetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    const origin = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
    return `${origin}${cleanPath}`;
  }
  
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl) {
    const origin = apiBaseUrl.replace("/api/v1", "").replace(/\/$/, "");
    return `${origin}${cleanPath}`;
  }
  
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:8000${cleanPath}`;
}
