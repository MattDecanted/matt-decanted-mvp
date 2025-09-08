// src/pages/AccountPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";
import { supabase } from "@/lib/supabase";
import { fetchTrialStatus, type TrialStatus } from "@/lib/membership";

const TIERS = [
  { key: "novice",        label: "Novice",        min: 0 },
  { key: "enthusiast",    label: "Enthusiast",    min: 100 },
  { key: "scholar",       label: "Scholar",       min: 300 },
  { key: "connoisseur",   label: "Connoisseur",   min: 700 },
  { key: "maestro",       label: "Maestro",       min: 1200 },
];

type FormState = {
  alias: string;
  name: string; // -> profiles.first_name or display_name
  bio: string;
  country: string;
  state: string;
  accept_terms: boolean;
};

type SchemaInfo = {
  hasAlias: boolean;
  nameField: "display_name" | "first_name" | null;
  hasBio: boolean;
  hasCountry: boolean;
  hasState: boolean;
  hasTermsAcceptedAt: boolean;
};

type BadgeRow = Record<string, any>; // we render common fields gracefully

function looksLikeUrl(s?: string | null) {
  if (!s) return false;
  return /^https?:\/\//i.test(s) || s.startsWith("/") || s.startsWith("data:");
}

export default function AccountPage() {
  const { user, loading, profile, refreshProfile } = useAuth();
  const pointsCtx = usePoints?.();
  const location = useLocation();

  // --- schema + badges state ---
  const [schema, setSchema] = useState<SchemaInfo>({
    hasAlias: true,
    nameField: "first_name",
    hasBio: false,
    hasCountry: true,
    hasState: true,
    hasTermsAcceptedAt: true,
  });
  const [badges, setBadges] = useState<BadgeRow[]>([]);

  // --- plan/trial via RPC (preferred) with fallback to profiles.* ---
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [fallbackTrialStart, setFallbackTrialStart] = useState<string | null>(null);
  const [fallbackTier, setFallbackTier] = useState<string | null>(null);

  // Keep Account in sync with navbar: refresh points once on mount
  useEffect(() => {
    (pointsCtx as any)?.refreshPoints?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Introspect schema + read badges + trial
  useEffect(() => {
    (async () => {
      if (!user) return;

      // schema (+ fallback plan fields on profiles)
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();

        const keys = Object.keys(data || {});
        const nameField = keys.includes("display_name")
          ? ("display_name" as const)
          : keys.includes("first_name")
          ? ("first_name" as const)
          : null;

        setSchema({
          hasAlias: keys.includes("alias"),
          nameField,
          hasBio: keys.includes("bio"),
          hasCountry: keys.includes("country") || keys.includes("country_code"),
          hasState: keys.includes("state"),
          hasTermsAcceptedAt: keys.includes("terms_accepted_at"),
        });

        // fallback values used only if RPC not available
        setFallbackTrialStart((data as any)?.trial_started_at ?? null);
        setFallbackTier((data as any)?.membership_tier ?? null);
      } catch {}

      // Plan/trial via RPC trial_status
      try {
        const t = await fetchTrialStatus();
        setTrial(t);
      } catch (e) {
        console.warn("[Account] trial_status RPC failed, using profiles fallback", e);
        setTrial(null);
      }

      // badges — load whatever columns exist
      const merged: BadgeRow[] = [];
      try {
        const { data } = await supabase
          .from("user_badges")
          .select("code,name,description,icon,category,level,created_at,tier,user_id,badge_code,awarded_at,evidence")
          .eq("user_id", user.id)
          .order("awarded_at", { ascending: false } as any);
        if (Array.isArray(data)) merged.push(...data);
      } catch {
        /* ignore if table/policy missing */
      }
      try {
        const { data } = await supabase
          .from("badges_earned")
          .select("*")
          .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
          .order("earned_at", { ascending: false } as any);
        if (Array.isArray(data)) merged.push(...data);
      } catch {}

      // unique
      const seen = new Set<string>();
      const unique: BadgeRow[] = [];
      for (const b of merged) {
        const key =
          String(b.id ?? b.badge_id ?? b.badge_code ?? b.code ?? JSON.stringify(b));
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(b);
        }
      }
      setBadges(unique);
    })();
  }, [user]);

  // Points: match the navbar (PointsContext), fallback 0
  const pointsLoading = Boolean((pointsCtx as any)?.loading);
  const pointsValue =
    (pointsCtx as any)?.totalPoints ??
    (pointsCtx as any)?.points ??
    (pointsCtx as any)?.balance ??
    0;

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

  // Trial/Plan label: prefer RPC; fallback to profiles.*
  const trialLabel = useMemo(() => {
    if (trial) {
      if (trial.is_trial) {
        const days = trial.days_left ?? (() => {
          if (!trial.trial_expires_at) return null;
          const ms = new Date(trial.trial_expires_at).getTime() - Date.now();
          return Math.max(0, Math.ceil(ms / 86400000));
        })();
        const d = days ?? "?";
        return `Trial: ${d} day${d === 1 ? "" : "s"} left`;
      }
      const tierName = (trial.tier || "FREE").toUpperCase();
      return `Plan: ${tierName}`;
    }

    // fallback
    if (!fallbackTrialStart) {
      return fallbackTier ? `Plan: ${fallbackTier}` : "Plan: FREE";
    }
    const start = new Date(fallbackTrialStart).getTime();
    const end = start + 7 * 86400000; // 7 days
    const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / 86400000));
    return `Trial: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  }, [trial, fallbackTrialStart, fallbackTier]);

  // Form seed (map to first_name if present)
  const initial: FormState = useMemo(
    () => ({
      alias: profile?.alias ?? "",
      name:
        (profile as any)?.display_name ??
        (profile as any)?.first_name ??
        "",
      bio: (profile as any)?.bio ?? "",
      country: (profile as any)?.country ?? "",
      state: (profile as any)?.state ?? "",
      accept_terms: Boolean((profile as any)?.terms_accepted_at),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      profile?.alias,
      (profile as any)?.display_name,
      (profile as any)?.first_name,
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

  const canSave = form.alias.trim().length > 0 && form.name.trim().length > 0 && !saving;

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
      if (schema.nameField) patch[schema.nameField] = form.name.trim();
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

  // Badge display helpers
  function badgeKey(b: BadgeRow) {
    return String(b.id ?? b.badge_id ?? b.badge_code ?? b.code ?? JSON.stringify(b));
  }
  function badgeTitle(b: BadgeRow) {
    return b.name ?? b.code ?? "Badge";
  }
  function badgeDate(b: BadgeRow) {
    const s = b.awarded_at ?? b.created_at ?? b.earned_at ?? null;
    return s ? new Date(s).toLocaleDateString() : null;
  }
  function badgeIconNode(b: BadgeRow) {
    const icon = b.icon;
    if (looksLikeUrl(icon)) {
      return (
        <img
          src={String(icon)}
          alt=""
          className="h-10 w-10 rounded"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
      );
    }
    return <span className="text-2xl leading-none">🏅</span>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      {/* Plan / Trial + Points */}
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
              <li key={badgeKey(b)} className="border rounded p-3 flex items-start gap-3">
                <div className="shrink-0">{badgeIconNode(b)}</div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{badgeTitle(b)}</div>
                  {(b.category || typeof b.level === "number") && (
                    <div className="mt-0.5 inline-flex items-center gap-2">
                      {b.category && (
                        <span className="text-[11px] rounded bg-gray-100 px-2 py-0.5 text-gray-700">
                          {b.category}
                        </span>
                      )}
                      {typeof b.level === "number" && (
                        <span className="text-[11px] rounded bg-gray-100 px-2 py-0.5 text-gray-700">
                          Lv {b.level}
                        </span>
                      )}
                    </div>
                  )}
                  {badgeDate(b) && (
                    <div className="text-xs text-gray-600 mt-0.5">Earned {badgeDate(b)}</div>
                  )}
                  {b.description && (
                    <div className="text-xs text-gray-700 mt-1 line-clamp-3">
                      {b.description}
                    </div>
                  )}
                </div>
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
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your first name"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              We store this as <code>{schema.nameField ?? "first_name"}</code> in your profile.
            </p>
          </div>

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
                Skipped fields not in database: {skippedFields.join(", ")}.
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
