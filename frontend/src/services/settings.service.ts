import api from "@/lib/axios";

export const settingsService = {
  getSettings: async () => {
    const response = await api.get("/settings/");
    return response.data?.data?.settings || {};
  },
  
  updateSettings: async (settings: Record<string, string>) => {
    const response = await api.patch("/settings/", { settings });
    return response.data?.data?.settings || {};
  }
};
