// src/pages/Challenges.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import {
  Brain,
  BookOpen,
  ListChecks,
  Target,
  Wine,
  Video,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

function TileIcon({
  children,
  gradient,
}: {
  children: React.ReactNode;
  gradient: string; // e.g. "from-purple-500 to-fuchsia-500"
}) {
  return (
    <div
      className={`w-14 h-14 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${gradient} shadow-sm`}
    >
      {children}
    </div>
  );
}

function ChallengeCard({
  to,
  title,
  desc,
  icon,
  gradient,
  cta = "Play",
}: {
  to: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  gradient: string;
  cta?: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <TileIcon gradient={gradient}>{icon}</TileIcon>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1 flex-1">{desc}</p>
        <div className="mt-5">
          <span className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium">
            {cta}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Challenges() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            {t("challenges.title", "Wine Games & Challenges")}
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto mt-3">
            {t(
              "challenges.tagline",
              "Play quick, beautiful challenges—sharpen your tasting skills and grow your wine knowledge."
            )}
          </p>
        </div>

        {/* Games grid */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("challenges.games", "Wine Games")}
            </h2>
            <p className="text-gray-600">
              {t("challenges.gamesSubtitle", "Pick a challenge to get started")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ChallengeCard
              to="/swirdle"
              title="Swirdle"
              desc="Daily wine word puzzle—guess the term in 6 tries."
              gradient="from-purple-500 to-fuchsia-500"
              icon={<Brain className="w-7 h-7" />}
              cta="Play Daily"
            />
            <ChallengeCard
              to="/vino-vocab"
              title="Vino Vocab"
              desc="Build your vocabulary with rapid-fire tasting terms."
              gradient="from-rose-500 to-orange-500"
              icon={<BookOpen className="w-7 h-7" />}
              cta="Start Drills"
            />
            <ChallengeCard
              to="/daily-quiz"
              title="Daily Wine Quiz"
              desc="Fresh multiple-choice questions every day."
              gradient="from-sky-500 to-blue-600"
              icon={<ListChecks className="w-7 h-7" />}
              cta="Take Quiz"
            />
            <ChallengeCard
              to="/wine-game"   // your Wine Options route
              title="Wine Options"
              desc="Answer guided questions—variety, region, style & more."
              gradient="from-green-500 to-emerald-600"
              icon={<Target className="w-7 h-7" />}
              cta="Start Challenge"
            />
            <ChallengeCard
              to="/guess-what"
              title="Guess What"
              desc="Weekly blind tasting with Matt—compare your picks."
              gradient="from-amber-500 to-yellow-500"
              icon={<Wine className="w-7 h-7" />}
              cta="Join This Week"
            />
          </div>
        </div>

        {/* Shorts & Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link
            to="/shorts"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-4">
              <TileIcon gradient="from-indigo-500 to-blue-600">
                <Video className="w-7 h-7" />
              </TileIcon>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">
                  {t("challenges.shorts", "Shorts")}
                </h3>
                <p className="text-gray-600 mt-1">
                  {t(
                    "challenges.shortsDesc",
                    "Bite-sized videos packed with quick tips and tasting nuggets."
                  )}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium">
                  {t("challenges.browse", "Browse Shorts")}
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/modules"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-4">
              <TileIcon gradient="from-teal-500 to-emerald-600">
                <GraduationCap className="w-7 h-7" />
              </TileIcon>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">
                  {t("challenges.modules", "Modules")}
                </h3>
                <p className="text-gray-600 mt-1">
                  {t(
                    "challenges.modulesDesc",
                    "Structured learning paths—master regions, varieties and styles."
                  )}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium">
                  {t("challenges.exploreModules", "Explore Modules")}
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
