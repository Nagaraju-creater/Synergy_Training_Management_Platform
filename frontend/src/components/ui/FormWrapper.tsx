import * as React from "react";
import { cn } from "@/lib/utils";

interface FormWrapperProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  columns?: 1 | 2;
}

export function FormWrapper({ children, onSubmit, className, columns = 1 }: FormWrapperProps) {
  const Content = (
    <div className={cn(
      "grid gap-x-6 gap-y-4",
      columns === 2 ? "md:grid-cols-2" : "grid-cols-1"
    )}>
      {children}
    </div>
  );

  if (!onSubmit) {
    return (
      <div className={cn("space-y-6", className)}>
        {Content}
      </div>
    );
  }

  return (
    <form 
      onSubmit={onSubmit}
      className={cn(
        "bg-card border border-border/50 rounded-xl p-6 lg:p-8 shadow-sm space-y-6",
        className
      )}
    >
      {Content}
    </form>
  );
}

export function FormSection({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-widest border-b pb-2">
          {title}
        </h3>
      )}
      <div className="grid gap-4">
        {children}
      </div>
    </div>
  );
}
