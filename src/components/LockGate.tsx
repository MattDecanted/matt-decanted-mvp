// src/components/LockGate.tsx
import * as React from "react";
import type { Tier } from "@/lib/entitlements";
import { Badge } from "@/components/ui/badge";
import { useAnalytics } from "@/context/AnalyticsContext";
import { tierMeets } from "@/hooks/useEntitlement";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type Telemetry = {
  kind?: string;      // 'short' | 'module' | 'game' | ...
  slug?: string;      // optional resource slug
  extra?: Record<string, any>;
};

type GateProps = {
  userTier: Tier;
  userPoints: number;
  requiredTier: Tier;
  requiredPoints: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;

  /** Optional: will emit gate_view, gate_denied/unlocked */
  telemetry?: Telemetry;
};

export function Gate({
  userTier,
  userPoints,
  requiredTier,
  requiredPoints,
  children,
  fallback = null,
  telemetry,
}: GateProps) {
  const { track } = useAnalytics();
  const meetsTier = tierMeets(userTier, requiredTier);
  const meetsPoints = Math.max(0, Number(requiredPoints || 0) - Number(userPoints || 0)) <= 0;
  const locked = !(meetsTier && meetsPoints);

  // avoid spammy duplicate events
  const prevRef = React.useRef<{ locked: boolean | null; sig: string | null }>({
    locked: null,
    sig: null,
  });

  React.useEffect(() => {
    if (!track) return;

    const payload = {
      kind: telemetry?.kind ?? "content",
      slug: telemetry?.slug,
      user_tier: userTier,
      user_points: userPoints,
      required_tier: requiredTier,
      required_points: requiredPoints,
      locked,
      ...telemetry?.extra,
    };

    const sig = JSON.stringify(payload);
    // gate_view always on change of dependencies
    if (prevRef.current?.sig !== sig) {
      track("gate_view", payload);
      prevRef.current.sig = sig;
    }
    // fire transition-only events
    if (prevRef.current.locked === null || prevRef.current.locked !== locked) {
      track(locked ? "gate_denied" : "gate_unlocked", payload);
      prevRef.current.locked = locked;
    }
  }, [locked, telemetry?.kind, telemetry?.slug, telemetry?.extra, userTier, userPoints, requiredTier, requiredPoints, track]);

  return locked ? <>{fallback}</> : <>{children}</>;
}

/* ------------------------------ LockBadge UI ----------------------------- */

export function LockBadge({
  requiredTier,
  requiredPoints,
  className,
}: {
  requiredTier: Tier;
  requiredPoints: number;
  className?: string;
}) {
  const needTier =
    requiredTier && requiredTier !== "free" ? requiredTier.toUpperCase() : null;
  const needPts = Number(requiredPoints || 0) > 0 ? Number(requiredPoints) : null;

  if (!needTier && !needPts) {
    return (
      <Badge variant="secondary" className={cx("text-xs", className)}>
        Free
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={cx("text-xs", className)}>
      {needTier ? `${needTier}` : null}
      {needTier && needPts ? " • " : null}
      {needPts ? `${needPts} pts` : null}
    </Badge>
  );
}
