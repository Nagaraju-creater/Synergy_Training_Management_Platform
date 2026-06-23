import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

import { analyticsService } from "@/services/analytics.service";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/SkeletonLoader";

import DesktopAdminDashboard from "./DesktopAdminDashboard";
import MobileAdminDashboard from "./MobileAdminDashboard";

export default function AdminDashboard() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data: adminData, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => analyticsService.getAdminDashboard(),
    select: (res) => res.data.data,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] p-4 lg:p-8 space-y-8">
        <Skeleton className="h-48 w-full rounded-[32px]" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-[24px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[450px] rounded-[32px]" />
          <Skeleton className="h-[450px] rounded-[32px]" />
        </div>
      </div>
    );
  }

  if (!adminData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 lg:p-20 text-center bg-[#F5F7FB] dark:bg-[#0B1020]">
        <div className="max-w-md w-full p-8 lg:p-10 bg-white dark:bg-[#172036] rounded-[32px] lg:rounded-[40px] shadow-2xl border border-slate-100 dark:border-white/5">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-rose-500" size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Sync Error Detected</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
            We encountered a critical synchronization issue while fetching the executive dashboard data.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold text-sm"
          >
            Initiate Re-sync
          </Button>
        </div>
      </div>
    );
  }

  return isMobile ? (
    <MobileAdminDashboard adminData={adminData} />
  ) : (
    <DesktopAdminDashboard adminData={adminData} />
  );
}
