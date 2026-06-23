import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/uiStore";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomNav from "./BottomNav";
import { MotivationalToast } from "@/components/ui/MotivationalToast";
import { cn } from "@/lib/utils";

export default function DashboardLayout() {
  const { pathname, hash } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const { mobileProfileOpen, setMobileProfileOpen } = useUIStore();
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : true);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [pathname]);

  // Handle Resize and Mobile Detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-collapse on route change
  useEffect(() => {
    setMobileProfileOpen(false);
    // Instantly unlock body scroll and pointer events on navigation transition
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
    document.body.removeAttribute("data-scroll-locked");
  }, [pathname, setMobileProfileOpen]);

  // Coordinate body scroll locking for mobile drawers
  useEffect(() => {
    if (isMobile && mobileProfileOpen) {
      document.body.style.overflow = "hidden";
      document.body.setAttribute("data-scroll-locked", "true");
    } else {
      document.body.style.overflow = "";
      document.body.style.pointerEvents = "";
      document.body.removeAttribute("data-scroll-locked");
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.pointerEvents = "";
      document.body.removeAttribute("data-scroll-locked");
    };
  }, [mobileProfileOpen, isMobile]);

  // Hash Scroll Handler (e.g. for #calendar)
  useEffect(() => {
    if (hash === "calendar" || hash === "#calendar") {
      setTimeout(() => {
        const el = document.getElementById("calendar");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [pathname, hash]);

  // Page Transitions variants (only active on mobile)
  const pageVariants = isMobile ? {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 }
  } : {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 }
  };
  const pageTransition = isMobile ? { duration: 0.25, ease: "easeInOut" } : { duration: 0 };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 transition-colors duration-500">
      {/* Desktop Sidebar */}
      <Sidebar />



      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <Topbar />
        
        {/* Main scrollable content with safe bottom padding for fixed BottomNav */}
        <main 
          ref={mainRef} 
          className={cn(
            "flex-1 relative scroll-smooth pb-28 lg:pb-6 transition-all duration-300",
            mobileProfileOpen 
              ? "overflow-hidden blur-[3px] opacity-40 pointer-events-none" 
              : "overflow-y-auto"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        
        <BottomNav />
      </div>
      <MotivationalToast />
    </div>
  );
}
