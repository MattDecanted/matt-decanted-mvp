// src/pages/ShortsPage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";
import type { Tier } from "@/lib/entitlements";
import { LockBadge } from "@/components/LockGate";
import PointsProgressChip from "@/components/PointsProgressChip";
import EmptyState from "@/components/EmptyState";
import SkeletonRows from "@/components/SkeletonRows";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CrownChip from "@/components/CrownChip";
import CornerRibbon from "@/components/CornerRibbon";
import UpgradeModal from "@/components/UpgradeModal";
import { useEntitlement } from "@/hooks/useEntitlement";
import { getLastShortSlug } from "@/hooks/useLocalProgress";

type ShortRow = {
  id: string;
  slug: string;
  title: string;
  preview: boolean;
  is_published: boolean;
};

type ShortGate = {
  slug: string;
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
};

export default function ShortsPage() {
  const { user, profile } = useAuth() as any;
  const userTier: Tier = (profile?.membership_tier || "free") as Tier;

  const { totalPoints, refreshPoints } = (usePoints() as any) || {};
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<ShortRow[]>([]);
  const [gates, setGates] = React.useState<Record<string, ShortGate>>({});
  const [userPoints, setUserPoints] = React.useState<number>(0);

  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const lastSlug = getLastShortSlug();

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: shorts } = await supabase
        .from("shorts")
        .select("id, slug, title, preview, is_published")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      setRows((shorts || []) as ShortRow[]);

      const { data: meta } = await supabase
        .from("content_shorts")
        .select("slug, required_points, required_tier, is_active");
      const map: Record<string, ShortGate> = {};
      (meta || []).forEach((m: any) => (map[m.slug] = {
        slug: m.slug,
        required_points: Number(m.required_points ?? 0),
        required_tier: (m.required_tier ?? "free") as Tier,
        is_active: Boolean(m.is_active ?? true),
      }));
      setGates(map);

      let pts = Number(totalPoints ?? 0);
      if (!pts && user?.id) {
        const { data: pt } = await supabase
          .from("user_points_totals_v1")
          .select("total_points")
          .eq("user_id", user.id)
          .maybeSingle();
        pts = Number(pt?.total_points ?? 0);
      }
      setUserPoints(pts);
      if (refreshPoints) refreshPoints();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // compute deltas via hook
  const lockDeltas = React.useMemo(() => {
    const ds: number[] = [];
    rows.forEach((r) => {
      const g = gates[r.slug];
      if (!g || !g.is_active) return;
      const { locked, pointsDelta } = useEntitlement({
        userTier,
        userPoints,
        requiredTier: g.required_tier,
        requiredPoints: g.required_points
      });
      if (locked) ds.push(pointsDelta);
    });
    return ds.sort((a, b) => a - b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, gates, userTier, userPoints]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Short Videos</h1>
        <div className="text-sm text-gray-600">
          {user ? <span className="tabular-nums">{userPoints}</span> : <Link className="underline" to="/signin">Sign in</Link>} points
        </div>
      </div>

      {/* Continue banner */}
      {lastSlug && (
        <div className="rounded-lg border bg-white px-4 py-3 flex items-center justify-between">
          <div className="text-sm">Continue where you left off?</div>
          <Button asChild><Link to={`/shorts/${lastSlug}`}>Resume</Link></Button>
        </div>
      )}

      {/* Sticky upsell when there are locked items */}
      {lockDeltas.length > 0 && (
        <div className="sticky top-2 z-[1]">
          <div className="rounded-lg border bg-white px-4 py-3 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">Some videos are locked.</span>{" "}
              {user ? <>Earn <span className="tabular-nums">{lockDeltas[0]}</span> more points to unlock the easiest one.</> : <>Sign in to start earning points.</>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild><a href="/daily-quiz">Earn points</a></Button>
              <Button onClick={() => setUpgradeOpen(true)}>Upgrade</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No videos yet"
          description="New content is being prepared. In the meantime, earn points with the Daily Quiz."
          ctaText="Play Daily Quiz"
          ctaHref="/daily-quiz"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map((s) => {
            const g = gates[s.slug] || { required_points: 0, required_tier: "free" as Tier, is_active: true };
            const { locked } = useEntitlement({
              userTier,
              userPoints,
              requiredTier: g.required_tier,
              requiredPoints: g.required_points
            });
            const premiumTier = g.required_tier !== "free" ? (g.required_tier as "pro" | "vip") : null;

            return (
              <Card key={s.id} className="relative overflow-hidden">
                {premiumTier && <CornerRibbon label={premiumTier.toUpperCase()} />}

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {s.title}
                        {premiumTier && <CrownChip tier={premiumTier} />}
                      </div>
                      <div className="mt-1">
                        {s.preview && <Badge variant="outline">Preview</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <LockBadge requiredTier={g.required_tier} requiredPoints={g.required_points} />
                      <PointsProgressChip userPoints={userPoints} requiredPoints={g.required_points} />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild><Link to={`/shorts/${s.slug}`}>{locked ? "View" : "Open"}</Link></Button>
                    {premiumTier ? (
                      <Button variant="outline" onClick={() => setUpgradeOpen(true)}>Upgrade</Button>
                    ) : (
                      <Button variant="outline" asChild><a href="/daily-quiz">Earn points</a></Button>
                    )}
                  </div>
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
