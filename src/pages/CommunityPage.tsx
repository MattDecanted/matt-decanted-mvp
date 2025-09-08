// src/pages/CommunityPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
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
  Reply,
} from "lucide-react";

type PostType = "discussion" | "announcement" | "event";

type PostRow = {
  id: string;
  author_id: string | null;
  title: string;
  content: string;
  post_type: PostType;
  is_pinned: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string | null;
  // from view:
  replies_count?: number | string | null;        // BIGINT -> string in JS sometimes
  latest_reply_at?: string | null;
  // joined author (we’ll be defensive)
  author?: {
    id?: string | null;
    user_id?: string | null;
    email?: string | null;
    alias?: string | null;
    display_name?: string | null;
    first_name?: string | null;
    role?: string | null;
    membership_tier?: string | null;
  } | null;
};

function LoadingSpinner({ size = "lg" }: { size?: "md" | "lg" }) {
  return (
    <div
      className={`animate-spin ${
        size === "lg" ? "w-10 h-10" : "w-6 h-6"
      } border-2 border-gray-300 border-t-transparent rounded-full`}
    />
  );
}

function timeAgo(iso?: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function authorDisplayName(a?: PostRow["author"]) {
  return (
    a?.display_name ||
    a?.first_name ||
    a?.alias ||
    (a?.email ? a.email.split("@")[0] : "Member")
  );
}

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | PostType>("all");

  // BASIC i18n stub
  const t = (k: string) =>
    (
      {
        "community.title": "Community",
        "community.subtitle": "Ask questions, share wins, and join tastings.",
        "community.yourTier": "Your tier",
        "community.activeMembers": "Active members",
        "community.discussions": "Discussions",
        "community.announcements": "Announcements",
        "community.events": "Events",
        "community.allPosts": "All posts",
        "community.replies": "replies",
        "community.lastReply": "Last reply",
        "community.joinDiscussion": "Join discussion",
        "community.upgrade": "Upgrade",
        "community.availableBasicFull": "Available to Basic and Full members.",
        "auth.signIn": "Sign in",
        "common.signInToJoin": "to join the discussion",
      } as Record<string, string>
    )[k] ?? k;

  // Membership helpers
  const role = (profile as any)?.role ?? "user";
  const tier = (profile as any)?.membership_tier ?? "free";
  const isAdmin = role === "admin";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Pull from the view (includes replies_count BIGINT + latest_reply_at)
        const { data, error } = await supabase
          .from("community_posts_with_stats")
          .select(
            `
            id, author_id, title, content, post_type, is_pinned, is_published, created_at, updated_at,
            replies_count, latest_reply_at,
            author:profiles!community_posts_author_id_fkey(
              id, user_id, email, alias, display_name, first_name, role, membership_tier
            )
          `
          )
          .eq("is_published", true)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPosts((data as PostRow[]) ?? []);
      } catch (e) {
        console.warn("[community] fetch error", e);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  // Basic access gate:
  // - Free users see discussion/announcements; events and “premium” content are gated.
  // - Admins see everything.
  function canAccessPost(p: PostRow) {
    if (isAdmin) return true;
    // naive premium flag: keywords or event posts
    const text = `${p.title} ${p.content}`.toLowerCase();
    const looksPremium =
      p.post_type === "event" ||
      text.includes("premium") ||
      text.includes("full members");
    if (!looksPremium) return true;
    // allow basic/full
    return ["basic", "full", "premium", "subscriber"].includes(String(tier));
  }

  const filteredPosts = useMemo(
    () =>
      posts.filter((p) => (activeFilter === "all" ? true : p.post_type === activeFilter)),
    [posts, activeFilter]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t("community.title")}</h1>
          <p className="text-lg text-gray-600 mb-8">{t("community.subtitle")}</p>
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
              className={`px-3 py-1 text-sm rounded-full ${
                tier === "full"
                  ? "bg-purple-100 text-purple-800"
                  : tier === "basic"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {tier === "full" && <Crown className="w-4 h-4 mr-1 inline" />}
              {tier === "basic" && <Star className="w-4 h-4 mr-1 inline" />}
              {String(tier || "free").toUpperCase()}
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {[
                { key: "all", label: "All posts" },
                { key: "discussion", label: "Discussions" },
                { key: "announcement", label: "Announcements" },
                { key: "event", label: "Events" },
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
          {filteredPosts.map((post) => {
            const access = canAccessPost(post);
            const count = Number(post.replies_count ?? 0); // BIGINT → number

            return (
              <div
                key={post.id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                  !access ? "opacity-75" : ""
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2 flex-wrap gap-2">
                        {post.is_pinned && <Pin className="w-4 h-4 text-amber-600" />}
                        {/* simple trending hint */}
                        {count >= 10 && <TrendingUp className="w-4 h-4 text-red-600" />}
                        <h2
                          className={`text-xl font-semibold ${
                            access ? "text-gray-900" : "text-gray-500"
                          }`}
                        >
                          {post.title}
                        </h2>
                        <span
                          className={`ml-1 px-2 py-1 text-xs font-medium rounded-full ${
                            post.post_type === "announcement"
                              ? "bg-blue-100 text-blue-800"
                              : post.post_type === "event"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {post.post_type}
                        </span>
                        {!access && <Lock className="w-4 h-4 text-gray-400" />}
                      </div>

                      <p className={`${access ? "text-gray-700" : "text-gray-400"} mb-4`}>
                        {access ? post.content : "Available to Basic and Full members."}
                      </p>

                      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          {/* author avatar placeholder */}
                          <img
                            src="/Matt_decantednk.png"
                            alt={authorDisplayName(post.author ?? undefined) || "author"}
                            className="w-6 h-6 rounded-full mr-2"
                          />
                          <span>{authorDisplayName(post.author ?? undefined)}</span>
                          {post.author?.role === "admin" && (
                            <Crown className="w-3 h-3 text-purple-600 ml-1" />
                          )}
                          {post.author?.membership_tier === "full" && (
                            <Star className="w-3 h-3 text-amber-600 ml-1" />
                          )}
                        </div>

                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center">
                          <Reply className="w-4 h-4 mr-1" />
                          <span>
                            {count} {t("community.replies")}
                          </span>
                        </div>

                        {post.latest_reply_at && (
                          <div className="flex items-center">
                            <Eye className="w-4 h-4 mr-1" />
                            <span>
                              {t("community.lastReply")} {timeAgo(post.latest_reply_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      {access ? (
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                          {t("community.joinDiscussion")}
                        </button>
                      ) : (
                        <Link
                          to="/pricing"
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
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

          {filteredPosts.length === 0 && (
            <div className="bg-white rounded-lg border p-6 text-center text-gray-600">
              No posts yet.
            </div>
          )}
        </div>

        {/* Simple footer stat cards (static placeholders — wire up later if you like) */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <div className="text-2xl font-bold text-gray-900">3</div>
            <div className="text-sm text-gray-600">{t("community.events")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
