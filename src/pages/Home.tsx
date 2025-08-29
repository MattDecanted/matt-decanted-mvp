// src/pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation as useTrans } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import {
  Play,
  Users,
  Trophy,
  Star,
  ArrowRight,
  Wine,
  BookOpen,
  Video,
  Brain,
  Calendar,
  CheckCircle,
  Quote,
  Crown,
  Sparkles,
  Target,
  Globe,
  Award,
  Download,
} from 'lucide-react';

// Safe i18n fallback so page works even if i18n isn't initialized yet.
function useTranslation() {
  try {
    return useTrans();
  } catch {
    return {
      t: (k: string, def?: any) =>
        typeof def === 'string' ? def : def?.defaultValue ?? k,
    } as { t: (k: string, def?: any) => string };
  }
}

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Premium Member',
      tier: 'premium',
      avatar:
        'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
      quote: t(
        'home.testimonials.sarah.quote',
        "Matt's approach transformed how I understand wine. The blind tastings are addictive!"
      ),
      achievement: 'Completed 15 courses',
    },
    {
      name: 'James Rodriguez',
      role: 'Basic Member',
      tier: 'basic',
      avatar:
        'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
      quote: t(
        'home.testimonials.james.quote',
        'Weekly wine shorts are perfect for my schedule. Learning so much in just 10 minutes!'
      ),
      achievement: '45-day learning streak',
    },
    {
      name: 'Emma Thompson',
      role: 'Free Member',
      tier: 'free',
      avatar:
        'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
      quote: t(
        'home.testimonials.emma.quote',
        "Started with the free guide and now I'm hooked. The community is so welcoming!"
      ),
      achievement: 'Downloaded wine guide',
    },
  ];

  // NOTE: routes mapped to existing pages so there are no 404s
  const features = [
    {
      icon: <Video className="w-8 h-8 text-red-600" />,
      title: t('home.features.shorts.title', 'Weekly Wine Shorts'),
      description: t(
        'home.features.shorts.description',
        'Bite-sized wine education videos perfect for busy schedules'
      ),
      cta: t('home.features.shorts.cta', 'Watch Latest'),
      route: '/shorts', // was /courses
    },
    {
      icon: <Brain className="w-8 h-8 text-purple-600" />,
      title: t('home.features.swirdle.title', 'Swirdle Daily'),
      description: t(
        'home.features.swirdle.description',
        'Daily wine word game that builds your vocabulary'
      ),
      cta: t('home.features.swirdle.cta', 'Play Today'),
      route: '/swirdle',
      badge: t('home.features.swirdle.badge', 'Members Only'),
    },
    {
      icon: <Target className="w-8 h-8 text-amber-600" />,
      title: t('home.features.blindTasting.title', 'Blind Tasting Challenges'),
      description: t(
        'home.features.blindTasting.description',
        'Test your palate with weekly blind tasting sessions'
      ),
      cta: t('home.features.blindTasting.cta', 'Join Session'),
      route: '/play', // was /content
    },
    {
      icon: <Users className="w-8 h-8 text-green-600" />,
      title: t('home.features.community.title', 'Wine Community'),
      description: t(
        'home.features.community.description',
        'Connect with fellow wine enthusiasts worldwide'
      ),
      cta: t('home.features.community.cta', 'Join Discussion'),
      route: '/blog', // was /community
    },
  ];

  return (
    <main>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-amber-50 via-white to-purple-50 py-20 overflow-hidden bg-dotted-pattern">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-6">
                <Trophy className="w-4 h-4 mr-2" />
                {t(
                  'home.hero.badge',
                  'Wine Spectator Top 100 Winemaker'
                )}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                {t(
                  'home.hero.headline',
                  'Learn wine from the winemaker behind 10 years of Wine Spectator Top 100'
                )}
              </h1>

              <p className="text-xl text-gray-700 mb-8 max-w-2xl">
                {t(
                  'home.hero.subheadline',
                  'Taste, talk, and think like a winemaker — without the pretension.'
                )}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                {!user ? (
                  <>
                    <Link
                      to="/activate" // was /signup
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      {t('home.hero.cta.startLearning', 'Start Free Learning')}
                    </Link>
                    <Link
                      to="/play" // was /content
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                    >
                      <Target className="w-5 h-5 mr-2" />
                      Wine Games & Content
                    </Link>
                    <Link
                      to="/blog" // was /community
                      className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                    >
                      <Users className="w-5 h-5 mr-2" />
                      {t('home.hero.cta.joinCommunity', 'Join Community')}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/dashboard"
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                    >
                      <ArrowRight className="w-5 h-5 mr-2" />
                      {t('home.hero.cta.continueLearning', 'Continue Learning')}
                    </Link>

                    <Link
                      to="/blog/wine-vocabulary-quiz"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                    >
                      <Brain className="w-5 h-5 mr-2" />
                      Test Your Wine Vocab
                    </Link>

                    <Link
                      to="/wine-options/multiplayer"
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                    >
                      <Target className="w-5 h-5 mr-2" />
                      Try Wine Options
                    </Link>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center lg:justify-start space-x-8 text-sm text-gray-600">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-amber-500 mr-1" />
                  <span>2,500+ {t('home.hero.stats.students', 'Happy Students')}</span>
                </div>
                <div className="flex items-center">
                  <Trophy className="w-4 h-4 text-amber-500 mr-1" />
                  <span>10 Years Top 100</span>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-full max-w-md h-80 bg-gradient-to-br from-purple-100 to-amber-100 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden">
                  <div className="text-center p-8">
                    <Wine className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">
                      {t("home.hero.videoPlaceholder", "Watch Matt's Introduction")}
                    </p>
                  </div>
                </div>
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-white rounded-full p-3 shadow-lg">
                  <Play className="w-6 h-6 text-blue-600" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white rounded-full p-3 shadow-lg">
                  <Trophy className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Preview Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('home.preview.title', 'Experience Wine Learning Like Never Before')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('home.preview.subtitle', 'Interactive, engaging, and designed for real wine lovers')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gray-50 group-hover:bg-blue-50 rounded-lg p-3 transition-colors">
                    {feature.icon}
                  </div>
                  {feature.badge && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                      {feature.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>

                <p className="text-gray-600 mb-4 text-sm">{feature.description}</p>

                <Link
                  to={feature.route}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm group-hover:translate-x-1 transition-transform"
                >
                  {feature.cta}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credibility Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('home.credibility.title', 'Trusted by wine lovers worldwide')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {t('home.credibility.experience', '30+ years')}
              </h3>
              <p className="text-gray-600">
                {t('home.credibility.experienceDesc', 'Winemaking experience')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {t('home.credibility.recognition', 'Wine Spectator Top 100')}
              </h3>
              <p className="text-gray-600">{t('home.credibility.recognitionDesc', '10 years in a row')}</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {t('home.credibility.expertise', 'Certified Wine Judge')}
              </h3>
              <p className="text-gray-600">
                {t('home.credibility.expertiseDesc', 'International competitions')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community & Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('home.community.title', 'This is wine education for real people.')}
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              {t(
                'home.community.description',
                'Not stuffy. Not snobby. Just brilliant wine, great stories, and a winemaker who wants to take you along for the ride.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 relative">
                <Quote className="w-8 h-8 text-gray-300 mb-4" />
                <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="flex items-center">
                      <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                      {testimonial.tier === 'premium' && (
                        <Crown className="w-4 h-4 text-purple-600 ml-2" />
                      )}
                      {testimonial.tier === 'basic' && (
                        <Star className="w-4 h-4 text-amber-600 ml-2" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                    <p className="text-xs text-gray-500">{testimonial.achievement}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/blog"
              className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              <Users className="w-5 h-5 mr-2" />
              {t('home.community.cta.join', 'Join Matt Decanted Today')}
            </Link>
          </div>
        </div>
      </section>

      {/* Daily Engagement Hook - Swirdle */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                {t('home.swirdle.badge', 'Daily Challenge')}
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                {t('home.swirdle.title', 'Swirdle: The Daily Wine Word Game')}
              </h2>

              <p className="text-xl text-purple-100 mb-6">
                {t(
                  'home.swirdle.description',
                  'Challenge your wine vocabulary with our daily word puzzle. Guess the wine term in 6 tries!'
                )}
              </p>

              <div className="flex items-center space-x-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold">2,847</div>
                  <div className="text-purple-200 text-sm">Players Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">89%</div>
                  <div className="text-purple-200 text-sm">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">156</div>
                  <div className="text-purple-200 text-sm">Day Streak Record</div>
                </div>
              </div>

              {user ? (
                <Link
                  to="/swirdle"
                  className="inline-flex items-center bg-white text-purple-600 hover:bg-gray-100 font-semibold py-3 px-6 rounded-lg shadow-lg transition-all"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  {t("home.swirdle.cta.play", "Play Today's Swirdle")}
                </Link>
              ) : (
                <Link
                  to="/activate"
                  className="inline-flex items-center bg-white text-purple-600 hover:bg-gray-100 font-semibold py-3 px-6 rounded-lg shadow-lg transition-all"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  {t('home.swirdle.cta.join', 'Join to Play Swirdle')}
                </Link>
              )}
            </div>

            {/* Swirdle Preview */}
            <div className="flex justify-center">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Today's Swirdle</h3>
                  <p className="text-sm text-gray-600">Guess the wine term!</p>
                </div>

                {/* Mock Swirdle Grid */}
                <div className="space-y-2 mb-6">
                  {[
                    ['T', 'E', 'R', 'R', 'O', 'I', 'R'],
                    ['', '', '', '', '', '', ''],
                    ['', '', '', '', '', '', ''],
                    ['', '', '', '', '', '', ''],
                    ['', '', '', '', '', '', ''],
                    ['', '', '', '', '', '', ''],
                  ].map((row, rowIndex) => (
                    <div key={rowIndex} className="flex space-x-1 justify-center">
                      {row.map((letter, colIndex) => (
                        <div
                          key={colIndex}
                          className={`w-8 h-8 border-2 rounded flex items-center justify-center text-sm font-bold ${
                            rowIndex === 0 && letter
                              ? 'border-green-500 bg-green-100 text-green-800'
                              : 'border-gray-300 bg-gray-50'
                          }`}
                        >
                          {letter}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-2">Members Only Feature</div>
                  <div className="flex items-center justify-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Solved in 1 try!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Paths (pricing-like) */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('home.learning.title', 'Choose Your Wine Learning Journey')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('home.learning.subtitle', 'From casual sipping to sommelier skills')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Path */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-gray-300 transition-all">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t('home.learning.free.title', 'Discover & Taste')}
                </h3>
                <p className="text-gray-600">
                  {t('home.learning.free.description', 'Perfect for wine beginners')}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  {t('home.learning.free.feature1', 'Free wine tasting guide')}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  {t('home.learning.free.feature2', 'Community access')}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  {t('home.learning.free.feature3', 'Monthly wine tips')}
                </li>
              </ul>

              <Link
                to="/blog/wine-tasting-guide" // was /lead-magnet
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors block text-center"
              >
                {t('home.learning.free.cta', 'Get Free Guide')}
              </Link>
            </div>

            {/* Basic Path */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-blue-500 transform scale-105 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  {t('home.learning.popular', 'Most Popular')}
                </span>
              </div>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t('home.learning.basic.title', 'Weekly Wine Shorts')}
                </h3>
                <p className="text-gray-600">
                  {t('home.learning.basic.description', 'Regular wine education content')}
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-blue-600">$4.99</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  {t('home.learning.basic.feature1', 'Weekly premium videos')}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  {t('home.learning.basic.feature2', 'Swirdle daily game')}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  {t('home.learning.basic.feature3', 'Downloadable guides')}
                </li>
              </ul>

              <Link
                to="/pricing"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors block text-center"
              >
                {t('home.learning.basic.cta', 'Start Free Trial')}
              </Link>
            </div>

            {/* Premium Path */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-purple-300 transition-all">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t('home.learning.premium.title', 'All Access Cellar Door')}
                </h3>
                <p className="text-gray-600">
                  {t('home.learning.premium.description', 'Complete wine education experience')}
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-purple-600">$59</span>
                  <span className="text-gray-600"> one-time</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  {t('home.learning.premium.feature1', 'All courses & masterclasses')}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  {t('home.learning.premium.feature2', 'Live Q&A with Matt')}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  {t('home.learning.premium.feature3', 'Blind tasting sessions')}
                </li>
              </ul>

              <Link
                to="/pricing"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors block text-center"
              >
                {t('home.learning.premium.cta', 'Get Full Access')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-amber-600 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              {t('home.finalCta.title', 'Ready to Transform Your Wine Knowledge?')}
            </h2>

            <p className="text-xl text-amber-100 mb-8">
              {t(
                'home.finalCta.subtitle',
                'Join thousands of wine lovers who have discovered the joy of authentic wine education'
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <>
                  <Link
                    to="/activate" // was /signup
                    className="bg-white text-amber-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                  >
                    <Star className="w-5 h-5 mr-2" />
                    {t('home.finalCta.primary', 'Start Your Journey')}
                  </Link>
                  <Link
                    to="/blog/wine-tasting-guide" // was /lead-magnet
                    className="border-2 border-white text-white hover:bg-white hover:text-amber-600 font-semibold py-4 px-8 rounded-lg transition-all flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    {t('home.finalCta.secondary', 'Get Free Wine Guide')}
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard"
                  className="bg-white text-amber-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  {t('home.finalCta.dashboard', 'Continue Your Journey')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky CTA for non-users */}
      {!user && (
        <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 shadow-lg z-40 transform transition-transform">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Wine className="w-6 h-6 mr-3" />
                <div>
                  <p className="font-semibold">
                    {t('home.stickyCtaTitle', 'Start Learning Wine Today')}
                  </p>
                  <p className="text-blue-100 text-sm">
                    {t(
                      'home.stickyCtaSubtitle',
                      'Join 2,500+ students learning authentic wine education'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  to="/blog/wine-tasting-guide" // was /lead-magnet
                  className="bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  {t('home.stickyCtaFree', 'Free Guide')}
                </Link>
                <Link
                  to="/activate" // was /signup
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  {t('home.stickyCtaJoin', 'Join Free')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
