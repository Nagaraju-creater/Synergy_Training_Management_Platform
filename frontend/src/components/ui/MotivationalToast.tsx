import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Flame, CheckCircle, TrendingUp, BookOpen, Star, Rocket, Trophy, Target } from "lucide-react";
import { create } from "zustand";
import { useAuthStore } from "@/store/authStore";

interface ToastItem {
  message: string;
  iconType: "sparkle" | "zap" | "flame" | "check" | "trend" | "book" | "star" | "rocket" | "trophy" | "target";
}

interface ToastState {
  queue: ToastItem[];
  currentToast: ToastItem | null;
  showToast: (message: string, iconType?: ToastItem["iconType"]) => void;
  processQueue: () => void;
  hideToast: () => void;
}

const icons = {
  sparkle: Sparkles,
  zap: Zap,
  flame: Flame,
  check: CheckCircle,
  trend: TrendingUp,
  book: BookOpen,
  star: Star,
  rocket: Rocket,
  trophy: Trophy,
  target: Target,
};

export const useMotivationalToast = create<ToastState>((set, get) => {
  let timeoutId: any = null;

  return {
    queue: [],
    currentToast: null,
    showToast: (message, iconType = "sparkle") => {
      const newItem: ToastItem = { message, iconType };
      set((state) => ({ queue: [...state.queue, newItem] }));
      get().processQueue();
    },
    processQueue: () => {
      const { currentToast, queue } = get();
      if (currentToast || queue.length === 0) return;

      const next = queue[0];
      set({
        currentToast: next,
        queue: queue.slice(1)
      });

      if (timeoutId) clearTimeout(timeoutId);

      // Auto dismiss after 2.8 seconds
      timeoutId = setTimeout(() => {
        get().hideToast();
      }, 2800);
    },
    hideToast: () => {
      set({ currentToast: null });
      // Allow exit animation to complete before processing next item in queue (300ms)
      setTimeout(() => {
        get().processQueue();
      }, 300);
    }
  };
});

export function MotivationalToast() {
  const { currentToast, showToast } = useMotivationalToast();
  const { user } = useAuthStore();
  const roleName = typeof user?.role === "string" ? user.role : (user?.role as any)?.name;
  const roleLower = roleName?.toLowerCase() || "";

  // Initial inspirational quote on dashboard mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (roleLower.includes("manager")) {
        showToast("Team growth starts with learning", "rocket");
      } else {
        const quotes: { text: string; icon: ToastItem["iconType"] }[] = [
          { text: "Knowledge is Power", icon: "zap" },
          { text: "Keep Building Skills", icon: "rocket" },
          { text: "Learning Creates Growth", icon: "book" },
          { text: "Great Progress Today", icon: "star" },
          { text: "Small steps, big results", icon: "trend" }
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        showToast(randomQuote.text, randomQuote.icon);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [roleLower]);

  const IconComponent = currentToast ? (icons[currentToast.iconType] || Sparkles) : Sparkles;

  return (
    <AnimatePresence>
      {currentToast && (
        <motion.div
          key={currentToast.message}
          initial={{ opacity: 0, scale: 0.9, y: "-50%", x: "-50%" }}
          animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
          exit={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
          transition={{ type: "spring", stiffness: 350, damping: 26 }}
          style={{ position: "fixed", top: "42%", left: "50%" }}
          className="z-[99999] pointer-events-none flex items-center gap-2.5 px-4.5 py-3 rounded-[20px] bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.12)] w-max max-w-[280px]"
        >
          <div className="w-7.5 h-7.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
            <IconComponent size={14} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200 pr-1.5 whitespace-normal leading-tight">
            {currentToast.message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
