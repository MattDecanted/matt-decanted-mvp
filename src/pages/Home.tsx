home 21/8/2025: import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Play, Users, Eye, Award, Calendar, Star } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-purple-50 py-16 px-6 text-center">
        <p className="text-sm font-semibold text-yellow-600 mb-2">Wine Spectator Top 100 Winemaker</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-gray-900">
          Learn wine from the winemaker behind <br />
          10 years of Wine Spectator Top 100
        </h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6">
          <span className="font-medium text-gray-800">Taste, talk, and think like a winemaker</span> — without the pretension.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/courses" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl shadow">
            Start Free Learning
          </Link>
          <Link to="/wine-game" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-xl shadow">
            Wine Games & Content
          </Link>
          <Link to="/community" className="border border-gray-400 text-gray-700 hover:bg-gray-100 font-semibold py-2 px-6 rounded-xl">
            Join Community
          </Link>
        </div>
        <div className="mt-6 flex justify-center gap-6 text-sm text-gray-500">
          <p>🥂 2,500+ Happy Students</p>
          <p>🏆 10 Years Top 100</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Experience Wine Learning Like Never Before</h2>
        <p className="text-gray-600 mb-10">Interactive, engaging, and designed for real wine lovers</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          <div className="bg-white shadow-md rounded-xl p-6 text-left">
            <BookOpen className="text-pink-600 mb-2" />
            <h3 className="font-bold mb-1">Weekly Wine Shorts</h3>
            <p className="text-sm text-gray-600">Bite-sized wine education videos perfect for busy schedules</p>
            <Link to="/shorts" className="text-indigo-600 text-sm mt-2 inline-block">Watch Latest →</Link>
          </div>
          <div className="bg-white shadow-md rounded-xl p-6 text-left">
            <Eye className="text-purple-600 mb-2" />
            <h3 className="font-bold mb-1">Swirdle Daily</h3>
            <p className="text-sm text-gray-600">Daily wine word game that builds your vocabulary</p>
            <Link to="/swirdle" className="text-indigo-600 text-sm mt-2 inline-block">Play Today →</Link>
          </div>
          <div className="bg-white shadow-md rounded-xl p-6 text-left">
            <Calendar className="text-orange-500 mb-2" />
            <h3 className="font-bold mb-1">Blind Tasting Challenges</h3>
            <p className="text-sm text-gray-600">Test your palate with weekly blind tasting sessions</p>
            <Link to="/guess-what" className="text-indigo-600 text-sm mt-2 inline-block">Join Session →</Link>
          </div>
          <div className="bg-white shadow-md rounded-xl p-6 text-left">
            <Users className="text-green-600 mb-2" />
            <h3 className="font-bold mb-1">Wine Community</h3>
            <p className="text-sm text-gray-600">Connect with fellow wine enthusiasts worldwide</p>
            <Link to="/community" className="text-indigo-600 text-sm mt-2 inline-block">Join Discussion →</Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-white py-16 px-6 text-center">
        <h2 className="text-2xl font-bold mb-10 text-gray-800">Trusted by wine lovers worldwide</h2>
        <div className="flex flex-wrap justify-center gap-10">
          <div>
            <Star className="mx-auto text-yellow-500 mb-2" size={32} />
            <p className="font-semibold">30+ years</p>
            <p className="text-sm text-gray-500">Winemaking experience</p>
          </div>
          <div>
            <Award className="mx-auto text-purple-600 mb-2" size={32} />
            <p className="font-semibold">Wine Spectator Top 100</p>
            <p className="text-sm text-gray-500">10 years in a row</p>
          </div>
          <div>
            <Users className="mx-auto text-blue-600 mb-2" size={32} />
            <p className="font-semibold">Certified Wine Judge</p>
            <p className="text-sm text-gray-500">International competitions</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-16 px-6 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">This is wine education for real people.</h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-10">
          Not stuffy. Not snobby. Just brilliant wine, great stories, and a winemaker who wants to take you along for the ride.
        </p>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3 max-w-6xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <p className="italic mb-4">"Matt’s approach transformed how I understand wine. The blind tastings are addictive!"</p>
            <p className="text-sm font-medium">Sarah Chen ⭐ Premium Member</p>
            <p className="text-xs text-gray-500">Completed 15 courses</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <p className="italic mb-4">"Weekly wine shorts are perfect for my schedule. Learning so much in just 10 minutes!"</p>
            <p className="text-sm font-medium">James Rodriguez 🟣 Basic Member</p>
            <p className="text-xs text-gray-500">45-day learning streak</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <p className="italic mb-4">"Started with the free guide and now I’m hooked. The community is so welcoming!"</p>
            <p className="text-sm font-medium">Emma Thompson ⚪ Free Member</p>
            <p className="text-xs text-gray-500">Downloaded wine guide</p>
          </div>
        </div>
        <div className="mt-10">
          <Link to="/signup" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow">
            🍷 Join Matt Decanted Today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
