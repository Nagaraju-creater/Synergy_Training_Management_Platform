import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUIStore } from "@/store/uiStore";

export default function UIWatchdog() {
  const { pathname } = useLocation();
  const { setMobileMenuOpen } = useUIStore();

  // Function to explicitly force clean UI locks
  const forceCleanUILocks = () => {
    // Check if there are active modals or dialogs intentionally in the DOM.
    const activeModals = document.querySelectorAll(
      '[role="dialog"], [data-radix-focus-guard]'
    );

    const { mobileMenuOpen, mobileProfileOpen } = useUIStore.getState();

    // Only force clean if no obvious modal is open and mobile menu/profile drawers are closed
    if (activeModals.length === 0 && !mobileMenuOpen && !mobileProfileOpen) {
      if (document.body.style.pointerEvents === "none") {
        console.warn("[UI Watchdog] Forcefully clearing stuck pointer-events on body.");
        document.body.style.pointerEvents = "";
      }
      if (document.body.style.overflow === "hidden") {
        console.warn("[UI Watchdog] Forcefully clearing stuck overflow on body.");
        document.body.style.overflow = "";
      }
      if (document.body.hasAttribute("data-scroll-locked")) {
        console.warn("[UI Watchdog] Forcefully clearing data-scroll-locked on body.");
        document.body.removeAttribute("data-scroll-locked");
      }
    }
  };

  // 1. Clean on Route Transitions
  useEffect(() => {
    // Clean instantly on transition to avoid initial click freeze
    forceCleanUILocks();
    setMobileMenuOpen(false);
    
    // Check again after a shorter timeout once transition/exit animations finish
    const timer = setTimeout(() => {
      forceCleanUILocks();
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname, setMobileMenuOpen]);

  // 2. Continuous Monitoring via MutationObserver
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "style" || mutation.attributeName === "data-scroll-locked")
        ) {
          if (
            document.body.style.pointerEvents === "none" || 
            document.body.style.overflow === "hidden" || 
            document.body.hasAttribute("data-scroll-locked")
          ) {
            // Check quickly (50ms) to clear any stray locks if no modal is visible
            setTimeout(forceCleanUILocks, 50);
          }
        }
      }
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "data-scroll-locked"] });

    return () => observer.disconnect();
  }, []);

  // 3. Global Error Handling to prevent silent freezing
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[UI Watchdog] Unhandled Promise Rejection:", event.reason);
      forceCleanUILocks(); // Try to unlock UI just in case
    };

    const handleError = (event: ErrorEvent) => {
      console.error("[UI Watchdog] Unhandled Error:", event.message);
      forceCleanUILocks(); // Try to unlock UI just in case
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  // Make it available globally for manual invocation if needed by other systems
  useEffect(() => {
    (window as any).resetUI = () => {
      console.log("[UI Watchdog] Manual resetUI triggered.");
      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
      document.body.removeAttribute("data-scroll-locked");
      setMobileMenuOpen(false);
    };
    return () => {
      delete (window as any).resetUI;
    };
  }, [setMobileMenuOpen]);

  return null; // Watchdog renders nothing visually
}
