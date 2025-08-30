import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If user arrived via recovery link, Supabase sets a session.
    // We wait a tick and confirm session exists.
    (async () => {
      const { data } = await supabase.auth.getSession();
      setReady(!!data.session);
      if (!data.session) {
        setMsg("Invalid or expired recovery link. Request a new reset email from the sign-in page.");
      }
    })();
  }, []);

  async function submit() {
    if (pw1.length < 6) return setMsg("Password must be at least 6 characters.");
    if (pw1 !== pw2)   return setMsg("Passwords do not match.");
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setBusy(false);
    if (error) return setMsg(error.message || "Could not update password.");
    setMsg("Password updated. Redirecting…");
    setTimeout(() => nav("/signin"), 900);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
      {!ready ? (
        <div className="text-sm text-gray-600">{msg || "Checking link…"}</div>
      ) : (
        <div className="space-y-3">
          <input className="w-full border rounded px-3 py-2" placeholder="New password" type="password" value={pw1} onChange={e=>setPw1(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="Confirm password" type="password" value={pw2} onChange={e=>setPw2(e.target.value)} />
          <button onClick={submit} disabled={busy} className="w-full rounded bg-black text-white py-2 disabled:opacity-50">
            {busy ? "Saving…" : "Save new password"}
          </button>
          {msg && <div className="text-sm">{msg}</div>}
        </div>
      )}
    </main>
  );
}
