import * as React from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Tier = "free" | "pro" | "vip";

/* --------------------------------- Types --------------------------------- */
type ShortBase = {
  id: string;
  slug: string;
  title: string;
  preview: boolean;
  is_published: boolean;
};

type ShortGate = {
  slug: string;
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
};

type ShortRow = {
  slug: string;
  title: string;
  preview: boolean;
  is_published: boolean;
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
  selected?: boolean;
  dirty?: boolean;
};

type ModuleRow = {
  slug: string;
  title: string;
  summary: string | null;
  required_points: number;
  required_tier: Tier;
  is_active: boolean;
  selected?: boolean;
  dirty?: boolean;
};

/* ------------------------------ Small helpers ---------------------------- */
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
const TIERS: Tier[] = ["free", "pro", "vip"];

function exportCSV(rows: any[], filename: string) {
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = Object.keys(rows[0] || {});
  const csv = [
    header.map(escape).join(","),
    ...rows.map((r) => header.map((k) => escape(r[k])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* --------------------------------- Page ---------------------------------- */
export default function ContentGateManager() {
  const [tab, setTab] = React.useState<"shorts" | "modules">("shorts");

  /* Shorts state */
  const [shorts, setShorts] = React.useState<ShortRow[]>([]);
  const [sLoading, setSLoading] = React.useState(true);

  /* Modules state */
  const [modules, setModules] = React.useState<ModuleRow[]>([]);
  const [mLoading, setMLoading] = React.useState(true);

  /* Filters */
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounced(search, 250);
  const [tierFilter, setTierFilter] = React.useState<"all" | Tier>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");

  React.useEffect(() => {
    loadShorts();
    loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadShorts() {
    try {
      setSLoading(true);
      const [{ data: sBase, error: e1 }, { data: sMeta, error: e2 }] = await Promise.all([
        supabase
          .from("shorts")
          .select("id, slug, title, preview, is_published")
          .eq("is_published", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("content_shorts")
          .select("slug, required_points, required_tier, is_active"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const gateMap = new Map<string, ShortGate>();
      (sMeta || []).forEach((g: any) =>
        gateMap.set(g.slug, {
          slug: g.slug,
          required_points: Number(g.required_points ?? 0),
          required_tier: (g.required_tier ?? "free") as Tier,
          is_active: Boolean(g.is_active ?? true),
        })
      );
      const rows: ShortRow[] = (sBase || []).map((b: ShortBase) => {
        const g = gateMap.get(b.slug);
        return {
          slug: b.slug,
          title: b.title,
          preview: b.preview,
          is_published: b.is_published,
          required_points: Number(g?.required_points ?? 0),
          required_tier: (g?.required_tier ?? "free") as Tier,
          is_active: Boolean(g?.is_active ?? true),
        };
      });
      setShorts(rows);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load shorts");
    } finally {
      setSLoading(false);
    }
  }

  async function loadModules() {
    try {
      setMLoading(true);
      const { data, error } = await supabase
        .from("content_modules")
        .select("slug, title, summary, required_points, required_tier, is_active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows: ModuleRow[] = (data || []).map((m: any) => ({
        slug: m.slug,
        title: m.title,
        summary: m.summary ?? null,
        required_points: Number(m.required_points ?? 0),
        required_tier: (m.required_tier ?? "free") as Tier,
        is_active: Boolean(m.is_active ?? true),
      }));
      setModules(rows);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load modules");
    } finally {
      setMLoading(false);
    }
  }

  /* ------------------------------ Derivations ----------------------------- */
  const list = tab === "shorts" ? shorts : modules;
  const filtered = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return list.filter((r: any) => {
      const bySearch = q
        ? (r.title?.toLowerCase() || "").includes(q) || (r.slug?.toLowerCase() || "").includes(q)
        : true;
      const byTier = tierFilter === "all" ? true : r.required_tier === tierFilter;
      const byStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? r.is_active === true
          : r.is_active === false;
      return bySearch && byTier && byStatus;
    });
  }, [list, debouncedSearch, tierFilter, statusFilter]);

  const allSelected = filtered.length > 0 && filtered.every((r) => r.selected);
  const someSelected = filtered.some((r) => r.selected);

  function toggleSelectAll() {
    const next = !allSelected;
    if (tab === "shorts") {
      setShorts((prev) =>
        prev.map((r) =>
          filtered.find((x) => x.slug === r.slug) ? { ...r, selected: next } : r
        )
      );
    } else {
      setModules((prev) =>
        prev.map((r) =>
          filtered.find((x) => x.slug === r.slug) ? { ...r, selected: next } : r
        )
      );
    }
  }

  function patchRow(slug: string, patch: Partial<ShortRow & ModuleRow>) {
    if (tab === "shorts") {
      setShorts((prev) =>
        prev.map((r) =>
          r.slug === slug ? { ...r, ...patch, dirty: true } : r
        )
      );
    } else {
      setModules((prev) =>
        prev.map((r) =>
          r.slug === slug ? { ...r, ...patch, dirty: true } : r
        )
      );
    }
  }

  async function saveRow(slug: string) {
    const row: any = (tab === "shorts" ? shorts : modules).find((r) => r.slug === slug);
    if (!row) return;
    try {
      if (tab === "shorts") {
        const { error } = await supabase.from("content_shorts").upsert(
          [
            {
              slug: row.slug,
              required_points: Math.max(0, Number(row.required_points || 0)),
              required_tier: row.required_tier,
              is_active: !!row.is_active,
            },
          ],
          { onConflict: "slug" }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("content_modules")
          .update({
            required_points: Math.max(0, Number(row.required_points || 0)),
            required_tier: row.required_tier,
            is_active: !!row.is_active,
          })
          .eq("slug", row.slug);
        if (error) throw error;
      }
      patchRow(slug, { dirty: false });
      toast.success("Saved");
    } catch (err: any) {
      console.error(err);
      toast.error("Save failed");
    }
  }

  /* ------------------------------- Bulk ops ------------------------------ */
  function getTargets(): string[] {
    const src = tab === "shorts" ? shorts : modules;
    const selected = src.filter((r) => r.selected).map((r) => r.slug);
    if (selected.length > 0) return selected;
    if (!window.confirm("No items selected. Apply to all filtered items?")) return [];
    return filtered.map((r) => r.slug);
  }

  async function bulkSetTier(tier: Tier) {
    const slugs = getTargets();
    if (slugs.length === 0) return;

    try {
      if (tab === "shorts") {
        const payload = slugs.map((slug) => ({ slug, required_tier: tier }));
        const { error } = await supabase.from("content_shorts").upsert(payload, { onConflict: "slug", ignoreDuplicates: false });
        if (error) throw error;
        setShorts((prev) =>
          prev.map((r) => (slugs.includes(r.slug) ? { ...r, required_tier: tier, dirty: false } : r))
        );
      } else {
        const { error } = await supabase
          .from("content_modules")
          .update({ required_tier: tier })
          .in("slug", slugs);
        if (error) throw error;
        setModules((prev) =>
          prev.map((r) => (slugs.includes(r.slug) ? { ...r, required_tier: tier, dirty: false } : r))
        );
      }
      toast.success(`Set ${slugs.length} item(s) to ${tier.toUpperCase()}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Bulk update failed");
    }
  }

  async function bulkSetPoints() {
    const slugs = getTargets();
    if (slugs.length === 0) return;
    const val = window.prompt("Required points (non-negative integer):", "0");
    if (val === null) return;
    const pts = Math.max(0, Number(val));
    if (!Number.isFinite(pts)) return toast.error("Invalid number");

    try {
      if (tab === "shorts") {
        const payload = slugs.map((slug) => ({ slug, required_points: pts }));
        const { error } = await supabase.from("content_shorts").upsert(payload, { onConflict: "slug", ignoreDuplicates: false });
        if (error) throw error;
        setShorts((prev) =>
          prev.map((r) => (slugs.includes(r.slug) ? { ...r, required_points: pts, dirty: false } : r))
        );
      } else {
        const { error } = await supabase
          .from("content_modules")
          .update({ required_points: pts })
          .in("slug", slugs);
        if (error) throw error;
        setModules((prev) =>
          prev.map((r) => (slugs.includes(r.slug) ? { ...r, required_points: pts, dirty: false } : r))
        );
      }
      toast.success(`Set points to ${pts} for ${slugs.length} item(s)`);
    } catch (err: any) {
      console.error(err);
      toast.error("Bulk update failed");
    }
  }

  async function bulkSetActive(active: boolean) {
    const slugs = getTargets();
    if (slugs.length === 0) return;

    try {
      if (tab === "shorts") {
        const payload = slugs.map((slug) => ({ slug, is_active: active }));
        const { error } = await supabase.from("content_shorts").upsert(payload, { onConflict: "slug", ignoreDuplicates: false });
        if (error) throw error;
        setShorts((prev) =>
          prev.map((r) => (slugs.includes(r.slug) ? { ...r, is_active: active, dirty: false } : r))
        );
      } else {
        const { error } = await supabase
          .from("content_modules")
          .update({ is_active: active })
          .in("slug", slugs);
        if (error) throw error;
        setModules((prev) =>
          prev.map((r) => (slugs.includes(r.slug) ? { ...r, is_active: active, dirty: false } : r))
        );
      }
      toast.success(`${active ? "Activated" : "Deactivated"} ${slugs.length} item(s)`);
    } catch (err: any) {
      console.error(err);
      toast.error("Bulk update failed");
    }
  }

  /* ------------------------------- CSV export ---------------------------- */
  function rowsForExport(src: Array<ShortRow | ModuleRow>) {
    if (tab === "shorts") {
      return (src as ShortRow[]).map((r) => ({
        type: "short",
        title: r.title,
        slug: r.slug,
        tier: r.required_tier.toUpperCase(),
        points: r.required_points,
        active: r.is_active ? "yes" : "no",
        preview: r.preview ? "yes" : "no",
      }));
    }
    return (src as ModuleRow[]).map((r) => ({
      type: "module",
      title: r.title,
      slug: r.slug,
      tier: r.required_tier.toUpperCase(),
      points: r.required_points,
      active: r.is_active ? "yes" : "no",
    }));
  }

  function exportFilteredCSV() {
    const rows = rowsForExport(filtered);
    if (rows.length === 0) return toast.message("Nothing to export");
    const ts = new Date();
    const name = `content_gates_${tab}_${ts.toISOString().replace(/[:.]/g, "-")}.csv`;
    exportCSV(rows, name);
  }

  function exportSelectedCSV() {
    const src = tab === "shorts" ? shorts : modules;
    const sel = src.filter((r: any) => r.selected);
    if (sel.length === 0) return toast.message("Select one or more rows first");
    const rows = rowsForExport(sel);
    const ts = new Date();
    const name = `content_gates_${tab}_selected_${ts.toISOString().replace(/[:.]/g, "-")}.csv`;
    exportCSV(rows, name);
  }

  /* ---------------------------------- UI --------------------------------- */
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Content Gate Manager</h1>
        <div className="inline-flex items-center gap-1">
          <Badge variant="outline">{tab === "shorts" ? "Shorts" : "Modules"}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border overflow-hidden">
        <button
          className={cx(
            "px-4 py-2 text-sm",
            tab === "shorts" ? "bg-black text-white" : "bg-white hover:bg-gray-50"
          )}
          onClick={() => setTab("shorts")}
        >
          Shorts
        </button>
        <button
          className={cx(
            "px-4 py-2 text-sm border-l",
            tab === "modules" ? "bg-black text-white" : "bg-white hover:bg-gray-50"
          )}
          onClick={() => setTab("modules")}
        >
          Modules
        </button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-2 items-center">
              <input
                className="w-64 rounded-md border px-3 py-2 text-sm"
                placeholder="Search by title or slug…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="rounded-md border px-2 py-2 text-sm"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as any)}
              >
                <option value="all">All tiers</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="vip">VIP</option>
              </select>
              <select
                className="rounded-md border px-2 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => bulkSetTier("free")}>Set Free</Button>
              <Button variant="outline" onClick={() => bulkSetTier("pro")}>Set Pro</Button>
              <Button variant="outline" onClick={() => bulkSetTier("vip")}>Set VIP</Button>
              <Button variant="outline" onClick={bulkSetPoints}>Set Points…</Button>
              <Button variant="outline" onClick={() => bulkSetActive(true)}>Activate</Button>
              <Button variant="outline" onClick={() => bulkSetActive(false)}>Deactivate</Button>
              {/* NEW: CSV */}
              <Button variant="outline" onClick={exportFilteredCSV}>Export CSV (filtered)</Button>
              <Button variant="outline" onClick={exportSelectedCSV}>Export CSV (selected)</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected;
                    }}
                  />
                </th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Slug</th>
                {tab === "shorts" && <th className="px-3 py-2">Preview</th>}
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Points</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(tab === "shorts" ? (sLoading ? [] : filtered) : (mLoading ? [] : filtered)).map((r: any) => (
                <tr key={r.slug} className={cx("border-t", r.dirty && "bg-amber-50")}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!r.selected}
                      onChange={(e) => patchRow(r.slug, { selected: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.title}</div>
                    {tab === "modules" && r.summary && (
                      <div className="text-xs text-gray-500 line-clamp-1">{r.summary}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{r.slug}</td>
                  {tab === "shorts" && (
                    <td className="px-3 py-2">
                      {r.preview ? <Badge variant="outline">Preview</Badge> : <span className="text-gray-400">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <select
                      className="rounded-md border px-2 py-1"
                      value={r.required_tier}
                      onChange={(e) => patchRow(r.slug, { required_tier: e.target.value as Tier })}
                    >
                      {TIERS.map((t) => (
                        <option key={t} value={t}>{t.toUpperCase()}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      className="w-24 rounded-md border px-2 py-1"
                      value={r.required_points}
                      onChange={(e) =>
                        patchRow(r.slug, { required_points: Math.max(0, Number(e.target.value || 0)) })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!r.is_active}
                        onChange={(e) => patchRow(r.slug, { is_active: e.target.checked })}
                      />
                      <span className={cx("text-xs", r.is_active ? "text-emerald-600" : "text-gray-500")}>
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveRow(r.slug)} disabled={!r.dirty}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { tab === "shorts" ? loadShorts() : loadModules(); }}
                      >
                        Reset
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {(sLoading && tab === "shorts") || (mLoading && tab === "modules") ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                    No items match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
