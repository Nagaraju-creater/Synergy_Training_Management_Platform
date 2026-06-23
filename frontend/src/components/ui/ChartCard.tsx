import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number | string;
  className?: string;
  actions?: React.ReactNode;
}

export function ChartCard({ 
  title, 
  subtitle, 
  children, 
  height = 300, 
  className,
  actions 
}: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn("border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold tracking-tight">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div style={{ height }}>
            {children}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
