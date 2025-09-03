import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, Plus, Edit, Trash2, Eye, HelpCircle,
  CheckCircle, X, Video, FileText, Globe, Lock
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ---------- Types (align with your DB) ---------- */
type Short = {
  id: string;
  slug: string;
  title: string;
  video_url: string | null;
  preview: boolean;
  is_published: boolean;
  created_at: string;
};

type GateMeta = {
  slug: string;
  required_points: number;
  required_tier: "free" | "pro" | "vip";
  is_active: boolean;
};

type ShortQuiz = {
  id: string;
  kind: "short";
  ref_id: string; // short.id
  question: string;
  options: string[] | null; // null for true/false
  correct_index: number | null; // for MCQ; for T/F store 0/1 or keep null and compare to explanation/correct_answer
  points_award: number;
  order_index: number | null;
  created_at: string;
};

type ShortI18n = {
  id: string;
  short_id: string;
  locale: string; // e.g. 'ko', 'es', ...
  title_i18n: string | null;
  blurb_i18n: string | null;
  video_url_alt: string | null;
  pdf_url_alt: string | null;
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

/* =======================================================
   MAIN PAGE
======================================================= */
export default function ShortsManager() {
  const [loading, setLoading] = useState(true);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [gatesBySlug, setGatesBySlug] = useState<Record<string, GateMeta>>({});
  const [quizzesByShort, setQuizzesByShort] = useState<Record<string, ShortQuiz[]>>({});
  const [i18nByShort, setI18nByShort] = useState<Record<string, ShortI18n[]>>({});

  // Modal state
  const [showShortForm, setShowShortForm] = useState(false);
  const [editingShort, setEditingShort] = useState<Short | null>(null);
  const [expandedShort, setExpandedShort] = useState<string>("");

  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizShortId, setQuizShortId] = useState<string>("");
  const [editingQuiz, setEditingQuiz] = useState<ShortQuiz | null>(null);

  const [showI18nForm, setShowI18nForm] = useState(false);
  const [i18nShort, setI18nShort] = useState<Short | null>(null);
  const [editingI18n, setEditingI18n] = useState<ShortI18n | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      // Shorts
      const { data: s } = await supabase
        .from("shorts")
        .select("*")
        .order("created_at", { ascending: false });
      const allShorts = (s || []) as Short[];
      setShorts(allShorts);

      // Gates
      const slugs = allShorts.map((x) => x.slug);
      let gatesMap: Record<string, GateMeta> = {};
      if (slugs.length) {
        const { data: g } = await supabase
          .from("content_shorts")
          .select("slug, required_points, required_tier, is_active")
          .in("slug", slugs);
        (g || []).forEach((row: any) => {
          gatesMap[row.slug] = {
            slug: row.slug,
            required_points: Number(row.required_points ?? 0),
            required_tier: (row.required_tier ?? "free") as GateMeta["required_tier"],
            is_active: Boolean(row.is_active ?? true),
          };
        });
      }
      setGatesBySlug(gatesMap);

      // Quizzes (one fetch)
      const ids = allShorts.map((x) => x.id);
      let qMap: Record<string, ShortQuiz[]> = {};
      if (ids.length) {
        const { data: q } = await supabase
          .from("quiz_bank")
          .select("*")
          .eq("kind", "short")
          .in("ref_id", ids)
          .order("order_index", { ascending: true });
        (q || []).forEach((row: any) => {
          const k = row.ref_id as string;
          if (!qMap[k]) qMap[k] = [];
          qMap[k].push(row as ShortQuiz);
        });
      }
      setQuizzesByShort(qMap);

      // I18n
      let iMap: Record<string, ShortI18n[]> = {};
      if (ids.length) {
        const { data: i18 } = await supabase
          .from("shorts_i18n")
          .select("*")
          .in("short_id", ids);
        (i18 || []).forEach((row: any) => {
          const k = row.short_id as string;
          if (!iMap[k]) iMap[k] = [];
          iMap[k].push(row as ShortI18n);
        });
      }
      setI18nByShort(iMap);
    } finally {
      setLoading(false);
    }
  }

  const totalQuizzes = useMemo(
    () => Object.values(quizzesByShort).reduce((n, arr) => n + (arr?.length || 0), 0),
    [quizzesByShort]
  );
  const languagesCount = useMemo(() => {
    const set = new Set<string>();
    Object.values(i18nByShort).forEach((arr) => arr?.forEach((r) => set.add(r.locale)));
    return Math.max(1, set.size);
  }, [i18nByShort]);

  async function deleteShort(shortId: string) {
    if (!confirm("Delete this short (and its quizzes/translations)?")) return;
    await supabase.from("shorts").delete().eq("id", shortId);
    // clean up children (if FK not cascading)
    await supabase.from("quiz_bank").delete().eq("kind", "short").eq("ref_id", shortId);
    await supabase.from("shorts_i18n").delete().eq("short_id", shortId);
    await loadAll();
  }

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Shorts Management</h1>
            <p className="text-gray-600">Create and manage micro-lessons (5–15 minutes) and quizzes</p>
          </div>
          <button
            onClick={() => { setEditingShort(null); setShowShortForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Short
          </button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KpiCard icon={<BookOpen className="w-8 h-8 text-blue-600 mr-3" />} label="Total Shorts" value={shorts.length} />
          <KpiCard icon={<HelpCircle className="w-8 h-8 text-purple-600 mr-3" />} label="Total Quizzes" value={totalQuizzes} />
          <KpiCard icon={<Eye className="w-8 h-8 text-amber-600 mr-3" />} label="Published" value={shorts.filter(s => s.is_published).length} />
          <KpiCard icon={<Globe className="w-8 h-8 text-teal-600 mr-3" />} label="Languages" value={languagesCount} />
        </div>

        {/* List */}
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : shorts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {shorts.map((s) => {
              const gate = gatesBySlug[s.slug];
              const quizzes = quizzesByShort[s.id] || [];
              const trans = i18nByShort[s.id] || [];
              return (
                <div key={s.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      {/* left */}
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{s.title}</h3>
                          <span className={`ml-3 px-2 py-1 text-xs rounded-full ${s.is_published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                            {s.is_published ? "Published" : "Draft"}
                          </span>
                          {s.preview && (
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                              Preview
                            </span>
                          )}
                          {gate && (
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 flex items-center">
                              <Lock className="w-3 h-3 mr-1" /> {gate.required_tier.toUpperCase()} • {gate.required_points} pts
                            </span>
                          )}
                        </div>
                        <div className="text-gray-600 text-sm mb-2">
                          <span className="mr-2">slug:</span>
                          <code className="text-gray-800 bg-gray-100 px-1 py-0.5 rounded">{s.slug}</code>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <FileText className="w-4 h-4 mr-1" />
                          <span>{quizzes.length} quizzes</span>
                          <span className="mx-2">•</span>
                          <span>Created {new Date(s.created_at).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span>{trans.length} translations</span>
                        </div>
                      </div>

                      {/* actions */}
                      <div className="flex space-x-2">
                        <IconBtn title="View details" onClick={() => setExpandedShort(expandedShort === s.id ? "" : s.id)}>
                          <Eye className="w-4 h-4" />
                        </IconBtn>
                        <IconBtn title="Add Quiz" onClick={() => { setQuizShortId(s.id); setEditingQuiz(null); setShowQuizForm(true); }}>
                          <HelpCircle className="w-4 h-4 text-purple-600" />
                        </IconBtn>
                        <IconBtn title="Manage Translations" onClick={() => { setI18nShort(s); setEditingI18n(null); setShowI18nForm(true); }}>
                          <Globe className="w-4 h-4 text-teal-600" />
                        </IconBtn>
                        <IconBtn title="Edit Short" onClick={() => { setEditingShort(s); setShowShortForm(true); }}>
                          <Edit className="w-4 h-4 text-blue-600" />
                        </IconBtn>
                        <IconBtn title="Delete Short" onClick={() => deleteShort(s.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </IconBtn>
                      </div>
                    </div>

                    {/* expanded */}
                    {expandedShort === s.id && (
                      <div className="border-t border-gray-200 pt-6 mt-4 space-y-6">
                        <section>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Quizzes</h4>
                          {quizzes.length === 0 ? (
                            <div className="text-sm text-gray-500">No quizzes yet.</div>
                          ) : (
                            <div className="space-y-2">
                              {quizzes.map((q) => (
                                <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex-1">
                                    <div className="flex items-center mb-1">
                                      <span className="font-medium text-gray-900 text-sm">{q.question}</span>
                                      <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                                        {q.options && q.options.length > 0 ? "multiple choice" : "true/false"}
                                      </span>
                                      <span className="ml-2 text-xs text-gray-500">+{q.points_award} pts</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      <span>Order: {q.order_index ?? 1}</span>
                                    </div>
                                  </div>
                                  <div className="flex space-x-1">
                                    <IconMini
                                      title="Edit"
                                      onClick={() => { setQuizShortId(s.id); setEditingQuiz(q); setShowQuizForm(true); }}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </IconMini>
                                    <IconMini
                                      title="Delete"
                                      onClick={async () => {
                                        await supabase.from("quiz_bank").delete().eq("id", q.id);
                                        await loadAll();
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </IconMini>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>

                        <section>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Translations</h4>
                          {trans.length === 0 ? (
                            <div className="text-sm text-gray-500">No translations yet.</div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {trans.map((t) => (
                                <div key={t.id} className="border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-center mb-1">
                                    <span className="mr-2">{LANGS.find(l => l.code === t.locale)?.flag || "🏳️"}</span>
                                    <span className="font-medium">{t.locale}</span>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {t.title_i18n || <em>No title</em>}
                                  </div>
                                  <div className="mt-2 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500">Alt Video:</span>
                                      <span className={`px-2 py-0.5 rounded-full ${t.video_url_alt ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                                        {t.video_url_alt ? "Available" : "Missing"}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-gray-500">Alt PDF:</span>
                                      <span className={`px-2 py-0.5 rounded-full ${t.pdf_url_alt ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                                        {t.pdf_url_alt ? "Available" : "Missing"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex gap-2">
                                    <button
                                      className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs"
                                      onClick={() => { setI18nShort(s); setEditingI18n(t); setShowI18nForm(true); }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs"
                                      onClick={async () => {
                                        await supabase.from("shorts_i18n").delete().eq("id", t.id);
                                        await loadAll();
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        {showShortForm && (
          <ShortForm
            shortItem={editingShort}
            gate={editingShort ? gatesBySlug[editingShort.slug] : undefined}
            onClose={() => { setShowShortForm(false); setEditingShort(null); }}
            onSaved={async () => { setShowShortForm(false); setEditingShort(null); await loadAll(); }}
          />
        )}

        {showQuizForm && (
          <QuizForm
            shortId={quizShortId}
            quiz={editingQuiz}
            onClose={() => { setShowQuizForm(false); setEditingQuiz(null); setQuizShortId(""); }}
            onSaved={async () => { setShowQuizForm(false); setEditingQuiz(null); setQuizShortId(""); await loadAll(); }}
          />
        )}

        {showI18nForm && i18nShort && (
          <I18nForm
            shortItem={i18nShort}
            record={editingI18n || null}
            onClose={() => { setShowI18nForm(false); setI18nShort(null); setEditingI18n(null); }}
            onSaved={async () => { setShowI18nForm(false); setI18nShort(null); setEditingI18n(null); await loadAll(); }}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Small UI helpers ---------- */
function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
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

function IconBtn({ children, title, onClick }: React.PropsWithChildren<{ title: string; onClick(): void }>) {
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
function IconMini({ children, title, onClick }: React.PropsWithChildren<{ title: string; onClick(): void }>) {
  return (
    <button
      className="p-1 hover:bg-gray-100 rounded transition-colors"
      title={title}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

/* =======================================================
   MODALS
======================================================= */

// Create/Edit Short + gating
function ShortForm({
  shortItem,
  gate,
  onClose,
  onSaved,
}: {
  shortItem: Short | null;
  gate?: GateMeta;
  onClose(): void;
  onSaved(): void;
}) {
  const [form, setForm] = useState({
    title: shortItem?.title ?? "",
    slug: shortItem?.slug ?? "",
    video_url: shortItem?.video_url ?? "",
    preview: shortItem?.preview ?? false,
    is_published: shortItem?.is_published ?? false,
  });
  const [gateForm, setGateForm] = useState({
    required_points: gate?.required_points ?? 0,
    required_tier: (gate?.required_tier ?? "free") as GateMeta["required_tier"],
    is_active: gate?.is_active ?? true,
  });
  const editing = Boolean(shortItem?.id);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (editing) {
      await supabase.from("shorts").update({
        title: form.title, slug: form.slug, video_url: form.video_url || null,
        preview: form.preview, is_published: form.is_published,
      }).eq("id", shortItem!.id);
    } else {
      const { error } = await supabase.from("shorts").insert([{
        title: form.title, slug: form.slug, video_url: form.video_url || null,
        preview: form.preview, is_published: form.is_published,
      }]);
      if (error) { alert(error.message); return; }
    }

    // upsert gate meta by slug
    await supabase.from("content_shorts").upsert({
      slug: form.slug,
      required_points: gateForm.required_points,
      required_tier: gateForm.required_tier,
      is_active: gateForm.is_active,
    }, { onConflict: "slug" });

    await onSaved();
  }

  return (
    <Modal title={editing ? "Edit Short" : "Create Short"} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Title">
          <input className="w-full px-3 py-2 border rounded-md" value={form.title}
                 onChange={e => setForm({ ...form, title: e.target.value })} required />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Slug">
            <input className="w-full px-3 py-2 border rounded-md" value={form.slug}
                   onChange={e => setForm({ ...form, slug: e.target.value })} required />
          </Field>
          <Field label="Video URL (YouTube/Vimeo)">
            <input className="w-full px-3 py-2 border rounded-md" value={form.video_url || ""}
                   onChange={e => setForm({ ...form, video_url: e.target.value })} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CheckRow label="Preview (free sample)" checked={form.preview}
                    onChange={(v) => setForm({ ...form, preview: v })} />
          <CheckRow label="Published (visible)" checked={form.is_published}
                    onChange={(v) => setForm({ ...form, is_published: v })} />
        </div>

        <div className="pt-2">
          <h4 className="font-semibold mb-2 flex items-center"><Lock className="w-4 h-4 mr-2" /> Gating</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Required Tier">
              <select className="w-full px-3 py-2 border rounded-md"
                      value={gateForm.required_tier}
                      onChange={(e) => setGateForm({ ...gateForm, required_tier: e.target.value as any })}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="vip">VIP</option>
              </select>
            </Field>
            <Field label="Required Points">
              <input type="number" min={0} className="w-full px-3 py-2 border rounded-md"
                     value={gateForm.required_points}
                     onChange={(e) => setGateForm({ ...gateForm, required_points: Number(e.target.value || 0) })} />
            </Field>
            <Field label="Gate Active">
              <select className="w-full px-3 py-2 border rounded-md"
                      value={gateForm.is_active ? "1" : "0"}
                      onChange={(e) => setGateForm({ ...gateForm, is_active: e.target.value === "1" })}>
                <option value="1">Active</option>
                <option value="0">Disabled</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium">
            <CheckCircle className="w-4 h-4 inline mr-2" />
            {editing ? "Update Short" : "Create Short"}
          </button>
          <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-lg font-medium">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Create/Edit Quiz for a short
function QuizForm({
  shortId, quiz, onClose, onSaved,
}: {
  shortId: string;
  quiz: ShortQuiz | null;
  onClose(): void;
  onSaved(): void;
}) {
  const [type, setType] = useState<"multiple_choice" | "true_false">(
    quiz?.options && quiz.options.length > 0 ? "multiple_choice" : "true_false"
  );
  const [question, setQuestion] = useState(quiz?.question || "");
  const [options, setOptions] = useState<string[]>(
    quiz?.options && quiz.options.length > 0 ? quiz.options : ["", "", "", ""]
  );
  const [correctIdx, setCorrectIdx] = useState<number | null>(quiz?.correct_index ?? null);
  const [points, setPoints] = useState<number>(quiz?.points_award ?? 50);
  const [order, setOrder] = useState<number>(quiz?.order_index ?? 1);

  function updateOption(i: number, v: string) {
    const copy = [...options]; copy[i] = v; setOptions(copy);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload: Partial<ShortQuiz> & { kind: "short"; ref_id: string } = {
      kind: "short",
      ref_id: shortId,
      question,
      options: type === "multiple_choice" ? options.filter(o => o.trim()) : null,
      correct_index: type === "multiple_choice" ? (correctIdx ?? 0) : 0, // 0 = True, 1 = False for TF
      points_award: points,
      order_index: order,
    };

    if (quiz?.id) {
      await supabase.from("quiz_bank").update(payload).eq("id", quiz.id);
    } else {
      await supabase.from("quiz_bank").insert([payload]);
    }
    await onSaved();
  }

  return (
    <Modal title={quiz ? "Edit Quiz" : "Add Quiz"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <Field label="Question">
          <textarea className="w-full px-3 py-2 border rounded-md" rows={3}
                    value={question} onChange={(e) => setQuestion(e.target.value)} required />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Type">
            <select className="w-full px-3 py-2 border rounded-md" value={type}
                    onChange={(e) => {
                      const t = e.target.value as "multiple_choice" | "true_false";
                      setType(t);
                      if (t === "true_false") { setOptions(["true", "false"]); setCorrectIdx(0); }
                      else { setOptions(["", "", "", ""]); setCorrectIdx(null); }
                    }}>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True/False</option>
            </select>
          </Field>
          <Field label="Points Award">
            <input type="number" min={0} className="w-full px-3 py-2 border rounded-md"
                   value={points} onChange={(e) => setPoints(Number(e.target.value || 0))} />
          </Field>
          <Field label="Order">
            <input type="number" min={1} className="w-full px-3 py-2 border rounded-md"
                   value={order} onChange={(e) => setOrder(Number(e.target.value || 1))} />
          </Field>
        </div>

        {type === "multiple_choice" ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Options</label>
              <button type="button" className="text-purple-600 text-sm"
                      onClick={() => setOptions([...options, ""])}>+ Add Option</button>
            </div>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 text-xs text-gray-500">{String.fromCharCode(65 + i)}.</span>
                  <input className="flex-1 px-3 py-2 border rounded-md" value={opt}
                         onChange={(e) => updateOption(i, e.target.value)} />
                  {options.length > 2 && (
                    <button type="button" className="text-red-600 p-1"
                            onClick={() => setOptions(options.filter((_, idx) => idx !== i))}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <Field label="Correct Answer" className="mt-3">
              <select className="w-full px-3 py-2 border rounded-md" required
                      value={String(correctIdx ?? "")}
                      onChange={(e) => setCorrectIdx(Number(e.target.value))}>
                <option value="">Select…</option>
                {options.map((opt, i) =>
                  opt.trim() ? <option key={i} value={i}>{String.fromCharCode(65 + i)}. {opt}</option> : null
                )}
              </select>
            </Field>
          </div>
        ) : (
          <Field label="Correct Answer">
            <select className="w-full px-3 py-2 border rounded-md" value={String(correctIdx ?? 0)}
                    onChange={(e) => setCorrectIdx(Number(e.target.value))}>
              <option value="0">True</option>
              <option value="1">False</option>
            </select>
          </Field>
        )}

        <div className="flex gap-3 pt-4">
          <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium">
            {quiz ? "Update" : "Create"} Quiz
          </button>
          <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-lg font-medium">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Add/Edit translation for a short (incl. alt links)
function I18nForm({
  shortItem, record, onClose, onSaved,
}: {
  shortItem: Short;
  record: ShortI18n | null;
  onClose(): void;
  onSaved(): void;
}) {
  const [locale, setLocale] = useState(record?.locale || "ko");
  const [title, setTitle] = useState(record?.title_i18n || "");
  const [blurb, setBlurb] = useState(record?.blurb_i18n || "");
  const [videoAlt, setVideoAlt] = useState(record?.video_url_alt || "");
  const [pdfAlt, setPdfAlt] = useState(record?.pdf_url_alt || "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      short_id: shortItem.id,
      locale,
      title_i18n: title || null,
      blurb_i18n: blurb || null,
      video_url_alt: videoAlt || null,
      pdf_url_alt: pdfAlt || null,
    };
    if (record?.id) {
      await supabase.from("shorts_i18n").update(payload).eq("id", record.id);
    } else {
      await supabase.from("shorts_i18n").upsert([payload], { onConflict: "short_id,locale" });
    }
    await onSaved();
  }

  return (
    <Modal title={`Translations for: ${shortItem.title}`} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Language">
            <select className="w-full px-3 py-2 border rounded-md" value={locale} onChange={(e) => setLocale(e.target.value)}>
              {LANGS.filter(l => l.code !== "en").map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Localized Title">
            <input className="w-full px-3 py-2 border rounded-md" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Alt Video URL">
            <input className="w-full px-3 py-2 border rounded-md" value={videoAlt} onChange={(e) => setVideoAlt(e.target.value)} placeholder="https://youtu.be/..." />
          </Field>
        </div>

        <Field label="Localized Blurb">
          <textarea className="w-full px-3 py-2 border rounded-md" rows={3} value={blurb} onChange={(e) => setBlurb(e.target.value)} />
        </Field>

        <Field label="Alt PDF URL">
          <input className="w-full px-3 py-2 border rounded-md" value={pdfAlt} onChange={(e) => setPdfAlt(e.target.value)} placeholder="https://example.com/guide.pdf" />
        </Field>

        <div className="flex gap-3 pt-4">
          <button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg font-medium">
            Save Translation
          </button>
          <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-lg font-m
