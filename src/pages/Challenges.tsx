// src/pages/Challenges.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Brain, Target, Wine, Trophy, Video, BookOpen } from "lucide-react";

export default function Challenges() {
  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Wine Games & Special Content</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Interactive wine games and exclusive educational content to enhance your knowledge and palate.
          </p>
        </div>

        {/* Games */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Wine Games</h2>
            <p className="text-gray-600">Test your wine knowledge with interactive challenges</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Swirdle */}
            <Tile
              to="/swirdle"
              icon={<Brain className="w-8 h-8 text-purple-600" />}
              iconWrap="bg-purple-100"
              title="Swirdle"
              desc="Daily wine word puzzle — guess the term in 6 tries"
              ctaBg="bg-purple-600"
              ctaText="Play Daily Challenge"
            />

            {/* Vino Vocab */}
            <Tile
              to="/vocab"
              icon={<Trophy className="w-8 h-8 text-rose-600" />}
              iconWrap="bg-rose-100"
              title="Vino Vocab"
              desc="Timed vocabulary rounds to sharpen your wine terminology"
              ctaBg="bg-rose-600"
              ctaText="Start Practising"
            />

            {/* Daily Wine Quiz */}
            <Tile
              to="/daily-quiz"
              icon={<Target className="w-8 h-8 text-blue-600" />}
              iconWrap="bg-blue-100"
              title="Daily Wine Quiz"
              desc="Five fresh questions every day. Come back for streaks!"
              ctaBg="bg-blue-600"
              ctaText="Take Today’s Quiz"
            />

            {/* Wine Options (multiplayer) */}
            <Tile
              to="/wine-options/multiplayer"
              icon={<Target className="w-8 h-8 text-teal-600" />}
              iconWrap="bg-teal-100"
              title="Wine Options Game"
              desc="Create or join a room and battle it out with friends"
              ctaBg="bg-teal-600"
              ctaText="Start Multiplayer"
            />

            {/* Guess What */}
            <Tile
              to="/games/guess-what"
              icon={<Wine className="w-8 h-8 text-amber-600" />}
              iconWrap="bg-amber-100"
              title="Guess What"
              desc="Weekly blind tasting with Matt — compare your picks"
              ctaBg="bg-amber-600"
              ctaText="Join Challenge"
            />

            {/* Swirdle Leaderboard */}
            <Tile
              to="/swirdle/leaderboard"
              icon={<Trophy className="w-8 h-8 text-indigo-600" />}
              iconWrap="bg-indigo-100"
              title="Leaderboards"
              desc="See how you rank and chase your next milestone"
              ctaBg="bg-indigo-600"
              ctaText="View Rankings"
            />
          </div>
        </section>

        {/* Learn */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Shorts */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <Video className="w-8 h-8 text-purple-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Shorts</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Bite-sized videos to learn something useful in under 2 minutes.
            </p>
            <Link
              to="/shorts"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:opacity-95 transition"
            >
              Browse Shorts
            </Link>
          </div>

          {/* Modules */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Short Courses</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Focused mini-courses covering specific topics in digestible sessions.
            </p>
            <Link
              to="/modules"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:opacity-95 transition"
            >
              Explore Modules
            </Link>
          </div>
        </section>

        {/* All content CTA */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Everything in One Place</h2>
          <p className="text-gray-600 mb-6">
            Head to Shorts or Modules to dive deeper, or jump into a game above.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/shorts"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border bg-white text-gray-900 hover:bg-gray-50"
            >
              View Shorts
            </Link>
            <Link
              to="/modules"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white"
            >
              View Modules
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Small tile component (white background, no black buttons) --- */
function Tile({
  to,
  icon,
  iconWrap,
  title,
  desc,
  ctaBg,
  ctaText,
}: {
  to: string;
  icon: React.ReactNode;
  iconWrap: string; // e.g. bg-purple-100
  title: string;
  desc: string;
  ctaBg: string;    // e.g. bg-purple-600
  ctaText: string;
}) {
  return (
    <Link
      to={to}
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all hover:border-gray-300"
      aria-label={title}
    >
      <div className="text-center">
        <div className={`w-16 h-16 ${iconWrap} rounded-full flex items-center justify-center mx-auto mb-4`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-4">{desc}</p>
        <div className={`${ctaBg} text-white px-4 py-2 rounded-lg font-medium inline-block`}>
          {ctaText}
        </div>
      </div>
    </Link>
  );
}
