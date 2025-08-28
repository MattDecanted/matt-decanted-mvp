// src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

import {
  Crown,
  Star,
  Trophy,
  Play,
  Calendar,
  Users,
  TrendingUp,
  Award,
  Clock,
  BookOpen,
  Brain,
  Target,
  CheckCircle,
} from "lucide-react";

// ---- minimal t() stub; swap to your LanguageContext when ready
const useLanguage = () => ({
  t: (k: string) =>
    (
      {
        "dashboard.continueJourney": "Let’s keep building your palate.",
        "dashboard.upcomingMasterclasses": "Upcoming Masterclasses",
        "dashboard.registered": "Registered",
        "dashboard.register": "Register",
        "dashboard.upgrade": "Upgrade required",
        "dashboard.upgradeToAccess": "Upgrade to access",
        "dashboard.noUpcomingMasterclasses": "No upcoming masterclasses",
        "dashboard.checkBackForEvents": "Check back soon for new events.",
        "dashboard.topMembers": "Top members",
        "dashboard.viewFullLeaderboard": "View full leaderboard",
        "dashboard.quickActions": "Quick actions",
        "dashboard.member": "member",
      } as Record<string, string>
    )[k] ?? k,
});

// ---- tiny spinner
const LoadingSpinner = ({ size = "md" }: { size?: "md" | "lg" }) => (
  <div
    className={`animate-spin ${
      size === "lg" ? "w-10 h-10" : "w-6 h-6"
    } border-2 border-gray-300 border-t-transparent rounded-full`}
  />
);

// ---- types
interface LeaderboardMember {
  id: string;
  name: string;
  avatar: string;
  points: number;
  rank: number;
  tier: "free" | "basic" | "premium";
  badges: string[];
}
interface UserStats {
  shortsWatched: number;
  modulesCompleted: number;
  badgesEarned: number;
  quizScore: number;
  streakDays: number;
  totalPoints: number;
  rank: number;
  swirdleStreak: number;
  swirdleGamesWon: number;
  blindTastingsCompleted: number;
  communityPosts: number;
}
interface BlindTastingVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  isNew: boolean;
}
interface Masterclass {
  id: string;
  title: string;
  description: string;
  instructor: string;
  date: string; // ISO date string
  time: string; // HH:mm
  duration: string;
  maxParticipants: number;
  currentParticipants: number;
  tier: "basic" | "premium";
  isRegistered: boolean;
}

// ---- achievements (light stand-in)
const ACHIEVEMENT_BADGES = [
  { id: "harvest_hand", name: "Harvest Hand", icon: "🌾" },
  { id: "vocabulary_master", name: "Vocabulary Master", icon: "🔤" },
  { id: "community_leader", name: "Community Leader", icon: "👑" },
  { id: "berry_builder", name: "Berry Builder", icon: "🫐" },
  { id: "swirdle_champion", name: "Swirdle Champion", icon: "🧠" },
  { id: "bloom_boss", name: "Bloom Boss", icon: "🌸" },
  { id: "tasting_expert", name: "Tasting Expert", icon: "🥇" },
] as const;

const getUserBadges = (
  _courses: number,
  modules: number,
  _quizzes: number,
  streak: number
) => {
  const arr: typeof ACHIEVEMENT_BADGES[number][] = [];
  if (modules >= 1) arr.push(ACHIEVEMENT_BADGES[0]);
  if (modules >= 5) arr.push(ACHIEVEMENT_BADGES[1]);
  if (streak >= 7) arr.push(ACHIEVEMENT_BADGES[2]);
  return arr;
};

