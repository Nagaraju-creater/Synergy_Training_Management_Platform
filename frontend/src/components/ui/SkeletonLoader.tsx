import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50", className)}
      {...props}
    />
  )
}

export function StatCardSkeleton() {
  return (
     <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
           <Skeleton className="h-4 w-24" />
           <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <div className="space-y-2">
           <Skeleton className="h-8 w-16" />
           <Skeleton className="h-3 w-32" />
        </div>
     </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between py-2">
        <Skeleton className="h-8 w-[150px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-muted">
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton }
