// src/pages/UrlDumpPage.tsx
import React, { useEffect, useState } from "react";
import { supabase, completeAuthFromUrl, setSessionFromHashStrict } from "@/lib/supabase";

type View =
  | { status: "idle" }
  | { status: "pkce"; code: string }
  | { status: "hash"; accessTokenShort: string }
  | { status: "none" }
  | { status: "ok"; email?: string; userId?: string; expiresAt?: number | null }
  | { status: "error"; message: string };

function readSbAuthKeys() {
  const keys: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    // Supabase stores auth in keys like: "sb-<project-ref>-auth-token"
    if (k.startsWith("sb-")) {
      const v = localStorage.getItem(k);
      keys[k] = v;
    }
  }
  return keys;
}

export default function UrlDumpPage() {
  const [state, setState] = useState<View>({ status: "idle" });
  const [href, setHref] = useState("");
  const [ls, setLs] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const url = new URL(window.location.href);
    setHref(url.href);
    setLs(readSbAuthKeys());

    const code = url.searchParams.get("code");
    const hash = url.hash.replace(/^#/, "");
    const hp = new URLSearchParams(hash);
    const at = hp.get("access_token");
    const hashErr = hp.get("error") || hp.get("error_description");

    if (hashErr) {
      setState({ status: "error", message: `Provider error: ${decodeURIComponent(hashErr)}` });
      return;
    }
    if (code) {
      setState({ status: "pkce", code });
      return;
    }
    if (at) {
      setState({ status: "hash", accessTokenShort: at.slice(0, 12) + "…" });
      return;
    }
    setState({ status: "none" });
  }, []);

  async function refreshSessionDisplay() {
    const { data } = await supabase.auth.getSession();
    setLs(readSbAuthKeys());
    if (data.session) {
      setState({
        status: "ok",
        email: data.session.user?.email ?? undefined,
        userId: data.session.user?.id ?? undefined,
        expiresAt: data.session.expires_at ?? null,
      });
    }
  }

  const onAutoComplete = async () => {
    try {
      const ses = await completeAuthFromUrl(); // handles both hash and PKCE, cleans URL
      await refreshSessionDisplay();
      if (!ses) throw new Error("No session after completion");
      // After success, keep this page but without auth params
      const loc = new URL(window.location.href);
      window.history.replaceState({}, document.title, loc.pathname);
    } catch (e: any) {
      setState({ status: "error", message: e?.message || String(e) });
    }
  };

  const onHashStrict = async () => {
    try {
      await setSessionFromHashStrict(); // writes session from #access_token and cleans hash
      await refreshSessionDisplay();
    } catch (e: any) {
      setState({ status: "error", message: e?.message || String(e) });
    }
  };

  const onPkceExchange = async () => {
    try {
      const url = new URL(window.location.href);
      const { error } = await supabase.auth.exchangeCodeForSession(url.href); // v2 requires full URL
      if (error) throw error;
      // Clean query so refreshes don’t retry
      window.history.replaceState({}, document.title, url.pathname + url.hash);
      await refreshSessionDisplay();
    } catch (e: any) {
      setState({ status: "error", message: e?.message || String(e) });
    }
  };

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="rounded-xl border bg-white shadow p-6 space-y-4 max-w-2xl w-full">
        <h1 className="text-lg font-semibold">Auth URL Debug</h1>

        <div className="text-xs break-all rounded bg-gray-50 p-2">{href}</div>

        {/* Status & actions */}
        {state.status === "pkce" && (
          <div className="space-y-2">
            <div className="text-sm">
              Detected: <b>PKCE</b> (<code>?code=…</code>)
            </div>
            <div className="flex gap-2">
              <button className="rounded bg-black text-white px-4 py-2" onClick={onAutoComplete}>
                Auto-complete from URL
              </button>
              <button className="rounded border px-4 py-2" onClick={onPkceExchange}>
                Exchange code (manual)
              </button>
            </div>
          </div>
        )}

        {state.status === "hash" && (
          <div className="space-y-2">
            <div className="text-sm">
              Detected: <b>Implicit</b> (<code>#access_token=…</code>) token={state.accessTokenShort}
            </div>
            <div className="flex gap-2">
              <button className="rounded bg-black text-white px-4 py-2" onClick={onAutoComplete}>
                Auto-complete from URL
              </button>
              <button className="rounded border px-4 py-2" onClick={onHashStrict}>
                Store from hash (strict)
              </button>
            </div>
          </div>
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
                  <br />
                </>
              )}
