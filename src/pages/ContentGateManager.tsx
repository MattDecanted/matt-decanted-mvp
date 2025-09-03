import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Tier = "free" | "pro" | "vip";

type ShortRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
};

type ModuleRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
};

const TIERS: Tier[] = ["free", "pro", "vip"];

function RowEditor<T extends { slug: string; title: string; summary: string | null; required_points: number; required_tier: Tier; is_active: boolean; }>(
  { row, onChange, onSave, saving }:
  { row: T; onChange: (r: T) => void; onSave: () => Promise<void>; saving: boolean; }
) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center border-t py-3">
      <div className="sm:col-span-3">
        <div className="font-medium">{row.title}</div>
        <div className="text-xs text-gray-500">{row.slug}</div>
      </div>
      <div className="sm:col-span-3">
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="Summary"
          value={row.summary ?? ""}
          onChange={(e) => onChange({ ...row, summary: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <select
          className="w-full rounded-md border px-3 py-2 bg-white"
          value={row.required_tier}
          onChange={(e) => onChange({ ...row, required_tier: e.target.value as Tier })}
        >
          {TIERS.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <input
          type="number"
          min={0}
          className="w-full rounded-md border px-3 py-2"
          value={row.required_points}
          onChange={(e) => onChange({ ...row, required_points: Math.max(0, Number(e.target.value || 0)) })}
        />
      </div>
      <div className="sm:col-span-1">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={row.is_active}
            onChange={(e) => onChange({ ...row, is_active: e.target.checked })}
          />
          Active
        </label>
      </div>
      <div className="sm:col-span-1">
        <Button onClick={onSave} disabled={saving} className="w-full">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function QuickAdd({
  kind,
  onAdded,
}: {
  kind: "shorts" | "modules";
  onAdded: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [requiredTier, setRequiredTier] = useState<Tier>("free");
  const [requiredPoints, setRequiredPoints] = useState(0);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const table = kind === "shorts" ? "content_shorts" : "content_modules";

  const save = async () => {
    if (!slug || !title) {
      toast.error("Slug and title are required.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from(table).insert([{
        slug: slug.trim(),
        title: title.trim(),
        summary: summary || null,
        required_tier: requiredTier,
        required_points: requiredPoints,
        is_active: active,
      }]);
      if (error) throw error;
      toast.success("Created!");
      setSlug(""); setTitle(""); setSummary(""); setRequiredTier("free"); setRequiredPoints(0); setActive(true);
      onAdded();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border p-3 space-y-2 bg-white">
      <div className="font-medium">Quick add {kind}</div>
      <div className="grid sm:grid-cols-6 gap-2">
        <input className="rounded-md border px-3 py-2 sm:col-span-2" placeholder="slug" value={slug} onChange={e => setSlug(e.target.value)} />
        <input className="rounded-md border px-3 py-2 sm:col-span-2" placeholder="title" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="rounded-md border px-3 py-2 sm:col-span-2" placeholder="summary (optional)" value={summary} onChange={e => setSummary(e.target.value)} />
        <select className="rounded-md border px-3 py-2 sm:col-span-2 bg-white" value={requiredTier} onChange={e => setRequiredTier(e.target.value as Tier)}>
          {TIERS.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
        <input type="number" min={0} className="rounded-md border px-3 py-2 sm:col-span-2" placeholder="required points" value={requiredPoints} onChange={e => setRequiredPoints(Math.max(0, Number(e.target.value || 0)))} />
        <label className="inline-flex items-center gap-2 text-sm sm:col-span-1">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Active
        </label>
        <Button onClick={save} disabled={saving} className="sm:col-span-1">{saving ? "Saving…" : "Create"}</Button>
      </div>
    </div>
  );
}

export default function ContentGateManager() {
  const [activeTab, setActiveTab] = useState<"shorts" | "modules">("shorts");
  const [shorts, setShorts] = useState<ShortRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [sRes, mRes] = await Promise.all([
      supabase.from("content_shorts").select("*").order("created_at", { ascending: false }),
      supabase.from("content_modules").select("*").order("created_at", { ascending: false }),
    ]);
    if (!sRes.error && sRes.data) setShorts(sRes.data as ShortRow[]);
    if (!mRes.error && mRes.data) setModules(mRes.data as ModuleRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const saveShort = async (row: ShortRow) => {
    setSavingSlug(row.slug);
    try {
      const { error } = await supabase
        .from("content_shorts")
        .update({
          title: row.title,
          summary: row.summary,
          required_tier: row.required_tier,
          required_points: row.required_points,
          is_active: row.is_active,
        })
        .eq("slug", row.slug);
      if (error) throw error;
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingSlug(null);
    }
  };

  const saveModule = async (row: ModuleRow) => {
    setSavingSlug(row.slug);
    try {
      const { error } = await supabase
        .from("content_modules")
        .update({
          title: row.title,
          summary: row.summary,
          required_tier: row.required_tier,
          required_points: row.required_points,
          is_active: row.is_active,
        })
        .eq("slug", row.slug);
      if (error) throw error;
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingSlug(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Content Gate Manager</h1>
        <div className="flex gap-2">
          <Button variant={activeTab === "shorts" ? "default" : "outline"} onClick={() => setActiveTab("shorts")}>Shorts</Button>
          <Button variant={activeTab === "modules" ? "default" : "outline"} onClick={() => setActiveTab("modules")}>Modules</Button>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          {activeTab === "shorts" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Shorts <Badge variant="secondary">{shorts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <QuickAdd kind="shorts" onAdded={loadAll} />
                <div className="text-xs text-gray-500">Edit requirements and toggle visibility. Changes are immediate on Save.</div>

                {shorts.map((s, idx) => (
                  <RowEditor
                    key={s.slug}
                    row={s}
                    saving={savingSlug === s.slug}
                    onChange={(next) => {
                      const copy = [...shorts];
                      copy[idx] = next as ShortRow;
                      setShorts(copy);
                    }}
                    onSave={() => saveShort(shorts[idx])}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "modules" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Modules <Badge variant="secondary">{modules.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <QuickAdd kind="modules" onAdded={loadAll} />
                <div className="text-xs text-gray-500">Edit requirements and toggle visibility. Changes are immediate on Save.</div>

                {modules.map((m, idx) => (
                  <RowEditor
                    key={m.slug}
                    row={m}
                    saving={savingSlug === m.slug}
                    onChange={(next) => {
                      const copy = [...modules];
                      copy[idx] = next as ModuleRow;
                      setModules(copy);
                    }}
                    onSave={() => saveModule(modules[idx])}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
