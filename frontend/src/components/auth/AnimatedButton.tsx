import { motion } from "framer-motion";
import { type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "ghost" | "outline";
  children: ReactNode;
  loadingText?: string;
}

export default function AnimatedButton({
  isLoading,
  variant = "primary",
  children,
  className,
  disabled,
  loadingText,
  ...props
}: AnimatedButtonProps) {
  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 select-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    primary:
      "h-[52px] w-full bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/35 hover:from-brand-400 hover:to-violet-400",
    ghost:
      "h-10 text-white/70 hover:text-white hover:bg-white/8",
    outline:
      "h-10 border border-white/20 text-white/80 hover:text-white hover:border-white/40 hover:bg-white/5",
  };

  return (
    <motion.button
      whileHover={{ scale: isLoading || disabled ? 1 : 1.015 }}
      whileTap={{ scale: isLoading || disabled ? 1 : 0.98 }}
      className={cn(base, variants[variant], className)}
      disabled={isLoading || disabled}
      {...(props as any)}
    >
      {/* Shimmer overlay */}
      {variant === "primary" && (
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/12 to-transparent group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
      )}

      {isLoading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>{loadingText ?? "Please wait…"}</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
