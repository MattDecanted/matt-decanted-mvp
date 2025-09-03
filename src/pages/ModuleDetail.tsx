import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Gate, LockBadge } from "@/components/LockGate";
import type { Tier } from "@/lib/entitlements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ModuleRow = {
  slug: string;
  title: string;
  summary: string | null;
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
};

export default function ModuleDetail() {
  const { slug } = useParams();
  const { profile } = useAuth() as any;
  const userTier: Tier = (profile?.membership_tier || "free") as Tier;

  const [row, setRow] = useState<ModuleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<number>(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("content_modules")
        .select("slug, title, summary, required_points, required_tier, is_active")
        .eq("slug", slug)
        .single();
      if (!error && data) setRow(data as ModuleRow);

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
  }, [slug]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!row) return <div className="p-6">Not found.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold">{row.title}</h1>
        <LockBadge requiredTier={row.required_tier} requiredPoints={row.required_points} />
      </div>
      <p className="text-sm text-gray-600">{row.summary ?? "Module overview goes here."}</p>

      <Gate
        userTier={userTier}
        userPoints={userPoints}
        requiredTier={row.required_tier}
        requiredPoints={row.required_points}
        fallback={
          <div className="rounded-md border p-4 bg-gray-50">
            <div className="mb-2 font-medium">This module is locked.</div>
            <div className="text-sm text-gray-600">
              Earn points via the Daily Quiz or upgrade your membership to unlock.
            </div>
            <div className="mt-3 flex gap-2">
              <a className="rounded-md border px-3 py-2 text-sm" href="/daily-quiz">Earn points</a>
              <a className="rounded-md bg-black text-white px-3 py-2 text-sm" href="/pricing">Upgrade</a>
            </div>
          </div>
        }
      >
        {/* 🔓 Unlocked module body placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Module Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-700">
              Lessons, videos, and assessments will appear here.
            </p>
          </CardContent>
        </Card>
      </Gate>
    </div>
  );
}
