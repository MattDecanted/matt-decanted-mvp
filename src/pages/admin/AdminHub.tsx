// src/pages/admin/AdminHub.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Shield, Users, UserCheck, BookOpen, Layers, Globe, LineChart, Film, MessageSquare,
  FileText, Sparkles, Grid3X3, Crown, Puzzle, PlayCircle, ChevronRight
} from "lucide-react";

type KPI = { label: string; value: string | number; icon: React.ReactNode; tone?: string };

type Tone =
  | "indigo" | "green" | "amber" | "violet" | "red"
  | "blue" | "teal" | "orange" | "pink" | "emerald" | "gray";

const toneBg: Record<Tone, string> = {
  indigo: "bg-indigo-50 text-indigo-700",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  violet: "bg-violet-50 text-violet-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700",
  teal: "bg-teal-50 text-teal-700",
  orange: "bg-orange-50 text-orange-700",
  pink: "bg-pink-50 text-pink-700",
  emerald: "bg-emerald-50 text-emerald-700",
  gray: "bg-gray-50 text-gray-700",
};

const toneBtn: Record<Tone, string> = {
  indigo: "bg-indigo-600 hover:bg-indigo-700 text-white",
  green: "bg-green-600 hover:bg-green-700 text-white",
  amber: "bg-amber-600 hover:bg-amber-700 text-white",
  violet: "bg-violet-600 hover:bg-violet-700 text-white",
  red: "bg-red-600 hover:bg-red-700 text-white",
  blue: "bg-blue-600 hover:bg-blue-700 text-white",
  teal: "bg-teal-600 hover:bg-teal-700 text-white",
  orange: "bg-orange-600 hover:bg-orange-700 text-white",
  pink: "bg-pink-600 hover:bg-pink-700 text-white",
  emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
  gray: "bg-gray-900 hover:bg-black text-white",
};

