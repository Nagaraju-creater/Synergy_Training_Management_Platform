import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  LogOut, 
  Moon, 
  Search, 
  Sun, 
  User, 
  Settings as SettingsIcon,
  HelpCircle,
  Inbox,
  Command,
  Shield,
  Download,
  CheckCircle
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { useThemeStore, useUIStore } from "@/store/uiStore";
import Breadcrumb from "./Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/Sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { formatDateTime } from "@/utils/formatters";
import type { Notification, PaginatedResponse } from "@/types";
import { cn } from "@/lib/utils";
import synergyLogo from "@/assets/synergy-logo.png";

const sheetVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.85, 
    y: -30, 
    x: "-50%",
    transition: {
      duration: 0.22,
      ease: [0.36, 0.66, 0.04, 1]
    }
  },
  show: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    x: "-50%",
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 26,
      staggerChildren: 0.04,
      delayChildren: 0.06
    } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 260, 
      damping: 24 
    } 
  }
};


const DrawerListItem = ({ icon: Icon, label, subtitle, onClick, rightElement, className }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 active:scale-[0.98] transition-all text-left",
      className
    )}
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 border border-slate-200/50 dark:border-white/5 flex items-center justify-center shadow-sm shrink-0">
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <span className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">{label}</span>
        {subtitle && <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</span>}
      </div>
    </div>
    {rightElement}
  </button>
);

