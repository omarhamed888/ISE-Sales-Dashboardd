import type { ReactNode } from "react";

/** Pulse block — compose into page layouts */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[#E2E8F0]/90 ${className}`.trim()}
      aria-hidden
    />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  const widths = ["w-full", "w-[92%]", "w-[75%]", "w-[60%]"];
  return (
    <div className={`space-y-2.5 w-full ${className}`.trim()}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${widths[Math.min(i, widths.length - 1)]}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function SkeletonTableRow({ cols = 6 }: { cols?: number }) {
  return (
    <div className="flex gap-3 items-center py-3 border-b border-[#F1F5F9]">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-4 flex-1 min-w-0 ${i === 0 ? "max-w-[120px]" : ""}`} />
      ))}
    </div>
  );
}

export function SkeletonChart({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm ${className}`.trim()}
    >
      <Skeleton className="h-8 w-40 mb-4 rounded-lg" />
      <Skeleton className="h-52 w-full rounded-xl" />
    </div>
  );
}
