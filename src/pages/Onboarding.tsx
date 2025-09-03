// src/pages/Onboarding.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Profile = {
  id: string;
  email: string | null;
  alias: string | null;
  country: string | null;
  state: string | null;
  terms_accepted_at: string | null;
  marketing_opt_in: boolean | null;
  stripe_customer_id: string | null;
};

const ALIAS_MIN = 3;
const ALIAS_MAX = 20;
const aliasPattern = /^[a-zA-Z0-9_]+$/;

const COUNTRIES = [
  { code: "AU", name: "Australia" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "NZ", name: "New Zealand" },
  { code: "GB", name: "United Kingdom" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
];

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND",
  "OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

function detectCountryCode(): string | null {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || "";
    const m = loc.match(/-([A-Z]{2})$/i);
    return m ? m[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

/** ---- Create Stripe customer (server function) if needed ---- */
async function createStripeCustomerIfNeeded(alias: string) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;
  if (!token) return;
  try {
    await fetch("/.netlify/functions/create-stripe-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: alias }),
    });
  } catch {
    // non-blocking
  }
}

/** ---- suggest alternates when a collision happens ---- */
function suggestAliases(base: string): string[] {
  const clean = (base || "").replace(/[^A-Za-z0-9_]/g, "").slice(0, ALIAS_MAX);
  const rnd = () => Math.floor(10 + Math.random() * 89);
  const rnd3 = () => Math.floor(100 + Math.random() * 900);
  const baseShort = clean.length > ALIAS_MAX - 3 ? clean.slice(0, ALIAS_MAX - 3) : clean;

  const options = new Set<string>();
  if (clean) {
    options.add(clean + rnd());
    options.add(clean + "_" + rnd3());
    options.add(baseShort + rnd3());
  }
  return Array.from(options).slice(0, 3);
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  const [alias, setAlias] = useState("");
  const [country, setCountry] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const [aliasOK, setAliasOK] = useState<null | boolean>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // email verify nudge
  const [emailAddr, setEmailAddr] = useState<string>("");
  const [emailVerified, setEmailVerified] = useState<boolean>(true);
  const [resending, setResending] = useState(false);

  // alias suggestions on collision
  const [aliasSuggestions, setAliasSuggestions] = useState<string[]>([]);

  const isAU = country === "Australia";
  const isUS = country === "United States";

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) { setLoading(false); return; }

      // auth user info (email + verification)
      const { data: uinfo } = await supabase.auth.getUser();
      const u = uinfo?.user;
      setEmailAddr(u?.email || "");
      // supabase-js v2 exposes email_confirmed_at
      setEmailVerified(Boolean((u as any)?.email_confirmed_at));

      // profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (error) setErr(error.message);
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setAlias(p.alias ?? "");

        const detected = detectCountryCode();
        const detectedName = detected && COUNTRIES.find(c => c.code === detected)?.name;

        setCountry(p.country ?? detectedName ?? "Australia");
        setStateRegion(p.state ?? "");
        setAccepted(Boolean(p.terms_accepted_at));
        setMarketing(Boolean(p.marketing_opt_in));
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const aliasIssues = useMemo(() => {
    if (!alias) return "Alias is required.";
    if (alias.length < ALIAS_MIN) return `Must be at least ${ALIAS_MIN} characters.`;
    if (alias.length > ALIAS_MAX) return `Must be at most ${ALIAS_MAX} characters.`;
    if (!aliasPattern.test(alias)) return "Use letters, numbers, or underscore only.";
    return null;
  }, [alias]);

  const canSave = !aliasIssues && accepted && !saving;

  async function checkAlias() {
    setAliasOK(null);
    setErr(null);
    setAliasSuggestions([]);
    if (aliasIssues) return;

    if (profile?.alias && profile.alias.toLowerCase() === alias.toLowerCase()) {
      setAliasOK(true);
      return;
    }

    const { data, error } = await supabase.rpc("check_alias_available", { p_alias: alias });
    if (error) setErr(error.message);
    setAliasOK(error ? null : Boolean(data));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    setAliasSuggestions([]);
    try {
      if (aliasIssues) throw new Error(aliasIssues);
      if (!accepted) throw new Error("You must accept the Terms & Conditions.");

      // Only re-check if alias changed
      if (!profile?.alias || profile.alias.toLowerCase() !== alias.toLowerCase()) {
        const { data, error } = await supabase.rpc("check_alias_available", { p_alias: alias });
        if (error) throw error;
        if (!data) throw new Error("Alias is taken. Please choose another.");
      }

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          alias: alias.trim(),
          country: country || null,
          state: stateRegion || null,
          marketing_opt_in: marketing,
          terms_accepted_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (upErr) {
        const code = (upErr as any)?.code || (upErr as any)?.details?.code;
        if (code === "23505" || String(upErr?.message || "").toLowerCase().includes("duplicate key")) {
          setErr("That alias was just claimed by someone else. Try one of these:");
          setAliasSuggestions(suggestAliases(alias));
        } else {
          throw upErr;
        }
      } else {
        setMsg("Profile saved.");
        toast.success("Onboarding complete — welcome!");
        // Create Stripe customer (non-blocking)
        createStripeCustomerIfNeeded(alias.trim());
        // Bounce into app
        navigate("/dashboard", { replace: true });
      }
    } catch (e: any) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function acceptSuggestion(s: string) {
    setAlias(s);
    setAliasOK(null);
    setAliasSuggestions([]);
    await checkAlias();
    save();
  }

  async function resendVerification() {
    if (!emailAddr) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailAddr,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      toast.success("Verification email sent.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  }

  if (!user) return <div className="p-6">Please sign in to continue.</div>;
  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Complete your profile</h1>
      <p className="text-sm text-gray-600">
        Set your public alias for the leaderboard, add your location, and accept the Terms &amp; Conditions.
      </p>

      {/* Verify email nudge */}
      {!emailVerified && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Please verify your email <span className="font-medium">{emailAddr}</span> to secure your account.
          <button
            onClick={resendVerification}
            className="ml-2 underline"
            disabled={resending}
            title="Resend verification email"
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        </div>
      )}

      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
          {aliasSuggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {aliasSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => acceptSuggestion(s)}
                  className="rounded-md border px-2 py-1 text-xs bg-white hover:bg-gray-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {msg && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}

      {/* Alias */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Alias (public)</label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border px-3 py-2"
            placeholder="e.g. WineWizard_23"
            value={alias}
            onChange={(e) => { setAlias(e.target.value); setAliasOK(null); setAliasSuggestions([]); }}
            onBlur={checkAlias}
          />
          <button type="button" onClick={checkAlias} className="rounded-md border px-3 py-2 text-sm">
            Check
          </button>
        </div>
        <div className="text-xs text-gray-500">
          {aliasIssues ? aliasIssues :
            aliasOK === true ? "Alias is available ✓" :
            aliasOK === false ? "Alias is taken ✗" :
            " "}
        </div>
      </div>

      {/* Country */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Country</label>
        <select
          className="w-full rounded-md border px-3 py-2 bg-white"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setStateRegion("");
          }}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.name}>{c.name}</option>
          ))}
          <option value="">Other / Not listed</option>
        </select>
      </div>

      {/* State / Region */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">State / Region</label>
        {(isAU || isUS) ? (
          <select
            className="w-full rounded-md border px-3 py-2 bg-white"
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
          >
            <option value="">{isAU ? "Select a state/territory" : "Select a state"}</option>
            {(isAU ? AU_STATES : US_STATES).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        ) : (
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="e.g. SA, Ontario, Seoul…"
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
          />
        )}
        <div className="text-xs text-gray-500">Used for regional stats and localised challenges.</div>
      </div>

      {/* Marketing opt-in */}
      <div className="flex items-center gap-2">
        <input
          id="marketing"
          type="checkbox"
          className="h-4 w-4"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
        />
        <label htmlFor="marketing" className="text-sm">
          I’d like to receive tips and updates (optional).
        </label>
      </div>

      {/* Terms */}
      <div className="flex items-start gap-2">
        <input
          id="tcs"
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <label htmlFor="tcs" className="text-sm">
          I accept the <a className="underline" href="/terms" target="_blank" rel="noreferrer">Terms &amp; Conditions</a>.
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={!canSave}
          onClick={save}
          className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-50"
          title={!accepted ? "Please accept the Terms first" : aliasIssues ? aliasIssues : "Save your profile"}
        >
          {saving ? "Saving…" : "Save & Continue"}
        </button>
        <a href="/" className="rounded-md border px-4 py-2">Skip for now</a>
      </div>

      <div className="text-xs text-gray-500">
        Your alias appears on public leaderboards. You can change it later unless someone else has claimed it.
      </div>
    </div>
  );
}
