// src/pages/admin/AdminGuessWhat.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Plus, Edit, Trash2, Eye, EyeOff, Save, X, Globe, HelpCircle, Image as ImageIcon,
  CheckCircle, AlertCircle, Copy as DuplicateIcon, PlayCircle, Link as LinkIcon,
  ExternalLink, ArrowUp, ArrowDown
} from "lucide-react";

/* ================= Types ================= */
type Round = {
  id: string;
  locale: string;
  week_number: number | null;
  title: string | null;
  date: string | null; // ISO (YYYY-MM-DD)
  hero_image_url: string | null;      // placeholder shown before selecting
  descriptors: string | null;         // Matt’s tasting descriptors (free text)
  video_url: string | null;           // main tasting video (Matt tasting)
  reveal_video_url: string | null;    // reveal video (optional)
  // Round Defaults (for reveal / convenience; players still answer via questions)
  locked_vintage: string | null;
  locked_variety: string | null;
  locked_region: string | null;
  locked_style: string | null;
  // Reveal block
  reveal_wine_name: string | null;
  reveal_vintage: string | null;
  reveal_variety: string | null;
  reveal_region: string | null;
  reveal_notes: string | null;
  reveal_image_url: string | null;    // optional image if no reveal video
  active: boolean;
  created_at: string;
  updated_at: string;
};

type BankRow = {
  id: string;
  round_id: string | null;
  slug: string;
  locale: string;
  prompt: string;
  options: string[] | null;
  correct_index: number | null;
  /** NEW: Matt’s pick for this question (index into options) */
  matt_index: number | null;
  image_url: string | null;
  points_award: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const LANGS = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ko", name: "한국어",  flag: "🇰🇷" },
  { code: "zh", name: "中文",   flag: "🇨🇳" },
  { code: "es", name: "Español",flag: "🇪🇸" },
  { code: "fr", name: "Français",flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "日本語",  flag: "🇯🇵" },
];

/* ======= tiny UI tokens ======= */
const BTN_PRIMARY =
  "inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60";
const BTN_ALT_OUTLINE =
  "inline-flex items-center justify-center bg-white text-black border border-black hover:bg-gray-50 px-3 py-2 rounded-lg";