export default function AdminHub() {
  const { user, profile } = useAuth() as any;

  const isAdmin =
    profile?.role === "admin" ||
    profile?.is_admin === true ||
    user?.user_metadata?.role === "admin";

  // Robots: prevent indexing
  React.useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  // counts (best-effort)
  const [counts, setCounts] = React.useState({
    users: null as number | null,
    rounds: null as number | null,
    roundsThisWeek: null as number | null,
    modules: null as number | null,
    courses: null as number | null,
  });

  React.useEffect(() => {
    let on = true;
    (async () => {
      try {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);

        const [
          usersRes,
          roundsRes,
          roundsWeekRes,
          modulesRes,
          coursesRes,
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("guess_what_rounds").select("*", { count: "exact", head: true }),
          supabase
            .from("guess_what_rounds")
            .select("date", { count: "exact", head: true })
            .gte("date", weekAgo.toISOString().slice(0, 10)),
          supabase.from("modules").select("*", { count: "exact", head: true }),
          supabase.from("courses").select("*", { count: "exact", head: true }),
        ]);

        if (!on) return;
        setCounts({
          users: usersRes.count ?? null,
          rounds: roundsRes.count ?? null,
          roundsThisWeek: roundsWeekRes.count ?? null,
          modules: modulesRes.count ?? null,
          courses: coursesRes.count ?? null,
        });
      } catch {
        // Leave as nulls; UI shows "—"
      }
    })();
    return () => { on = false; };
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 p-10">
        <div className="text-center max-w-md">
          <Shield className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-gray-600 mt-1">This area is for administrators only.</p>
        </div>
      </div>
    );
  }

  const kpis: KPI[] = [
    { label: "Total Users", value: counts.users ?? "—", icon: <Users className="w-6 h-6" /> },
    { label: "Active Subscribers", value: "—", icon: <UserCheck className="w-6 h-6" />, tone: "text-green-700 bg-green-50" },
    { label: "Courses", value: counts.courses ?? "—", icon: <BookOpen className="w-6 h-6" /> },
    { label: "Modules", value: counts.modules ?? "—", icon: <Layers className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff,#fff8f5)] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Crown className="w-6 h-6 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm -mt-0.5">Manage your wine education platform</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
              <div className={["p-2 rounded-lg bg-gray-50 text-gray-700", k.tone].filter(Boolean).join(" ")}>
                {k.icon}
              </div>
              <div>
                <div className="text-xs text-gray-500">{k.label}</div>
                <div className="text-2xl font-semibold tabular-nums">{k.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AdminCard
            title="Course Management"
            subtitle="Create and manage wine education courses"
            statLabel="Total Courses"
            statValue={counts.courses ?? "—"}
            to="/admin/content"
            tone="indigo"
            icon={<BookOpen className="w-5 h-5" />}
            cta="Manage Courses"
          />
          <AdminCard
            title="User Management"
            subtitle="Manage user accounts and roles"
            statLabel="Total Users"
            statValue={counts.users ?? "—"}
            to="/admin/users"
            tone="green"
            icon={<Users className="w-5 h-5" />}
            cta="Manage Users"
          />
          <AdminCard
            title="Lead Management"
            subtitle="View and export leads"
            statLabel="Total Leads"
            statValue="—"
            to="#"
            tone="amber"
            icon={<FileText className="w-5 h-5" />}
            cta="View Leads"
          />
          <AdminCard
            title="Community Management"
            subtitle="Manage discussions and events"
            statLabel="Total Posts"
            statValue="—"
            to="#"
            tone="violet"
            icon={<MessageSquare className="w-5 h-5" />}
            cta="Manage Community"
          />
          <AdminCard
            title="Media Library"
            subtitle="Manage videos and downloads"
            statLabel="Videos"
            statValue="—"
            to="#"
            tone="red"
            icon={<Film className="w-5 h-5" />}
            cta="Manage Media"
          />
          <AdminCard
            title="Analytics & Reports"
            subtitle="View detailed analytics"
            statLabel="Engagement"
            statValue="—"
            to="#"
            tone="blue"
            icon={<LineChart className="w-5 h-5" />}
            cta="Analytics"
          />
          <AdminCard
            title="Translation Management"
            subtitle="Manage multi-language content"
            statLabel="Languages"
            statValue="—"
            to="#"
            tone="teal"
            icon={<Globe className="w-5 h-5" />}
            cta="Manage Translations"
          />
          <AdminCard
            title="Content Items"
            subtitle="Manage special content"
            statLabel="Items"
            statValue="—"
            to="/admin/shorts"
            tone="orange"
            icon={<Sparkles className="w-5 h-5" />}
            cta="Manage Content"
          />
          <AdminCard
            title="Swirdle Management"
            subtitle="Manage daily word puzzles"
            statLabel="Total Words"
            statValue="—"
            to="/admin/swirdle"
            tone="pink"
            icon={<Grid3X3 className="w-5 h-5" />}
            cta="Manage Swirdle"
          />
          <AdminCard
            title="Vino Vocab Management"
            subtitle="Create vocabulary challenges"
            statLabel="Challenges"
            statValue="—"
            to="/admin/quizzes"         // live admin section
            tone="blue"
            icon={<Sparkles className="w-5 h-5" />}
            cta="Manage Vino Vocab"
          />
          <AdminCard
            title="Guess What Challenges"
            subtitle="Manage weekly blind challenges"
            statLabel="Total Challenges"
            statValue={counts.rounds ?? "—"}
            extra={`This Week: ${counts.roundsThisWeek ?? "—"}`}
            to="/admin/guess-what"
            tone="emerald"
            icon={<Puzzle className="w-5 h-5" />}
            cta="Manage Challenges"
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</div>
          <div className="flex flex-wrap gap-3">
            <QuickAction to="/admin/guess-what" tone="emerald">
              <Puzzle className="w-4 h-4" /> New Guess What
            </QuickAction>
            <QuickAction to="/admin/quizzes" tone="blue">
              <Sparkles className="w-4 h-4" /> New Vino Vocab
            </QuickAction>
            <QuickAction to="/admin/swirdle" tone="pink">
              <PlayCircle className="w-4 h-4" /> Add Swirdle Word
            </QuickAction>
            <QuickAction to="/admin/content" tone="indigo">
              <BookOpen className="w-4 h-4" /> Add Course
            </QuickAction>
            <QuickAction to="/admin/shorts" tone="red">
              <Film className="w-4 h-4" /> New Post
            </QuickAction>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminCard({
  title, subtitle, statLabel, statValue, extra, to, tone, icon, cta,
}: {
  title: string;
  subtitle: string;
  statLabel: string;
  statValue: string | number;
  extra?: string;
  to: string;
  tone: Tone;
  icon: React.ReactNode;
  cta: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col">
      <div className="flex items-center gap-3">
        <span className={`p-2 rounded-lg ${toneBg[tone]}`}>{icon}</span>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-gray-600">{subtitle}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-500">{statLabel}</div>
          <div className="text-xl font-semibold tabular-nums">{statValue}</div>
        </div>
        {extra && (
          <div>
            <div className="text-xs text-gray-500">This Week</div>
            <div className="text-xl font-semibold tabular-nums">{extra.split(": ")[1]}</div>
          </div>
        )}
      </div>
      <Link
        to={to}
        className={`mt-4 inline-flex items-center justify-center rounded-lg px-3 py-2 ${toneBtn[tone]}`}
      >
        {cta}
        <ChevronRight className="w-4 h-4 ml-1" />
      </Link>
    </div>
  );
}

function QuickAction({
  to,
  tone = "gray",
  children,
}: React.PropsWithChildren<{ to: string; tone?: Tone }>) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-sm ${toneBtn[tone]}`}
    >
      {children}
    </Link>
  );
}
