// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

import {
  Crown, Star, Trophy, Play, Calendar, Users, TrendingUp, Award,
  Clock, BookOpen, Brain, Target, CheckCircle
} from 'lucide-react';

// ---- minimal t() stub; swap to your LanguageContext when ready
const useLanguage = () => ({
  t: (k: string) => ({
    'dashboard.continueJourney': 'Let’s keep building your palate.',
    'dashboard.upcomingMasterclasses': 'Upcoming Masterclasses',
    'dashboard.registered': 'Registered',
    'dashboard.register': 'Register',
    'dashboard.upgrade': 'Upgrade required',
    'dashboard.upgradeToAccess': 'Upgrade to access',
    'dashboard.noUpcomingMasterclasses': 'No upcoming masterclasses',
    'dashboard.checkBackForEvents': 'Check back soon for new events.',
    'dashboard.topMembers': 'Top members',
    'dashboard.viewFullLeaderboard': 'View full leaderboard',
    'dashboard.quickActions': 'Quick actions',
    'dashboard.member': 'member',
  }[k] ?? k),
});

// ---- tiny spinner
const LoadingSpinner = ({ size = 'md' }: { size?: 'md' | 'lg' }) => (
  <div className={`animate-spin ${size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'} border-2 border-gray-300 border-t-transparent rounded-full`} />
);

// ---- types
interface LeaderboardMember {
  id: string; name: string; avatar: string; points: number; rank: number;
  tier: 'free' | 'basic' | 'premium'; badges: string[];
}
interface UserStats {
  shortsWatched: number; modulesCompleted: number; badgesEarned: number; quizScore: number;
  streakDays: number; totalPoints: number; rank: number; swirdleStreak: number; swirdleGamesWon: number;
  blindTastingsCompleted: number; communityPosts: number;
}
interface BlindTastingVideo {
  id: string; title: string; description: string; thumbnailUrl: string; duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced'; isNew: boolean;
}
interface Masterclass {
  id: string; title: string; description: string; instructor: string; date: string; time: string;
  duration: string; maxParticipants: number; currentParticipants: number;
  tier: 'basic' | 'premium'; isRegistered: boolean;
}

