import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { usersService } from "@/services/users.service";
import { analyticsService } from "@/services/analytics.service";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import synergyLogo from "@/assets/synergy-logo.png";

// Layouts
import AuthLayout from "@/components/layout/AuthLayout";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import UIWatchdog from "@/components/layout/UIWatchdog";

// Auth pages
import LoginPage from "@/app/auth/login";
import ForgotPasswordPage from "@/app/auth/forgot-password";
import ResetPasswordPage from "@/app/auth/reset-password";

// Welcome Flow
import WelcomeFlow from "@/components/welcome/WelcomeFlow";

// Dashboard pages
import DashboardPage from "@/app/dashboard";
import EmployeesPage from "@/app/employees";
import DepartmentsPage from "@/app/departments";
import TrainingsPage from "@/app/trainings";
import TrainingDetailsPage from "@/app/trainings/details";
import EnrollmentsPage from "@/app/enrollments";
import ELearningPage from "@/app/elearning";
import ELearningDetailsPage from "@/app/elearning/details";

import EffectivenessPage from "@/app/effectiveness";
import ReportsPage from "@/app/reports";
import SettingsPage from "@/app/settings";
import AnalyticsPage from "@/app/analytics";
import ProfilePage from "@/app/profile";
import AttendancePage from "@/app/attendance";
import AttendanceRosterPage from "@/app/attendance/public";
import TrainingPlanPage from "@/app/training-plan";
import DataImportPage from "@/app/data-import";

