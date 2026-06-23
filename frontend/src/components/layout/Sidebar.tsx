import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
  Target,
  UserCircle,
  Clock,
  LogOut,
  Database,
  BookOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";

import synergyLogo from "@/assets/synergy-logo.png";

interface NavItem {
  icon: any;
  label: string;
  href: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const ADMIN_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { icon: LayoutDashboard, label: "Dashboard",     href: "/dashboard" },
      { icon: Users,           label: "Employees",     href: "/employees" },
      { icon: Building2,       label: "Departments",   href: "/departments" },
    ]
  },
  {
    title: "Learning Management",
    items: [
      { icon: GraduationCap,   label: "Trainings",     href: "/trainings" },
      { icon: Calendar,        label: "Training Plan", href: "/training-plan" },
      { icon: ClipboardList,   label: "Enrollments",   href: "/enrollments" },
      { icon: Clock,           label: "Attendance",    href: "/attendance" },
      { icon: BookOpen,        label: "E-Learning & Awareness Hub", href: "/elearning" },
    ]
  },
  {
    title: "Analytics",
    items: [
      { icon: Target,          label: "Effectiveness", href: "/effectiveness" },
      { icon: BarChart3,       label: "Team Analytics", href: "/reports" },
    ]
  },
  {
    title: "System",
    items: [
      { icon: Database,        label: "Data Import",   href: "/data-import" },
      { icon: Settings,        label: "Settings",      href: "/settings" },
    ]
  }
];

const MANAGER_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { icon: LayoutDashboard, label: "Dashboard",      href: "/dashboard" },
      { icon: Users,           label: "My Team",        href: "/employees" },
    ]
  },
  {
    title: "Operations",
    items: [
      { icon: ClipboardList,   label: "Team Enrollments",href: "/enrollments" },
      { icon: Clock,           label: "Attendance",     href: "/attendance" },
      { icon: Target,          label: "Reviews",        href: "/effectiveness" },
    ]
  },
  {
    title: "Analytics",
    items: [
      { icon: BarChart3,       label: "Analytics",      href: "/analytics" },
    ]
  }
];

const EMPLOYEE_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { icon: LayoutDashboard, label: "Dashboard",          href: "/dashboard" },
      { icon: GraduationCap,   label: "Trainings",          href: "/enrollments" },
      { icon: Clock,           label: "Attendance",         href: "/attendance" },
    ]
  },
  {
    title: "Learning Center",
    items: [
      { icon: BookOpen,        label: "E-Learning & Awareness Hub", href: "/elearning" },
    ]
  },
  {
    title: "Performance",
    items: [
      { icon: Target,          label: "Effectiveness",      href: "/effectiveness" },
      { icon: UserCircle,      label: "Profile",            href: "/profile" },
    ]
  }
];

