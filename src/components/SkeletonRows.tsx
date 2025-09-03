// src/components/SkeletonRows.tsx
import * as React from "react";

export default function SkeletonRows({
  count = 6,
}: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="h-4 w-24 bg-muted animate-pulse rounded mb-3" />
          <div className="h-5 w-3/4 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-2/3 bg-muted animate-pulse rounded mb-4" />
          <div className="h-8 w-28 bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}
