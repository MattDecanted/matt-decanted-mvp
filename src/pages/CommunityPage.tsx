// src/pages/CommunityPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Users,
  Calendar,
  Pin,
  Lock,
  Crown,
  Star,
  Plus,
  TrendingUp,
  Clock,
  Eye,
  Reply as ReplyIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

// ---- Minimal i18n stub (replace with your Language/Locale t() when ready)
const t = (k: string) =>
  ({
    "community.title": "Community",
    "community.subtitle":
      "Share tasting notes, ask questions, and join events with fellow wine lovers.",
    "community.yourTier": "Your tier",
    "community.activeMembers": "Active members",
    "community.discussions": "Discussions",
    "community.announcements": "Announcements",
    "community.events": "Events",
    "community.allPosts": "All",
    "community.engagement": "Engagement",
    "community.posts.welcome.title": "Welcome to the Community",
    "community.posts.welcome.content":
      "Say hello and tell us what you’re drinking this week!",
    "community.posts.whatTasting.title": "What are you tasting tonight?",
    "community.posts.whatTasting.content":
      "Share a quick note: grape, region, and what you loved (or didn’t).",
    "community.posts.blindTasting.title": "Blind Tasting: Pinot Noir vs Burgundy",
    "community.posts.blindTasting.content":
      "Join this weekend’s blind tasting and compare notes.",
    "community.posts.askMatt.title": "Ask Matt (Beginner Q&A)",
    "community.posts.askMatt.content":
      "New to wine? Drop your questions—no question too simple.",
    "community.posts.premiumMasterclass.title": "Premium Masterclass: Old World vs New World",
    "community.posts.premiumMasterclass.content":
      "Deep dive for full members. Bring your questions and a glass.",
    "community.signInMessage": "Sign in to read and join discussions.",
    "auth.signIn": "Sign in",
    "common.signInToJoin": "to join",
    "community.availableBasicFull": "Available for Pro and VIP members.",
    "community.replies": "replies",
    "community.joinDiscussion": "Join discussion",
    "community.upgrade": "Upgrade",
    "community.unlockMore": "Unlock more community features",
    "community.upgradeMessage":
      "Upgrade your membership to access premium discussions, masterclasses, and tasting events.",
    "community.startTrial": "Start trial",
    "community.getFullAccess": "Get full access",
    "community.guidelines": "Community guidelines",
    "community.guideline1": "Be kind. Everyone started as a beginner.",
    "community.guideline2": "Share useful tasting notes and context.",
    "community.guideline3": "No spam or self-promotion without permission.",
    "community.guideline4": "Stay on topic; use clear titles.",
    "community.guideline5": "Assume good intent and be constructive.",
    "community.guideline6": "Report issues to the team if needed.",
  } as Record<string, string>)[k] ?? k;

