import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Users, Star, ShieldCheck, Video, Gamepad, Eye, Globe, Wine, BookOpen, UsersRound, CheckCircle, Lock, PlayCircle } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* HERO SECTION */}
      <section className="text-center px-6 py-12 bg-gradient-to-r from-white to-purple-50">
        <div className="max-w-5xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-4">
            <Star size={14} /> Wine Spectator Top 100 Winemaker
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 mb-4">
            Learn wine from the winemaker behind 10 years of Wine Spectator Top 100
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            <span className="font-medium">Taste, talk, and think like a winemaker</span> — without the pretension.
          </p>
          <div className="flex justify-center flex-wrap gap-4">
            <Link to="/subscribe" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow">
              Start Free Learning
            </Link>
            <Link to="/courses" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow">
              Wine Games & Content
            </Link>
            <Link to="/community" className="px-6 py-3 border-2 border-indigo-600 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50">
              Join Community
            </Link>
          </div>
          <div className="mt-6 text-sm text-gray-500 flex justify-center gap-6">
            <span><Users size={14} className="inline" /> 2,500+ Happy Students</span>
            <span><Sparkles size={14} className="inline" /> 10 Years Top 100</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Experience Wine Learning Like Never Before</h2>
          <p className="text-gray-600 mb-10">Interactive, engaging, and designed for real wine lovers</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="border rounded-xl p-6 shadow">
              <BookOpen className="text-indigo-600 mb-2" size={28} />
              <h3 className="font-semibold mb-1">Weekly Wine Shorts</h3>
              <p className="text-sm text-gray-500 mb-2">Bite-sized video lessons</p>
              <Link to="/courses" className="text-indigo-600 text-sm">Watch Latest →</Link>
            </div>
            <div className="border rounded-xl p-6 shadow">
              <Gamepad className="text-purple-600 mb-2" size={28} />
              <h3 className="font-semibold mb-1">Swirdle Daily</h3>
              <p className="text-sm text-gray-500 mb-2">The daily word game for wine lovers</p>
              <Link to="/swirdle" className="text-purple-600 text-sm">Play Today →</Link>
            </div>
            <div className="border rounded-xl p-6 shadow">
              <Eye className="text-orange-500 mb-2" size={28} />
              <h3 className="font-semibold mb-1">Blind Tasting Challenges</h3>
              <p className="text-sm text-gray-500 mb-2">Refine your palate weekly</p>
              <Link to="/guess-what" className="text-orange-500 text-sm">Join Session →</Link>
            </div>
            <div className="border rounded-xl p-6 shadow">
              <UsersRound className="text-green-600 mb-2" size={28} />
              <h3 className="font-semibold mb-1">Wine Community</h3>
              <p className="text-sm text-gray-500 mb-2">Meet fellow wine lovers</p>
              <Link to="/community" className="text-green-600 text-sm">Join Discussion →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST + TESTIMONIAL */}
      <section className="bg-gray-50 py-16 px-6 text-center">
        <div className="max-w-5xl mx-auto mb-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-8">Trusted by wine lovers worldwide</h2>
          <div className="flex flex-wrap justify-center gap-12">
            <div>
              <Trophy className="text-amber-600 mx-auto mb-1" />
              <p className="font-semibold">30+ years</p>
              <p className="text-sm text-gray-500">Winemaking experience</p>
            </div>
            <div>
              <ShieldCheck className="text-purple-600 mx-auto mb-1" />
              <p className="font-semibold">Wine Spectator Top 100</p>
              <p className="text-sm text-gray-500">10 years in a row</p>
            </div>
            <div>
              <Globe className="text-blue-600 mx-auto mb-1" />
              <p className="font-semibold">Certified Wine Judge</p>
              <p className="text-sm text-gray-500">International competitions</p>
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">This is wine education for real people.</h2>
        <p className="text-gray-600 mb-6 max-w-xl mx-auto">
          Not stuffy. Not snobby. Just brilliant wine, great stories, and a winemaker who wants to take you along for the ride.
        </p>
        <div className="flex justify-center gap-6 text-left text-sm">
          {/* Repeatable card for testimonial */}
          <div className="bg-white rounded-xl p-4 shadow w-64">
            <p className="mb-2 italic">“Matt’s approach transformed how I understand wine. The blind tastings are addictive!”</p>
            <p className="font-semibold">Sarah Chen <span className="text-xs text-purple-500">Premium Member</span></p>
            <p className="text-xs text-gray-400">Completed 15 courses</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow w-64">
            <p className="mb-2 italic">“Weekly wine shorts are perfect for my schedule.”</p>
            <p className="font-semibold">James Rodriguez <span className="text-xs text-yellow-500">Basic Member</span></p>
            <p className="text-xs text-gray-400">45-day learning streak</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow w-64">
            <p className="mb-2 italic">“Started with the free guide. Now I’m hooked.”</p>
            <p className="font-semibold">Emma Thompson <span className="text-xs text-green-500">Free Member</span></p>
            <p className="text-xs text-gray-400">Downloaded wine guide</p>
          </div>
        </div>
        <div className="mt-6">
          <Link to="/subscribe" className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow">
            Join Matt Decanted Today
          </Link>
        </div>
      </section>

      {/* PRICING / CTA */}
      <section className="py-20 bg-gray-100 px-6 text-center">
        <h2 className="text-3xl font-bold mb-3">Choose Your Wine Learning Journey</h2>
        <p className="text-gray-600 mb-10">From casual sipping to sommelier skills</p>
        {/* Add pricing card components here */}
        {/* ... will add after confirmation ... */}
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white text-sm px-6 py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-2">Matt Decanted</h3>
            <p className="text-gray-400">footer.tagline</p>
            <div className="flex gap-4 mt-3">
              <a href="#"><i className="fa-brands fa-instagram"></i></a>
              <a href="#"><i className="fa-brands fa-facebook"></i></a>
              <a href="#"><i className="fa-brands fa-youtube"></i></a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Quick Links</h4>
            <ul className="text-gray-400">
              <li><Link to="/courses">Courses</Link></li>
              <li><Link to="/about">About Matt</Link></li>
              <li><Link to="/free-guide">Free Wine Guide</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Community</h4>
            <ul className="text-gray-400">
              <li><Link to="/guess-what">Blind Tasting Sessions</Link></li>
              <li><Link to="/swirdle">Wineback Wednesday</Link></li>
              <li><Link to="/community">Discussion Forum</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