export default function App() {
  const { theme } = useThemeStore();
  const { isLoading, isAuthenticated } = useAuthStore();
  const [showSplash, setShowSplash] = useState(!isAuthenticated);
  const [loadingStage, setLoadingStage] = useState("Loading Resources");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // ── Session Initialization ──────────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      const { accessToken, setUser, logout, setLoading } = useAuthStore.getState();
      
      // If no token, we can't be logged in. Skip the check to save time.
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await usersService.getMe();
        if (res.data.success && res.data.data) {
          // Keep the current token and just update the user info
          setUser(res.data.data);
          // ── Prefetch dashboard data while user orients themselves ──
          // This fires in the background so Dashboard feels instant on first click.
          const role = res.data.data.role?.toLowerCase();
          if (role === "employee") {
            queryClient.prefetchQuery({
              queryKey: ["employee-dashboard"],
              queryFn: () => analyticsService.getEmployeeDashboard(),
            });
          } else if (role === "manager") {
            queryClient.prefetchQuery({
              queryKey: ["manager-dashboard"],
              queryFn: () => analyticsService.getManagerDashboard(),
            });
          } else if (role === "admin") {
            queryClient.prefetchQuery({
              queryKey: ["admin-dashboard"],
              queryFn: () => analyticsService.getAdminDashboard(),
            });
          }
        }
      } catch (err: any) {
        // Only logout if not already on a public page and the error is an auth failure
        if (err.response?.status === 401 || err.response?.status === 403) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // ── Splash Screen Animation Timers ─────────────────────────────────
  useEffect(() => {
    if (!showSplash) return;

    // Keep splash active for exactly 1.8 seconds (1800ms)
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);

    // Animate loading text stages
    const stageTimer1 = setTimeout(() => setLoadingStage("Loading Learning Data"), 400);
    const stageTimer2 = setTimeout(() => setLoadingStage("Preparing Dashboard"), 800);
    const stageTimer3 = setTimeout(() => setLoadingStage("Welcome Back"), 1200);

    // Progress bar increments smoothly (reaches 100% at 1600ms)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 32);

    return () => {
      clearTimeout(splashTimer);
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      clearInterval(interval);
    };
  }, [showSplash]);

  return (
    <>
      <UIWatchdog />
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: { duration: 0.3, ease: "easeInOut" }
            }}
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-gradient-to-tr from-white via-indigo-50/20 to-sky-50/30 select-none text-slate-800 overflow-hidden"
          >
            {/* Subtle floating particles */}
            {[...Array(6)].map((_, i) => {
              const sizes = [6, 8, 10, 5, 7, 9];
              const lefts = ["15%", "80%", "25%", "75%", "10%", "85%"];
              const tops = ["20%", "30%", "65%", "75%", "80%", "15%"];
              const delays = [0, 1.5, 0.8, 2.2, 0.4, 1.8];
              return (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-indigo-500/10 pointer-events-none"
                  style={{
                    width: sizes[i],
                    height: sizes[i],
                    left: lefts[i],
                    top: tops[i],
                  }}
                  animate={{
                    y: [0, -35, 0],
                    x: [0, 15, 0],
                  }}
                  transition={{
                    duration: 12 + i * 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: delays[i],
                  }}
                />
              );
            })}

            {/* Centered splash content card */}
            <div className="flex flex-col items-center justify-between h-[360px] w-full max-w-sm px-6 text-center z-10">
              
              {/* Top: Animated company logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  y: [0, -6, 0] // Floating effect
                }}
                exit={{
                  scale: 0.85,
                  transition: { duration: 0.3, ease: "easeInOut" }
                }}
                transition={{
                  opacity: { duration: 0.8, ease: "easeOut" },
                  scale: { duration: 0.8, ease: "easeOut" },
                  y: {
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut",
                    delay: 0.8
                  }
                }}
                className="relative flex items-center justify-center h-24 mb-2"
              >
                {/* Soft pulse glow behind logo */}
                <motion.div 
                  className="absolute w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -z-10"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                />
                
                <img 
                  src={synergyLogo} 
                  alt="Synergy Logo" 
                  className="h-20 w-auto object-contain"
                />
              </motion.div>

              {/* Middle: Training Management System */}
              <div className="flex flex-col items-center">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-lg font-black text-slate-800 tracking-wider uppercase"
                >
                  Synergy
                </motion.h2>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1"
                >
                  Training Management System
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.7, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="text-[10px] font-semibold text-slate-500 tracking-wide mt-1.5"
                >
                  Empowering Learning Excellence
                </motion.p>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="text-[9px] font-black uppercase text-indigo-600 tracking-widest mt-3.5 px-3 py-1 bg-indigo-50 rounded-full"
                >
                  Learning • Growth • Excellence
                </motion.div>
              </div>

              {/* Bottom: Loading progress animation */}
              <div className="flex flex-col items-center gap-3.5 w-full">
                {/* Aurora loading progress bar */}
                <div className="w-52 h-1.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/20">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 via-cyan-400 to-pink-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut", duration: 0.1 }}
                  />
                </div>

                {/* Dynamic Loading stages text */}
                <div className="h-4 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={loadingStage}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 0.5, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className="text-[9px] font-black uppercase tracking-widest text-slate-400 select-none"
                    >
                      {loadingStage}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Main App Routes */}
      <div className={cn("w-full h-full transition-opacity duration-500", isLoading ? "opacity-0" : "opacity-100")}>
        <Routes>
          {/* ── Auth ─────────────────────────────────────────────── */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Shareable Public Attendance Desk */}
          <Route path="/attendance-roster/:token" element={<AttendanceRosterPage />} />

          {/* ── Protected dashboard ──────────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            {/* Welcome Experience – full screen, no sidebar */}
            <Route path="/welcome" element={<WelcomeFlow />} />
            <Route element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"      element={<DashboardPage />} />
              <Route path="/employees"      element={<EmployeesPage />} />
              <Route path="/departments"    element={<DepartmentsPage />} />
              <Route path="/trainings"      element={<TrainingsPage />} />
              <Route path="/trainings/details/:id" element={<TrainingDetailsPage />} />
              <Route path="/enrollments"    element={<EnrollmentsPage />} />
              <Route path="/elearning"      element={<ELearningPage />} />
              <Route path="/elearning/:id"  element={<ELearningDetailsPage />} />
              <Route path="/nominations"    element={<Navigate to="/enrollments" replace />} />
              <Route path="/effectiveness"  element={<EffectivenessPage />} />
              <Route path="/reports"        element={<ReportsPage />} />
              <Route path="/settings"       element={<SettingsPage />} />
              <Route path="/team-progress" element={<Navigate to="/employees" replace />} />
              <Route path="/reviews"       element={<Navigate to="/effectiveness" replace />} />
              <Route path="/analytics"     element={<AnalyticsPage />} />
              <Route path="/profile"       element={<ProfilePage />} />
              <Route path="/attendance"    element={<AttendancePage />} />
              
              <Route element={<ProtectedRoute requiredRoles={["admin"]} />}>
                <Route path="/training-plan" element={<TrainingPlanPage />} />
                <Route path="/data-import" element={<DataImportPage />} />
              </Route>
            </Route>
          </Route>

          {/* ── Catch-all ────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster />
      </div>
    </>
  );
}