// ---- Types
type PostRow = {
  id: string;
  author_id: string | null;
  title: string;
  content: string;
  post_type: "discussion" | "announcement" | "event" | string;
  is_pinned?: boolean | null;
  is_published?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Author = {
  user_id?: string | null;
  id?: string | null; // some schemas use id
  alias?: string | null;
  first_name?: string | null;
  display_name?: string | null;
  role?: string | null;
  membership_tier?: string | null; // 'free' | 'pro' | 'vip'
};

type ReplyRow = {
  id: string;
  post_id: string;
  created_at?: string | null;
};

type PostWithDetails = PostRow & {
  author?: { name: string; role?: string | null; membership_tier?: string | null };
  replies_count?: number;
  latest_reply?: string | null;
  is_trending?: boolean;
};

// ---- Small helpers
function authorName(a?: Author | null) {
  if (!a) return "Member";
  return a.display_name || a.first_name || a.alias || "Member";
}
function since(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d).getTime();
  const mins = Math.max(0, Math.round((Date.now() - dt) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<"all" | "discussion" | "announcement" | "event">("all");
  const [error, setError] = useState<string | null>(null);

  // Load posts + authors + replies; degrade gracefully if tables/columns differ
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      // Mock (used if tables not present)
      const mockPosts: PostWithDetails[] = [
        {
          id: "1",
          author_id: "matt",
          title: t("community.posts.welcome.title"),
          content: t("community.posts.welcome.content"),
          post_type: "announcement",
          is_pinned: true,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: { name: "Matt Decanted", role: "admin", membership_tier: "vip" },
          replies_count: 23,
          latest_reply: "2h ago",
          is_trending: true,
        },
        {
          id: "2",
          author_id: "user1",
          title: t("community.posts.whatTasting.title"),
          content: t("community.posts.whatTasting.content"),
          post_type: "discussion",
          is_pinned: false,
          is_published: true,
          created_at: new Date(Date.now() - 3600_000).toISOString(),
          updated_at: new Date(Date.now() - 3600_000).toISOString(),
          author: { name: "Sarah Wine Lover", role: "user", membership_tier: "pro" },
          replies_count: 15,
          latest_reply: "1h ago",
          is_trending: true,
        },
        {
          id: "3",
          author_id: "matt",
          title: t("community.posts.blindTasting.title"),
          content: t("community.posts.blindTasting.content"),
          post_type: "event",
          is_pinned: false,
          is_published: true,
          created_at: new Date(Date.now() - 4 * 3600_000).toISOString(),
          updated_at: new Date(Date.now() - 4 * 3600_000).toISOString(),
          author: { name: "Matt Decanted", role: "admin", membership_tier: "vip" },
          replies_count: 8,
          latest_reply: "3h ago",
          is_trending: false,
        },
      ];

      try {
        // 1) Get published posts
        let postRows: PostRow[] = [];
        try {
          const { data, error } = await supabase
            .from("community_posts")
            .select("*")
            .eq("is_published", true)
            .order("is_pinned", { ascending: false })
            .order("created_at", { ascending: false });
          if (!error && Array.isArray(data)) postRows = data as PostRow[];
        } catch {
          // table might not exist
        }

        // Fallback to mock
        if (!postRows.length) {
          setPosts(mockPosts);
          setLoading(false);
          return;
        }

        // 2) Fetch authors (robust to schemas: by user_id or id)
        const authorIds = Array.from(
          new Set(postRows.map((p) => p.author_id).filter(Boolean))
        ) as string[];

        let authorMap = new Map<string, Author>();
        if (authorIds.length) {
          try {
            const { data: a1, error: e1 } = await supabase
              .from("profiles")
              .select("user_id,id,alias,first_name,display_name,role,membership_tier")
              .in("user_id", authorIds);
            if (!e1 && Array.isArray(a1) && a1.length) {
              for (const a of a1 as Author[]) {
                const key = (a.user_id || a.id || "") as string;
                if (key) authorMap.set(key, a);
              }
            } else {
              // Try matching on id (some schemas store auth uid in 'id')
              const { data: a2 } = await supabase
                .from("profiles")
                .select("user_id,id,alias,first_name,display_name,role,membership_tier")
                .in("id", authorIds);
              if (Array.isArray(a2)) {
                for (const a of a2 as Author[]) {
                  const key = (a.user_id || a.id || "") as string;
                  if (key) authorMap.set(key, a);
                }
              }
            }
          } catch {
            // ignore author join failure
          }
        }

        // 3) Replies (count + latest) in one go; group client-side
        const replyMap = new Map<
          string,
          { count: number; latest: string | null }
        >();
        if (postRows.length) {
          try {
            const { data: reps, error: re } = await supabase
              .from("community_replies")
              .select("post_id,created_at")
              .in("post_id", postRows.map((p) => p.id));
            if (!re && Array.isArray(reps)) {
              for (const r of reps as ReplyRow[]) {
                const rec = replyMap.get(r.post_id) || { count: 0, latest: null };
                rec.count += 1;
                if (
                  r.created_at &&
                  (!rec.latest ||
                    new Date(r.created_at).getTime() >
                      new Date(rec.latest).getTime())
                ) {
                  rec.latest = r.created_at;
                }
                replyMap.set(r.post_id, rec);
              }
            }
          } catch {
            // ignore replies failure
          }
        }

        // 4) Shape posts
        const shaped: PostWithDetails[] = postRows.map((p) => {
          const a = p.author_id ? authorMap.get(p.author_id) : undefined;
          const rep = replyMap.get(p.id);
          const rc = rep?.count ?? 0;

          const created = p.created_at ? new Date(p.created_at).getTime() : 0;
          const is_trending = rc >= 10 || Date.now() - created < 48 * 3600_000;

          return {
            ...p,
            author: a
              ? {
                name: authorName(a),
                role: a.role ?? undefined,
                membership_tier: a.membership_tier ?? undefined,
              }
              : undefined,
            replies_count: rc,
            latest_reply: since(rep?.latest ?? null),
            is_trending,
          };
        });

        setPosts(shaped);
      } catch (e: any) {
        setError(e?.message || "Failed to load community.");
        setPosts(mockPosts);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Gating: allow all if admin; otherwise:
  // - announcements & discussions visible to all
  // - events visible to pro/vip
  function canAccessPost(post: PostWithDetails): boolean {
    const role = (profile as any)?.role;
    const tier = (profile as any)?.membership_tier || "free";
    if (role === "admin") return true;
    if (post.post_type === "event") return tier === "pro" || tier === "vip";
    return true;
  }

  const filtered = useMemo(() => {
    if (activeFilter === "all") return posts;
    return posts.filter((p) => p.post_type === activeFilter);
  }, [posts, activeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-gray-300 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t("community.title")}</h1>
          <p className="text-lg text-gray-600 mb-8">{t("community.signInMessage")}</p>
          <Link
            to="/signin"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {t("auth.signIn")} {t("common.signInToJoin")}
          </Link>
        </div>
      </div>
    );
  }

  const tier = (profile as any)?.membership_tier || "free";

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t("community.title")}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">{t("community.subtitle")}</p>
          <div className="mt-4">
            <span className="text-sm text-gray-500">{t("community.yourTier")}: </span>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full ${
                tier === "vip"
                  ? "bg-purple-100 text-purple-800"
                  : tier === "pro"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {tier === "vip" && <Crown className="w-4 h-4" />}
              {tier === "pro" && <Star className="w-4 h-4" />}
              {String(tier).toUpperCase()}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">
            {error}
          </div>
        )}

        {/* Community Stats (static/demo numbers with real post count) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">127</div>
            <div className="text-sm text-gray-600">{t("community.activeMembers")}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{posts.length}</div>
            <div className="text-sm text-gray-600">{t("community.discussions")}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {posts.filter((p) => p.post_type === "event").length}
            </div>
            <div className="text-sm text-gray-600">{t("community.events")}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <TrendingUp className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">89%</div>
            <div className="text-sm text-gray-600">{t("community.engagement")}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: "all", label: t("community.allPosts") },
                { key: "discussion", label: t("community.discussions") },
                { key: "announcement", label: t("community.announcements") },
                { key: "event", label: t("community.events") },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeFilter === key
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {filtered.map((post) => {
            const hasAccess = canAccessPost(post);
            const authorTier = post.author?.membership_tier;
            const authorRole = post.author?.role;

            const TypeIcon =
              post.post_type === "announcement"
                ? Pin
                : post.post_type === "event"
                ? Calendar
                : MessageSquare;

            const typeBadge =
              post.post_type === "announcement"
                ? "bg-blue-100 text-blue-800"
                : post.post_type === "event"
                ? "bg-purple-100 text-purple-800"
                : "bg-green-100 text-green-800";

            return (
              <div
                key={post.id}
                className={`bg-white rounded-lg shadow overflow-hidden ${!hasAccess ? "opacity-75" : ""}`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {post.is_pinned && <Pin className="w-4 h-4 text-amber-600 mr-2" />}
                        {post.is_trending && <TrendingUp className="w-4 h-4 text-red-600 mr-2" />}
                        <h2 className={`text-xl font-semibold ${hasAccess ? "text-gray-900" : "text-gray-500"}`}>
                          {post.title}
                        </h2>
                        <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full inline-flex items-center gap-1 ${typeBadge}`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                          <span className="capitalize">{post.post_type}</span>
                        </span>
                        {!hasAccess && <Lock className="w-4 h-4 text-gray-400 ml-2" />}
                      </div>

                      <p className={`mb-4 ${hasAccess ? "text-gray-600" : "text-gray-400"}`}>
                        {hasAccess ? post.content : t("community.availableBasicFull")}
                      </p>

                      <div className="flex items-center flex-wrap gap-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <img
                            src="/Matt_decantednk.png"
                            alt={post.author?.name || "Author"}
                            className="w-6 h-6 rounded-full mr-2"
                          />
                          <span>{post.author?.name || "Member"}</span>
                          {authorRole === "admin" && <Crown className="w-3 h-3 text-purple-600 ml-1" />}
                          {authorTier === "vip" && <Crown className="w-3 h-3 text-amber-600 ml-1" />}
                          {authorTier === "pro" && <Star className="w-3 h-3 text-amber-600 ml-1" />}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{post.created_at ? new Date(post.created_at).toLocaleDateString() : ""}</span>
                        </div>
                        <div className="flex items-center">
                          <ReplyIcon className="w-4 h-4 mr-1" />
                          <span>
                            {post.replies_count ?? 0} {t("community.replies")}
                          </span>
                        </div>
                        {post.latest_reply && (
                          <div className="flex items-center">
                            <Eye className="w-4 h-4 mr-1" />
                            <span>Last reply {post.latest_reply}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      {hasAccess ? (
                        <button
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          onClick={() => navigate(`/community/post/${post.id}`)}
                        >
                          {t("community.joinDiscussion")}
                        </button>
                      ) : (
                        <Link
                          to="/pricing"
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center"
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          {t("community.upgrade")}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Upgrade CTA for Free Users */}
        {tier === "free" && (
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t("community.unlockMore")}</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">{t("community.upgradeMessage")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/pricing"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                <Star className="w-5 h-5 mr-2" />
                {t("community.startTrial")}
              </Link>
              <Link
                to="/pricing"
                className="border border-purple-600 text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                <Crown className="w-5 h-5 mr-2" />
                {t("community.getFullAccess")}
              </Link>
            </div>
          </div>
        )}

        {/* Community Guidelines */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("community.guidelines")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                {t("community.guideline1")}
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                {t("community.guideline2")}
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                {t("community.guideline3")}
              </li>
            </ul>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                {t("community.guideline4")}
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                {t("community.guideline5")}
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                {t("community.guideline6")}
              </li>
            </ul>
          </div>
        </div>

        {/* Floating new-post (optional, admins only) */}
        {(profile as any)?.role === "admin" && (
          <button
            onClick={() => navigate("/admin/community/new")}
            className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-black text-white px-4 py-2 shadow-lg"
            title="New post"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        )}
      </div>
    </div>
  );
}
