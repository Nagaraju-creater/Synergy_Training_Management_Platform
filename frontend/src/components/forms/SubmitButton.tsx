import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary:   "bg-brand-600 hover:bg-brand-700 text-white shadow-sm focus:ring-brand-500",
  secondary: "bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border focus:ring-brand-500",
  danger:    "bg-destructive hover:bg-destructive/90 text-white focus:ring-destructive",
  ghost:     "hover:bg-accent text-foreground focus:ring-brand-500",
};

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: Variant;
}

export function SubmitButton({
  isLoading,
  variant = "primary",
  children,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <button
      disabled={isLoading || disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium",
        "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {isLoading && <Loader size="xs" />}
      {children}
    </button>
  );
}
