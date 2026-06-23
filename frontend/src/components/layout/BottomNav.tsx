import { useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  GraduationCap, 
  ClipboardList, 
  Clock, 
  BarChart3, 
  Calendar, 
  BookOpen, 
  Database, 
  UserCircle,
  Target
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const { pathname, hash } = useLocation();
  const { user } = useAuthStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  const roleName = typeof user?.role === "string" ? user.role : (user?.role as any)?.name;
  const role = roleName?.toLowerCase() || "";

  const isManager = role.includes("manager");
  const isAdmin = role.includes("admin") || role.includes("system");

  const roleItems = (() => {
    if (isAdmin) {
      return [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
        { icon: Users,           label: "Employees", href: "/employees" },
        { icon: Building2,       label: "Departments", href: "/departments" },
        { icon: GraduationCap,   label: "Trainings", href: "/trainings" },
        { icon: ClipboardList,   label: "Enrollments", href: "/enrollments" },
        { icon: Clock,           label: "Attendance", href: "/attendance" },
        { icon: BarChart3,       label: "Analytics", href: "/reports" },
        { icon: Calendar,        label: "Training Plan", href: "/training-plan" },
        { icon: BookOpen,        label: "Learning Hub", href: "/elearning" },
        { icon: Database,        label: "Imports", href: "/data-import" },
        { icon: UserCircle,      label: "Profile", href: "/profile" }
      ];
    }
    if (isManager) {
      return [
        { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
        { icon: Users,           label: "My Team", href: "/employees" },
        { icon: ClipboardList,   label: "Enrollments", href: "/enrollments" },
        { icon: Clock,           label: "Attendance", href: "/attendance" },
        { icon: Target,          label: "Reviews", href: "/effectiveness" },
        { icon: BarChart3,       label: "Analytics", href: "/analytics" },
        { icon: Calendar,        label: "Calendar", href: "/dashboard#calendar" },
        { icon: BookOpen,        label: "Learning Hub", href: "/elearning" },
        { icon: UserCircle,      label: "Profile", href: "/profile" }
      ];
    }
    return [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
      { icon: GraduationCap,   label: "Trainings", href: "/enrollments" },
      { icon: Clock,           label: "Attendance", href: "/attendance" },
      { icon: BookOpen,        label: "Learning Hub", href: "/elearning" },
      { icon: Target,          label: "Effectiveness", href: "/effectiveness" },
      { icon: UserCircle,      label: "Profile", href: "/profile" }
    ];
  })();

  const isTabActive = (itemHref: string) => {
    const [path, hashValue] = itemHref.split("#");
    if (hashValue) {
      return pathname === path && (hash === `#${hashValue}` || hash === hashValue);
    }
    if (itemHref === "/dashboard" && hash) {
      return false;
    }
    return pathname === path || (path !== "/dashboard" && pathname.startsWith(path + "/"));
  };

  useEffect(() => {
    const centerActiveTab = () => {
      if (activeTabRef.current && containerRef.current) {
        const container = containerRef.current;
        const activeTab = activeTabRef.current;

        const containerWidth = container.clientWidth;
        const activeTabWidth = activeTab.clientWidth;
        const activeTabLeft = activeTab.offsetLeft;

        const targetScrollLeft = activeTabLeft - (containerWidth / 2) + (activeTabWidth / 2);
        
        container.scrollTo({
          left: targetScrollLeft,
          behavior: "smooth"
        });
      }
    };

    const timer = setTimeout(centerActiveTab, 100);
    return () => clearTimeout(timer);
  }, [pathname, hash]);

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Floating Pill Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40 mx-auto w-[calc(100vw-32px)] max-w-[480px]">
        <div className="relative bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-[28px] shadow-[0_16px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)] p-1.5 overflow-hidden">
          {/* Subtle top border highlight gradient */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/25 dark:via-indigo-400/20 to-transparent pointer-events-none" />
          
          <div 
            ref={containerRef}
            className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-1 scroll-smooth"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {roleItems.map((item) => {
              const active = isTabActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  ref={active ? activeTabRef : null}
                  className={cn(
                    "relative flex items-center justify-center rounded-full text-xs font-black shrink-0 select-none transition-all duration-300",
                    active 
                      ? "text-white z-10 px-4 py-2.5" 
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 px-3.5 py-2.5"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-full shadow-[0_8px_20px_rgba(99,102,241,0.3)] dark:shadow-[0_8px_25px_rgba(99,102,241,0.45)] -z-10"
                      style={{
                        background: "linear-gradient(135deg, #a855f7 0%, #4f46e5 35%, #06b6d4 70%, #ec4899 100%)",
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  
                  <motion.div
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5"
                  >
                    <motion.div
                      animate={{ 
                        scale: active ? 1.08 : 1,
                        opacity: active ? 1 : 0.7 
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="shrink-0 flex items-center justify-center"
                    >
                      <item.icon size={16} strokeWidth={active ? 2.5 : 2} />
                    </motion.div>
                    
                    <AnimatePresence initial={false}>
                      {active && (
                        <motion.span
                          initial={{ width: 0, opacity: 0, scale: 0.8 }}
                          animate={{ width: "auto", opacity: 1, scale: 1 }}
                          exit={{ width: 0, opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="overflow-hidden whitespace-nowrap text-[11px] font-bold"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
