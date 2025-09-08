import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { MessageSquare, Reply, Clock, Crown, Star } from "lucide-react";

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
  replies_count?: number | null;    // view returns bigint → coerce to number in code
  latest_reply_at?: string | null;
};

type ReplyRow = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
  author_role?: string | null;
};

export default function CommunityPostPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // ---- membership / role
  const isAdmin =
    (profile as any)?.role === "admin" ||
    (profile as any)?.is_admin === true ||
    ((user?.user_metadata as any)?.role === "admin");

  // Your profiles table uses membership_tier (free|pro|vip). If something else slips through, map it.
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

  const gate = useMemo(() => {
    const rank = (t: string) => (t === "vip" ? 3 : t === "pro" ? 2 : 1);
    return (p?: Post | null) =>
      !p
        ? false
        : isAdmin
        ? false
        : rank(myTier) < rank(p.min_tier || "free");
  }, [myTier, isAdmin]);

  const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T) => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  // ---- helper: fetch replies + hydrate authors in one query
  async function loadRepliesWithAuthors(postId: string): Promise<ReplyRow[]> {
    const { data: rows, error } = await supabase
      .from("community_replies")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error || !Array.isArray(rows) || rows.length === 0) {
      return [];
    }

    const ids = Array.from(
      new Set(rows.map((r: any) => String(r.author_id)).filter(Boolean))
    );

    let authors: Record<
      string,
      { name: string | null; role: string | null }
    > = {};

    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,user_id,display_name,first_name,alias,email,role,membership_tier")
        .or(ids.map((uid) => `user_id.eq.${uid}`).join(","));
      if (Array.isArray(profs)) {
        for (const p of profs as any[]) {
          const key = String(p.user_id || p.id);
          const name =
            p.display_name || p.first_name || p.alias || p.email || null;
          const role = p.role || p.membership_tier || null;
          authors[key] = { name, role };
        }
      }
    }

    return rows.map((row: any) => {
      const a = authors[String(row.author_id)] || { name: null, role: null };
      return {
        id: row.id,
        post_id: row.post_id,
        author_id: row.author_id,
        content: row.content,
        created_at: row.created_at,
        updated_at: row.updated_at,
        author_name: a.name,
        author_role: a.role,
      };
    });
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setErr(null);

      // ---- Post (prefer view, fallback to base table)
      const p = await safeFetch(async () => {
        const { data, error } = await supabase
          .from("community_posts_v")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const d = data as any;
          return {
            ...d,
            // Coerce bigint-y counts to number (safe for UI)
            replies_count:
              d.replies_count != null ? Number(d.replies_count) : null,
          } as Post;
        }

        // fallback to base table
        const r2 = await supabase
          .from("community_posts")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (r2.error) throw r2.error;
        const base = r2.data as Post | null;
        if (!base) return null;

        // hydrate author (best-effort)
        const { data: ap } = await supabase
          .from("profiles")
          .select("display_name,first_name,alias,email,role,membership_tier")
          .or(`user_id.eq.${base.author_id},id.eq.${base.author_id}`)
          .maybeSingle();

        const author_name =
          (ap as any)?.display_name ||
          (ap as any)?.first_name ||
          (ap as any)?.alias ||
          (ap as any)?.email ||
          null;
        const author_role =
          (ap as any)?.role || (ap as any)?.membership_tier || null;

        return {
          ...base,
          author_name,
          author_role,
        } as Post;
      }, null as any);
      setPost(p);

      // ---- Replies (with author hydration)
      const rs = p ? await safeFetch(() => loadRepliesWithAuthors(p.id), []) : [];
      setReplies(rs);

      setLoading(false);
    })();
  }, [id]);

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !post || !text.trim() || gate(post)) return;
    setSending(true);
    setErr(null);
    try {
      const { error } = await supabase.from("community_replies").insert({
        post_id: post.id,
        author_id: user.id,
        content: text.trim(),
      });
      if (error) throw error;
      setText("");

      // reload replies (and re-hydrate author names)
      const rs = await loadRepliesWithAuthors(post.id);
      setReplies(rs);
    } catch (e: any) {
      setErr(e?.message || "Could not post reply.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded border bg-white p-6">Post not found.</div>
      </div>
    );
  }

  const locked = gate(post);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/community" className="text-sm underline">
          ← Back to Community
        </Link>
      </div>

      <article className="bg-white border rounded-lg p-5">
        <h1 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {post.title}
        </h1>
        <div className="text-sm text-gray-500 mb-4 flex items-center gap-3">
          <span className="inline-flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {new Date(post.created_at).toLocaleString()}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
              post.min_tier === "vip"
                ? "bg-purple-100 text-purple-800"
                : post.min_tier === "pro"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {(post.min_tier || "free").toUpperCase()}
            {post.min_tier === "vip" && <Crown className="w-3 h-3" />}
            {post.min_tier === "pro" && <Star className="w-3 h-3" />}
          </span>
        </div>
        <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
      </article>

      {/* Replies */}
      <section className="bg-white border rounded-lg p-5">
        <h2 className="font-semibold mb-3 flex items-center">
          <Reply className="w-4 h-4 mr-2" /> Replies
        </h2>

        {replies.length === 0 ? (
          <div className="text-sm text-gray-600 mb-4">No replies yet.</div>
        ) : (
          <ul className="space-y-3 mb-4">
            {replies.map((r) => (
              <li key={r.id} className="border rounded p-3">
                <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                  <strong>{r.author_name || "Member"}</strong>
                  {r.author_role === "vip" && (
                    <Crown className="w-3 h-3 text-purple-600" />
                  )}
                  {r.author_role === "pro" && (
                    <Star className="w-3 h-3 text-amber-600" />
                  )}
                  <span className="text-gray-400">
                    · {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-gray-900 whitespace-pre-wrap">
                  {r.content}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Composer */}
        {locked ? (
          <div className="rounded border-amber-300 bg-amber-50 text-amber-800 p-3 text-sm">
            This thread is for {post.min_tier.toUpperCase()} members.{" "}
            <Link to="/pricing" className="underline">
              Upgrade
            </Link>{" "}
            to join the discussion.
          </div>
        ) : !user ? (
          <div className="rounded border-blue-300 bg-blue-50 text-blue-800 p-3 text-sm">
            Please{" "}
            <Link to="/signin" className="underline">
              sign in
            </Link>{" "}
            to reply.
          </div>
        ) : (
          <form onSubmit={submitReply} className="space-y-2">
            {err && (
              <div className="rounded bg-rose-50 text-rose-700 p-2 text-sm">
                {err}
              </div>
            )}
            <textarea
              rows={3}
              className="w-full rounded border p-2"
              placeholder="Write a reply…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className={`px-4 py-2 rounded text-white ${
                  sending ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {sending ? "Posting…" : "Post reply"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