export default function Dashboard() {
  const { user, profile } = useAuth() as {
    user: any;
    profile: any;
  };
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [blindTastingVideo, setBlindTastingVideo] =
    useState<BlindTastingVideo | null>(null);
  const [masterclasses, setMasterclasses] = useState<Masterclass[]>([]);

  useEffect(() => {
    if (user) loadDashboardData();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T) => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  const loadDashboardData = async () => {
    // ---- mock fallbacks for fast dev
    const mockLeaderboard: LeaderboardMember[] = [
      {
        id: "1",
        name: "Sarah Chen",
        avatar:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150",
        points: 2847,
        rank: 1,
        tier: "premium",
        badges: ["harvest_hand", "vocabulary_master", "community_leader"],
      },
      {
        id: "2",
        name: "James Rodriguez",
        avatar:
          "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150",
        points: 2156,
        rank: 2,
        tier: "basic",
        badges: ["berry_builder", "swirdle_champion"],
      },
      {
        id: "3",
        name: "Emma Thompson",
        avatar:
          "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150",
        points: 1923,
        rank: 3,
        tier: "basic",
        badges: ["bloom_boss", "tasting_expert"],
      },
    ];
    const mockUserStats: UserStats = {
      shortsWatched: 23,
      modulesCompleted: 8,
      badgesEarned: 5,
      quizScore: 87,
      streakDays: 12,
      totalPoints: 1456,
      rank: 15,
      swirdleStreak: 7,
      swirdleGamesWon: 34,
      blindTastingsCompleted: 6,
      communityPosts: 3,
    };
    const mockBlindTasting: BlindTastingVideo = {
      id: "1",
      title: "Burgundy vs. Pinot Noir Challenge",
      description:
        "Can you distinguish between Old World and New World Pinot Noir?",
      thumbnailUrl:
        "https://images.pexels.com/photos/1407846/pexels-photo-1407846.jpeg",
      duration: "25 min",
      difficulty: "intermediate",
      isNew: true,
    };
    const mockMasterclasses: Masterclass[] = [
      {
        id: "1",
        title: "Burgundy Deep Dive: Terroir & Tradition",
        description: "Explore Burgundy from village to Grand Cru.",
        instructor: "Matt Decanted",
        date: "2025-09-25",
        time: "19:00",
        duration: "90 min",
        maxParticipants: 50,
        currentParticipants: 34,
        tier: "premium",
        isRegistered: false,
      },
      {
        id: "2",
        title: "Food Pairing Secrets with Matt",
        description: "Techniques for perfect pairings.",
        instructor: "Matt Decanted",
        date: "2025-09-28",
        time: "18:30",
        duration: "60 min",
        maxParticipants: 30,
        currentParticipants: 18,
        tier: "basic",
        isRegistered: true,
      },
    ];

    const leaderboardData = await safeFetch(async () => {
      const { data, error } = await supabase
        .from("user_leaderboard")
        .select("*")
        .order("points", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as unknown as LeaderboardMember[];
    }, mockLeaderboard);

    const userStatsData = await safeFetch(async () => {
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as UserStats) ?? mockUserStats;
    }, mockUserStats);

    const blindTastingData = await safeFetch(async () => {
      const { data, error } = await supabase
        .from("blind_tasting_videos")
        .select("*")
        .eq("is_featured", true)
        .maybeSingle();
      if (error) throw error;
      const d = data as any;
      return d
        ? ({
            id: d.id,
            title: d.title,
            description: d.description,
            thumbnailUrl: d.thumbnail_url,
            duration: d.duration,
            difficulty: d.difficulty,
            isNew: true,
          } as BlindTastingVideo)
        : mockBlindTasting;
    }, mockBlindTasting);

    const masterclassData = await safeFetch(async () => {
      const { data, error } = await supabase
        .from("masterclasses")
        .select("*")
        .gte("date", new Date().toISOString())
        .order("date");
      if (error) throw error;
      return (data as unknown as Masterclass[]) ?? mockMasterclasses;
    }, mockMasterclasses);

    setLeaderboard(leaderboardData);
    setUserStats(userStatsData);
    setBlindTastingVideo(blindTastingData);
    setMasterclasses(masterclassData);
    setLoading(false);
  };

  const getAchievementBadges = () => {
    if (!userStats) return [];
    return getUserBadges(
      Math.floor(userStats.modulesCompleted / 5),
      userStats.modulesCompleted,
      userStats.modulesCompleted * 2,
      userStats.streakDays
    );
  };

  const getNextBadge = () =>
    ACHIEVEMENT_BADGES.find(
      (b) => !getAchievementBadges().some((e) => e.id === b.id)
    );

  const getDifficultyColor = (d: string) =>
    d === "advanced"
      ? "bg-red-100 text-red-800"
      : d === "intermediate"
      ? "bg-amber-100 text-amber-800"
      : "bg-green-100 text-green-800";

  const role = (profile as any)?.role ?? "learner";
  const subStatus = (profile as any)?.subscription_status ?? "inactive";

  const canAccessMasterclass = (m: Masterclass): boolean => {
    if (!profile) return false;
    if (role === "admin") return true;
    if (m.tier === "basic")
      return ["basic", "premium", "subscriber", "admin"].includes(role);
    if (m.tier === "premium")
      return ["premium", "admin"].includes(role) ||
        (role === "subscriber" && subStatus === "active");
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !profile || !userStats) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Dashboard Unavailable</h1>
          <p className="text-gray-600 mb-6">Please sign in and try again.</p>
          <Link
            to="/signin"
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            Go to Sign in
          </Link>
        </div>
      </div>
    );
  }

  const earnedBadges = getAchievementBadges();
  const nextBadge = getNextBadge();

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome back,{" "}
                {profile?.full_name?.split(" ")[0] ||
                  user?.email?.split("@")[0] ||
                  "Wine Enthusiast"}
                !
              </h1>
              <p className="text-gray-600 mt-1">{t("dashboard.continueJourney")}</p>
            </div>
            <div className="text-right">
              <div
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  role === "admin"
                    ? "bg-purple-100 text-purple-800"
                    : role === "premium"
                    ? "bg-yellow-100 text-yellow-800"
                    : role === "basic" || role === "subscriber"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <Crown className="w-4 h-4 mr-1" />
                {role?.toUpperCase?.() ?? "LEARNER"}
              </div>
              {role === "subscriber" && (
                <div className="text-xs text-gray-500 mt-1">
                  Subscription: {subStatus}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="p-4 rounded-lg bg-white border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Points</span>
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold mt-2">{userStats.totalPoints}</div>
            <div className="text-xs text-gray-500">Rank: #{userStats.rank}</div>
          </div>
          <div className="p-4 rounded-lg bg-white border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Streak</span>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold mt-2">{userStats.streakDays} days</div>
            <div className="text-xs text-gray-500">
              Swirdle: {userStats.swirdleStreak}-day streak
            </div>
          </div>
          <div className="p-4 rounded-lg bg-white border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Modules</span>
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold mt-2">{userStats.modulesCompleted}</div>
            <div className="text-xs text-gray-500">
              Badges: {userStats.badgesEarned}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-white border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Quiz Score</span>
              <Brain className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold mt-2">{userStats.quizScore}%</div>
            <div className="text-xs text-gray-500">Latest score</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Featured blind tasting */}
          <div className="lg:col-span-2">
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="flex">
                <img
                  src={blindTastingVideo?.thumbnailUrl}
                  alt={blindTastingVideo?.title}
                  className="w-48 h-32 object-cover hidden sm:block"
                />
                <div className="p-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                      {blindTastingVideo?.title}
                    </h2>
                    {blindTastingVideo?.isNew && (
                      <span className="ml-3 inline-flex items-center text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 mr-1" /> New
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mt-1">
                    {blindTastingVideo?.description}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{blindTastingVideo?.duration}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full ${getDifficultyColor(
                        blindTastingVideo?.difficulty || "beginner"
                      )}`}
                    >
                      {blindTastingVideo?.difficulty}
                    </span>
                  </div>
                  <div className="mt-4">
                    <Link
                      to="/play"
                      className="inline-flex items-center bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Watch & Play
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Award className="w-4 h-4 mr-2" /> Achievements
              </h3>
              {earnedBadges.length === 0 ? (
                <p className="text-sm text-gray-600">No badges yet — start a lesson!</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3">
                  {earnedBadges.map((b) => (
                    <li
                      key={b.id}
                      className="rounded border p-2 flex items-center gap-2"
                    >
                      <span className="text-xl">{b.icon}</span>
                      <span className="text-sm font-medium">{b.name}</span>
                    </li>
                  ))}
                </ul>
              )}
              {nextBadge && (
                <div className="mt-4 text-xs text-gray-600">
                  Next up: <strong>{nextBadge.name}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming masterclasses */}
        <div className="mt-8 bg-white border rounded-lg">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {t("dashboard.upcomingMasterclasses")}
            </h3>
            <span className="text-xs text-gray-500">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          {masterclasses.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">
              {t("dashboard.noUpcomingMasterclasses")} —{" "}
              {t("dashboard.checkBackForEvents")}
            </div>
          ) : (
            <ul className="divide-y">
              {masterclasses.slice(0, 4).map((m) => {
                const canAccess = canAccessMasterclass(m);
                return (
                  <li key={m.id} className="p-4 flex items-start justify-between">
                    <div>
                      <div className="font-medium">{m.title}</div>
                      <div className="text-sm text-gray-600">{m.description}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                        <span className="inline-flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {m.date} @ {m.time} • {m.duration}
                        </span>
                        <span className="inline-flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {m.currentParticipants}/{m.maxParticipants}{" "}
                          {t("dashboard.member")}
                          {m.maxParticipants !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {m.isRegistered ? (
                        <span className="inline-flex items-center text-green-700 bg-green-100 text-xs px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t("dashboard.registered")}
                        </span>
                      ) : canAccess ? (
                        <button className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">
                          {t("dashboard.register")}
                        </button>
                      ) : (
                        <span className="inline-flex items-center text-amber-700 bg-amber-100 text-xs px-2 py-1 rounded-full">
                          {t("dashboard.upgradeToAccess")}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Leaderboard & Quick actions */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center">
                <Trophy className="w-4 h-4 mr-2" />
                {t("dashboard.topMembers")}
              </h3>
              <Link to="/account" className="text-sm underline">
                {t("dashboard.viewFullLeaderboard")}
              </Link>
            </div>
            <ul className="divide-y">
              {leaderboard.slice(0, 8).map((m) => (
                <li key={m.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-right">{m.rank}</span>
                    <img
                      src={m.avatar}
                      alt={m.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-gray-500">
                        {m.tier === "premium" ? "Premium" : m.tier === "basic" ? "Basic" : "Free"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{m.points} pts</div>
                    <div className="flex gap-1 justify-end mt-1">
                      {m.badges.slice(0, 3).map((b) => (
                        <span key={b} title={b}>
                          <Award className="w-4 h-4" />
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              {t("dashboard.quickActions")}
            </h3>
            <div className="space-y-2">
              <Link
                to="/trial-quiz"
                className="w-full inline-flex items-center justify-between px-3 py-2 rounded border hover:bg-gray-50"
              >
                <span>Try the Trial Quiz</span>
                <Play className="w-4 h-4" />
              </Link>
              <Link
                to="/vocab"
                className="w-full inline-flex items-center justify-between px-3 py-2 rounded border hover:bg-gray-50"
              >
                <span>Vino Vocab</span>
                <BookOpen className="w-4 h-4" />
              </Link>
              <Link
                to="/swirdle"
                className="w-full inline-flex items-center justify-between px-3 py-2 rounded border hover:bg-gray-50"
              >
                <span>Play Swirdle</span>
                <Brain className="w-4 h-4" />
              </Link>
              <Link
                to="/pricing"
                className="w-full inline-flex items-center justify-between px-3 py-2 rounded border hover:bg-gray-50"
              >
                <span>Upgrade</span>
                <Crown className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Crafted with <span className="inline-block">🍇</span> — keep tasting, keep learning.
        </div>
      </div>
    </div>
  );
}
