
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEOHead from '../../components/SEO/SEOHead';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Calendar, Clock, ArrowRight, BookOpen, Brain, GraduationCap, Trophy, Wine } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  category: string;
  readTime: string;
  publishDate: string;
  featured: boolean;
  tags: string[];
}

const BlogIndex: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Posts', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'wine-education', name: 'Wine Education', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'wine-careers', name: 'Wine Careers', icon: <Trophy className="w-4 h-4" /> },
    { id: 'tasting-tips', name: 'Tasting Tips', icon: <Wine className="w-4 h-4" /> },
    { id: 'games-quizzes', name: 'Games & Quizzes', icon: <Brain className="w-4 h-4" /> },
    { id: 'wset-study', name: 'WSET Study Help', icon: <BookOpen className="w-4 h-4" /> }
  ];

  const blogPosts: BlogPost[] = [
    {
      id: '1',
      title: 'WSET Level 2 Sample Questions & Practice Test',
      excerpt: 'Practice WSET Level 2 exam questions with detailed explanations covering wine regions, grape varieties, and tasting techniques.',
      slug: 'wset-level-2-sample-questions',
      category: 'wset-study',
      readTime: '15 min',
      publishDate: '2025-01-15',
      featured: true,
      tags: ['WSET', 'Certification', 'Practice Questions']
    },
    {
      id: '2',
      title: 'How to Become a Winemaker: Complete Career Guide 2025',
      excerpt: 'Discover the path to becoming a professional winemaker, from education and training to building a successful wine career.',
      slug: 'how-to-become-winemaker',
      category: 'wine-careers',
      readTime: '12 min',
      publishDate: '2025-01-14',
      featured: true,
      tags: ['Career', 'Winemaking', 'Education']
    },
    {
      id: '3',
      title: 'How to Taste Wine Like a Pro: Complete Guide',
      excerpt: 'Master professional wine tasting techniques with this comprehensive guide covering the systematic approach used by sommeliers.',
      slug: 'wine-tasting-guide',
      category: 'tasting-tips',
      readTime: '10 min',
      publishDate: '2025-01-13',
      featured: true,
      tags: ['Tasting', 'Sommelier', 'Techniques']
    },
    {
      id: '4',
      title: 'Interactive Wine Vocabulary Quiz',
      excerpt: 'Test your wine vocabulary with this interactive quiz covering essential wine terms from basic to advanced levels.',
      slug: 'wine-vocabulary-quiz',
      category: 'games-quizzes',
      readTime: '8 min',
      publishDate: '2025-01-12',
      featured: false,
      tags: ['Quiz', 'Vocabulary', 'Interactive']
    },
    {
      id: '5',
      title: 'WSET Level 3 Tasting Vocabulary & Descriptors',
      excerpt: 'Master advanced wine tasting vocabulary for WSET Level 3 with comprehensive descriptor lists and tasting techniques.',
      slug: 'wset-level-3-tasting-vocabulary',
      category: 'wset-study',
      readTime: '18 min',
      publishDate: '2025-01-11',
      featured: false,
      tags: ['WSET Level 3', 'Vocabulary', 'Advanced']
    },
    {
      id: '6',
      title: 'Best Wines in the World: 2025 Ultimate List',
      excerpt: 'Discover the world\'s finest wines across all categories, from legendary Bordeaux to emerging regions making exceptional wines.',
      slug: 'best-wines-world-2025',
      category: 'wine-education',
      readTime: '20 min',
      publishDate: '2025-01-10',
      featured: false,
      tags: ['Wine List', 'Premium Wines', '2025']
    }
  ];

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const featuredPosts = blogPosts.filter(post => post.featured);

  return (
    <>
      <SEOHead
        title="Wine Education Blog - Learn Wine with Matt Decanted"
        description="Explore comprehensive wine education articles, WSET study guides, career advice, and interactive quizzes. Learn wine tasting, terminology, and industry insights with expert guidance."
        keywords="wine education blog, wine learning, WSET study guide, wine career advice, wine tasting tips, sommelier training"
        ogType="website"
      />

      <div className="min-h-screen py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Wine Education Blog
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive guides, study materials, and expert insights to advance your wine knowledge
            </p>
          </header>

          {/* Featured Posts */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                        Featured
                      </span>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Search and Filter */}
          <section className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.icon}
                    <span className="ml-2">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* All Posts */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              All Articles ({filteredPosts.length})
            </h2>
            
            <div className="space-y-6">
              {filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="block bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          post.category === 'wine-education' ? 'bg-blue-100 text-blue-800' :
                          post.category === 'wine-careers' ? 'bg-green-100 text-green-800' :
                          post.category === 'tasting-tips' ? 'bg-purple-100 text-purple-800' :
                          post.category === 'games-quizzes' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {categories.find(c => c.id === post.category)?.name || post.category}
                        </span>
                        {post.featured && (
                          <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                            Featured
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {post.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-3">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        {post.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <ArrowRight className="w-5 h-5 text-blue-600 ml-4 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No articles found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search terms or category filter
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default BlogIndex;
