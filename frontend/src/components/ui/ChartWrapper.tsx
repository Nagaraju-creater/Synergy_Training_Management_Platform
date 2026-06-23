import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function ChartWrapper({ title, subtitle, children, className, actions }: ChartWrapperProps) {
  return (
    <Card className={cn("p-0 overflow-hidden", className)}>
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}
