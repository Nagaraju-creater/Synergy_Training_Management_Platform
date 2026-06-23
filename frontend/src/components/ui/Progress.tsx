
interface ProgressProps {
  value: number;
  className?: string;
  variant?: "brand" | "success" | "warning" | "danger" | "default";
}

export function Progress({ value, className = "", variant = "brand" }: ProgressProps) {
  const variantClasses = {
    brand: "bg-brand-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    default: "bg-primary",
  };

  return (
    <div className={`w-full bg-muted rounded-full h-2 overflow-hidden ${className}`}>
      <div 
        className={`h-full transition-all duration-500 ${variantClasses[variant]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
