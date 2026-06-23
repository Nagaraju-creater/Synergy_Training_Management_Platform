import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Card, CardContent } from "./Card";
import { TrendingDown, TrendingUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
  className?: string;
  delay?: number;
  variant?: "brand" | "indigo" | "emerald" | "amber" | "rose" | "default";
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  className,
  delay = 0,
  variant = "default"
}: StatCardProps) {
  const variantClasses = {
    default: "text-muted-foreground bg-muted/50",
    brand: "text-brand-600 bg-brand-500/10 group-hover:bg-brand-500 group-hover:text-white",
    indigo: "text-indigo-600 bg-indigo-500/10 group-hover:bg-indigo-500 group-hover:text-white",
    emerald: "text-emerald-600 bg-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-white",
    amber: "text-amber-600 bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-white",
    rose: "text-rose-600 bg-rose-500/10 group-hover:bg-rose-500 group-hover:text-white",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <Card className={cn("overflow-hidden group hover:shadow-md transition-all duration-300 border-none bg-card/10 backdrop-blur-md shadow-sm border border-white/10", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {title}
            </p>
            <div className={cn("p-2 rounded-xl transition-all duration-300", variantClasses[variant])}>
              <Icon size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
            <div className="flex items-center gap-2 mt-2">
              {trend && (
                <div className={cn(
                  "flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full",
                  trend.isUp ? "text-emerald-600 bg-emerald-100" : "text-rose-600 bg-rose-100"
                )}>
                  {trend.isUp ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                  {trend.value}%
                </div>
              )}
              {description && (
                <p className="text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
