// src/hooks/useEntitlement.ts
import { useMemo } from "react";
import type { Tier } from "@/lib/entitlements";

export function tierMeets(userTier: Tier, requiredTier: Tier): boolean {
  if (requiredTier === "free") return true;
  if (requiredTier === "pro") return userTier === "pro" || userTier === "vip";
  if (requiredTier === "vip") return userTier === "vip";
  return false;
}

export function useEntitlement({
  userTier,
  userPoints,
  requiredTier,
  requiredPoints,
}: {
  userTier: Tier;
  userPoints: number;
  requiredTier: Tier;
  requiredPoints: number;
}) {
  return useMemo(() => {
    const meetsTier = tierMeets(userTier, requiredTier);
    const pointsDelta = Math.max(0, Number(requiredPoints || 0) - Number(userPoints || 0));
    const meetsPoints = pointsDelta <= 0;
    const locked = !(meetsTier && meetsPoints);
    return { meetsTier, meetsPoints, locked, pointsDelta };
  }, [userTier, userPoints, requiredTier, requiredPoints]);
}
