import { useAuthStore } from "@/store/authStore";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import EmployeeDashboard from "./EmployeeDashboard";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role?.toLowerCase();

  if (role === "admin") return <AdminDashboard />;
  if (role === "manager") return <ManagerDashboard />;
  return <EmployeeDashboard />;
}
