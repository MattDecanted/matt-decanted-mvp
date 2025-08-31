// src/pages/DebugAuth.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, setSessionFromHash } from "@/lib/supabase";

function mask(s?: string | null, keep = 6) {
  if (!s) return "∅";
  if (s.length <= keep * 2) return s;
  return `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

export default function DebugAuth() {
  const navigate = useNavigate();
  const loc = useLocation();

  const [envOk, setEnvOk] = React.useState<boolean | null>(null);
  const [sbOk, setSbOk] = React.useState<boolean | null>(null);

  const [rawHash, setRawHash] = React.useState<string>(typeof window !== "undefined" ? window.location.hash : "");
  const [parsed, setParsed] = React.useState<{
    type?: string | null;
    access?: string | null;
    refresh?: string | null;
    expires_at?: string | null;
    redirect_to?: string | null;
  }>({});

  const [sessionInfo, setSessionInfo] = React.useState<any>(null);
  const [userInfo, setUserInfo] = React.useState<any>(null);
  const [lastResult, setLastResult] = React.useState<{ ok: boolean; error?: any } | null>(null);
  const [events, setEvents] = React.useState<string[]>([]);

  // Parse hash + basic env/client checks
  React.useEffect(() => {
    setEnvOk(Boolean(import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY));
    setSbOk(!!(supabase as any)?.auth?.getSession);

    const h = (typeof window !== "undefined" ? window.location.hash : "") || "";
    setRawHash(h);
    const p = new URLSearchParams(h.replace(/^#/, ""));
    setParsed({
      type: p.get("type"),
      access: p.get("access_token"),
      refresh: p.get("refresh_token"),
      expires_at: p.get("expires_at"),
      redirect_to: p.get("redirect_to"),
    });
  }, [loc.key]);

  // Show current session and log auth state changes
  const refreshSession = React.useCallback(async () => {
    const { data, error } = await supabase.auth.getSession().catch((e: any) => ({ data: null, error: e }));
    setSessionInfo({ data, error });
    const { data: u } = await supabase.auth.getUser().catch(() => ({ data: null }));
    setUserInfo(u);
  }, []);

  React.useEffect(() => {
    refreshSession();
    const sub = supabase.auth.onAuthStateChange((ev, session) => {
      setEvents((e) => [`${new Date().toLocaleTimeString()} • ${ev}`, ...e]);
      setSessionInfo({ event: ev, session });
    });
    return () => sub.data.subscription?.unsubscribe();
  }, [refreshSession]);

  // Actions
  const handleSetFromHash = async () => {
    const { handled, error } = await setSessionFromHash(rawHash);
    setLastResult({ ok: handled && !error, error });
    await refreshSession();
  };

  const clearHash = () => {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setRawHash("");
    setParsed({});
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await refreshSession();
  };

  const goTarget = () => {
    const target = parsed.redirect_to || (parsed.type === "recovery" ? "/reset-password" : "/dashboard");
    navigate(target, { replace: true });
  };

  const hasTokens = Boolean(parsed.access && parsed.refresh);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Auth Debug</h1>

      <section className="rounded border p-4">
        <h2 className="font-semibold mb-2">Environment</h2>
        <div>VITE_SUPABASE_URL present: <b>{String(envOk)}</b></div>
        <div>Client .auth available: <b>{String(sbOk)}</b></div>
        <div className="text-xs text-gray-500 mt-2">
          URL: {mask(import.meta.env?.VITE_SUPABASE_URL)}<br />
          ANON: {mask(import.meta.env?.VITE_SUPABASE_ANON_KEY)}
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="font-semibold mb-2">URL Hash</h2>
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">{rawHash || "(no hash present)"}</pre>
        <div className="mt-2 text-sm">
          <div>type: <code>{parsed.type || "(none)"}</code></div>
          <div>access_token: <code title={parsed.access || ""}>{mask(parsed.access || "")}</code></div>
          <div>refresh_token: <code title={parsed.refresh || ""}>{mask(parsed.refresh || "")}</code></div>
          <div>expires_at: <code>{parsed.expires_at || "(none)"}</code></div>
          <div>redirect_to: <code>{parsed.redirect_to || "(none)"}</code></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={handleSetFromHash} disabled={!hasTokens} className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50">
            Set session from hash
          </button>
          <button onClick={clearHash} className="px-3 py-1.5 rounded border">Clear hash</button>
          <button onClick={goTarget} className="px-3 py-1.5 rounded border">Go to target (dashboard/reset)</button>
          <button onClick={refreshSession} className="px-3 py-1.5 rounded border">Refresh session</button>
          <button onClick={signOut} className="px-3 py-1.5 rounded border">Sign out</button>
        </div>
        <p className="text-xs mt-2 text-gray-600">
          Tip: open this page directly from your email link (it will include <code>#access_token</code> and <code>#refresh_token</code>).
        </p>
      </section>

      <section className="rounded border p-4">
        <h2 className="font-semibold mb-2">setSession result</h2>
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(lastResult, null, 2)}</pre>
      </section>

      <section className="rounded border p-4">
        <h2 className="font-semibold mb-2">Current session</h2>
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(sessionInfo, null, 2)}</pre>
      </section>

      <section className="rounded border p-4">
        <h2 className="font-semibold mb-2">User</h2>
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(userInfo, null, 2)}</pre>
      </section>

      <section className="rounded border p-4">
        <h2 className="font-semibold mb-2">Auth events</h2>
        <ul className="text-xs space-y-1">
          {events.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </section>

      <p className="text-xs text-gray-500">
        Expected when opened from a fresh email link: envOk=true, sbOk=true, tokens present, “Set session from hash” → ok, then a non-null user/session.
      </p>
    </div>
  );
}
