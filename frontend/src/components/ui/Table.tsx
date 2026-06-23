import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "./SkeletonLoader";
import { EmptyState } from "./EmptyState";
import { motion, AnimatePresence } from "framer-motion";

export interface Column<T> {
  key: string;
  label: string;
  className?: string;
  headerClassName?: string;
  render?: (row: T) => ReactNode;
  hidden?: boolean;
}

interface TableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  keyExtractor: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  stickyHeader?: boolean;
  stickyOffset?: number | string;
  hideHeader?: boolean;
}

export function Table<T extends object>({
  columns,
  data,
  isLoading,
  keyExtractor,
  emptyTitle = "No data found",
  emptyDescription,
  onRowClick,
  className,
  stickyHeader,
  stickyOffset = 0,
  hideHeader = false,
}: TableProps<T>) {
  const visibleColumns = columns.filter((col) => !col.hidden);

  return (
    <div className={cn("isolate bg-card border border-border/50 rounded-xl shadow-sm", className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm border-collapse">
          {!hideHeader && (
            <thead className={cn("bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shadow-sm", !stickyHeader && "relative")}>
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap bg-white dark:bg-slate-900",
                      stickyHeader && "sticky z-20",
                      col.headerClassName
                    )}
                    style={stickyHeader ? { top: typeof stickyOffset === 'number' ? stickyOffset : stickyOffset } : undefined}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-border/30">
            {isLoading ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-6 py-8">
                  <TableSkeleton rows={5} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="py-12">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              <AnimatePresence>
                {data.map((row, index) => (
                  <motion.tr
                    key={keyExtractor(row)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "group hover:bg-muted/40 dark:hover:bg-slate-800/40 transition-colors duration-200 relative z-0",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {visibleColumns.map((col) => (
                      <td key={col.key} className={cn("px-6 py-4 text-foreground/90 font-medium", col.className)}>
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? "—")}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-border/30">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={3} />
          </div>
        ) : data.length === 0 ? (
          <div className="py-12">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          data.map((row, index) => (
            <motion.div
              key={keyExtractor(row)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "p-4 flex flex-col gap-3 hover:bg-muted/40 transition-colors",
                onRowClick && "cursor-pointer"
              )}
            >
              {visibleColumns.map((col) => (
                <div key={col.key} className="flex justify-between items-start gap-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0 mt-1">
                    {col.label}
                  </span>
                  <div className={cn("text-right text-sm font-bold", col.className)}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "—")}
                  </div>
                </div>
              ))}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
