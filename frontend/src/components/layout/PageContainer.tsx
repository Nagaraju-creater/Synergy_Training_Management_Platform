import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function PageContainer({
  title,
  subtitle,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn("p-6 space-y-6 animate-fade-in", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {title && (
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