const PWAInstallButton = ({ onClick, isInstalled }: { onClick: () => void; isInstalled: boolean }) => {
  return (
    <button
      onClick={isInstalled ? undefined : onClick}
      disabled={isInstalled}
      style={{
        background: isInstalled 
          ? "rgba(16, 185, 129, 0.1)" 
          : "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)",
        height: "52px",
        borderRadius: "16px",
      }}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 border transition-all text-left",
        isInstalled 
          ? "border-emerald-500/20 dark:border-emerald-500/10 shadow-sm" 
          : "border-transparent text-white shadow-[0_4px_20px_rgba(99,102,241,0.25)] active:scale-[0.98]"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
          isInstalled ? "bg-emerald-500 text-white" : "bg-white/20 text-white"
        )}>
          {isInstalled ? <CheckCircle size={16} strokeWidth={2.5} /> : <Download size={16} strokeWidth={2.5} />}
        </div>
        <div className="min-w-0">
          <span className={cn(
            "block text-xs font-black uppercase tracking-wider leading-none",
            isInstalled ? "text-emerald-600 dark:text-emerald-400" : "text-white"
          )}>
            {isInstalled ? "Installed ✓" : "Install App"}
          </span>
          <span className={cn(
            "block text-[9px] font-bold mt-1 leading-none",
            isInstalled ? "text-emerald-500/80 dark:text-emerald-400/80" : "text-white/80"
          )}>
            {isInstalled ? "Training Management App Ready" : "Add Training Management to Home Screen"}
          </span>
        </div>
      </div>
    </button>
  );
};

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { mobileProfileOpen, setMobileProfileOpen } = useUIStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // PWA specific states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileProfileOpen(false);
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setMobileProfileOpen]);

  useEffect(() => {
    if (isMobile && mobileProfileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileProfileOpen, isMobile]);

  // PWA detection and handlers
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia("(display-mode: standalone)").matches || 
        (window.navigator as any).standalone || 
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    };
    
    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstalled(false);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log("PWA was installed successfully!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to PWA install prompt: ${outcome}`);
    if (outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const roleName = typeof user?.role === "string" ? user.role : (user?.role as any)?.name;
  const role = roleName?.toLowerCase() || "";

  const getPageTitle = (pathStr: string, userRole: string) => {
    const path = pathStr.split("?")[0].split("#")[0];
    if (path === "/dashboard") return "Dashboard";
    if (path.startsWith("/employees")) return userRole.includes("manager") ? "My Team" : "Employees";
    if (path.startsWith("/departments")) return "Departments";
    if (path.startsWith("/trainings")) return "Trainings";
    if (path.startsWith("/enrollments")) return userRole.includes("employee") ? "My Trainings" : "Enrollments";
    if (path.startsWith("/elearning")) return "Learning Hub";
    if (path.startsWith("/effectiveness")) return "Effectiveness";
    if (path.startsWith("/reports")) return "Reports";
    if (path.startsWith("/analytics")) return "Learning Analytics";
    if (path.startsWith("/settings")) return "Settings";
    if (path.startsWith("/profile")) return "Profile";
    if (path.startsWith("/attendance")) return "Attendance";
    if (path.startsWith("/training-plan")) return "Training Plan";
    if (path.startsWith("/data-import")) return "Data Import";
    return "Synergy";
  };

  const { data: notifsResp } = useQuery({
    queryKey: ["notifications", "topbar", user?.id],
    queryFn: () => api.get<PaginatedResponse<Notification>>("/notifications/", { params: { page: 1, per_page: 5 } }),
    enabled: !!user,
    select: (res) => res.data,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifsResp?.data?.filter(n => !n.is_read).length || 0;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (isMobile) {
    return (
      <header
        className={cn(
          "h-14 sm:h-16 w-full sticky top-0 shrink-0 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] px-3 sm:px-4",
          "bg-[rgba(255,255,255,0.95)] dark:bg-[#0f172a]/95 backdrop-blur-[12px] border-b border-[rgba(99,102,241,0.08)]",
          (mobileProfileOpen || showLogoutConfirm) ? "z-[99999]" : "z-30"
        )}
      >
        <div className="grid grid-cols-3 w-full h-full items-center gap-1">
          {/* Left Column: Logo + Training Management System */}
          <div className="col-span-1 flex items-center gap-1.5 min-w-0 justify-self-start">
            <img
              src={synergyLogo}
              alt="Synergy Global Sourcing"
              className="h-6 w-auto max-w-[36px] min-[390px]:max-w-[40px] object-contain shrink-0 dark:brightness-110"
            />
            <div className="hidden min-[360px]:flex flex-col justify-center border-l border-slate-200 dark:border-slate-800 pl-1.5 leading-none min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black tracking-tight text-slate-900 dark:text-white leading-none">
                  Synergy
                </span>
                {isStandalone && (
                  <span className="text-[6.5px] font-black tracking-widest bg-emerald-505 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1 py-0.5 rounded-md uppercase scale-[0.8] origin-left shrink-0">
                    APP
                  </span>
                )}
              </div>
              <span className="text-[8px] font-bold tracking-tight text-slate-400 dark:text-slate-500 mt-0.5">
                TMS
              </span>
            </div>
          </div>

          {/* Center Column: Current Page Title */}
          <div className="col-span-1 flex flex-col items-center justify-center min-w-0">
            <h1 className="text-[18px] font-[700] tracking-[0.5px] uppercase text-[#111827] dark:text-slate-100 whitespace-nowrap text-center select-none leading-none">
              {getPageTitle(pathname, role)}
            </h1>
            <div 
              className="mt-1 w-[40px] h-[3px] rounded-full"
              style={{
                background: "linear-gradient(90deg, #6366F1, #8B5CF6)"
              }}
            />
          </div>

          {/* Right Section: Search + Notification + Profile */}
          <div className="col-span-1 flex items-center justify-end gap-1.5 min-w-0 shrink-0 justify-self-end">
            {/* Mobile Search Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400">
                  <Search size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="p-4 border-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl h-auto flex flex-col gap-4">
                <div className="relative w-full group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={18} />
                  <Input 
                    autoFocus
                    placeholder="Search..." 
                    className="w-full pl-11 h-12 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border-transparent focus-visible:border-indigo-500/30 focus-visible:ring-[6px] focus-visible:ring-indigo-500/5 transition-all duration-300 placeholder:text-slate-400/70 placeholder:font-medium text-base"
                  />
                </div>
                <p className="text-xs font-bold text-slate-400 text-center uppercase tracking-widest">Type to search</p>
              </SheetContent>
            </Sheet>

            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl relative bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                  >
                     <Bell size={18} />
                     {unreadCount > 0 && (
                       <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
                     )}
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 mt-2 border-slate-200/60 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden" align="end">
                <div className="p-4 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                   <h4 className="font-black text-[13px] uppercase tracking-wider text-slate-900 dark:text-white">Notifications</h4>
                   <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-[10px] font-black text-indigo-600 dark:text-indigo-400">{unreadCount} New</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                   {notifsResp?.data && notifsResp.data.length > 0 ? (
                     <div className="divide-y divide-slate-100 dark:divide-white/5">
                       {notifsResp.data.map((n) => (
                         <div 
                           key={n.id} 
                           className={cn(
                             "p-4 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer group",
                             !n.is_read ? 'bg-indigo-50/30 dark:bg-indigo-500/[0.03]' : ''
                           )}
                           onClick={() => {
                              if (!n.is_read) markRead.mutate(n.id);
                           }}
                         >
                           <div className="flex justify-between items-start gap-3 mb-1">
                             <span className="font-bold text-[13px] text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{n.title}</span>
                             <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight whitespace-nowrap mt-0.5">{formatDateTime(n.created_at)}</span>
                           </div>
                           <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{n.message}</p>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="p-8 text-center flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                          <Inbox className="w-6 h-6 text-slate-400 opacity-50" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">All caught up!</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">No new notifications.</p>
                        </div>
                     </div>
                   )}
                </div>
                <div className="p-3 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 text-center">
                   <button className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">View All</button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Profile Avatar Button */}
            <Button 
              variant="ghost" 
              onClick={() => setMobileProfileOpen(true)}
              className="relative h-8 w-8 rounded-xl flex items-center justify-center p-0 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-700/50 hover:bg-white transition-all duration-300 ml-0.5"
            >
              <Avatar className="h-7 w-7 rounded-[10px] shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-brand-600 text-white text-[10px] font-black tracking-widest">
                  {user?.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-[2px] border-white dark:border-slate-900 rounded-full shadow-sm z-10">
                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40"></div>
              </div>
            </Button>
          </div>
        </div>

        {/* ── Mobile Profile Drawer ────────────────────────────────────────── */}
        <AnimatePresence>
          {mobileProfileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                onClick={() => setMobileProfileOpen(false)}
                className="fixed inset-0 z-[99999] bg-slate-950/50 backdrop-blur-md"
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                variants={sheetVariants}
                initial="hidden"
                animate="show"
                exit="hidden"
                style={{ x: "-50%", transformOrigin: "top right" }}
                className="fixed top-[76px] left-1/2 z-[100000] w-[90vw] max-w-[400px] max-h-[80vh] overflow-y-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.18)] flex flex-col gap-4 p-4 pb-6 custom-scrollbar"
              >
                {/* Profile User Card */}
                <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 via-brand-500/5 to-transparent dark:from-indigo-500/20 dark:to-transparent p-4 flex items-center gap-3 border border-slate-100 dark:border-white/5">
                  <div className="relative shrink-0">
                    <Avatar className="h-14 w-14 rounded-2xl shadow-md ring-2 ring-indigo-500/20">
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-brand-600 text-white text-lg font-black tracking-widest">
                        {user?.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm z-10">
                      <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40"></div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight truncate">{user?.full_name}</h3>
                    <p className="text-[11px] font-bold text-slate-400 truncate mt-0.5">{user?.email}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md uppercase">
                        <Shield size={10} /> {user?.role}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md uppercase">
                        Online
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Profile Menu List (Enhanced Order) */}
                <motion.div variants={itemVariants} className="flex flex-col gap-2.5 px-1">
                  {/* 1. My Profile */}
                  <DrawerListItem 
                    icon={User} 
                    label="My Profile" 
                    subtitle="View and update your profile details"
                    onClick={() => { setMobileProfileOpen(false); navigate("/profile"); }} 
                  />

                  {/* 2. Settings */}
                  <DrawerListItem 
                    icon={SettingsIcon} 
                    label="Settings" 
                    subtitle="Configure app preferences"
                    onClick={() => { setMobileProfileOpen(false); navigate("/settings"); }} 
                  />

                  {/* 3. Appearance */}
                  <DrawerListItem 
                    icon={theme === "dark" ? Sun : Moon} 
                    label="Appearance" 
                    subtitle={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
                    onClick={() => toggleTheme()} 
                    rightElement={
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">{theme}</span>
                    }
                  />

                  {/* 4. Install App (If supported/installed) */}
                  {(deferredPrompt || isInstalled) && (
                    <PWAInstallButton onClick={handleInstallClick} isInstalled={isInstalled} />
                  )}

                  {/* 5. Help & Support */}
                  <DrawerListItem 
                    icon={HelpCircle} 
                    label="Help & Support" 
                    subtitle="FAQs and contact support"
                    onClick={() => { setMobileProfileOpen(false); navigate("/profile"); }} 
                  />
                </motion.div>

                {/* 6. Sign Out */}
                <motion.div variants={itemVariants} className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setMobileProfileOpen(false);
                      setTimeout(() => {
                        setShowLogoutConfirm(true);
                      }, 180);
                    }}
                    className="w-full py-3 bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/20 rounded-xl text-[11px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2 active:scale-95 animate-pulse"
                  >
                    <LogOut size={14} /> Sign Out
                  </motion.button>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Sign Out Confirm Portal */}
        {createPortal(
          <AnimatePresence>
            {showLogoutConfirm && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="fixed inset-0 z-[100100] bg-slate-950/50 backdrop-blur-[2px]"
                />
                <motion.div
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="fixed bottom-0 left-0 right-0 mx-auto z-[100200] w-full max-w-[480px] max-h-[280px] h-[240px] bg-white dark:bg-[#111726] border-t border-slate-200/60 dark:border-white/10 rounded-t-[24px] px-6 py-5 flex flex-col justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.12)] text-left"
                >
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>🚪</span> Sign Out
                    </h4>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-bold mt-2">
                      Are you sure you want to sign out?
                    </p>
                    <p className="text-[10.5px] text-slate-400 dark:text-slate-500 font-bold mt-1 leading-normal">
                      You will need to sign in again to access your learning dashboard.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setShowLogoutConfirm(false);
                        handleLogout();
                      }}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-rose-600/10 active:scale-98"
                    >
                      Sign Out
                    </button>
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="w-full py-2.5 bg-transparent border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-350 rounded-xl transition-all active:scale-98"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
      </header>
    );
  }

  return (
    <header 
      className={cn(
        "h-14 sm:h-16 lg:h-[76px] w-full bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between px-2.5 sm:px-4 lg:px-8 sticky top-0 shrink-0 gap-1.5 sm:gap-4 transition-all duration-500 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]",
        showLogoutConfirm ? "z-[99999]" : "z-30"
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 shrink-0 min-w-0">
        <div className="hidden lg:flex items-center gap-3">
           <Breadcrumb />
           {isStandalone && (
             <span className="text-[8px] font-black tracking-widest bg-emerald-500 text-white px-1.5 py-0.5 rounded-full uppercase shadow-sm">
               App Mode
             </span>
           )}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 lg:gap-5 justify-end shrink-0 lg:flex-1 lg:max-w-5xl">
        {/* Desktop Search Bar */}
        <div className="relative w-full max-w-[320px] lg:max-w-[400px] hidden sm:block group">
          <div className="absolute inset-0 bg-indigo-500/0 group-focus-within:bg-indigo-500/5 rounded-full transition-colors duration-500 pointer-events-none" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-300 z-10" size={17} strokeWidth={2.5} />
          <Input 
            placeholder="Search everything..." 
            className="pl-11 pr-14 h-11 rounded-full bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:border-indigo-500/40 focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:bg-white dark:focus-visible:bg-slate-900 transition-all duration-300 shadow-inner placeholder:text-slate-400/80 placeholder:font-medium text-[13px] font-semibold text-slate-700 dark:text-slate-200"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 shadow-sm transition-all duration-300 group-focus-within:opacity-0 group-focus-within:scale-90 pointer-events-none">
            <Command size={10} className="text-slate-400 font-bold" />
            <span className="text-[10px] font-black text-slate-400">K</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 lg:gap-3">
          {/* Theme Toggle */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="hidden sm:block">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme} 
              className="h-10 w-10 rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm text-slate-500 dark:text-slate-400 transition-all duration-300"
            >
              {theme === "dark" ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-600" />}
            </Button>
          </motion.div>

          {/* Notifications Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl relative bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm text-slate-500 dark:text-slate-400 transition-all duration-300"
                >
                   <Bell size={18} />
                   {unreadCount > 0 && (
                     <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
                   )}
                </Button>
              </motion.div>
            </PopoverTrigger>
            <PopoverContent className="w-85 p-0 mt-2 border-slate-200/60 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden" align="end">
              <div className="p-4 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                 <h4 className="font-black text-[13px] uppercase tracking-wider text-slate-900 dark:text-white">Notifications</h4>
                 <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-[10px] font-black text-indigo-600 dark:text-indigo-400">{unreadCount} New</span>
              </div>
              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                 {notifsResp?.data && notifsResp.data.length > 0 ? (
                   <div className="divide-y divide-slate-100 dark:divide-white/5">
                     {notifsResp.data.map((n) => (
                       <div 
                         key={n.id} 
                         className={cn(
                           "p-4 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer group",
                           !n.is_read ? 'bg-indigo-50/30 dark:bg-indigo-500/[0.03]' : ''
                         )}
                         onClick={() => {
                            if (!n.is_read) markRead.mutate(n.id);
                          }}
                       >
                         <div className="flex justify-between items-start gap-3 mb-1">
                           <span className="font-bold text-[13px] text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{n.title}</span>
                           <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight whitespace-nowrap mt-0.5">{formatDateTime(n.created_at)}</span>
                         </div>
                         <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{n.message}</p>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="p-8 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <Inbox className="w-6 h-6 text-slate-400 opacity-50" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">All caught up!</p>
                        <p className="text-xs text-slate-500 dark:text-slate-505 mt-1">No new notifications at the moment.</p>
                      </div>
                   </div>
                 )}
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 text-center">
                 <button className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">View All Notifications</button>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 sm:h-11 rounded-xl sm:rounded-2xl flex items-center gap-3 px-0.5 sm:px-1 lg:pl-1 lg:pr-3 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 hover:border-slate-300 dark:hover:bg-slate-600 hover:shadow-md transition-all duration-300 group ml-0.5 lg:ml-2">
                <div className="relative shrink-0">
                  <Avatar className="h-7 w-7 sm:h-9 sm:w-9 rounded-[10px] shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-transform group-hover:scale-105 duration-300">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-brand-600 text-white text-[10px] sm:text-xs font-black tracking-widest">
                      {user?.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-[2px] border-white dark:border-slate-900 rounded-full shadow-sm z-10">
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40"></div>
                  </div>
                </div>
                <div className="hidden lg:flex flex-col items-start justify-center gap-0 text-left min-w-[90px]">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white leading-[1.2] tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{user?.full_name}</span>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-[1.2]">
                    {user?.role}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2 mt-2 border-slate-200/60 dark:border-white/10 shadow-2xl rounded-2xl" align="end">
              <DropdownMenuLabel className="p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white">{user?.full_name}</p>
                  <p className="text-[11px] font-medium text-slate-500 truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 mx-2" />
              <div className="p-1 space-y-0.5">
                <DropdownMenuItem className="rounded-xl py-2.5 cursor-pointer focus:bg-indigo-50 dark:focus:bg-indigo-500/10 focus:text-indigo-600 dark:focus:text-indigo-400" onClick={() => navigate("/profile")}>
                  <User className="mr-3 h-4 w-4" />
                  <span className="font-bold text-[13px]">My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl py-2.5 cursor-pointer focus:bg-indigo-50 dark:focus:bg-indigo-500/10 focus:text-indigo-600 dark:focus:text-indigo-400" onClick={() => navigate("/settings")}>
                  <SettingsIcon className="mr-3 h-4 w-4" />
                  <span className="font-bold text-[13px]">Settings</span>
                </DropdownMenuItem>
                
                {/* Desktop PWA Install Button (If supported/installed) */}
                {(deferredPrompt || isInstalled) && (
                  <DropdownMenuItem 
                    className="rounded-xl py-1.5 focus:bg-transparent"
                    onClick={(e) => {
                      if (isInstalled) e.preventDefault(); // Don't close menu or trigger anything if installed
                    }}
                  >
                    <PWAInstallButton onClick={handleInstallClick} isInstalled={isInstalled} />
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem className="rounded-xl py-2.5 cursor-pointer focus:bg-indigo-50 dark:focus:bg-indigo-500/10 focus:text-indigo-600 dark:focus:text-indigo-400">
                  <HelpCircle className="mr-3 h-4 w-4" />
                  <span className="font-bold text-[13px]">Help & Support</span>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 mx-2" />
              <div className="p-1">
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl py-2.5 cursor-pointer text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-500/10 focus:text-rose-600 dark:focus:text-rose-400">
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-bold text-[13px]">Sign Out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sign Out Confirm Portal */}
      {createPortal(
        <AnimatePresence>
          {showLogoutConfirm && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setShowLogoutConfirm(false)}
                className="fixed inset-0 z-[100100] bg-slate-950/50 backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="fixed bottom-0 left-0 right-0 mx-auto z-[100200] w-full max-w-[480px] max-h-[280px] h-[240px] bg-white dark:bg-[#111726] border-t border-slate-200/60 dark:border-white/10 rounded-t-[24px] px-6 py-5 flex flex-col justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.12)] text-left"
              >
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🚪</span> Sign Out
                  </h4>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-bold mt-2">
                    Are you sure you want to sign out?
                  </p>
                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 font-bold mt-1 leading-normal">
                    You will need to sign in again to access your learning dashboard.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setShowLogoutConfirm(false);
                      handleLogout();
                    }}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-rose-600/10 active:scale-98"
                  >
                    Sign Out
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="w-full py-2.5 bg-transparent border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-350 rounded-xl transition-all active:scale-98"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </header>
  );
}
