import React from "react";
import { supabase } from "@/lib/supabase";

function mask(s?: string | null, keep = 6) {
  if (!s) return "∅";
  return s.length <= keep ? s : `${s.slice(0, keep)}…`;
}

export default function DebugAuth() {
  const [envOk, setEnvOk] = React.useState<boolean | null>(null);
  const [sbOk, setSbOk] = React.useState<boolean | null>(null);
  const [hashInfo, setHashInfo] = React.useState<{ hasTokens: boolean; access?: string; refresh?: string }>({ hasTokens: false });
  const [sessionInfo, setSessionInfo] = React.useState<any>(null);
  const [setSessionResult, setSetSessionResult] = React.useState<{ ok: boolean; error?: any } | null>(null);
  const [userInfo, setUserInfo] = React.useState<any>(null);

  React.useEffect(() => {
    // 1) Is env present (client built with URL+anon key)?
    const url = (import.meta as any).env?.VITE_SUPABASE_URL;
    const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
    setEnvOk(Boolean(url && key));

    // 2) Does our client have .auth ?
    setSbOk(!!(supabase as any)?.auth?.getSession);

    // 3) Parse hash tokens
    const qp = new URLSearchParams(window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash);
    const access = qp.get("access_token") || undefined;
    const refresh = qp.get("refresh_token") || undefined;
    setHashInfo({ hasTokens: !!(access && refresh), access, refresh });

    (async () => {
      // 4) What is the current session?
      const { data: sess, error: sessErr } = await supabase.auth.getSession().catch((e: any) => ({ data: null, error: e }));
      setSessionInfo({ data: sess, error: sessErr });

      // 5) If tokens exist, try setSession now (without redirect)
      if (access && refresh) {
        const { data, error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh }).catch((e: any) => ({ data: null, error: e }));
        setSetSessionResult({ ok: !error, error });
        // fetch user after setting
        const { data: u } = await supabase.auth.getUser().catch(() => ({ data: null }));
        setUserInfo(u);
      } else {
        const { data: u } = await supabase.auth.getUser().catch(() => ({ data: null }));
        setUserInfo(u);
      }
    })();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Auth Debug</h1>

      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Environment</h2>
        <div>VITE_SUPABASE_URL present: <b>{String(envOk)}</b></div>
        <div>Client .auth available: <b>{String(sbOk)}</b></div>
        <div className="text-xs text-gray-500 mt-2">
          URL: {mask((import.meta as any).env?.VITE_SUPABASE_URL)} <br />
          ANON: {mask((import.meta as any).env?.VITE_SUPABASE_ANON_KEY)}
        </div>
      </section>

      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Hash tokens</h2>
        <div>hasTokens: <b>{String(hashInfo.hasTokens)}</b></div>
        <div className="text-xs text-gray-500">
          access_token: {mask(hashInfo.access)} <br />
          refresh_token: {mask(hashInfo.refresh)}
        </div>
        <p className="text-xs mt-2">Tip: open this page *with* the magic/recovery URL (#access_token=…&refresh_token=…).</p>
      </section>

      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Supabase session</h2>
        <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded">{JSON.stringify(sessionInfo, null, 2)}</pre>
      </section>

      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">setSession result</h2>
        <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded">{JSON.stringify(setSessionResult, null, 2)}</pre>
      </section>

      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">User</h2>
        <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded">{JSON.stringify(userInfo, null, 2)}</pre>
      </section>

      <p className="text-xs text-gray-500">
        Expected: envOk=true, sbOk=true, hasTokens=true (when opened from email), setSession ok=true, and a non-null user.
      </p>
    </div>
  );
}
