// src/pages/Challenges.tsx
import React from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  Target,
  Wine,
  Trophy,
  Video,
  BookOpen,
  Crown,
  Sparkles,
  ClipboardList,
  BookOpenCheck,
  UtensilsCrossed,
  Flame,
  CalendarCheck,
  Medal,
} from "lucide-react";

import { useLocale } from "@/context/LocaleContext";
import { usePoints } from "@/context/PointsContext";
import { supabase } from "@/lib/supabase";
import i18n from "i18next";

/* ---------------- i18n helper ---------------- */
function useT() {
  const { locale } = useLocale();
  const t = React.useCallback(
    (key: string, fallback: string) =>
      (i18n?.t ? i18n.t(key, { defaultValue: fallback }) : fallback),
    [locale]
  );
  return { t };
}

/* ---------------- Types ---------------- */
type LBRow = { user_id: string; total_points?: number; points_30d?: number };

/* ---------------- Page ---------------- */
export default function Challenges() {
  const { t } = useT();
  const { totalPoints } = usePoints();

  const [leaderboard, setLeaderboard] = React.useState<
    { id: string; name: string; pts: number }[]
  >([]);

  React.useEffect(() => {
    let live = true;
    (async () => {
      try {
        // Try long-term total_points first
        const up = await supabase
          .from("user_points")
          .select("user_id,total_points")
          .order("total_points", { ascending: false })
          .limit(5);

        let rows: LBRow[] | null = null;
        if (!up.error && Array.isArray(up.data) && up.data.length) {
          rows = up.data as any;
        } else {
          // Fallback to 30-day view if present
          const lb30 = await supabase
            .from("vocab_leaderboard_30d")
            .select("user_id,points_30d")
            .order("points_30d", { ascending: false })
            .limit(5);
          if (!lb30.error && Array.isArray(lb30.data) && lb30.data.length) {
            rows = lb30.data as any;
          }
        }

        const list =
          rows?.map((r, i) => ({
            id: r.user_id,
            name: `User ${r.user_id.slice(0, 6)}…`,
            pts: Number(r.total_points ?? r.points_30d ?? 0),
          })) ??
          [
            { id: "demo1", name: "Sarah C.", pts: 2847 },
            { id: "demo2", name: "James R.", pts: 2156 },
            { id: "demo3", name: "Emma T.", pts: 1923 },
            { id: "demo4", name: "Luca F.", pts: 1675 },
            { id: "demo5", name: "Ava M.", pts: 1540 },
          ];

        if (live) setLeaderboard(list);
      } catch {
        if (!live) return;
        setLeaderboard([
          { id: "demo1", name: "Sarah C.", pts: 2847 },
          { id: "demo2", name: "James R.", pts: 2156 },
          { id: "demo3", name: "Emma T.", pts: 1923 },
          { id: "demo4", name: "Luca F.", pts: 1675 },
          { id: "demo5", name: "Ava M.", pts: 1540 },
        ]);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ---------------- Header ---------------- */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-3">
            {t("challenges.title", "Wine Games & Special Content")}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t(
              "challenges.subtitle",
              "Interactive wine games and exclusive educational content to enhance your knowledge and palate."
            )}
          </p>
        </header>

        {/* ---------------- Games (Bolt-style tiles) ---------------- */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
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
            {/* Swirdle */}
            <Tile
              to="/swirdle"
              icon={<Brain className="w-8 h-8" />}
              accent="purple"
              title={t("challenges.tiles.swirdle.title", "Swirdle")}
              desc={t(
                "challenges.tiles.swirdle.desc",
                "Daily wine word puzzle — guess the term in 6 tries"
              )}
              cta={t("challenges.tiles.swirdle.cta", "Play Daily Challenge")}
            />

            {/* Wine Options (multiplayer) */}
            <Tile
              to="/wine-options/multiplayer"
              icon={<Target className="w-8 h-8" />}
              accent="teal"
              title={t("challenges.tiles.options.title", "Wine Options Game")}
              desc={t(
                "challenges.tiles.options.desc",
                "Create or join a room and battle it out with friends"
              )}
              cta={t("challenges.tiles.options.cta", "Start Multiplayer")}
            />

            {/* Guess What */}
            <Tile
              to="/games/guess-what"
              icon={<Wine className="w-8 h-8" />}
              accent="amber"
              title={t("challenges.tiles.guessWhat.title", "Guess What")}
              desc={t(
                "challenges.tiles.guessWhat.desc",
                "Weekly blind tasting with Matt — compare your picks"
              )}
              cta={t("challenges.tiles.guessWhat.cta", "Join Challenge")}
            />

            {/* Vino Vocab */}
            <Tile
              to="/vocab"
              icon={<BookOpen className="w-8 h-8" />}
              accent="rose"
              title={t("challenges.tiles.vocab.title", "Vino Vocab")}
              desc={t(
                "challenges.tiles.vocab.desc",
                "Timed rounds to sharpen your wine terminology"
              )}
              cta={t("challenges.tiles.vocab.cta", "Start Practising")}
            />

            {/* Daily Wine Quiz */}
            <Tile
              to="/daily-quiz"
              icon={<Target className="w-8 h-8" />}
              accent="blue"
              title={t(
                "challenges.tiles.dailyQuiz.title",
                "Daily Wine Quiz"
              )}
              desc={t(
                "challenges.tiles.dailyQuiz.desc",
                "Five fresh questions every day. Build your streak!"
              )}
              cta={t("challenges.tiles.dailyQuiz.cta", "Take Today’s Quiz")}
            />

            {/* Leaderboards entry */}
            <Tile
              to="/swirdle/leaderboard"
              icon={<Trophy className="w-8 h-8" />}
              accent="indigo"
              title={t("challenges.tiles.leaderboards.title", "Leaderboards")}
              desc={t(
                "challenges.tiles.leaderboards.desc",
                "See how you rank and chase your next milestone"
              )}
              cta={t("challenges.tiles.leaderboards.cta", "View Rankings")}
            />
          </div>

          {/* Inline Leaderboard */}
          <div className="mt-10 rounded-lg border bg-gray-50">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                {t("challenges.lb.title", "Top players")}
              </h3>
              <Link to="/swirdle/leaderboard" className="text-sm underline">
                {t("challenges.lb.viewAll", "View full leaderboard")}
              </Link>
            </div>
            <ul className="divide-y">
              {leaderboard.map((row, i) => (
                <li key={row.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-right">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-white border" />
                    <div className="leading-tight">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-gray-500">
                        {i === 0 ? "Premium" : "Member"}
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold">{row.pts} pts</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------- Helper Tools ---------------- */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            {t("challenges.tools.heading", "Tools to help")}
          </h2>
          <p className="text-gray-600 text-center mb-6">
            {t(
              "challenges.tools.sub",
              "Use these quick references to improve your tasting accuracy and speed."
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HelperCard
              to="/shorts?tag=tasting-cards"
              icon={<ClipboardList className="w-7 h-7" />}
              accent="emerald"
              title={t("challenges.tools.tasting.title", "Tasting Cards")}
              desc={t(
                "challenges.tools.tasting.desc",
                "Printable aroma, flavour and structure guides for classic grapes."
              )}
              cta={t("challenges.tools.cta", "Open")}
            />
            <HelperCard
              to="/vocab"
              icon={<BookOpenCheck className="w-7 h-7" />}
              accent="rose"
              title={t("challenges.tools.flash.title", "Vocab Flashcards")}
              desc={t(
                "challenges.tools.flash.desc",
                "Rapid-fire decks for the most-tested wine terms."
              )}
              cta={t("challenges.tools.cta", "Practice")}
            />
            <HelperCard
              to="/shorts?tag=pairing"
              icon={<UtensilsCrossed className="w-7 h-7" />}
              accent="amber"
              title={t("challenges.tools.pairing.title", "Food & Wine Pairing")}
              desc={t(
                "challenges.tools.pairing.desc",
                "Simple pairing rules + quick lookups for popular dishes."
              )}
              cta={t("challenges.tools.cta", "Explore")}
            />
          </div>
        </section>

        {/* ---------------- Keep Learning ---------------- */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <PromoCard
            icon={<Video className="w-8 h-8" />}
            title={t("challenges.learn.shorts.heading", "Keep learning with Shorts")}
            desc={t(
              "challenges.learn.shorts.desc",
              "Bite-sized videos under 2 minutes. Perfect for quick wins between tastings."
            )}
            to="/shorts"
            cta={t("challenges.learn.shorts.cta", "Browse Shorts")}
            accent="purple"
          />
          <PromoCard
            icon={<BookOpen className="w-8 h-8" />}
            title={t("challenges.learn.modules.heading", "Stay on your journey")}
            desc={t(
              "challenges.learn.modules.desc",
              "Short courses that build toward real confidence in the glass."
            )}
            to="/modules"
            cta={t("challenges.learn.modules.cta", "Explore Modules")}
            accent="blue"
          />
        </section>

        {/* ---------------- Keep Earning Points (loyalty best-practice) ---------------- */}
        <section className="bg-white rounded-xl shadow p-6 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            <h3 className="text-xl font-bold">Keep earning points</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Earn points by playing daily, maintaining streaks, and finishing learning sprints.
            Points unlock badges and perks over time.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <Tip
              icon={<CalendarCheck className="w-4 h-4" />}
              text="Daily Quiz & Swirdle — +points every day you show up."
            />
            <Tip icon={<Flame className="w-4 h-4" />} text="Streak bonuses at 3, 7, 14, 30 days." />
            <Tip icon={<Medal className="w-4 h-4" />} text="Badges for vocab wins, blind tasting accuracy and more." />
          </ul>

          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              Current points: <strong>{Number(totalPoints ?? 0)}</strong>
            </div>
            <div className="flex gap-3">
              <Link
                to="/signin"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-black text-white"
              >
                {t("challenges.loyalty.signup", "Create free account")}
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center px-4 py-2 rounded-lg border border-yellow-600 text-yellow-700 hover:bg-yellow-50"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t("challenges.loyalty.trial", "Start 7-day trial")}
              </Link>
            </div>
          </div>
        </section>

        <footer className="text-center text-sm text-gray-500">
          Crafted with 🍇 — keep tasting, keep learning.
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Reusable UI ---------------- */

function Tile({
  to,
  icon,
  accent,
  title,
  desc,
  cta,
}: {
  to: string;
  icon: React.ReactNode;
  accent:
    | "purple"
    | "teal"
    | "amber"
    | "rose"
    | "blue"
    | "indigo"
    | "emerald";
  title: string;
  desc: string;
  cta: string;
}) {
  const wrap =
    accent === "purple"
      ? "bg-purple-100"
      : accent === "teal"
      ? "bg-teal-100"
      : accent === "amber"
      ? "bg-amber-100"
      : accent === "rose"
      ? "bg-rose-100"
      : accent === "indigo"
      ? "bg-indigo-100"
      : accent === "emerald"
      ? "bg-emerald-100"
      : "bg-blue-100";

  const btn =
    accent === "purple"
      ? "bg-purple-600"
      : accent === "teal"
      ? "bg-teal-600"
      : accent === "amber"
      ? "bg-amber-600"
      : accent === "rose"
      ? "bg-rose-600"
      : accent === "indigo"
      ? "bg-indigo-600"
      : accent === "emerald"
      ? "bg-emerald-600"
      : "bg-blue-600";

  return (
    <Link
      to={to}
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all hover:border-gray-300 block focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className={`w-12 h-12 ${wrap} rounded-full flex items-center justify-center shrink-0`}>
          <div className="w-7 h-7">{icon}</div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm mb-4">{desc}</p>
      <div className={`${btn} text-white px-4 py-2 rounded-lg font-medium inline-block`}>
        {cta}
      </div>
    </Link>
  );
}

function HelperCard({
  to,
  icon,
  title,
  desc,
  cta,
  accent,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  accent: "emerald" | "rose" | "amber";
}) {
  const wrap =
    accent === "emerald"
      ? "bg-emerald-100 text-emerald-800"
      : accent === "rose"
      ? "bg-rose-100 text-rose-800"
      : "bg-amber-100 text-amber-800";

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${wrap}`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">{desc}</p>
      <Link to={to} className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:bg-gray-50">
        {cta}
      </Link>
    </div>
  );
}

function PromoCard({
  icon,
  title,
  desc,
  to,
  cta,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: string;
  cta: string;
  accent: "purple" | "blue";
}) {
  const btn = accent === "purple" ? "bg-purple-600" : "bg-blue-600";
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-3">
        {icon}
        <h3 className="text-2xl font-bold text-gray-900 ml-3">{title}</h3>
      </div>
      <p className="text-gray-600 mb-6">{desc}</p>
      <Link
        to={to}
        className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-white font-medium hover:opacity-95 transition ${btn}`}
      >
        {cta}
      </Link>
    </div>
  );
}

function Tip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2 p-3 rounded-lg bg-gray-50">
      <span className="mt-0.5">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