/* ================ Page ================ */
export default function AdminGuessWhat() {
  const { profile, user } = useAuth() as any;
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLocale, setFilterLocale] = useState("all");
  const [editing, setEditing] = useState<Round | null>(null);

  // 🛡️ Admin gate (router should already protect)
  const isAdmin =
    profile?.role === "admin" ||
    profile?.is_admin === true ||
    user?.user_metadata?.role === "admin";

  // 🚫 No indexing
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-gray-600">This page is restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("guess_what_rounds")
          .select("*")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });
        if (error) throw error;
        setRounds((data || []) as Round[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => (filterLocale === "all" ? rounds : rounds.filter((r) => r.locale === filterLocale)),
    [rounds, filterLocale]
  );

  const kpi = useMemo(() => {
    const total = rounds.length;
    const active = rounds.filter((r) => r.active).length;
    const locales = new Set(rounds.map((r) => r.locale)).size;
    return { total, active, locales };
  }, [rounds]);

  async function toggleRoundActive(r: Round) {
    const next = !r.active;
    const { error } = await supabase.from("guess_what_rounds").update({ active: next }).eq("id", r.id);
    if (error) {
      console.error(error);
      return;
    }
    setRounds((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: next } : x)));
  }

  async function removeRound(id: string) {
    if (!confirm("Delete this round and ALL of its questions?")) return;
    // Delete questions first (covers missing DB cascade)
    const { error: qErr } = await supabase.from("guess_what_bank").delete().eq("round_id", id);
    if (qErr) {
      console.error(qErr);
      alert("Failed to delete questions for this round.");
      return;
    }
    const { error: rErr } = await supabase.from("guess_what_rounds").delete().eq("id", id);
    if (rErr) {
      console.error(rErr);
      alert("Failed to delete the round.");
      return;
    }
    setRounds((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Guess What — Rounds</h1>
            <p className="text-gray-600">
              Create a game with a placeholder image, tasting video, 3–5 unique questions, and a reveal video or image.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterLocale}
              onChange={(e) => setFilterLocale(e.target.value)}
              className="px-3 py-2 border rounded-md bg-white"
            >
              <option value="all">All languages</option>
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name} ({l.code})
                </option>
              ))}
            </select>
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={() =>
                setEditing({
                  id: "" as any,
                  locale: "en",
                  week_number: null,
                  title: "Week Challenge",
                  date: new Date().toISOString().slice(0, 10),
                  hero_image_url: "",
                  descriptors: "",
                  video_url: "",
                  reveal_video_url: "",
                  locked_region: "",
                  locked_style: "",
                  locked_variety: "",
                  locked_vintage: "",
                  reveal_image_url: "",
                  reveal_notes: "",
                  reveal_region: "",
                  reveal_variety: "",
                  reveal_vintage: "",
                  reveal_wine_name: "",
                  active: false,
                  created_at: "" as any,
                  updated_at: "" as any,
                })
              }
            >
              <Plus className="w-5 h-5 mr-2" />
              New Round
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Kpi label="Total Rounds" value={kpi.total} icon={<HelpCircle className="w-7 h-7 text-blue-600" />} />
          <Kpi label="Active" value={kpi.active} icon={<CheckCircle className="w-7 h-7 text-green-600" />} />
          <Kpi label="Languages" value={kpi.locales} icon={<Globe className="w-7 h-7 text-teal-600" />} />
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-600">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-600">No rounds yet.</div>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => {
                const lang = LANGS.find((l) => l.code === r.locale);
                return (
                  <li key={r.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-100">
                            Week {r.week_number ?? "—"}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded bg-amber-50 text-amber-700">
                            {r.date || "No date"}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded bg-teal-50 text-teal-700 inline-flex items-center">
                            <span className="mr-1">{lang?.flag || "🏳️"}</span> {r.locale}
                          </span>
                          {r.video_url ? (
                            <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700 inline-flex items-center">
                              <PlayCircle className="w-3.5 h-3.5 mr-1" /> Video
                            </span>
                          ) : null}
                          {r.reveal_video_url ? (
                            <span className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700">
                              Reveal Video
                            </span>
                          ) : r.reveal_image_url ? (
                            <span className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700">
                              Reveal Image
                            </span>
                          ) : null}
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${
                              r.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {r.active ? "Published" : "Hidden"}
                          </span>
                        </div>
                        <div className="font-semibold text-gray-900">{r.title || "Untitled Round"}</div>
                        <div className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {r.descriptors || "— No descriptors —"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconBtn title={r.active ? "Hide" : "Publish"} onClick={() => toggleRoundActive(r)}>
                          {r.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </IconBtn>
                        <IconBtn title="Copy Round ID" onClick={() => navigator.clipboard.writeText(r.id)}>
                          <DuplicateIcon className="w-4 h-4" />
                        </IconBtn>
                        <IconBtn title="Preview this round" onClick={() => window.open(`/games/guess-what?round=${r.id}`, "_blank")}>
                          <ExternalLink className="w-4 h-4" />
                        </IconBtn>
                        <IconBtn title="Edit" onClick={() => setEditing(r)}>
                          <Edit className="w-4 h-4" />
                        </IconBtn>
                        <IconBtn title="Delete" onClick={() => removeRound(r.id)}>
                          <Trash2 className="w-4 h-4" />
                        </IconBtn>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {editing && (
          <RoundEditor
            round={editing}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              const { data } = await supabase
                .from("guess_what_rounds")
                .select("*")
                .order("date", { ascending: false })
                .order("created_at", { ascending: false });
              setRounds((data || []) as Round[]);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ============== Round Editor with inline Question Editor ============== */
function RoundEditor({
  round,
  onClose,
  onSaved,
}: {
  round: Round;
  onClose(): void;
  onSaved(): void;
}) {
  const creating = !round.id;
  const [form, setForm] = useState<Round>(round);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setForm(round), [round]);

  async function saveRound(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (creating) {
        const { data, error } = await supabase
          .from("guess_what_rounds")
          .insert([
            {
              locale: form.locale,
              week_number: form.week_number,
              title: form.title,
              date: form.date,
              hero_image_url: form.hero_image_url || null,
              descriptors: form.descriptors || null,
              video_url: form.video_url || null,
              reveal_video_url: form.reveal_video_url || null,
              locked_region: form.locked_region || null,
              locked_style: form.locked_style || null,
              locked_variety: form.locked_variety || null,
              locked_vintage: form.locked_vintage || null,
              reveal_image_url: form.reveal_image_url || null,
              reveal_notes: form.reveal_notes || null,
              reveal_region: form.reveal_region || null,
              reveal_variety: form.reveal_variety || null,
              reveal_vintage: form.reveal_vintage || null,
              reveal_wine_name: form.reveal_wine_name || null,
              active: form.active ?? false,
            },
          ])
          .select()
          .single();
        if (error) throw error;
        setForm(data as Round);
        onSaved();
      } else {
        const { error } = await supabase
          .from("guess_what_rounds")
          .update({
            locale: form.locale,
            week_number: form.week_number,
            title: form.title,
            date: form.date,
            hero_image_url: form.hero_image_url || null,
            descriptors: form.descriptors || null,
            video_url: form.video_url || null,
            reveal_video_url: form.reveal_video_url || null,
            locked_region: form.locked_region || null,
            locked_style: form.locked_style || null,
            locked_variety: form.locked_variety || null,
            locked_vintage: form.locked_vintage || null,
            reveal_image_url: form.reveal_image_url || null,
            reveal_notes: form.reveal_notes || null,
            reveal_region: form.reveal_region || null,
            reveal_variety: form.reveal_variety || null,
            reveal_vintage: form.reveal_vintage || null,
            reveal_wine_name: form.reveal_wine_name || null,
            active: form.active ?? false,
          })
          .eq("id", form.id);
        if (error) throw error;
        onSaved();
      }
    } catch (e: any) {
      setError(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={creating ? "Create Round" : "Edit Round"} onClose={onClose} wide z={50}>
      <form onSubmit={saveRound} className="space-y-5">
        {error && (
          <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>
        )}

        {!creating && (
          <div className="text-xs text-gray-500 -mb-2">
            Round ID:{" "}
            <code className="px-1 py-0.5 bg-gray-100 rounded select-all">{form.id}</code>
            <button
              type="button"
              className={`${BTN_ALT_OUTLINE} ml-2`}
              onClick={() => navigator.clipboard.writeText(form.id)}
            >
              <DuplicateIcon className="w-3 h-3 mr-1" /> Copy
            </button>
            <button
              type="button"
              className={`${BTN_ALT_OUTLINE} ml-2`}
              onClick={() => window.open(`/games/guess-what?round=${form.id}`, "_blank")}
            >
              <ExternalLink className="w-3 h-3 mr-1" /> Preview
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Language">
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={form.locale || "en"}
              onChange={(e) => setForm({ ...form, locale: e.target.value })}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name} ({l.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Week #">
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md"
              value={form.week_number ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  week_number: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="e.g. 1"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-md"
              value={form.date ?? ""}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Title">
          <input
            className="w-full px-3 py-2 border rounded-md"
            value={form.title ?? ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Week 1 Challenge"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Hero / Placeholder Image (shown before selecting)">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 px-3 py-2 border rounded-md"
                value={form.hero_image_url ?? ""}
                onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })}
                placeholder="https://… (1200×675)"
              />
              <ImageIcon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Leave blank to use the in-app orange placeholder.
              <button
                type="button"
                className="ml-2 underline text-blue-700"
                onClick={() => setForm((f) => ({ ...f, hero_image_url: "" }))}
              >
                Use default
              </button>
            </p>
          </Field>

          <Field label="Main Tasting Video URL (YouTube/Vimeo/mp4)">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 px-3 py-2 border rounded-md"
                value={form.video_url ?? ""}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://youtu.be/… or https://…/video.mp4"
              />
              <LinkIcon className="w-5 h-5 text-gray-400" />
            </div>
          </Field>
        </div>

        <Field label="Matt’s Tasting Descriptors">
          <textarea
            rows={3}
            className="w-full px-3 py-2 border rounded-md"
            value={form.descriptors ?? ""}
            onChange={(e) => setForm({ ...form, descriptors: e.target.value })}
            placeholder="Deep ruby color… blackcurrant, cedar, vanilla…"
          />
        </Field>

        {/* Round Defaults (formerly "Locked") */}
        <div className="rounded-lg border p-4">
          <div className="font-medium mb-2">Round Defaults (optional)</div>
          <p className="text-xs text-gray-600 mb-3">
            Canonical answers you’ll reveal for this round. Players still answer via questions; these are for the reveal or as defaults.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Default Vintage">
              <input
                className="w-full px-3 py-2 border rounded-md"
                value={form.locked_vintage ?? ""}
                onChange={(e) => setForm({ ...form, locked_vintage: e.target.value })}
              />
            </Field>
            <Field label="Default Variety / Blend">
              <input
                className="w-full px-3 py-2 border rounded-md"
                value={form.locked_variety ?? ""}
                onChange={(e) => setForm({ ...form, locked_variety: e.target.value })}
              />
            </Field>
            <Field label="Default Region / Appellation">
              <input
                className="w-full px-3 py-2 border rounded-md"
                value={form.locked_region ?? ""}
                onChange={(e) => setForm({ ...form, locked_region: e.target.value })}
              />
            </Field>
            <Field label="Default Style / Level">
              <input
                className="w-full px-3 py-2 border rounded-md"
                value={form.locked_style ?? ""}
                onChange={(e) => setForm({ ...form, locked_style: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Reveal Video URL (YouTube/Vimeo/mp4)">
            <input
              className="w-full px-3 py-2 border rounded-md"
              value={form.reveal_video_url ?? ""}
              onChange={(e) => setForm({ ...form, reveal_video_url: e.target.value })}
              placeholder="https://youtu.be/… or https://…/reveal.mp4"
            />
          </Field>
          <Field label="Reveal Image URL (optional)">
            <input
              className="w-full px-3 py-2 border rounded-md"
              value={form.reveal_image_url ?? ""}
              onChange={(e) => setForm({ ...form, reveal_image_url: e.target.value })}
              placeholder="https://…/reveal.jpg (used if no video)"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Reveal: Wine / Producer">
            <input
              className="w-full px-3 py-2 border rounded-md"
              value={form.reveal_wine_name ?? ""}
              onChange={(e) => setForm({ ...form, reveal_wine_name: e.target.value })}
            />
          </Field>
          <Field label="Reveal: Variety/Blend">
            <input
              className="w-full px-3 py-2 border rounded-md"
              value={form.reveal_variety ?? ""}
              onChange={(e) => setForm({ ...form, reveal_variety: e.target.value })}
            />
          </Field>
          <Field label="Reveal: Vintage">
            <input
              className="w-full px-3 py-2 border rounded-md"
              value={form.reveal_vintage ?? ""}
              onChange={(e) => setForm({ ...form, reveal_vintage: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Reveal: Region/Appellation">
            <input
              className="w-full px-3 py-2 border rounded-md"
              value={form.reveal_region ?? ""}
              onChange={(e) => setForm({ ...form, reveal_region: e.target.value })}
            />
          </Field>
          <Field label="Reveal: Notes">
            <textarea
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
              value={form.reveal_notes ?? ""}
              onChange={(e) => setForm({ ...form, reveal_notes: e.target.value })}
              placeholder="High — classic Bordeaux structure…"
            />
          </Field>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={`${BTN_PRIMARY} flex-1`}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving…" : creating ? "Create Round" : "Save Changes"}
          </button>
          <button type="button" onClick={onClose} className={`${BTN_ALT_OUTLINE} flex-1`}>
            Cancel
          </button>
        </div>

        {/* Questions for this round */}
        {!creating && <RoundQuestions roundId={form.id} locale={form.locale || "en"} />}
      </form>
    </Modal>
  );
}

/* ============== Questions list + inline editor ============== */
function RoundQuestions({ roundId, locale }: { roundId: string; locale: string }) {
  const [rows, setRows] = useState<BankRow[] | null>(null);
  const [editing, setEditing] = useState<BankRow | null>(null);

  async function load() {
    const { data } = await supabase
      .from("guess_what_bank")
      .select("*")
      .eq("round_id", roundId)
      .order("created_at", { ascending: true });
    setRows((data || []) as BankRow[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  async function toggleActive(row: BankRow) {
    const { error } = await supabase.from("guess_what_bank").update({ active: !row.active }).eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    setRows((prev) => prev!.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)));
  }

  async function duplicate(row: BankRow) {
    const payload = {
      round_id: roundId,
      slug: uniqueSlug(rows || [], `${row.slug}-copy`),
      locale: row.locale,
      prompt: row.prompt,
      options: row.options,
      correct_index: row.correct_index,
      matt_index: row.matt_index ?? null,
      image_url: row.image_url,
      points_award: row.points_award,
      active: false,
    };
    const { error } = await supabase.from("guess_what_bank").insert([payload]);
    if (error) console.error(error);
    await load();
  }

  async function removeRow(id: string) {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("guess_what_bank").delete().eq("id", id);
    if (error) console.error(error);
    await load();
  }

  const pointsTotal = useMemo(
    () => (rows || []).filter(r => r.active).reduce((s, r) => s + Number(r.points_award || 0), 0),
    [rows]
  );

  if (rows === null) return <div className="mt-8 p-6 bg-white rounded-xl shadow">Loading questions…</div>;

  return (
    <div className="mt-8 p-6 bg-white rounded-xl shadow space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <h3 className="text-lg font-semibold">Questions in this round</h3>
          <div className="text-sm text-gray-600">
            Active points total: <strong className="text-gray-900">{pointsTotal}</strong>
          </div>
        </div>
        <button
          type="button"
          className={BTN_PRIMARY}
          onClick={() =>
            setEditing({
              id: "" as any,
              round_id: roundId,
              slug: "",
              locale,
              prompt: "",
              options: ["", "", ""],
              correct_index: 0,
              matt_index: null,
              image_url: "",
              points_award: 50,
              active: true,
              created_at: "" as any,
              updated_at: "" as any,
            })
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </button>
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <div className="text-sm text-gray-600">No questions yet.</div>
      ) : (
        <ul className="divide-y">
          {rows.map((r, idx) => {
            const correct = r.options?.[Number(r.correct_index ?? -1)] ?? "—";
            const matt = r.matt_index == null ? "—" : (r.options?.[Number(r.matt_index)] ?? "—");
            return (
              <li key={r.id} className="py-4">
                <div className="flex items-start justify-between">
                  <div className="pr-4">
                    <div className="text-sm text-gray-500 mb-1">Q{idx + 1}</div>
                    <div className="font-medium text-gray-900 mb-1">{r.prompt}</div>
                    <div className="text-sm text-gray-600">
                      {r.options?.map((o, i) =>
                        i === r.correct_index ? (
                          <strong key={i} className="text-green-700">
                            {o}
                            {i < (r.options?.length || 0) - 1 ? ", " : ""}
                          </strong>
                        ) : (
                          <span key={i}>
                            {o}
                            {i < (r.options?.length || 0) - 1 ? ", " : ""}
                          </span>
                        )
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-700">
                      Correct: <span className="font-medium">{correct}</span>
                      {" · "}
                      Matt: <span className="font-medium">{matt}</span>
                      {" · "}
                      <span className="text-amber-700">+{Number(r.points_award ?? 0)} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconBtn title={r.active ? "Hide" : "Publish"} onClick={() => toggleActive(r)}>
                      {r.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </IconBtn>
                    <IconBtn title="Duplicate" onClick={() => duplicate(r)}>
                      <DuplicateIcon className="w-4 h-4" />
                    </IconBtn>
                    <IconBtn title="Edit" onClick={() => setEditing(r)}>
                      <Edit className="w-4 h-4" />
                    </IconBtn>
                    <IconBtn title="Delete" onClick={() => removeRow(r.id)}>
                      <Trash2 className="w-4 h-4" />
                    </IconBtn>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Inline editor */}
      {editing && (
        <QuestionFormInline
          key={editing.id || "new"}
          record={editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function uniqueSlug(rows: BankRow[], base: string) {
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/* ============== Inline Question Form (no modal) ============== */
function QuestionFormInline({
  record,
  onCancel,
  onSaved,
}: {
  record: BankRow;
  onCancel(): void;
  onSaved(): void;
}) {
  const creating = !record.id;
  const [form, setForm] = useState(record);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateOption(i: number, v: string) {
    const copy = [...(form.options || [])];
    copy[i] = v;
    setForm({ ...form, options: copy });
  }
  function addOption() {
    setForm((f) => ({ ...f, options: [...(f.options || []), ""] }));
  }
  function removeOption() {
    setForm((f) => ({
      ...f,
      options: (f.options || []).slice(0, Math.max(2, (f.options || []).length - 1)),
    }));
    setForm((f) => ({
      ...f,
      correct_index: Math.min(
        Number(f.correct_index ?? 0),
        Math.max(0, (f.options?.length || 1) - 2)
      ),
      matt_index:
        f.matt_index == null
          ? null
          : Math.min(Number(f.matt_index), Math.max(0, (f.options?.length || 1) - 2)),
    }));
  }
  function moveOption(from: number, to: number) {
    const opts = [...(form.options || [])];
    if (to < 0 || to >= opts.length) return;
    const [moved] = opts.splice(from, 1);
    opts.splice(to, 0, moved);

    let ci = Number(form.correct_index ?? 0);
    if (ci === from) ci = to;
    else if (ci > from && ci <= to) ci = ci - 1;
    else if (ci < from && ci >= to) ci = ci + 1;

    let mi = form.matt_index == null ? null : Number(form.matt_index);
    if (mi != null) {
      if (mi === from) mi = to;
      else if (mi > from && mi <= to) mi = mi - 1;
      else if (mi < from && mi >= to) mi = mi + 1;
    }

    setForm({ ...form, options: opts, correct_index: ci, matt_index: mi });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const cleanOptions = (form.options || []).map((o) => o.trim()).filter(Boolean);
      if (cleanOptions.length < 2) throw new Error("Please provide at least two options.");
      if (
        typeof form.correct_index !== "number" ||
        form.correct_index < 0 ||
        form.correct_index >= cleanOptions.length
      ) {
        throw new Error("Please mark a valid correct option.");
      }

      const payload = {
        round_id: form.round_id,
        slug: form.slug || `gw-${Date.now()}`,
        locale: form.locale,
        prompt: form.prompt,
        options: cleanOptions.slice(0, 6), // 2–6 options
        correct_index: Number(form.correct_index ?? 0),
        matt_index:
          form.matt_index == null || Number.isNaN(Number(form.matt_index))
            ? null
            : Number(form.matt_index),
        image_url: form.image_url || null,
        points_award: Number(form.points_award ?? 0),
        active: Boolean(form.active),
      };

      if (creating) {
        const { error } = await supabase.from("guess_what_bank").insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("guess_what_bank").update(payload).eq("id", form.id);
        if (error) throw error;
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Failed to save question.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{creating ? "Add Question" : "Edit Question"}</div>
        <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100" aria-label="Close" type="button">
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Slug">
            <input
              className="w-full px-3 py-2 border rounded-md"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="unique-slug"
            />
          </Field>
          <Field label="Points">
            <input
              type="number"
              min={0}
              className="w-full px-3 py-2 border rounded-md"
              value={Number(form.points_award ?? 0)}
              onChange={(e) => setForm({ ...form, points_award: Number(e.target.value || 0) })}
            />
          </Field>
        </div>

        <Field label="Prompt">
          <textarea
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Question Image (optional)">
            <input
              className="w-full px-3 py-2 border rounded-md"
              value={form.image_url || ""}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Visibility">
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={form.active ? "1" : "0"}
              onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}
            >
              <option value="1">Active (shown)</option>
              <option value="0">Hidden</option>
            </select>
          </Field>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Options</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={addOption} className={BTN_ALT_OUTLINE}>
              + Add
            </button>
            <button type="button" onClick={removeOption} className={BTN_ALT_OUTLINE}>
              − Remove
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(form.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={`${BTN_ALT_OUTLINE} p-1`}
                  onClick={() => moveOption(i, i - 1)}
                  disabled={i === 0}
                  title="Move up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className={`${BTN_ALT_OUTLINE} p-1`}
                  onClick={() => moveOption(i, i + 1)}
                  disabled={i === (form.options?.length || 1) - 1}
                  title="Move down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              <input
                className="flex-1 px-3 py-2 border rounded-md"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
              />

              {/* Correct Answer */}
              <label className="text-xs flex items-center gap-1">
                <input
                  type="radio"
                  name="correct"
                  checked={Number(form.correct_index ?? 0) === i}
                  onChange={() => setForm({ ...form, correct_index: i })}
                />
                Correct
              </label>

              {/* Matt's Answer */}
              <label className="text-xs flex items-center gap-1">
                <input
                  type="radio"
                  name="matt"
                  checked={form.matt_index != null && Number(form.matt_index) === i}
                  onChange={() => setForm({ ...form, matt_index: i })}
                />
                Matt
              </label>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={`${BTN_PRIMARY} flex-1`}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving…" : creating ? "Create Question" : "Save Question"}
          </button>
          <button type="button" onClick={onCancel} className={`${BTN_ALT_OUTLINE} flex-1`}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/* ============== Small UI helpers ============== */
function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-sm text-gray-600">{label}</div>
          <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}

/** Outline icon button — white bg, black border. */
function IconBtn({
  title,
  onClick,
  children,
}: React.PropsWithChildren<{ title: string; onClick(): void }>) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`${BTN_ALT_OUTLINE} p-2`}
    >
      {children}
    </button>
  );
}

/** Modal with NO overlay click-to-close (prevents accidental dismissal). */
function Modal({
  title,
  children,
  onClose,
  wide,
  z = 50,
}: {
  title: string;
  children: React.ReactNode;
  onClose(): void;
  wide?: boolean;
  z?: number;
}) {
  return (
    <div className="fixed inset-0" style={{ zIndex: z }}>
      {/* overlay (no click handler) */}
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={`relative bg-white rounded-xl shadow-xl p-6 mx-auto my-8 ${wide ? "max-w-5xl" : "max-w-2xl"} w-[92%]`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            type="button"
            className={`${BTN_ALT_OUTLINE} px-2 py-1`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
