// src/components/CrownChip.tsx
import * as React from "react";
import { Crown } from "lucide-react";

export default function CrownChip({
  tier,
}: {
  tier: "pro" | "vip";
}) {
  const label = tier.toUpperCase();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold"
      title={`${label} content`}
    >
      <Crown className="w-3 h-3" />
      {label}
    </span>
  );
}
