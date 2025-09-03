// src/pages/admin/UsersManager.tsx
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Row = {
  id: string;
  email: string | null;
  alias: string | null;
  country: string | null;
  state: string | null;
  membership_tier: "free" | "pro" | "vip";
  role: "user" | "admin";
  terms_accepted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const TIERS: Array<Row["membership_tier"]> = ["free", "pro", "vip"];
const ROLES: Array<Row["role"]> = ["user", "admin"];
const PAGE_SIZE = 50;

export default function UsersManager() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [count, setCount] = React.useState<number>(0);

  // Debounce search
  const [debounced, setDebounced] = React.useState(query);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  async function load() {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("profiles")
        .select(
          "id, email, alias, country, state, membership_tier, role, terms_accepted_at, created_at, updated_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (debounced) {
        q = q.or(`email.ilike.%${debounced}%,alias.ilike.%${debounced}%`);
      }

      const { data, error, count: total } = await q;
      if (error) throw error;
      setRows((data || []) as Row[]);
      setCount(total || 0);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, page]);

  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  async function setTier(id: string, next: Row["membership_tier"]) {
    setSavingId(id);
    try {
      const { error } = await supabase.rpc("admin_set_membership_tier", {
        p_user_id: id,
        p_tier: next,
      });
      if (error) throw error;
      toast.success("Membership updated");
      setRows(r => r.map(x => (x.id === id ? { ...x, membership_tier: next } : x)));
    } catch (e: any) {
      toast.error(e?.message || "Failed to update membership");
    } finally {
      setSavingId(null);
    }
  }

  async function setRole(id: string, next: Row["role"]) {
    setSavingId(id);
    try {
      const { error } = await supabase.rpc("admin_set_role", {
        p_user_id: id,
        p_role: next,
      });
      if (error) throw error;
      toast.success("Role updated");
      setRows(r => r.map(x => (x.id === id ? { ...x, role: next } : x)));
    } catch (e: any) {
      toast.error(e?.message || "Failed to update role");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="text-sm text-gray-600">{count} total</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Directory</span>
            <div className="w-64">
              <Input
                placeholder="Search email or alias…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">No users match.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="px-3 py-2">Alias</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Terms</th>
                    <th className="px-3 py-2">Tier</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{u.alias || "—"}</div>
                      </td>
                      <td className="px-3 py-2">{u.email || "—"}</td>
                      <td className="px-3 py-2">
                        {(u.country || "—")}{u.state ? ` · ${u.state}` : ""}
                      </td>
                      <td className="px-3 py-2">
                        {u.terms_accepted_at ? (
                          <Badge variant="secondary">Accepted</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="rounded-md border px-2 py-1 bg-white"
                          value={u.membership_tier}
                          onChange={(e) => setTier(u.id, e.target.value as Row["membership_tier"])}
                          disabled={savingId === u.id}
                        >
                          {TIERS.map(t => (
                            <option key={t} value={t}>{t.toUpperCase()}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="rounded-md border px-2 py-1 bg-white"
                          value={u.role}
                          onChange={(e) => setRole(u.id, e.target.value as Row["role"])}
                          disabled={savingId === u.id}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r.toUpperCase()}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {savingId === u.id ? (
                          <span className="text-xs text-gray-500">Saving…</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="p-3 flex items-center justify-between border-t">
            <div className="text-xs text-gray-600">
              Page {page + 1} of {pages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
              >
                Prev
              </Button>
              <Button
                onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
                disabled={page >= pages - 1 || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
