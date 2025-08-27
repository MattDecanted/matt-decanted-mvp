import React from 'react';
import { Link } from 'react-router-dom';
import { Wine, Star } from 'lucide-react';

const About: React.FC = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Who is Matt Decanted?
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Meet Matt Wenk — the quietly legendary McLaren Vale winemaker and educator who makes wine knowledge welcoming, practical and genuinely fun.
          </p>

          {/* Quick Nav / CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/courses"
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition"
            >
              Start Learning
            </Link>
            <Link
              to="/community"
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium bg-gray-900 text-white hover:bg-black transition"
            >
              Join the Community
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium border border-gray-300 text-gray-800 hover:bg-gray-50 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>

        {/* Matt's Character / Imagery */}
        <div className="text-center mb-16">
          <div className="mx-auto mb-8 w-48 h-48 bg-amber-200 rounded-full flex items-center justify-center shadow-md">
            <Wine className="w-24 h-24 text-amber-700" />
          </div>
          <p className="text-lg text-gray-700 italic">
            “Boots, bucket hat, blue shirt — that’s Matt. The style’s simple; the thinking isn’t. Science in one hand, palate in the other.”
          </p>
        </div>

        {/* Intro */}
        <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Who I am</h2>
          <p className="text-gray-700 leading-relaxed">
            Winemaker, taster, and educator. I’ve worked across multiple regions,
            led teams through vintage after vintage, and love translating serious
            wine knowledge into useful, down-to-earth insights.
          </p>
        </section>

        {/* Fast Facts */}
        <section className="bg-white border border-gray-200 rounded-2xl p-8 mb-16 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Fast Facts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start">
              <Star className="w-6 h-6 text-amber-600 mt-1 mr-3 flex-shrink-0" />
              <p className="text-gray-700">
                Recipient of the <strong>prestigious Len Evans Tutorial Scholarship</strong> — one of the highest honours in Australian wine, awarded to the brightest palates in the country.
              </p>
            </div>

            <div className="flex items-start">
              <Star className="w-6 h-6 text-amber-600 mt-1 mr-3 flex-shrink-0" />
              <p className="text-gray-700">
                <strong>30+ vintages</strong> crafted across <strong>3 continents</strong> and <strong>6 world-class wine regions</strong> — from McLaren Vale to Bordeaux and beyond.
              </p>
            </div>

            <div className="flex items-start">
              <Star className="w-6 h-6 text-amber-600 mt-1 mr-3 flex-shrink-0" />
              <p className="text-gray-700">
                Made <strong>hundreds of wines scoring 90+ points</strong> with critics — consistently setting the benchmark for quality and balance.
              </p>
            </div>

            <div className="flex items-start">
              <Star className="w-6 h-6 text-amber-600 mt-1 mr-3 flex-shrink-0" />
              <p className="text-gray-700">
                Widely regarded as having <strong>one of the best palates in Australia</strong> — trusted by judges, sommeliers, and fellow winemakers.
              </p>
            </div>

            <div className="flex items-start">
              <Star className="w-6 h-6 text-amber-600 mt-1 mr-3 flex-shrink-0" />
              <p className="text-gray-700">
                Seasoned <strong>podcast host & sought-after guest</strong>, known for breaking down wine knowledge with wit and clarity.
              </p>
            </div>

            <div className="flex items-start">
              <Star className="w-6 h-6 text-amber-600 mt-1 mr-3 flex-shrink-0" />
              <p className="text-gray-700">
                <strong>University guest lecturer</strong>, inspiring the next generation of winemakers and wine thinkers.
              </p>
            </div>
          </div>{/* end grid */}
        </section>

        {/* Footer spacer */}
        <div className="text-center text-sm text-gray-500">
          © {new Date().getFullYear()} — All rights reserved.
        </div>
      </div>{/* end container */}
    </main>
  );
};

export default About;
