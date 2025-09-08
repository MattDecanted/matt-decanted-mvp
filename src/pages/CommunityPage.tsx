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
  replies_count?: number | null;
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

  const myTier = (profile as any)?.membership_tier || (profile as any)?.role || "free";
  const gate = useMemo(() => {
    const rank = (t: string) => (t === "vip" ? 3 : t === "pro" ? 2 : 1);
    return (p?: Post | null) => !p ? false : rank(myTier) < rank(p.min_tier);
  }, [myTier]);

  const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T) => {
    try { return await fn(); } catch { return fallback; }
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setErr(null);

      // Post (prefer view)
      const p = await safeFetch(async () => {
        const { data, error } = await supabase
          .from("community_posts_v")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (data) return data as Post;

        const r2 = await supabase.from("community_posts").select("*").eq("id", id).maybeSingle();
        if (r2.error) throw r2.error;
        return r2.data as Post;
      }, null as any);
      setPost(p);

      // Replies
      const rs = await safeFetch(async () => {
        // try reply + author join if you have a view; else two-step
        const r = await supabase
          .from("community_replies")
          .select("*")
          .eq("post_id", id)
          .order("created_at", { ascending: true });
        if (r.error) throw r.error;

        // attach author name (best-effort)
        const out: ReplyRow[] = [];
        for (const row of (r.data as any[])) {
          let name: string | null = null;
          let role: string | null = null;
          const { data: pp } = await supabase
            .from("profiles")
            .select("display_name,first_name,alias,email,role,membership_tier")
            .or(`user_id.eq.${row.author_id},id.eq.${row.author_id}`)
            .maybeSingle();
          if (pp) {
            name = (pp as any).display_name || (pp as any).first_name || (pp as any).alias || (pp as any).email;
            role = (pp as any).role || (pp as any).membership_tier;
          }
          out.push({
            id: row.id, post_id: row.post_id, author_id: row.author_id,
            content: row.content, created_at: row.created_at, updated_at: row.updated_at,
            author_name: name, author_role: role
          });
        }
        return out;
      }, []);
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

      // reload replies
      const { data } = await supabase
        .from("community_replies")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      setReplies(
        (data || []).map((row: any) => ({
          id: row.id, post_id: row.post_id, author_id: row.author_id,
          content: row.content, created_at: row.created_at, updated_at: row.updated_at
        }))
      );
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
        <Link to="/community" className="text-sm underline">← Back to Community</Link>
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
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
            post.min_tier === "vip" ? "bg-purple-100 text-purple-800"
            : post.min_tier === "pro" ? "bg-blue-100 text-blue-800"
            : "bg-gray-100 text-gray-800"}`}>
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
                  {r.author_role === "vip" && <Crown className="w-3 h-3 text-purple-600" />}
                  {r.author_role === "pro" && <Star className="w-3 h-3 text-amber-600" />}
                  <span className="text-gray-400">· {new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div className="text-gray-900 whitespace-pre-wrap">{r.content}</div>
              </li>
            ))}
          </ul>
        )}

        {/* Composer */}
        {locked ? (
          <div className="rounded border-amber-300 bg-amber-50 text-amber-800 p-3 text-sm">
            This thread is for {post.min_tier.toUpperCase()} members. <Link to="/pricing" className="underline">Upgrade</Link> to join the discussion.
          </div>
        ) : !user ? (
          <div className="rounded border-blue-300 bg-blue-50 text-blue-800 p-3 text-sm">
            Please <Link to="/signin" className="underline">sign in</Link> to reply.
          </div>
        ) : (
          <form onSubmit={submitReply} className="space-y-2">
            {err && <div className="rounded bg-rose-50 text-rose-700 p-2 text-sm">{err}</div>}
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
                className={`px-4 py-2 rounded text-white ${sending ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
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
