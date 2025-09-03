// src/components/LockGate.tsx
import React from "react";
import { hasAccess, Tier } from "@/lib/entitlements";

export function LockBadge({
  requiredTier,
  requiredPoints
}: { requiredTier: Tier; requiredPoints: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs">
      <span role="img" aria-label="lock">🔒</span>
      <span>
        Requires {requiredTier.toUpperCase()}
        {requiredPoints ? ` + ${requiredPoints} pts` : ""}
      </span>
    </div>
  );
}

export function Gate({
  children,
  userTier,
  userPoints,
  requiredTier,
  requiredPoints,
  fallback
}: {
  children: React.ReactNode;
  userTier: Tier;
  userPoints: number;
  requiredTier: Tier;
  requiredPoints: number;
  fallback?: React.ReactNode;
}) {
  const ok = hasAccess(userTier, userPoints, requiredTier, requiredPoints);
  if (ok) return <>{children}</>;
  return (
    <>
      {fallback ?? (
        <div className="rounded-md border p-4 bg-gray-50">
          <div className="mb-2 font-medium">This content is locked.</div>
          <LockBadge requiredTier={requiredTier} requiredPoints={requiredPoints} />
          <div className="mt-2 text-sm text-gray-600">
            Earn more points by playing Daily Quiz or upgrade your membership.
          </div>
        </div>
      )}
    </>
  );
}
