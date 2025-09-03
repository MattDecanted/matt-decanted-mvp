// src/pages/ModulesIndex.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Gate, LockBadge } from "@/components/LockGate";
import type { Tier } from "@/lib/entitlements";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PointsProgressChip from "@/components/PointsProgressChip";
import EmptyState from "@/components/EmptyState";
import SkeletonRows from "@/components/SkeletonRows";
import CrownChip from "@/components/CrownChip";
import CornerRibbon from "@/components/CornerRibbon";
import UpgradeModal from "@/components/UpgradeModal";
import { useEntitlement } from "@/hooks/useEntitlement";
import { getLastModuleSlug } from "@/hooks/useLocalProgress";

type ModuleRow = {
  slug: string;
  title: string;
  summary: string | null;
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

function fmtDate(d: Date | null) {
  if (!d || Number.isNaN(d.getTime())) return "";
  // Light, locale-friendly date (no time) — tweak as you like
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ModulesIndex() {
  const { profile } = useAuth() as any;
  const userTier: Tier = (profile?.membership_tier || "free") as Tier;

  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const lastModule = getLastModuleSlug();

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Pull created_at/updated_at so we can show “Last updated”
      const { data: modulesData } = await supabase
        .from("content_modules")
        .select("slug, title, summary, required_points, required_tier, is_active, created_at, updated_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const rows = (modulesData || []) as ModuleRow[];
      setRows(rows);

      // Compute lastUpdated from the most recent updated_at (fall back to created_at)
      const latest = rows
        .map((m) => new Date(m.updated_at || m.created_at || 0))
        .filter((d) => !Number.isNaN(d.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;
      setLastUpdated(latest ?? null);

      const { data: me } = await supabase.auth.getUser();
      const uid = me?.user?.id;
      if (uid) {
        const { data: pt } = await supabase
          .from("user_points_totals_v1")
          .select("total_points")
          .eq("user_id", uid)
          .maybeSingle();
        setUserPoints(Number(pt?.total_points ?? 0));
      }
      setLoading(false);
    })();
  }, []);

  const totalActive = useMemo(() => rows.length, [rows]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Modules</h1>
        <SkeletonRows />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Modules</h1>
        <div className="text-xs text-gray-500">
          {totalActive > 0 && <>Updated {fmtDate(lastUpdated)}</>}
        </div>
      </div>
      <p className="text-sm text-gray-600">
        Structured learning modules. Some items may be locked based on your membership and points.
      </p>

      {/* Continue banner */}
      {lastModule && (
        <div className="rounded-lg border bg-white px-4 py-3 flex items-center justify-between">
          <div className="text-sm">Continue where you left off?</div>
          <Button asChild><a href={`/modules/${lastModule}`}>Resume</a></Button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No modules yet"
          description="We’re assembling course modules now. Earn points to be ready when they drop."
          ctaText="Play Daily Quiz"
          ctaHref="/daily-quiz"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map((m) => {
            const premiumTier =
              m.required_tier !== "free" ? (m.required_tier as "pro" | "vip") : null;
            const { locked } = useEntitlement({
              userTier,
              userPoints,
              requiredTier: m.required_tier,
              requiredPoints: m.required_points,
            });

            return (
              <Card key={m.slug} className="relative overflow-hidden">
                {premiumTier && <CornerRibbon label={premiumTier.toUpperCase()} />}
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {m.title}
                        {premiumTier && <CrownChip tier={premiumTier} />}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {m.summary ?? "Coming soon…"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <LockBadge
                        requiredTier={m.required_tier}
                        requiredPoints={m.required_points}
                      />
                      <PointsProgressChip
                        userPoints={userPoints}
                        requiredPoints={m.required_points}
                      />
                    </div>
                  </div>

                  <Gate
                    userTier={userTier}
                    userPoints={userPoints}
                    requiredTier={m.required_tier}
                    requiredPoints={m.required_points}
                    telemetry={{ kind: "module", slug: m.slug }}
                    fallback={
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => (window.location.href = "/daily-quiz")}
                        >
                          Earn points
                        </Button>
                        <Button onClick={() => setUpgradeOpen(true)}>
                          Upgrade
                        </Button>
                      </div>
                    }
                  >
                    <a
                      href={`/modules/${m.slug}`}
                      className="inline-block rounded-md bg-black text-white px-3 py-2 text-sm"
                    >
                      {locked ? "View" : "Open module"}
                    </a>
                  </Gate>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
