import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Gate, LockBadge } from "@/components/LockGate";
import { Tier } from "@/lib/entitlements";

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
  const { profile, pointsTotal } = useAuth() as any;
  const [row, setRow] = useState<ModuleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const userTier: Tier = (profile?.membership_tier || 'free') as Tier;
  const userPoints = Number(pointsTotal ?? 0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("content_modules")
        .select("slug, title, summary, required_points, required_tier, is_active")
        .eq("slug", slug)
        .single();
      if (!error && data) setRow(data as any);
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
      >
        {/* 🔓 Unlocked module body placeholder */}
        <div className="rounded-md border p-4 bg-white">
          <div className="font-medium mb-2">Module Content</div>
          <p className="text-sm text-gray-700">Lesson videos, text, and quizzes will appear here.</p>
        </div>
      </Gate>
    </div>
  );
}
