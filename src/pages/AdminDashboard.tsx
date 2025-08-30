// src/pages/admin/AdminDashboard.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  Shield, Calendar, ListChecks, Brain,
  BookOpen, Users, Sparkles, ChevronRight, RefreshCcw
} from "lucide-react";

type Cnt = { today: number; total: number };

function todayAU(): string {
  // If you use local server time, simple UTC date is fine for MVP
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminDashboard() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [swirdle, setSwirdle] = React.useState<Cnt>({ today: 0, total: 0 });
  const [quiz, setQuiz] = React.useState<Cnt>({ today: 0, total: 0 });
  const [vocab, setVocab] = React.useState<Cnt>({ today: 0, total: 0 });
  const [users, setUsers] = React.useState<number>(0);

  const tdy = todayAU();

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // Swirdle words
      {
        const { count: total } = await supabase
          .from("swirdle_words")
          .select("id", { count: "exact", head: true });
        const { count: today } = await supabase
          .from("swirdle_words")
          .select("id", { count: "exact", head: true })
          .eq("date_scheduled", tdy)
          .eq("is_published", true);
        setSwirdle({ today: today ?? 0, total: total ?? 0 });
      }
      // Daily quizzes
      {
        const { count: total } = await supabase
          .from("daily_quizzes")
          .select("id", { count: "exact", head: true });
        const { count: today } = await supabase
          .from("daily_quizzes")
          .select("id", { count: "exact", head: true })
          .eq("date_scheduled", tdy)
          .eq("is_published", true);
        setQuiz({ today: today ?? 0, total: total ?? 0 });
      }
      // Vino vocab challenges
      {
        const { count: total } = await supabase
          .from("vocab_challenges")
          .select("id", { count: "exact", head: true });
        const { count: today } = await supabase
          .from("vocab_challenges")
          .select("id", { count: "exact", head: true })
          .eq("date", tdy);
        setVocab({ today: today ?? 0, total: total ?? 0 });
      }
      // Users (profiles)
      {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true });
        setUsers(count ?? 0);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-purple/10 text-brand-purple">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Today: {tdy}</p>
          </div>
          <button
            onClick={load}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {err && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Swirdle words"
            icon={<Brain className="w-4 h-4" />}
            today={swirdle.today}
            total={swirdle.total}
          />
          <StatCard
            title="Daily quizzes"
            icon={<ListChecks className="w-4 h-4" />}
            today={quiz.today}
            total={quiz.total}
          />
          <StatCard
            title="Vino Vocab"
            icon={<BookOpen className="w-4 h-4" />}
            today={vocab.today}
            total={vocab.total}
          />
          <StatCard
            title="Users (profiles)"
            icon={<Users className="w-4 h-4" />}
            today={0}
            total={users}
          />
        </div>

        {/* Quick actions */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <AdminLink
            to="/admin/swirdle"
            title="Manage Swirdle"
            desc="Schedule words, set hints, publish today."
          />
          <AdminLink
            to="/admin/quizzes"
            title="Manage Daily Quiz"
            desc="Create & schedule daily quiz questions."
          />
          <AdminLink
            to="/admin/vocab"
            title="Manage Vino Vocab"
            desc="Set today’s vocab term, options & points."
          />
          <AdminLink
            to="/account"
            title="Members & roles"
            desc="Inspect users, set admin, confirm trial status."
          />
        </div>

        {/* Schedule helper */}
        <div className="mt-8 card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-brand-blue" />
            <h2 className="font-semibold">What should be live today?</h2>
          </div>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>
              <strong>Swirdle:</strong> {swirdle.today > 0 ? "✓ a word is published" : "• no word published yet"}
            </li>
            <li>
              <strong>Daily Quiz:</strong> {quiz.today > 0 ? "✓ a quiz is published" : "• no quiz published yet"}
            </li>
            <li>
              <strong>Vino Vocab:</strong> {vocab.today > 0 ? "✓ challenge set" : "• no challenge set"}
            </li>
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            Counts are scoped to <em>{tdy}</em>. Use the manager pages above to create/publish items.
          </p>
        </div>

        {/* Flair */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <Sparkles className="inline w-4 h-4 mr-1" />
          Keep it tidy. One word a day.
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-gray-300 border-t-transparent" />
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  icon,
  today,
  total,
}: {
  title: string;
  icon: React.ReactNode;
  today: number;
  total: number;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="text-2xl font-semibold">{total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">{today}</div>
          <div className="text-xs text-gray-500">Today</div>
        </div>
      </div>
    </div>
  );
}

function AdminLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="card p-4 flex items-start justify-between hover:bg-gray-50 transition-colors"
    >
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-gray-600">{desc}</div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </Link>
  );
}
