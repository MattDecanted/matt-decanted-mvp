// src/pages/Challenges.tsx
import React from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  Target,
  Wine,
  Trophy,
  BookOpen,
  Sparkles,
  UtensilsCrossed,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
import { useLocale } from "@/context/LocaleContext";
import i18n from "i18next";
import { supabase } from "@/lib/supabase";

/* ---------- i18n helper (re-render on locale change) ---------- */
function useT() {
  const { locale } = useLocale();
  return React.useCallback(
    (k: string, fallback: string) =>
      (i18n?.t ? i18n.t(k, { defaultValue: fallback }) : fallback),
    [locale]
  );
}

/* ---------- Small types ---------- */
type LBRow = { id: string; name: string; points: number; rank: number };

/* ---------- Page ---------- */
export default function Challenges() {
  const t = useT();

  // Lightweight leaderboard: try user_points; fallback to mock
  const [lb, setLb] = React.useState<LBRow[]>([]);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await supabase
          .from("user_points")
          .select("user_id,total_points")
          .order("total_points", { ascending: false })
          .limit(8);
        const rows = (r?.data || []).map((row: any, i: number) => ({
          id: row.user_id,
          name: `Member ${row.user_id?.slice?.(0, 6) ?? ""}…`,
          points: Number(row.total_points ?? 0),
          rank: i + 1,
        }));
        if (alive && rows.length) return setLb(rows);
      } catch {
        /* ignore */
      }
      if (!alive) return;
      setLb(
        [
          ["Sarah", 2847],
          ["James", 2156],
          ["Emma", 1923],
          ["Alex", 1770],
          ["Maya", 1660],
          ["Luca", 1512],
          ["Zoë", 1490],
          ["Ben", 1415],
        ].map(([name, points], i) => ({
          id: String(i + 1),
          name: String(name),
          points: Number(points),
          rank: i + 1,
        }))
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header (bold style) */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            {t("challenges.title", "Wine Games & Special Content")}
          </h1>
          <p className="mt-3 text-lg text-gray-600 max-w-3xl mx-auto">
            {t(
              "challenges.subtitle",
              "Interactive wine games and exclusive educational content to enhance your knowledge and palate"
            )}
            .
          </p>
        </header>

        {/* Games grid */}
        <section className="bg-white rounded-xl shadow border p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("challenges.games.heading", "Wine Games")}
            </h2>
            <p className="text-gray-600">
              {t(
                "challenges.games.subheading",
                "Test your wine knowledge with interactive challenges"
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GameTile
              to="/swirdle"
              icon={<Brain className="w-7 h-7" />}
              iconClass="bg-purple-100 text-purple-700"
              title="Swirdle"
              desc="Daily wine word puzzle — guess the term in 6 tries"
              cta="Play Daily Challenge"
              ctaClass="bg-purple-600 hover:bg-purple-700"
            />

            <GameTile
              to="/vocab"
              icon={<BookOpen className="w-7 h-7" />}
              iconClass="bg-rose-100 text-rose-700"
              title="Vino Vocab"
              desc="Timed rounds to sharpen your wine terminology"
              cta="Start Flashcards"
              ctaClass="bg-rose-600 hover:bg-rose-700"
            />

            <GameTile
              to="/daily-quiz"
              icon={<Sparkles className="w-7 h-7" />}
              iconClass="bg-blue-100 text-blue-700"
              title="Daily Wine Quiz"
              desc="Five fresh questions every day — build your streak"
              cta="Take Today’s Quiz"
              ctaClass="bg-blue-600 hover:bg-blue-700"
            />

            <GameTile
              to="/wine-options/multiplayer"
              icon={<Target className="w-7 h-7" />}
              iconClass="bg-teal-100 text-teal-700"
              title="Wine Options Game"
              desc="Create or join a room and battle it out with friends"
              cta="Start Multiplayer"
              ctaClass="bg-teal-600 hover:bg-teal-700"
            />

            <GameTile
              to="/games/guess-what"
              icon={<Wine className="w-7 h-7" />}
              iconClass="bg-amber-100 text-amber-700"
              title="Guess What"
              desc="Weekly blind tasting with Matt — compare your picks"
              cta="Join Challenge"
              ctaClass="bg-amber-600 hover:bg-amber-700"
            />

            <GameTile
              to="/swirdle/leaderboard"
              icon={<Trophy className="w-7 h-7" />}
              iconClass="bg-indigo-100 text-indigo-700"
              title="Leaderboards"
              desc="See how you rank and chase your next milestone"
              cta="View Rankings"
              ctaClass="bg-indigo-600 hover:bg-indigo-700"
            />
          </div>
        </section>

        {/* Tools to help */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <ToolTile
            to="/shorts"
            icon={<BadgeCheck className="w-7 h-7" />}
            bgClass="bg-emerald-50"
            title="Tasting Cards"
            desc="Printable prompts to structure your tastings."
            cta="Open Cards"
          />
          <ToolTile
            to="/vocab"
            icon={<BookOpen className="w-7 h-7" />}
            bgClass="bg-rose-50"
            title="Vocab Flashcards"
            desc="Drill core terms and aroma families fast."
            cta="Practice Now"
          />
          <ToolTile
            to="/blog/wine-tasting-guide"
            icon={<UtensilsCrossed className="w-7 h-7" />}
            bgClass="bg-amber-50"
            title="Food & Wine Pairing"
            desc="Simple rules of thumb for better matches."
            cta="View Guide"
          />
        </section>

        {/* Keep learning */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <PromoCard
            title="Keep learning with Shorts"
            desc="Bite-sized videos to learn something useful in under 2 minutes."
            to="/shorts"
            cta="Browse Shorts"
          />
          <PromoCard
            title="Stay on your journey"
            desc="Follow focused mini-modules to build knowledge step by step."
            to="/modules"
            cta="Explore Modules"
          />
        </section>

        {/* Keep earning points (loyalty best-practice) */}
        <section className="bg-white rounded-xl shadow border p-6 mb-12">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-amber-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold">Keep earning points</h3>
              <p className="text-sm text-gray-600 mt-1">
                Earn points by playing daily, maintaining streaks, and finishing
                learning sprints. Points unlock badges, tiers, and member perks.
              </p>
              <ul className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <li className="rounded-lg border p-3">
                  <span className="font-medium">Daily Quiz & Swirdle</span>
                  <div className="text-gray-600">
                    Earn every day you show up.
                  </div>
                </li>
                <li className="rounded-lg border p-3">
                  <span className="font-medium">Streak bonuses</span>
                  <div className="text-gray-600">
                    Milestones at 7, 14, 30 days.
                  </div>
                </li>
                <li className="rounded-lg border p-3">
                  <span className="font-medium">Badges & milestones</span>
                  <div className="text-gray-600">
                    Extra points for wins and mastery.
                  </div>
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/signin"
                  className="inline-flex items-center rounded-lg bg-black text-white px-4 py-2 text-sm"
                >
                  Save my points
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center rounded-lg border px-4 py-2 text-sm"
                >
                  See membership perks
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Compact leaderboard */}
        <section className="bg-white rounded-xl shadow border p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-600" />
            Top members
          </h3>
          <ul className="divide-y">
            {lb.map((m) => (
              <li key={m.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right text-gray-500">{m.rank}</span>
                  <div className="w-8 h-8 rounded-full bg-gray-100 grid place-items-center text-xs font-medium">
                    {m.name?.[0] ?? "M"}
                  </div>
                  <div className="font-medium">{m.name}</div>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">{m.points}</span>{" "}
                  <span className="text-gray-500">pts</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-right">
            <Link to="/swirdle/leaderboard" className="text-sm underline">
              View full leaderboard
            </Link>
          </div>
        </section>

        <footer className="mt-10 text-center text-xs text-gray-500">
          Crafted with 🍇 — keep tasting, keep learning.
        </footer>
      </div>
    </div>
  );
}

/* ---------- Components ---------- */

function GameTile(props: {
  to: string;
  icon: React.ReactNode;
  iconClass: string; // e.g. "bg-purple-100 text-purple-700"
  title: string;
  desc: string;
  cta: string;
  ctaClass: string; // e.g. "bg-purple-600 hover:bg-purple-700"
}) {
  const { to, icon, iconClass, title, desc, cta, ctaClass } = props;
  const titleId = React.useId();

  return (
    <Link
      to={to}
      className="group block rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition"
      aria-labelledby={titleId}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${iconClass}`}
        >
          {icon}
        </div>
        <h3 id={titleId} className="text-lg font-semibold text-gray-900">
          {title}
        </h3>
      </div>

      <p className="mt-3 text-sm text-gray-600">{desc}</p>

      <span
        className={`mt-4 inline-flex items-center text-sm font-medium text-white ${ctaClass} px-4 py-2 rounded-lg`}
      >
        {cta}
      </span>
    </Link>
  );
}

function ToolTile(props: {
  to: string;
  icon: React.ReactNode;
  bgClass: string;
  title: string;
  desc: string;
  cta: string;
}) {
  const { to, icon, bgClass, title, desc, cta } = props;
  return (
    <Link
      to={to}
      className="rounded-xl border bg-white hover:shadow-md transition p-6 block"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-full grid place-items-center ${bgClass}`}>
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">{desc}</p>
      <span className="inline-flex items-center text-sm font-medium text-gray-900">
        {cta}
        <ChevronRight className="w-4 h-4 ml-1" />
      </span>
    </Link>
  );
}

function PromoCard(props: { title: string; desc: string; to: string; cta: string }) {
  const { title, desc, to, cta } = props;
  return (
    <div className="rounded-xl border bg-white p-6 flex items-start justify-between">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{desc}</p>
      </div>
      <Link
        to={to}
        className="mt-3 sm:mt-0 inline-flex items-center rounded-lg bg-gray-900 text-white px-4 py-2 text-sm hover:opacity-95"
      >
        {cta}
        <ChevronRight className="w-4 h-4 ml-1" />
      </Link>
    </div>
  );
}
