import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { MessageSquare, Calendar, Pin, Lock, Crown, Star, TrendingUp, Clock } from "lucide-react";

type Post = {
  id: string;
  author_id: string;
  title: string;
  content: string;
  post_type: "discussion" | "announcement" | "event";
  min_tier: "free" | "pro" | "vip";
  is_published: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
  author_role?: string | null;
  replies_count?: number | null;     // may be bigint in views → coerce
  latest_reply_at?: string | null;
};

type TabKey = "all" | "discussion" | "announcement" | "event";

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<TabKey>("all");
  const [loading, setLoading] = useState(true);

  const isAdmin =
    (profile as any)?.role === "admin" ||
    (profile as any)?.is_admin === true ||
    ((user?.user_metadata as any)?.role === "admin");

  const rawTier =
    (profile as any)?.membership_tier ||
    (profile as any)?.role ||
    "free";
  const myTier: "free" | "pro" | "vip" =
    rawTier === "vip" || rawTier === "pro" || rawTier === "free"
      ? rawTier
      : rawTier === "trial"
      ? "pro"
      : "free";

  const rank = (t: string) => (t === "vip" ? 3 : t === "pro" ? 2 : 1);
  const isLocked = (p: Post) => (isAdmin ? false : rank(myTier) < rank(p.min_tier || "free"));

  const iconFor = (t: Post["post_type"]) =>
    t === "announcement" ? <Pin className="w-4 h-4 text-blue-600" /> :
    t === "event" ? <Calendar className="w-4 h-4 text-purple-600" /> :
    <MessageSquare className="w-4 h-4 text-green-600" />;

  const badgeFor = (t: Post["post_type"]) =>
    t === "announcement" ? "bg-blue-100 text-blue-800" :
    t === "event" ? "bg-purple-100 text-purple-800" :
    "bg-green-100 text-green-800";

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);

      // 1) Prefer view with counts/author fields
      const tryView = await supabase
        .from("community_posts_v")
        .select("*")
        .eq("is_published", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (alive && !tryView.error && Array.isArray(tryView.data) && tryView.data.length) {
        setPosts(
          (tryView.data as any[]).map((d) => ({
            ...d,
            replies_count: d.replies_count != null ? Number(d.replies_count) : null,
          }))
        );
        setLoading(false);
        return;
      }

      // 2) Fallback to base table + hydrate authors (best-effort)
      const base = await supabase
        .from("community_posts")
        .select("*")
        .eq("is_published", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (alive && !base.error && Array.isArray(base.data)) {
        const rows = base.data as Post[];
        // one-shot author fetch
        const ids = Array.from(new Set(rows.map((r) => String(r.author_id)).filter(Boolean)));
        let authors: Record<string, { name: string | null; role: string | null }> = {};
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id,user_id,display_name,first_name,alias,email,role,membership_tier")
            .or(ids.map((uid) => `user_id.eq.${uid}`).join(","));
          if (Array.isArray(profs)) {
            for (const p of profs as any[]) {
              const key = String(p.user_id || p.id);
              const name = p.display_name || p.first_name || p.alias || p.email || null;
              const role = p.role || p.membership_tier || null;
              authors[key] = { name, role };
            }
          }
        }
        setPosts(
          rows.map((r) => ({
            ...r,
            author_name: authors[String(r.author_id)]?.name ?? null,
            author_role: authors[String(r.author_id)]?.role ?? null,
            replies_count: null,
            latest_reply_at: null,
          }))
        );
      }

      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(
    () => posts.filter((p) => (tab === "all" ? true : p.post_type === tab)),
    [posts, tab]
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Community</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Ask questions, share wins, and join events with other wine lovers.
          </p>
          <div className="mt-4">
            <span className="text-sm text-gray-500">Your tier: </span>
            <span
              className={`px-3 py-1 text-sm rounded-full ${
                myTier === "vip"
                  ? "bg-purple-100 text-purple-800"
                  : myTier === "pro"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {myTier.toUpperCase()}{" "}
              {myTier === "vip" ? <Crown className="w-4 h-4 inline ml-1" /> : myTier === "pro" ? <Star className="w-4 h-4 inline ml-1" /> : null}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {(["all","discussion","announcement","event"] as TabKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    tab === k ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {k === "all" ? "All posts" : k[0].toUpperCase() + k.slice(1) + (k === "discussion" ? "s" : "s")}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {filtered.map((p) => {
            const locked = isLocked(p);
            return (
              <div key={p.id} className={`bg-white rounded-lg shadow overflow-hidden ${locked ? "opacity-90" : ""}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {p.is_pinned && <Pin className="w-4 h-4 text-amber-600 mr-2" />}
                        {/* naive trending: 10+ replies */}
                        {Number(p.replies_count ?? 0) >= 10 && <TrendingUp className="w-4 h-4 text-red-600 mr-2" />}
                        <h2 className={`text-xl font-semibold ${locked ? "text-gray-600" : "text-gray-900"}`}>
                          {p.title}
                        </h2>
                        <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${badgeFor(p.post_type)}`}>
                          <span className="inline-flex items-center">{iconFor(p.post_type)}<span className="ml-1">{p.post_type}</span></span>
                        </span>
                        {locked && <Lock className="w-4 h-4 text-gray-400 ml-2" />}
                      </div>

                      <p className={`mb-4 ${locked ? "text-gray-500" : "text-gray-700"}`}>
                        {p.content.length > 220 ? p.content.slice(0, 220) + "…" : p.content}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="inline-flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(p.created_at).toLocaleDateString()}
                        </div>
                        <div className="inline-flex items-center">
                          <span className="font-medium">{p.author_name || "Member"}</span>
                          {p.author_role === "vip" && <Crown className="w-3 h-3 text-purple-600 ml-1" />}
                          {p.author_role === "pro" && <Star className="w-3 h-3 text-amber-600 ml-1" />}
                        </div>
                        <div className="inline-flex items-center">
                          <MessageSquare className="w-4 h-4 mr-1" /> {Number(p.replies_count ?? 0)}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex items-center">
                      {locked ? (
                        <Link to="/pricing" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium">
                          Upgrade
                        </Link>
                      ) : (
                        <button
                          onClick={() => navigate(`/community/${p.id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                        >
                          Join discussion
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-lg bg-white border p-6 text-center text-gray-600">
              Nothing here yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
