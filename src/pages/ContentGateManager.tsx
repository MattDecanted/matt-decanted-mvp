// src/pages/admin/ContentGateManager.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Tier } from "@/lib/entitlements";

type ShortGate = {
  slug: string;
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
  updated_at?: string | null;
};
type ModuleGate = {
  slug: string;
  title: string | null;
  summary?: string | null;
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
  updated_at?: string | null;
};

const TIERS: Tier[] = ["free", "pro", "vip"];

function TierSelect({
  value,
  onChange,
}: {
  value: Tier;
  onChange: (v: Tier) => void;
}) {
  return (
    <select
      className="h-9 rounded-md border px-2 text-sm bg-white"
      value={value}
      onChange={(e) => onChange(e.target.value as Tier)}
    >
      {TIERS.map((t) => (
        <option key={t} value={t}>
          {t.toUpperCase()}
        </option>
      ))}
    </select>
  );
}

function ActiveCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      Active
    </label>
  );
}

export default function ContentGateManager() {
  const [tab, setTab] = useState<"shorts" | "modules">("shorts");

  const [shorts, setShorts] = useState<ShortGate[]>([]);
  const [mods, setMods] = useState<ModuleGate[]>([]);
  const [loading, setLoading] = useState(false);

  // New row forms
  const [newShortSlug, setNewShortSlug] = useState("");
  const [newShortTier, setNewShortTier] = useState<Tier>("free");
  const [newShortPoints, setNewShortPoints] = useState<number>(0);

  const [newModSlug, setNewModSlug] = useState("");
  const [newModTitle, setNewModTitle] = useState("");
  const [newModSummary, setNewModSummary] = useState("");
  const [newModTier, setNewModTier] = useState<Tier>("free");
  const [newModPoints, setNewModPoints] = useState<number>(0);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      setLoading(true);

      // content_shorts
      const { data: sData, error: sErr } = await supabase
        .from("content_shorts")
        .select("slug, required_points, required_tier, is_active, updated_at")
        .order("updated_at", { ascending: false })
        .order("slug", { ascending: true });
      if (sErr) throw sErr;
      setShorts((sData || []) as ShortGate[]);

      // content_modules
      const { data: mData, error: mErr } = await supabase
        .from("content_modules")
        .select(
          "slug, title, summary, required_points, required_tier, is_active, updated_at"
        )
        .order("updated_at", { ascending: false })
        .order("slug", { ascending: true });
      if (mErr) throw mErr;
      setMods((mData || []) as ModuleGate[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to load content gates.");
    } finally {
      setLoading(false);
    }
  }

  async function saveShort(row: ShortGate) {
    try {
      const { error } = await supabase
        .from("content_shorts")
        .update({
          required_points: Number(row.required_points || 0),
          required_tier: row.required_tier,
          is_active: !!row.is_active,
        })
        .eq("slug", row.slug);
      if (error) throw error;
      toast.success(`Saved ${row.slug}`);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  async function saveModule(row: ModuleGate) {
    try {
      const { error } = await supabase
        .from("content_modules")
        .update({
          title: row.title ?? null,
          summary: row.summary ?? null,
          required_points: Number(row.required_points || 0),
          required_tier: row.required_tier,
          is_active: !!row.is_active,
        })
        .eq("slug", row.slug);
      if (error) throw error;
      toast.success(`Saved ${row.slug}`);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  async function addShort() {
    try {
      if (!newShortSlug.trim()) {
        toast.error("Slug is required");
        return;
      }
      const payload = {
        slug: newShortSlug.trim(),
        required_points: Number(newShortPoints || 0),
        required_tier: newShortTier,
        is_active: true,
      };
      const { error } = await supabase.from("content_shorts").insert([payload]);
      if (error) throw error;
      toast.success(`Added short gate: ${payload.slug}`);
      setNewShortSlug("");
      setNewShortPoints(0);
      setNewShortTier("free");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Add failed");
    }
  }

  async function addModule() {
    try {
      if (!newModSlug.trim() || !newModTitle.trim()) {
        toast.error("Slug and title are required");
        return;
      }
      const payload = {
        slug: newModSlug.trim(),
        title: newModTitle.trim(),
        summary: newModSummary.trim() || null,
        required_points: Number(newModPoints || 0),
        required_tier: newModTier,
        is_active: true,
      };
      const { error } = await supabase.from("content_modules").insert([payload]);
      if (error) throw error;
      toast.success(`Added module: ${payload.slug}`);
      setNewModSlug("");
      setNewModTitle("");
      setNewModSummary("");
      setNewModPoints(0);
      setNewModTier("free");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Add failed");
    }
  }

  const header = useMemo(
    () => (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant={tab === "shorts" ? "default" : "outline"}
            onClick={() => setTab("shorts")}
          >
            Shorts
          </Button>
          <Button
            variant={tab === "modules" ? "default" : "outline"}
            onClick={() => setTab("modules")}
          >
            Modules
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{loading ? "Loading…" : "Ready"}</Badge>
          <Button variant="outline" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </div>
    ),
    [tab, loading]
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Gating Manager</CardTitle>
        </CardHeader>
        <CardContent>{header}</CardContent>
      </Card>

      {/* SHORTS TAB */}
      {tab === "shorts" && (
        <>
          {/* Add new short gate */}
          <Card>
            <CardHeader>
              <CardTitle>Add short gate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  className="h-9 rounded-md border px-2 text-sm"
                  placeholder="slug (must match shorts.slug)"
                  value={newShortSlug}
                  onChange={(e) => setNewShortSlug(e.target.value)}
                />
                <TierSelect value={newShortTier} onChange={setNewShortTier} />
                <input
                  type="number"
                  className="h-9 rounded-md border px-2 text-sm"
                  placeholder="required points"
                  value={newShortPoints}
                  onChange={(e) => setNewShortPoints(Number(e.target.value))}
                />
                <Button onClick={addShort}>Add</Button>
              </div>
              <p className="text-xs text-gray-500">
                Only controls access (tier/points/active). Manage the actual short in the <code>shorts</code> table.
              </p>
            </CardContent>
          </Card>

          {/* List/edit shorts */}
          <Card>
            <CardHeader>
              <CardTitle>Short gates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {shorts.length === 0 ? (
                <div className="text-sm text-gray-500">No rows.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-3">Slug</th>
                        <th className="py-2 pr-3">Tier</th>
                        <th className="py-2 pr-3">Points</th>
                        <th className="py-2 pr-3">Active</th>
                        <th className="py-2 pr-3">Updated</th>
                        <th className="py-2 pr-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shorts.map((row) => (
                        <ShortRow key={row.slug} row={row} onSave={saveShort} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* MODULES TAB */}
      {tab === "modules" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Add module</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <input
                  className="h-9 rounded-md border px-2 text-sm"
                  placeholder="slug"
                  value={newModSlug}
                  onChange={(e) => setNewModSlug(e.target.value)}
                />
                <input
                  className="h-9 rounded-md border px-2 text-sm"
                  placeholder="title"
                  value={newModTitle}
                  onChange={(e) => setNewModTitle(e.target.value)}
                />
                <input
                  className="h-9 rounded-md border px-2 text-sm sm:col-span-2"
                  placeholder="summary (optional)"
                  value={newModSummary}
                  onChange={(e) => setNewModSummary(e.target.value)}
                />
                <TierSelect value={newModTier} onChange={setNewModTier} />
                <input
                  type="number"
                  className="h-9 rounded-md border px-2 text-sm"
                  placeholder="required points"
                  value={newModPoints}
                  onChange={(e) => setNewModPoints(Number(e.target.value))}
                />
              </div>
              <div>
                <Button onClick={addModule}>Add</Button>
              </div>
              <p className="text-xs text-gray-500">
                This creates a row in <code>content_modules</code>. You can edit gate fields below.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mods.length === 0 ? (
                <div className="text-sm text-gray-500">No rows.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-3">Slug</th>
                        <th className="py-2 pr-3">Title</th>
                        <th className="py-2 pr-3">Tier</th>
                        <th className="py-2 pr-3">Points</th>
                        <th className="py-2 pr-3">Active</th>
                        <th className="py-2 pr-3">Updated</th>
                        <th className="py-2 pr-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mods.map((row) => (
                        <ModuleRow key={row.slug} row={row} onSave={saveModule} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ShortRow({
  row,
  onSave,
}: {
  row: ShortGate;
  onSave: (r: ShortGate) => void;
}) {
  const [draft, setDraft] = useState(row);
  useEffect(() => setDraft(row), [row]);

  const dirty =
    draft.required_points !== row.required_points ||
    draft.required_tier !== row.required_tier ||
    draft.is_active !== row.is_active;

  return (
    <tr className="border-t">
      <td className="py-2 pr-3 font-mono">{row.slug}</td>
      <td className="py-2 pr-3">
        <TierSelect
          value={draft.required_tier}
          onChange={(v) => setDraft((d) => ({ ...d, required_tier: v }))}
        />
      </td>
      <td className="py-2 pr-3">
        <input
          type="number"
          className="h-9 w-24 rounded-md border px-2 text-sm"
          value={draft.required_points}
          onChange={(e) =>
            setDraft((d) => ({ ...d, required_points: Number(e.target.value) }))
          }
        />
      </td>
      <td className="py-2 pr-3">
        <ActiveCheckbox
          checked={draft.is_active}
          onChange={(v) => setDraft((d) => ({ ...d, is_active: v }))}
        />
      </td>
      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
        {row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"}
      </td>
      <td className="py-2 pr-3">
        <Button
          size="sm"
          disabled={!dirty}
          onClick={() => onSave(draft)}
          title={dirty ? "Save changes" : "No changes"}
        >
          Save
        </Button>
      </td>
    </tr>
  );
}

function ModuleRow({
  row,
  onSave,
}: {
  row: ModuleGate;
  onSave: (r: ModuleGate) => void;
}) {
  const [draft, setDraft] = useState(row);
  useEffect(() => setDraft(row), [row]);

  const dirty =
    draft.required_points !== row.required_points ||
    draft.required_tier !== row.required_tier ||
    draft.is_active !== row.is_active ||
    (draft.title ?? "") !== (row.title ?? "") ||
    (draft.summary ?? "") !== (row.summary ?? "");

  return (
    <tr className="border-t">
      <td className="py-2 pr-3 font-mono">{row.slug}</td>
      <td className="py-2 pr-3">
        <input
          className="h-9 rounded-md border px-2 text-sm min-w-[12rem]"
          value={draft.title ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
        <div className="mt-1">
          <input
            className="h-9 rounded-md border px-2 text-xs w-full"
            placeholder="summary (optional)"
            value={draft.summary ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, summary: e.target.value }))
            }
          />
        </div>
      </td>
      <td className="py-2 pr-3">
        <TierSelect
          value={draft.required_tier}
          onChange={(v) => setDraft((d) => ({ ...d, required_tier: v }))}
        />
      </td>
      <td className="py-2 pr-3">
        <input
          type="number"
          className="h-9 w-24 rounded-md border px-2 text-sm"
          value={draft.required_points}
          onChange={(e) =>
            setDraft((d) => ({ ...d, required_points: Number(e.target.value) }))
          }
        />
      </td>
      <td className="py-2 pr-3">
        <ActiveCheckbox
          checked={draft.is_active}
          onChange={(v) => setDraft((d) => ({ ...d, is_active: v }))}
        />
      </td>
      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
        {row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"}
      </td>
      <td className="py-2 pr-3">
        <Button
          size="sm"
          disabled={!dirty}
          onClick={() => onSave(draft)}
          title={dirty ? "Save changes" : "No changes"}
        >
          Save
        </Button>
      </td>
    </tr>
  );
}
