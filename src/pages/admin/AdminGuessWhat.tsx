//src/pages/admin/AdminGuessWhat.tsx

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Star,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

/* ========= Types aligned to your DB ========= */
type BankRow = {
  id: string;
  slug: string;
  locale: string;
  prompt: string;
  options: string[] | null;
  correct_index: number | null;
  image_url: string | null;
  points_award: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const LANGS = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
}

/* =======================================================================================
   ADMIN: Guess What (manages guess_what_bank)
   - List all questions
   - Create/edit rows with locale, prompt, options[], correct_index, points, image_url, active
======================================================================================= */
export default function AdminGuessWhat() {
  const { profile } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BankRow[]>([]);
  const [filterLocale, setFilterLocale] = useState<string>("all");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BankRow | null>(null);

  const kpi = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.active).length;
    const locales = new Set(rows.map((r) => r.locale));
    const totalPts = rows.reduce((n, r) => n + Number(r.points_award ?? 0), 0);
    return { total, active, locales: locales.size, totalPts };
  }, [rows]);

  useEffect(() => {
    loadAll().catch(() => {});
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const q = supabase.from("guess_what_bank").select("*").order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      setRows((data || []) as BankRow[]);
    } finally {
      setLoading(false);
    }
  }

  async function removeRow(id: string) {
    if (!confirm("Delete this question?")) return;
    await supabase.from("guess_what_bank").delete().eq("id", id);
    await loadAll();
  }

  async function toggleActive(row: BankRow) {
    await supabase.from("guess_what_bank").update({ active: !row.active }).eq("id", row.id);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)));
  }

  const filteredRows =
    filterLocale === "all" ? rows : rows.filter((r) => r.locale === filterLocale);

  // Restrict to admins
  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">This page is restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Guess What — Question Bank</h1>
            <p className="text-gray-600">
              Create and manage blind-tasting questions used by the Guess What game.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterLocale}
              onChange={(e) => setFilterLocale(e.target.value)}
              className="px-3 py-2 border rounded-md bg-white"
              aria-label="Filter by language"
            >
              <option value="all">All languages</option>
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name} ({l.code})
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center"
              type="button"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Question
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KpiCard
            icon={<HelpCircle className="w-8 h-8 text-blue-600 mr-3" />}
            label="Total Questions"
            value={kpi.total}
          />
          <KpiCard
            icon={<CheckCircle className="w-8 h-8 text-green-600 mr-3" />}
            label="Active"
            value={kpi.active}
          />
          <KpiCard
            icon={<Globe className="w-8 h-8 text-teal-600 mr-3" />}
            label="Languages"
            value={kpi.locales}
          />
          <KpiCard
            icon={<Star className="w-8 h-8 text-amber-600 mr-3" />}
            label="Total Points"
            value={kpi.totalPts}
          />
        </div>

        {/* List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center text-gray-600">No questions yet.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRows.map((r) => {
                const lang = LANGS.find((l) => l.code === r.locale);
                return (
                  <div key={r.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      {/* Left */}
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {r.slug}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 flex items-center">
                            <span className="mr-1">{lang?.flag || "🏳️"}</span>
                            {r.locale}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                            +{Number(r.points_award ?? 0)} pts
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              r.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {r.active ? "Active" : "Hidden"}
                          </span>
                        </div>
                        <div className="text-gray-900 font-medium mb-2">
                          {r.prompt.length > 140 ? r.prompt.slice(0, 140) + "…" : r.prompt}
                        </div>
                        <div className="text-sm text-gray-600">
                          {r.options?.length ? (
                            <span>
                              Options:{" "}
                              <span className="text-gray-800">
                                {r.options.map((o, i) =>
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
                              </span>
                            </span>
                          ) : (
                            <em>No options</em>
                          )}
                        </div>
                      </div>

                      {/* Right actions */}
                      <div className="flex items-center gap-2">
                        <IconBtn
                          title={r.active ? "Hide" : "Publish"}
                          onClick={() => toggleActive(r)}
                        >
                          {r.active ? (
                            <EyeOff className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Eye className="w-4 h-4 text-green-600" />
                          )}
                        </IconBtn>
                        <IconBtn
                          title="Edit"
                          onClick={() => {
                            setEditing(r);
                            setShowForm(true);
                          }}
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </IconBtn>
                        <IconBtn title="Delete" onClick={() => removeRow(r.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </IconBtn>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Form modal */}
        {showForm && (
          <QuestionForm
            record={editing}
            onClose={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSaved={async () => {
              setShowForm(false);
              setEditing(null);
              await loadAll();
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ==========================
   QUESTION FORM (Create/Edit)
========================== */
function QuestionForm({
  record,
  onClose,
  onSaved,
}: {
  record: BankRow | null;
  onClose(): void;
  onSaved(): void;
}) {
  const editing = Boolean(record?.id);

  const [form, setForm] = useState({
    slug: record?.slug ?? "",
    locale: record?.locale ?? "en",
    prompt: record?.prompt ?? "",
    image_url: record?.image_url ?? "",
    points_award: record?.points_award ?? 50,
    active: record?.active ?? true,
  });

  const [options, setOptions] = useState<string[]>(
    record?.options && record.options.length ? record.options : ["", "", "", ""]
  );
  const [correctIdx, setCorrectIdx] = useState<number>(record?.correct_index ?? 0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!editing && form.slug.trim() === "" && form.prompt.trim().length > 0) {
      setForm((prev) => ({ ...prev, slug: slugify(form.prompt) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.prompt]);

  function updateOption(i: number, v: string) {
    const copy = [...options];
    copy[i] = v;
    setOptions(copy);
  }

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }
  function removeOption() {
    setOptions((prev) => (prev.length > 2 ? prev.slice(0, prev.length - 1) : prev));
    setCorrectIdx((idx) => Math.min(idx, Math.max(0, options.length - 2)));
  }

  function validate(): string | null {
    if (!form.prompt.trim()) return "Prompt is required.";
    if (!form.slug.trim()) return "Slug is required.";
    if (!/^[a-z0-9\-]+$/.test(form.slug)) return "Slug must be lowercase letters, numbers and dashes only.";
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (clean.length < 2) return "Provide at least two options.";
    if (correctIdx < 0 || correctIdx >= options.length) return "Select a valid correct option.";
    const pts = Number(form.points_award ?? 0);
    if (isNaN(pts) || pts < 0) return "Points must be 0 or more.";
    return null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setSaving(true);
    setErrorMsg("");

    const payload = {
      slug: form.slug,
      locale: form.locale,
      prompt: form.prompt,
      options: options.map((o) => o.trim()).filter(Boolean),
      correct_index: correctIdx,
      image_url: form.image_url || null,
      points_award: Number(form.points_award ?? 0),
      active: Boolean(form.active),
    };

    try {
      if (editing) {
        const { error } = await supabase.from("guess_what_bank").update(payload).eq("id", record!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("guess_what_bank").insert([payload]);
        if (error) throw error;
      }
      await onSaved();
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Edit Question" : "New Question"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Language">
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={form.locale}
              onChange={(e) => setForm({ ...form, locale: e.target.value })}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name} ({l.code})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Slug">
            <input
              className="w-full px-3 py-2 border rounded-md"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              placeholder="e.g. gw-cabernet-oak"
              required
            />
          </Field>

          <Field label="Points Award">
            <input
              type="number"
              min={0}
              className="w-full px-3 py-2 border rounded-md"
              value={form.points_award}
              onChange={(e) =>
                setForm({ ...form, points_award: Number(e.target.value || 0) })
              }
            />
          </Field>
        </div>

        <Field label="Prompt">
          <textarea
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            placeholder="Which note is most associated with oak-aged Cabernet Sauvignon?"
            required
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Image URL (optional)">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 px-3 py-2 border rounded-md"
                value={form.image_url || ""}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://… (1200×675 preferred)"
              />
              <ImageIcon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Recommended: 1200×675 (or 600×338) JPG/PNG for consistent layout.
            </p>
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

        {/* Options */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Options</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addOption}
                className="px-3 py-1 border rounded text-sm"
              >
                + Add option
              </button>
              <button
                type="button"
                onClick={removeOption}
                className="px-3 py-1 border rounded text-sm"
              >
                − Remove last
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="flex-1 px-3 py-2 border rounded-md"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="correct"
                    checked={correctIdx === i}
                    onChange={() => setCorrectIdx(i)}
                  />
                  Correct
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 px-4 rounded-lg font-medium inline-flex items-center justify-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving…" : editing ? "Update Question" : "Create Question"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-lg font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ======= UI bits ======= */
function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center">
        {icon}
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
}: React.PropsWithChildren<{ title: string; onClick(): void }>) {
  return (
    <button
      className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
      title={title}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose(): void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`relative bg-white rounded-xl shadow-xl p-6 mx-4 w-full ${
          wide ? "max-w-3xl" : "max-w-xl"
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
            type="button"
            aria-label="Close"
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
