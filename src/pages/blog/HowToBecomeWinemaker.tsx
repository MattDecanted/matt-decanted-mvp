import React from 'react';
import SEOHead from '../../components/SEO/SEOHead';
import { useTranslation } from 'react-i18next';
import { GraduationCap, MapPin, Clock, DollarSign, TrendingUp, CheckCircle, ArrowRight, BookOpen } from 'lucide-react';

const HowToBecomeWinemaker: React.FC = () => {
  const { t } = useTranslation();

  const careerSteps = [
    {
      step: 1,
      title: "Get Wine Education & Certification",
      description: "Start with formal wine education through programs like WSET, Court of Master Sommeliers, or university viticulture degrees.",
      timeframe: "6 months - 4 years",
      cost: "$500 - $50,000"
    },
    {
      step: 2,
      title: "Gain Hands-On Experience",
      description: "Work harvest seasons at wineries, volunteer at local vineyards, or intern with established winemakers.",
      timeframe: "1-3 years",
      cost: "Often paid positions"
    },
    {
      step: 3,
      title: "Develop Technical Skills",
      description: "Learn laboratory analysis, fermentation management, blending techniques, and quality control processes.",
      timeframe: "2-5 years",
      cost: "Part of employment"
    },
    {
      step: 4,
      title: "Build Industry Network",
      description: "Attend wine events, join professional associations, and connect with other wine professionals.",
      timeframe: "Ongoing",
      cost: "$1,000-5,000/year"
    },
    {
      step: 5,
      title: "Specialize & Advance",
      description: "Choose your specialty (red wines, sparkling, organic, etc.) and work toward head winemaker positions.",
      timeframe: "5-10 years",
      cost: "Investment in expertise"
    }
  ];

  const topWinemakingSchools = [
    {
      name: "UC Davis - Viticulture & Enology",
      location: "California, USA",
      program: "Bachelor's & Master's in Viticulture and Enology",
      reputation: "World-renowned program with extensive research facilities"
    },
    {
      name: "Cornell University",
      location: "New York, USA", 
      program: "Enology & Viticulture Program",
      reputation: "Strong focus on cool-climate winemaking"
    },
    {
      name: "Adelaide University",
      location: "South Australia",
      program: "Bachelor of Viticulture and Oenology",
      reputation: "Leading Australian wine education institution"
    },
    {
      name: "Bordeaux Sciences Agro",
      location: "Bordeaux, France",
      program: "Master in Vine and Wine Sciences",
      reputation: "Traditional French winemaking education"
    }
  ];

  const salaryRanges = [
    { position: "Assistant Winemaker", range: "$35,000 - $55,000", experience: "Entry Level" },
    { position: "Winemaker", range: "$55,000 - $85,000", experience: "3-7 years" },
    { position: "Head Winemaker", range: "$75,000 - $150,000", experience: "7-15 years" },
    { position: "Consulting Winemaker", range: "$100,000 - $300,000+", experience: "15+ years" }
  ];

  return (
    <>
      <SEOHead
        title="How to Become a Winemaker: Complete Career Guide 2025"
        description="Learn how to become a professional winemaker with our comprehensive guide covering education, experience, skills, and career paths. Discover the best winemaking schools and salary expectations."
        keywords="how to become a winemaker, winemaker career, viticulture education, enology degree, winemaking schools, wine career guide"
        ogType="article"
        articleData={{
          publishedTime: new Date().toISOString(),
          author: "Matt Decanted",
          section: "Wine Careers",
          tags: ["Career Guide", "Winemaking", "Education", "Wine Industry"]
        }}
      />

      <div className="min-h-screen py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How to Become a Winemaker: Complete Career Guide 2025
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
              Discover the path to becoming a professional winemaker, from education and training 
              to building a successful career in the wine industry.
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span>12 min read</span>
              </div>
              <div className="flex items-center">
                <GraduationCap className="w-4 h-4 mr-1" />
                <span>Career Guide</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>Updated 2025</span>
              </div>
            </div>
          </header>

          {/* Introduction */}
          <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              What Does a Winemaker Do?
            </h2>
            <p className="text-gray-600 mb-4">
              A winemaker is responsible for overseeing the entire wine production process, from grape 
              selection and harvest to fermentation, aging, and bottling. Modern winemakers combine 
              traditional techniques with scientific knowledge to create wines that express both 
              terroir and personal style.
            </p>
            <p className="text-gray-600 mb-6">
              The role requires a deep understanding of viticulture (grape growing), enology (wine science), 
              business management, and often involves long hours during harvest season and constant 
              attention to detail throughout the year.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <GraduationCap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-800">Education Required</h3>
                <p className="text-blue-700 text-sm">Formal wine education or degree preferred</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-800">Time to Master</h3>
                <p className="text-green-700 text-sm">5-10 years of experience typically needed</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <DollarSign className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <h3 className="font-semibold text-amber-800">Salary Range</h3>
                <p className="text-amber-700 text-sm">$35K - $300K+ depending on experience</p>
              </div>
            </div>
          </section>

          {/* Career Steps */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              5 Steps to Becoming a Professional Winemaker
            </h2>
            
            <div className="space-y-6">
              {careerSteps.map((step) => (
                <div key={step.step} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-start">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-4 mt-1">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-gray-600 mb-3">
                        {step.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{step.timeframe}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          <span>{step.cost}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Top Winemaking Schools */}
          <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Best Winemaking Schools in the World
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {topWinemakingSchools.map((school, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{school.name}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{school.location}</span>
                    </div>
                  </div>
                  <p className="text-blue-600 font-medium text-sm mb-2">{school.program}</p>
                  <p className="text-gray-600 text-sm">{school.reputation}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Salary Expectations */}
          <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Winemaker Salary Expectations (2025)
            </h2>
            
            <div className="space-y-4">
              {salaryRanges.map((role, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900">{role.position}</h3>
                    <p className="text-sm text-gray-500">{role.experience}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{role.range}</p>
                    <p className="text-xs text-gray-500">Annual salary</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> Salaries vary significantly based on location, winery size, 
                reputation, and wine quality. Top winemakers at prestigious wineries can earn 
                significantly more through bonuses and profit sharing.
              </p>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg shadow-lg p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">
              Start Your Wine Career Journey Today
            </h2>
            <p className="text-amber-100 mb-6 max-w-2xl mx-auto">
              Whether you're just starting out or looking to advance your wine career, 
              Matt Decanted's courses provide the foundation you need to succeed in the wine industry.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-amber-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Explore Wine Education
              </button>
              <button className="border border-white text-white hover:bg-amber-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center">
                <ArrowRight className="w-5 h-5 mr-2" />
                Download Career Guide
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default HowToBecomeWinemaker;