export default function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
  const { pathname } = useLocation();
  const { sidebarCollapsed, toggleSidebar, setMobileMenuOpen } = useUIStore();
  const { user } = useAuthStore();

  const sections = React.useMemo(() => {
    let roleName = "";
    if (typeof user?.role === "string") {
      roleName = user.role;
    } else if (user?.role && typeof (user.role as any).name === "string") {
      roleName = (user.role as any).name;
    }
    
    const role = roleName.toLowerCase();
    
    if (role.includes("admin") || role.includes("system")) {
      return ADMIN_SECTIONS;
    }
    if (role.includes("manager")) {
      return MANAGER_SECTIONS;
    }
    if (role.includes("employee") || role.includes("user")) {
      return EMPLOYEE_SECTIONS;
    }
    
    return [];
  }, [user?.role]);

  return (
    <div className={cn(
      "relative flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-40",
      isMobile ? "flex w-full p-0" : "hidden lg:flex p-4",
      !isMobile && (sidebarCollapsed ? "w-24" : "w-[280px]")
    )}>
      <aside
        className={cn(
          "flex flex-col h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/60 dark:border-white/5 overflow-hidden transition-all duration-500",
          !isMobile && "rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
        )}
      >
        {/* Brand Logo */}
        <div className={cn(
          "flex items-center shrink-0 h-20 transition-all overflow-hidden", 
          (!isMobile && sidebarCollapsed) ? "justify-center px-0" : "px-6",
          isMobile && "pt-4"
        )}>
          <Link 
            to="/" 
            onClick={() => {
              if (isMobile) {
                setMobileMenuOpen(false);
              }
            }}
            className="flex items-center gap-3 outline-none group w-full"
          >
            <img 
              src={synergyLogo} 
              alt="Synergy Global Sourcing" 
              className={cn(
                "w-auto object-contain transition-all duration-300 shrink-0 dark:brightness-110 dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]",
                (!isMobile && sidebarCollapsed) ? "h-8 max-w-[60px]" : "h-8 lg:h-9 max-w-[110px] lg:max-w-[130px]"
              )}
            />
            {(!sidebarCollapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col min-w-0 border-l-2 border-slate-200 dark:border-slate-700/50 pl-3 py-0.5"
              >
                <span className="font-black text-[12px] lg:text-[13px] leading-[1.1] tracking-tight text-slate-900 dark:text-white truncate transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  Training
                </span>
                <span className="font-bold text-[10px] lg:text-[11px] leading-[1.2] tracking-tight text-slate-500 dark:text-slate-400 truncate mt-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                  Management System
                </span>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6 custom-scrollbar scrollbar-hide">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              {(!sidebarCollapsed || isMobile) ? (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]"
                >
                  {section.title}
                </motion.p>
              ) : (
                <div className="h-px bg-slate-100 dark:bg-white/5 mx-2 my-4" />
              )}
              
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => {
                        if (isMobile) {
                          setMobileMenuOpen(false);
                        }
                      }}
                      className={cn(
                        "group flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-[13.5px] font-bold transition-all duration-300 relative",
                        active 
                          ? "bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_10px_rgba(79,70,229,0.06)]" 
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50/80 dark:hover:bg-white/[0.04]"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300",
                        active ? "bg-white dark:bg-indigo-500/20 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-500/30" : "bg-transparent"
                      )}>
                        <item.icon className={cn(
                          "shrink-0 transition-all duration-300", 
                          active ? "text-indigo-600 dark:text-indigo-400 scale-110" : "text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110"
                        )} size={18} />
                      </div>

                      {(!sidebarCollapsed || isMobile) && (
                        <motion.span
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="truncate flex-1"
                        >
                          {item.label}
                        </motion.span>
                      )}

                      {active && (
                        <motion.div 
                          layoutId="active-nav-indicator"
                          className="absolute left-0 top-[20%] bottom-[20%] w-1 bg-indigo-600 dark:bg-indigo-500 rounded-r-full"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

              {/* Sidebar Footer / Profile */}
        <div className="p-4 mt-auto">
          <div className={cn(
            "group relative overflow-hidden rounded-[24px] bg-slate-50/50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 transition-all duration-300 p-2.5",
            !sidebarCollapsed && "hover:bg-white dark:hover:bg-white/[0.05] hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-none hover:border-slate-200"
          )}>
            <div className={cn("flex items-center gap-3", (!isMobile && sidebarCollapsed) && "justify-center")}>
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-100 to-indigo-100 dark:from-indigo-500/20 dark:to-brand-500/20 flex items-center justify-center text-brand-700 dark:text-indigo-400 font-black text-xs uppercase shadow-sm border border-white dark:border-white/10">
                  {user?.full_name?.charAt(0) || "U"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm"></div>
              </div>

              {(!sidebarCollapsed || isMobile) && (
                <div className="flex flex-col min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate leading-none mb-1">
                    {user?.full_name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {user?.role}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile Settings/Logout Actions */}
            {isMobile && (
              <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-white/10 flex flex-col gap-1">
                <Link 
                  to="/settings" 
                  onClick={() => {
                    if (isMobile) {
                      setMobileMenuOpen(false);
                    }
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                >
                  <Settings size={16} />
                  Settings
                </Link>
                <button 
                  onClick={() => {
                    useAuthStore.getState().logout();
                    window.location.href = "/login";
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors w-full text-left"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Collapse Toggle */}
      {!isMobile && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSidebar}
          className="absolute -right-0 top-12 z-50 h-8 w-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-lg flex items-center justify-center transition-all"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </motion.button>
      )}
    </div>
  );
}
