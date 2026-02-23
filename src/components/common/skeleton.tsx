import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[#1A1A2E]/[0.06]",
        className
      )}
      style={style}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Pre-built skeleton patterns for common dashboard elements                  */
/* -------------------------------------------------------------------------- */

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/50 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="mt-4 h-7 w-24" />
      <Skeleton className="mt-2 h-4 w-20" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/40 p-3.5">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-1.5 h-3 w-20" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/50 p-5 backdrop-blur-md">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-1 h-3 w-28" />
      <div className="mt-6 flex items-end gap-2">
        {[40, 65, 45, 80, 55, 70].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${h}%`, minHeight: `${h}px` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-[#1A1A2E]/5 py-3 px-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-32 flex-1" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Recent lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClientsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function OrdersListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  );
}
