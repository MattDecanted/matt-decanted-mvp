// src/pages/AccountPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";
import { supabase } from "@/lib/supabase";

const TIERS = [
  { key: "novice", label: "Novice", min: 0 },
  { key: "enthusiast", label: "Enthusiast", min: 100 },
  { key: "scholar", label: "Scholar", min: 300 },
  { key: "connoisseur", label: "Connoisseur", min: 700 },
  { key: "maestro", label: "Maestro", min: 1200 },
];

type FormState = {
  alias: string;
  display_name: string;
  bio: string;
  country: string;
  state: string;
  accept_terms: boolean;
};

type SchemaFlags = {
  hasAlias: boolean;
  hasDisplayName: boolean;
  hasBio: boolean;
  hasCountry: boolean;
  hasState: boolean;
  hasTermsAcceptedAt: boolean;
};

type BadgeRow = { id?: string; title?: string; badge_key?: string; earned_at?: string };

export default function AccountPage() {
  const { user, loading, profile, refreshProfile } = useAuth();
  const pointsCtx = usePoints?.();
  const location = useLocation();

  const [schema, setSchema] = useState<SchemaFlags>({
    hasAlias: true,
    hasDisplayName: true,
    hasBio: false,
    hasCountry: false,
    hasState: false,
    hasTermsAcceptedAt: true,
  });

  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  // Keep Account in sync with the navbar: refresh points once when page opens
  useEffect(() => {
    if ((pointsCtx as any)?.refreshPoints) {
      (pointsCtx as any).refreshPoints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inspect schema, badges, and trial info
  useEffect(() => {
    (async () => {
      if (!user) return;

      // schema (safe: select "*")
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();
        const keys = Object.keys(data || {});
        setSchema({
          hasAlias: keys.includes("alias") || true,
          hasDisplayName: keys.includes("display_name") || true,
          hasBio: keys.includes("bio"),
          hasCountry: keys.includes("country"),
          hasState: keys.includes("state"),
          hasTermsAcceptedAt: keys.includes("terms_accepted_at") || true,
        });
      } catch {
        /* ignore */
      }

      // badges (try common shapes; merge results)
      const setUnique = (arr: BadgeRow[]) => {
        const seen = new Set<string>();
        const out: BadgeRow[] = [];
        for (const b of arr) {
          const key = (b.id || b.badge_key || JSON.stringify(b)) as string;
          if (!seen.has(key)) {
            seen.add(key);
            out.push(b);
          }
        }
        return out;
      };

      const collected: BadgeRow[] = [];
      // user_badges by user_id
      try {
        const { data } = await supabase
          .from("user_badges")
          .select("id,title,badge_key,earned_at")
          .eq("user_id", user.id)
          .order("earned_at", { ascending: false });
        if (Array.isArray(data)) collected.push(...(data as any));
      } catch {}
      // user_badges by profile_id
      try {
        const { data } = await supabase
          .from("user_badges")
          .select("id,title,badge_key,earned_at")
          .eq("profile_id", user.id)
          .order("earned_at", { ascending: false });
        if (Array.isArray(data)) collected.push(...(data as any));
      } catch {}
      // badges_earned table (alt name)
      try {
        const { data } = await supabase
          .from("badges_earned")
          .select("id,title,badge_key,earned_at")
          .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
          .order("earned_at", { ascending: false });
        if (Array.isArray(data)) collected.push(...(data as any));
      } catch {}

      setBadges(setUnique(collected));

      // trial: first match wins
      const candidates: Array<() => Promise<{ end?: string | null; plan?: string | null }>> = [
        async () => {
          const end = (profile as any)?.trial_ends_at || null;
          const p = (profile as any)?.plan || null;
          return { end, plan: p };
        },
        async () => {
          const { data } = await supabase
            .from("memberships")
            .select("trial_ends_at,plan")
            .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
            .maybeSingle();
          return { end: data?.trial_ends_at || null, plan: data?.plan || null };
        },
        async () => {
          const { data } = await supabase
            .from("subscriptions")
            .select("trial_end,plan")
            .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
            .maybeSingle();
          return { end: data?.trial_end || null, plan: data?.plan || null };
        },
      ];

      for (const fn of candidates) {
        try {
          const { end, plan } = await fn();
          if (end) {
            setTrialEndsAt(end);
            if (plan) setPlan(plan);
            break;
          }
          if (plan && !trialEndsAt) setPlan(plan);
        } catch {}
      }
    })();
  }, [user, profile]);

  // Points = use the same source as the navbar (PointsContext), fallback to profile fields
  const pointsFromProfile =
    (profile as any)?.points_total ??
    (profile as any)?.points ??
    (profile as any)?.score ??
    (profile as any)?.xp ??
    0;

  const pointsLoading = Boolean((pointsCtx as any)?.loading);
  const pointsValue =
    (pointsCtx as any)?.totalPoints ??
    (pointsCtx as any)?.points ??
    (pointsCtx as any)?.balance ??
    pointsFromProfile;

  const currentTier = useMemo(() => {
    const p = Number(pointsValue || 0);
    let idx = 0;
    for (let i = 0; i < TIERS.length; i++) if (p >= TIERS[i].min) idx = i;
    return TIERS[idx];
  }, [pointsValue]);

  const nextTier = useMemo(() => {
    const idx = TIERS.findIndex((t) => t.key === currentTier.key);
    return TIERS[idx + 1] || null;
  }, [currentTier]);

  const progressPct = useMemo(() => {
    const p = Number(pointsValue || 0);
    if (!nextTier) return 100;
    const span = nextTier.min - currentTier.min;
    const pos = Math.max(0, Math.min(span, p - currentTier.min));
    return Math.round((pos / span) * 100);
  }, [pointsValue, currentTier, nextTier]);

  // Trial label
  const trialLabel = useMemo(() => {
    if (!trialEndsAt) return plan ? `Plan: ${plan}` : "Plan: FREE";
    const end = new Date(trialEndsAt);
    const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
    return `Trial: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  }, [trialEndsAt, plan]);

  // Form seed
  const initial: FormState = useMemo(
    () => ({
      alias: profile?.alias ?? "",
      display_name: profile?.display_name ?? "",
      bio: (profile as any)?.bio ?? "",
      country: (profile as any)?.country ?? "",
      state: (profile as any)?.state ?? "",
      accept_terms: Boolean((profile as any)?.terms_accepted_at),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      profile?.alias,
      profile?.display_name,
      (profile as any)?.bio,
      (profile as any)?.country,
      (profile as any)?.state,
      (profile as any)?.terms_accepted_at,
    ]
  );

  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [skippedFields, setSkippedFields] = useState<string[]>([]);

  useEffect(() => setForm(initial), [initial]);

  if (!loading && !user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  const canSave =
    form.alias.trim().length > 0 &&
    form.display_name.trim().length > 0 &&
    !saving;

  // Upsert w/out onConflict; drop unknown columns and retry.
  async function safeUpsert(payload: Record<string, any>) {
    const dropped: string[] = [];
    let body = { ...payload };
    let tries = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { error } = await supabase.from("profiles").upsert(body);
      if (!error) return { dropped };

      const msg = String(error.message || "");
      const m1 = msg.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i);
      const m2 = msg.match(/could not find the '([a-zA-Z0-9_]+)'\s+column/i);
      const bad = (m1?.[1] || m2?.[1]) as string | undefined;

      if (!bad || !(bad in body) || tries++ > 8) throw error;

      dropped.push(bad);
      const { [bad]: _omit, ...rest } = body;
      body = rest;
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSavedMsg(null);
    setErrorMsg(null);
    setSkippedFields([]);

    try {
      const patch: Record<string, any> = {
        id: user.id,
        user_id: user.id,
      };

      if (schema.hasAlias) patch.alias = form.alias.trim();
      if (schema.hasDisplayName) patch.display_name = form.display_name.trim();
      if (schema.hasBio) patch.bio = form.bio;
      if (schema.hasCountry) patch.country = form.country.trim();
      if (schema.hasState) patch.state = form.state.trim();
      if (schema.hasTermsAcceptedAt && form.accept_terms && !(profile as any)?.terms_accepted_at) {
        patch.terms_accepted_at = new Date().toISOString();
      }

      const { dropped } = await safeUpsert(patch);
      await refreshProfile();

      if (dropped.length) setSkippedFields(dropped);
      setSavedMsg("Profile saved.");
      setTimeout(() => setSavedMsg(null), 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      {/* Plan / Trial + Points (from PointsContext for consistency) */}
      <section className="bg-white rounded-lg shadow border p-6">
        <div className="text-sm text-gray-600 mb-2">{trialLabel}</div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-sm text-gray-600">Points</div>
            <div className="text-3xl font-bold">
              {pointsLoading ? "…" : Number(pointsValue || 0)}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600">
              Tier: <span className="font-semibold">{currentTier.label}</span>
              {nextTier ? (
                <> · Next: <span className="font-semibold">{nextTier.label}</span> at {nextTier.min}</>
              ) : (
                " · Top tier"
              )}
            </div>
            <div className="mt-2 h-3 w-full bg-gray-200 rounded">
              <div
                className="h-3 bg-gray-900 rounded"
                style={{ width: `${progressPct}%` }}
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold mb-3">Your badges</h2>
        {badges.length === 0 ? (
          <p className="text-sm text-gray-600">
            No badges yet. Play daily quiz, Swirdle, or Vino Vocab to earn your first badge.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {badges.map((b) => (
              <li key={b.id || b.badge_key} className="border rounded p-3">
                <div className="font-medium">{b.title || b.badge_key || "Badge"}</div>
                {b.earned_at && (
                  <div className="text-xs text-gray-600">
                    Earned {new Date(b.earned_at).toLocaleDateString()}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Profile form */}
      <section className="bg-white rounded-lg shadow border p-6">
        <form onSubmit={onSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Alias</label>
            <input
              className="w-full rounded border p-2"
              value={form.alias}
              onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
              placeholder="e.g. winefan123"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              <strong>Alias</strong> is your public handle shown on leaderboards and community posts.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input
              className="w-full rounded border p-2"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="Your name"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              <strong>Display name</strong> is how we greet you in the app (can be your real name).
            </p>
          </div>

          {/* Bio */}
          {schema.hasBio && (
            <div>
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea
                className="w-full rounded border p-2"
                rows={4}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Tell us a little about your wine journey..."
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Country (optional)</label>
              <input
                className="w-full rounded border p-2"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="For event planning"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State/Region (optional)</label>
              <input
                className="w-full rounded border p-2"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="For event planning"
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <input
              id="terms"
              type="checkbox"
              checked={form.accept_terms}
              onChange={(e) => setForm((f) => ({ ...f, accept_terms: e.target.checked }))}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I accept the{" "}
              <a href="/terms" className="underline">
                Terms of Service
              </a>
              .
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSave}
              className={`px-4 py-2 rounded text-white ${
                canSave ? "bg-gray-900 hover:opacity-95" : "bg-gray-400"
              }`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {savedMsg && <span className="text-sm text-green-600">{savedMsg}</span>}
            {errorMsg && <span className="text-sm text-red-600">{errorMsg}</span>}
            {skippedFields.length > 0 && !errorMsg && (
              <span className="text-xs text-amber-700">
                Note: skipped fields not present in your database: {skippedFields.join(", ")}.
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
