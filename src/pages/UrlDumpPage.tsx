// src/pages/UrlDumpPage.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type State =
  | { status: "idle" }
  | { status: "pkce"; code: string }
  | { status: "hash"; accessToken: string }
  | { status: "none" }
  | { status: "ok"; email?: string; userId?: string }
  | { status: "error"; message: string };

export default function UrlDumpPage() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [href, setHref] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    setHref(url.href);

    const code = url.searchParams.get("code");
    const hash = url.hash.replace(/^#/, "");
    const hp = new URLSearchParams(hash);
    const accessToken = hp.get("access_token") || "";
    const hashErr = hp.get("error") || hp.get("error_description");

    if (hashErr) {
      setState({ status: "error", message: `Provider error: ${hashErr}` });
      return;
    }
    if (code) {
      setState({ status: "pkce", code });
      return;
    }
    if (accessToken) {
      setState({ status: "hash", accessToken });
      return;
    }
    setState({ status: "none" });
  }, []);

  const exchangePkce = async () => {
    try {
      // Uses the full URL (with ?code=) as recommended by supabase-js v2
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) throw error;
      const { data } = await supabase.auth.getSession();
      setState({
        status: "ok",
        email: data.session?.user?.email,
        userId: data.session?.user?.id,
      });
      // Clean URL (no query/hash)
      const url = new URL(window.location.href);
      window.history.replaceState({}, document.title, url.pathname);
    } catch (e: any) {
      setState({ status: "error", message: e?.message || String(e) });
    }
  };

  const storeFromHash = async () => {
    try {
      // Manually parse #access_token / #refresh_token → setSession (works everywhere)
      const url = new URL(window.location.href);
      const hp = new URLSearchParams(url.hash.replace(/^#/, ""));
      const access_token = hp.get("access_token") || undefined;
      const refresh_token = hp.get("refresh_token") || undefined;
      const expires_in = Number(hp.get("expires_in") || "3600");
      const token_type = hp.get("token_type") || "bearer";

      if (!access_token || !refresh_token) {
        throw new Error("Missing access_token or refresh_token in URL hash.");
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
        expires_in,
        token_type,
      });
      if (error) throw error;

      const { data } = await supabase.auth.getSession();
      setState({
        status: "ok",
        email: data.session?.user?.email,
        userId: data.session?.user?.id,
      });

      // Clean hash
      window.history.replaceState({}, document.title, url.pathname + url.search);
    } catch (e: any) {
      setState({ status: "error", message: e?.message || String(e) });
    }
  };

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="rounded-xl border bg-white shadow p-6 space-y-4 max-w-xl w-full">
        <h1 className="text-lg font-semibold">Auth URL Debug</h1>

        <div className="text-xs break-all rounded bg-gray-50 p-2">{href}</div>

        {state.status === "pkce" && (
          <>
            <div className="text-sm">
              Detected: <b>PKCE</b> (<code>?code=…</code>)
            </div>
            <button
              className="rounded bg-black text-white px-4 py-2"
              onClick={exchangePkce}
            >
              Exchange code for session
            </button>
          </>
        )}

        {state.status === "hash" && (
          <>
            <div className="text-sm">
              Detected: <b>Implicit</b> (<code>#access_token=…</code>)
            </div>
            <button
              className="rounded bg-black text-white px-4 py-2"
              onClick={storeFromHash}
            >
              Store session from hash
            </button>
          </>
        )}

        {state.status === "none" && (
          <div className="text-sm text-red-600">
            No <code>?code=</code> or <code>#access_token</code> found. Request a fresh link.
          </div>
        )}

        {state.status === "ok" && (
          <div className="space-y-2">
            <div className="text-green-700">✅ Session stored.</div>
            <div className="text-sm text-gray-700">
              {state.email && (
                <>
                  Email: <b>{state.email}</b>
                  <br />
                </>
              )}
              {state.userId && (
                <>
                  User ID: <code className="text-xs">{state.userId}</code>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <a className="rounded bg-black text-white px-3 py-2" href="/account">
                Go to Account
              </a>
              <a className="rounded border px-3 py-2" href="/dashboard">
                Go to Dashboard
              </a>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="text-sm text-red-600">{state.message}</div>
        )}
      </div>
    </div>
  );
}
