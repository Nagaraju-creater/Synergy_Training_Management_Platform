import api from "@/lib/axios";
import type { ApiResponse, Employee, PaginatedResponse } from "@/types";

export interface EmployeeSearchParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  department_id?: string;
  manager_id?: string;
  sort_by?: string;
  sort_order?: string;
}

export const employeesService = {
  list: (params: EmployeeSearchParams = {}) =>
    api.get<PaginatedResponse<Employee>>("/employees/", { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Employee>>(`/employees/${id}`),

  getManagers: () =>
    api.get<ApiResponse<Employee[]>>("/employees/managers"),

  create: (payload: Partial<Employee>) =>
    api.post<ApiResponse<Employee>>("/employees/", payload),

  update: (id: string, payload: Partial<Employee>) =>
    api.patch<ApiResponse<Employee>>(`/employees/${id}`, payload),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Employee>>(`/employees/${id}/status`, { status }),

  delete: (id: string) => api.delete(`/employees/${id}`),

  uploadAvatar: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<ApiResponse<Employee>>(`/employees/${id}/avatar`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  importCSV: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<ApiResponse<{ created: number; errors: Array<{ row: number; error: string }> }>>(
      "/employees/import",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },

  exportCSV: async () => {
    const res = await api.get("/employees/export", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadTemplate: async () => {
    const res = await api.get("/employees/import-template", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  },
};
