import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

/** Simple tier ladder. Adjust thresholds any time. */
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
  bio: string;        // UI only; saved iff column exists
  country: string;    // optional; saved iff column exists
  state: string;      // optional; saved iff column exists
  accept_terms: boolean;
};

type SchemaFlags = {
  hasAlias: boolean;
  hasDisplayName: boolean;
  hasBio: boolean;
  hasCountry: boolean;
  hasState: boolean;
  hasTermsAcceptedAt: boolean;
  pointsKey: string | null; // which key holds points
};

export default function AccountPage() {
  const { user, loading, profile, upsertProfile, refreshProfile } = useAuth();
  const location = useLocation();

  const [schema, setSchema] = useState<SchemaFlags>({
    hasAlias: true,
    hasDisplayName: true,
    hasBio: false,
    hasCountry: false,
    hasState: false,
    hasTermsAcceptedAt: true,
    pointsKey: null,
  });

  const [badges, setBadges] = useState<
    Array<{ id?: string; title?: string; badge_key?: string; earned_at?: string }>
  >([]);

  // Infer schema by reading your row once with select("*")
  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (error) {
        // If select("*") fails, keep defaults and let saves be minimal.
        console.warn("[Account] profiles select(*) error:", error.message);
        return;
      }
      const row = data || {};
      const keys = Object.keys(row);

      const pointsKey =
        ["points_total", "points", "score", "xp"].find((k) => keys.includes(k)) || null;

      setSchema({
        hasAlias: keys.includes("alias") || true, // assume true if missing; alias commonly exists
        hasDisplayName: keys.includes("display_name") || true,
        hasBio: keys.includes("bio"),
        hasCountry: keys.includes("country"),
        hasState: keys.includes("state"),
        hasTermsAcceptedAt: keys.includes("terms_accepted_at") || true,
        pointsKey,
      });

      // Try to load badges from a common table name
      try {
        const { data: b } = await supabase
          .from("user_badges")
          .select("id,title,badge_key,earned_at")
          .eq("user_id", user.id)
          .order("earned_at", { ascending: false });
        if (Array.isArray(b)) setBadges(b);
      } catch (e) {
        // no badges table; ignore
      }
    })();
  }, [user]);

  // Compute points from profile (try several possible keys)
  const points = useMemo(() => {
    if (!profile) return 0;
    return (
      (profile as any)?.points_total ??
      (profile as any)?.points ??
      (profile as any)?.score ??
      (profile as any)?.xp ??
      0
    );
  }, [profile]);

  const currentTier = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < TIERS.length; i++) {
      if (points >= TIERS[i].min) idx = i;
    }
    return TIERS[idx];
  }, [points]);

  const nextTier = useMemo(() => {
    const idx = TIERS.findIndex((t) => t.key === currentTier.key);
    return TIERS[idx + 1] || null;
  }, [currentTier]);

  const progressPct = useMemo(() => {
    if (!nextTier) return 100;
    const span = nextTier.min - currentTier.min;
    const pos = Math.max(0, Math.min(span, points - currentTier.min));
    return Math.round((pos / span) * 100);
  }, [points, currentTier, nextTier]);

  // Seed the form from loaded profile
  const initial: FormState = useMemo(
    () => ({
      alias: profile?.alias ?? "",
      display_name: profile?.display_name ?? "",
      bio: (profile as any)?.bio ?? "",
      country: (profile as any)?.country ?? "",
      state: (profile as any)?.state ?? "",
      accept_terms: Boolean((profile as any)?.terms_accepted_at),
    }),
    // only seed when these change
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

  // keep form in sync with profile arrival
  useEffect(() => {
    setForm(initial);
  }, [initial]);

  if (!loading && !user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  const canSave =
    form.alias.trim().length > 0 &&
    form.display_name.trim().length > 0 &&
    !saving;

  /** Try upsert; if we hit "column does not exist" errors, drop those fields and retry. */
  async function safeUpsert(patch: Record<string, any>) {
    const dropped: string[] = [];
    let payload = { ...patch };
    let tries = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (!error) {
        return { dropped };
      }
      const msg = String(error.message || "");
      // Try to parse which column failed
      const m1 = msg.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i);
      const m2 = msg.match(/could not find the '([a-zA-Z0-9_]+)'\s+column/i);
      const bad = (m1?.[1] || m2?.[1]) as string | undefined;
      if (!bad || !(bad in payload) || tries++ > 6) {
        throw error; // give up; unknown error
      }
      // Drop the offending field and retry
      dropped.push(bad);
      const { [bad]: _omit, ...rest } = payload;
      payload = rest;
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

      {/* Points + Tier progress */}
      <section className="bg-white rounded-lg shadow border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-sm text-gray-600">Points</div>
            <div className="text-3xl font-bold">{points}</div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600">
              Tier: <span className="font-semibold">{currentTier.label}</span>
              {nextTier ? (
                <>
                  {" "}
                  · Next: <span className="font-semibold">{nextTier.label}</span> at {nextTier.min}
                </>
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
          {/* Alias */}
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
              Alias is your public handle. It appears on leaderboards and community posts.
            </p>
          </div>

          {/* Display name */}
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
              Display name is how we greet you in the app. It can be your real name.
            </p>
          </div>

          {/* Bio (only render if column exists) */}
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

          {/* Country/State (optional; saved iff columns exist) */}
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

          {/* Terms */}
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

          {/* Buttons / Status */}
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
