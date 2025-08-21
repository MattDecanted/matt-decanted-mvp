// src/pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, BookOpen, PlayCircle, Sparkles } from 'lucide-react';

function ClearGlassSVG(props: React.SVGProps<SVGSVGElement>) {
  // Minimal, elegant clear-glass outline (no color fill)
  return (
    <svg viewBox="0 0 180 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="3">
        {/* Bowl */}
        <path d="M50 20c0 40 10 65 40 80c30-15 40-40 40-80" strokeLinecap="round"/>
        {/* Stem */}
        <line x1="90" y1="100" x2="90" y2="165" strokeLinecap="round"/>
        {/* Base */}
        <path d="M55 180h70" strokeLinecap="round"/>
        <path d="M45 185h90" strokeLinecap="round" opacity="0.6"/>
      </g>
    </svg>
  );
}

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-amber-50">
      {/* Hero */}
      <section className="relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-amber-200 text-amber-800 bg-amber-50 mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Learn wine, one smart sip at a time
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
                Level up your wine chops—without the waffle
              </h1>
              <p className="mt-4 text-lg text-gray-600">
                Daily mini-games, bite-size lessons, and clear definitions. Built by Matt for people who want to actually
                understand wine, not memorize flashcards.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/swirdle"
                  className="inline-flex items-center justify-center rounded-lg bg-black text-white px-5 py-3 font-semibold hover:bg-gray-900"
                >
                  Play Swirdle
                  <Trophy className="w-4 h-4 ml-2" />
                </Link>
                <Link
                  to="/vocab"
                  className="inline-flex items-center justify-center rounded-lg border px-5 py-3 font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Explore Vocab
                  <BookOpen className="w-4 h-4 ml-2" />
                </Link>
              </div>

              <p className="mt-3 text-sm text-gray-500">
                New word daily • Optional hints • Earn points & badges
              </p>
            </div>

            {/* Clear glass only */}
            <div className="flex md:justify-end">
              <div className="relative">
                <div className="absolute -inset-6 bg-amber-100/40 blur-xl rounded-full" />
                <ClearGlassSVG className="relative w-[220px] h-[280px] text-gray-300 md:w-[260px] md:h-[320px]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Options grid */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/swirdle"
              className="group rounded-xl border bg-white hover:shadow-sm transition p-5 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Swirdle</h3>
                <Trophy className="w-4 h-4 text-amber-600" />
              </div>
              <p className="mt-2 text-sm text-gray-600">Daily wine word. Six guesses. Smart hints.</p>
              <span className="mt-auto pt-4 text-sm text-amber-700 group-hover:underline">Play now</span>
            </Link>

            <Link
              to="/vocab"
              className="group rounded-xl border bg-white hover:shadow-sm transition p-5 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Vino Vocab</h3>
                <BookOpen className="w-4 h-4 text-amber-600" />
              </div>
              <p className="mt-2 text-sm text-gray-600">Clear, usable definitions with Matt’s notes.</p>
              <span className="mt-auto pt-4 text-sm text-amber-700 group-hover:underline">Browse terms</span>
            </Link>

            <Link
              to="/shorts"
              className="group rounded-xl border bg-white hover:shadow-sm transition p-5 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Shorts</h3>
                <PlayCircle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="mt-2 text-sm text-gray-600">60–90s hits on grapes, regions, and techniques.</p>
              <span className="mt-auto pt-4 text-sm text-amber-700 group-hover:underline">Watch</span>
            </Link>

            <Link
              to="/pricing"
              className="group rounded-xl border bg-white hover:shadow-sm transition p-5 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Go Pro</h3>
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <p className="mt-2 text-sm text-gray-600">Unlock streaks, stats, and advanced vocab.</p>
              <span className="mt-auto pt-4 text-sm text-amber-700 group-hover:underline">See plans</span>
            </Link>
          </div>

          {/* Trust strip / tiny benefits */}
          <div className="mt-8 grid sm:grid-cols-3 gap-3 text-sm text-gray-600">
            <div className="rounded-lg border bg-white p-3">Plain-English definitions (no fluff)</div>
            <div className="rounded-lg border bg-white p-3">Built for WSET learners & the wine-curious</div>
            <div className="rounded-lg border bg-white p-3">Daily nudge to keep you consistent</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
