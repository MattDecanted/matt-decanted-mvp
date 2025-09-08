// src/pages/AccountPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type FormState = {
  alias: string;
  display_name: string;
  bio: string;
  accept_terms: boolean; // UI-only; maps to terms_accepted_at
};

export default function AccountPage() {
  const { user, loading, profile, upsertProfile, refreshProfile } = useAuth();
  const location = useLocation();

  // Seed the form from the loaded profile
  const initial: FormState = useMemo(
    () => ({
      alias: profile?.alias ?? "",
      display_name: profile?.display_name ?? "",
      bio: profile?.bio ?? "",
      accept_terms: Boolean(profile?.terms_accepted_at),
    }),
    // re-seed when any of these specific fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.alias, profile?.display_name, profile?.bio, profile?.terms_accepted_at]
  );

  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // keep local form in sync when profile arrives/changes
  useEffect(() => {
    setForm(initial);
  }, [initial]);

  // Gate: if unauthenticated (and not loading), send to /signin
  if (!loading && !user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  const canSave =
    form.alias.trim().length > 0 &&
    form.display_name.trim().length > 0 &&
    !saving;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSavedMsg(null);
    setErrorMsg(null);

    try {
      const patch: Record<string, any> = {
        alias: form.alias.trim(),
        display_name: form.display_name.trim(),
        bio: form.bio,
      };

      // only set terms_accepted_at if user newly accepts them
      if (form.accept_terms && !profile?.terms_accepted_at) {
        patch.terms_accepted_at = new Date().toISOString();
      }

      // uses AuthContext helper which upserts with { id: user.id, user_id: user.id, ... }
      await upsertProfile(patch);
      await refreshProfile();

      setSavedMsg("Profile saved.");
      setTimeout(() => setSavedMsg(null), 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>

      {loading ? (
        <div className="p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
        </div>
      ) : (
        <form onSubmit={onSave} className="bg-white rounded-lg shadow border p-6 space-y-5">
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
              Shown on leaderboards and community posts.
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input
              className="w-full rounded border p-2"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="Your name"
              required
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              className="w-full rounded border p-2"
              rows={4}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Tell us a little about your wine journey…"
            />
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
              {saving ? "Saving…" : "Save"}
            </button>
            {savedMsg && <span className="text-sm text-green-600">{savedMsg}</span>}
            {errorMsg && <span className="text-sm text-red-600">{errorMsg}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