// ---- achievements (light stand-in)
const ACHIEVEMENT_BADGES = [
  { id: 'harvest_hand', name: 'Harvest Hand', icon: '🌾' },
  { id: 'vocabulary_master', name: 'Vocabulary Master', icon: '🔤' },
  { id: 'community_leader', name: 'Community Leader', icon: '👑' },
  { id: 'berry_builder', name: 'Berry Builder', icon: '🫐' },
  { id: 'swirdle_champion', name: 'Swirdle Champion', icon: '🧠' },
  { id: 'bloom_boss', name: 'Bloom Boss', icon: '🌸' },
  { id: 'tasting_expert', name: 'Tasting Expert', icon: '🥇' },
];
const getUserBadges = (_courses: number, modules: number, _quizzes: number, streak: number) => {
  const arr = [];
  if (modules >= 1) arr.push(ACHIEVEMENT_BADGES[0]);
  if (modules >= 5) arr.push(ACHIEVEMENT_BADGES[1]);
  if (streak >= 7) arr.push(ACHIEVEMENT_BADGES[2]);
  return arr;
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [blindTastingVideo, setBlindTastingVideo] = useState<BlindTastingVideo | null>(null);
  const [masterclasses, setMasterclasses] = useState<Masterclass[]>([]);

  useEffect(() => {
    if (user) loadDashboardData();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T) => {
    try { return await fn(); } catch { return fallback; }
  };

  const loadDashboardData = async () => {
    // ---- mock fallbacks for fast dev
    const mockLeaderboard: LeaderboardMember[] = [
      { id: '1', name: 'Sarah Chen', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150', points: 2847, rank: 1, tier: 'premium', badges: ['harvest_hand','vocabulary_master','community_leader'] },
      { id: '2', name: 'James Rodriguez', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150', points: 2156, rank: 2, tier: 'basic', badges: ['berry_builder','swirdle_champion'] },
      { id: '3', name: 'Emma Thompson', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150', points: 1923, rank: 3, tier: 'basic', badges: ['bloom_boss','tasting_expert'] },
    ];
    const mockUserStats: UserStats = {
      shortsWatched: 23, modulesCompleted: 8, badgesEarned: 5, quizScore: 87, streakDays: 12,
      totalPoints: 1456, rank: 15, swirdleStreak: 7, swirdleGamesWon: 34, blindTastingsCompleted: 6, communityPosts: 3,
    };
    const mockBlindTasting: BlindTastingVideo = {
      id: '1', title: 'Burgundy vs. Pinot Noir Challenge',
      description: 'Can you distinguish between Old World and New World Pinot Noir?',
      thumbnailUrl: 'https://images.pexels.com/photos/1407846/pexels-photo-1407846.jpeg',
      duration: '25 min', difficulty: 'intermediate', isNew: true
    };
    const mockMasterclasses: Masterclass[] = [
      { id: '1', title: 'Burgundy Deep Dive: Terroir & Tradition', description: 'Explore Burgundy from village to Grand Cru.',
        instructor: 'Matt Decanted', date: '2025-09-25', time: '19:00', duration: '90 min',
        maxParticipants: 50, currentParticipants: 34, tier: 'premium', isRegistered: false },
      { id: '2', title: 'Food Pairing Secrets with Matt', description: 'Techniques for perfect pairings.',
        instructor: 'Matt Decanted', date: '2025-09-28', time: '18:30', duration: '60 min',
        maxParticipants: 30, currentParticipants: 18, tier: 'basic', isRegistered: true },
    ];

    const leaderboardData = await safeFetch(async () => {
      const { data, error } = await supabase
        .from('user_leaderboard').select('*')
        .order('points', { ascending: false }).limit(10);
      if (error) throw error;
      return data as unknown as LeaderboardMember[];
    }, mockLeaderboard);

    const userStatsData = await safeFetch(async () => {
      const { data, error } = await supabase
        .from('user_stats').select('*')
        .eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return (data as unknown as UserStats) ?? mockUserStats;
    }, mockUserStats);

    const blindTastingData = await safeFetch(async () => {
      const { data, error } = await supabase
        .from('blind_tasting_videos').select('*')
        .eq('is_featured', true).maybeSingle();
      if (error) throw error;
      const d = data as any;
      return d
        ? ({ id: d.id, title: d.title, description: d.description, thumbnailUrl: d.thumbnail_url,
             duration: d.duration, difficulty: d.difficulty, isNew: true } as BlindTastingVideo)
        : mockBlindTasting;
    }, mockBlindTasting);

    const masterclassData = await safeFetch(async () => {
      const { data, error } = await supabase
        .from('masterclasses').select('*')
        .gte('date', new Date().toISOString())
        .order('date');
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
    ACHIEVEMENT_BADGES.find(b => !getAchievementBadges().some(e => e.id === b.id));

  const getDifficultyColor = (d: string) =>
    d === 'advanced' ? 'bg-red-100 text-red-800' :
    d === 'intermediate' ? 'bg-amber-100 text-amber-800' :
    'bg-green-100 text-green-800';

  const canAccessMasterclass = (m: Masterclass): boolean => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    if (m.tier === 'basic') return ['basic','premium','subscriber','admin'].includes(profile.role || 'learner');
    if (m.tier === 'premium')
      return ['premium','admin'].includes(profile.role || '') ||
        (profile.role === 'subscriber' && profile.subscription_status === 'active');
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
          <Link to="/signin" className="bg-blue-600 text-white px-6 py-2 rounded">Go to Sign in</Link>
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
                Welcome back, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Wine Enthusiast'}!
              </h1>
              <p className="text-gray-600 mt-1">{t('dashboard.continueJourney')}</p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                profile?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
