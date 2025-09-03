// src/components/PointsProgressChip.tsx
import * as React from "react";
import { Progress } from "@/components/ui/progress";

export default function PointsProgressChip({
  userPoints,
  requiredPoints,
}: {
  userPoints: number;
  requiredPoints: number;
}) {
  if (!requiredPoints || requiredPoints <= 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs bg-white">
        <span className="font-medium">No points required</span>
      </div>
    );
  }

  const need = Math.max(0, requiredPoints - (userPoints || 0));
  const pct = Math.max(
    0,
    Math.min(100, Math.round(((userPoints || 0) / requiredPoints) * 100))
  );

  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs bg-white">
      <span className="tabular-nums font-medium">
        {Math.max(0, userPoints || 0)} / {requiredPoints} pts
      </span>
      <div className="w-20">
        <Progress className="h-1" value={pct} />
      </div>
      {need > 0 ? (
        <span className="text-[11px] text-gray-600">Need {need} more</span>
      ) : (
        <span className="text-[11px] text-emerald-600">Ready</span>
      )}
    </div>
  );
}
