import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, BookOpen, FileText, Mail, TrendingUp, MessageSquare,
  Video, Download, Globe, Brain, Film, CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    subs: 0,
    shorts: 0,
    shortQuizzes: 0,
    languages: 1,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      // Users
      const prof = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const users = prof?.count ?? 0;

      // Subscribers (assumes profiles.membership_tier IN ('pro','vip'))
      const subsRes = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("membership_tier", ["pro", "vip"]);
      const subs = subsRes?.count ?? 0;

      // Shorts
      const shortsRes = await supabase.from("shorts").select("id", { count: "exact", head: true });
      const shorts = shortsRes?.count ?? 0;

      // Short quizzes
      const qb = await supabase
        .from("quiz_bank")
        .select("id", { count: "exact", head: true })
        .eq("kind", "short");
      const shortQuizzes = qb?.count ?? 0;

      // Languages (distinct locales present in shorts_i18n)
      const locales = await supabase.from("shorts_i18n").select("locale");
      const languages = locales.data ? new Set(locales.data.map((x: any) => x.locale)).size : 1;

      if (active) setStats({ users, subs, shorts, shortQuizzes, languages });
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your wine education platform</p>
        </div>

        {/* KPI / Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.users}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Subscribers</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.subs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Film className="w-6 h-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Shorts</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.shorts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Short Quizzes</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.shortQuizzes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-teal-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Languages</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.languages}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions (Bolt style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                Shorts Management
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Create and manage micro-lessons (5–15 minutes) and quizzes.
            </p>
            <Link
              to="/admin/shorts"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors block text-center"
            >
              Manage Shorts
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                Translation Management
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Localize titles, blurbs, and alt links for 5–6 languages.
            </p>
            <Link
              to="/admin/translations"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg font-medium transition-colors block text-center"
            >
              Manage Translations
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                Reports & Analytics
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              See engagement on Shorts and quizzes.
            </p>
            <Link
              to="/admin/analytics"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium transition-colors block text-center"
            >
              View Analytics
            </Link>
          </div>

          {/* keep a few Bolt tiles for parity / future */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                Community Management
              </h3>
            </div>
            <p className="text-gray-600 mb-4">Manage discussions and events</p>
            <Link
              to="/admin/community"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors block text-center"
            >
              Manage Community
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                Media Library
              </h3>
            </div>
            <p className="text-gray-600 mb-4">Manage videos and PDFs</p>
            <Link
              to="/admin/media"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-lg font-medium transition-colors block text-center"
            >
              Manage Media
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-fuchsia-100 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-fuchsia-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                Swirdle Management
              </h3>
            </div>
            <p className="text-gray-600 mb-4">Daily wine word puzzles</p>
            <Link
              to="/admin/swirdle"
              className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white py-2 px-4 rounded-lg font-medium transition-colors block text-center"
            >
              Manage Swirdle
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
