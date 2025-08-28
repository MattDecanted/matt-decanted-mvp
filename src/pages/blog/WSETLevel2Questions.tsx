import React from 'react';
import SEOHead from '../../components/SEO/SEOHead';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle, Clock, Star, Download, ArrowRight } from 'lucide-react';

const WSETLevel2Questions: React.FC = () => {
  const { t } = useTranslation();

  const sampleQuestions = [
    {
      id: 1,
      question: "Which grape variety is primarily used in the production of Burgundy red wines?",
      options: ["Pinot Noir", "Cabernet Sauvignon", "Merlot", "Syrah"],
      correct: "Pinot Noir",
      explanation: "Pinot Noir is the exclusive red grape variety used in Burgundy, France, producing some of the world's most prestigious wines."
    },
    {
      id: 2,
      question: "What is the ideal serving temperature for most red wines?",
      options: ["8-10°C (46-50°F)", "12-14°C (54-57°F)", "16-18°C (61-64°F)", "20-22°C (68-72°F)"],
      correct: "16-18°C (61-64°F)",
      explanation: "Most red wines are best served slightly below room temperature to enhance their flavor profile and reduce alcohol heat."
    },
    {
      id: 3,
      question: "Which region is famous for producing Champagne?",
      options: ["Burgundy", "Bordeaux", "Champagne", "Loire Valley"],
      correct: "Champagne",
      explanation: "Champagne can only be produced in the Champagne region of France using specific grape varieties and production methods."
    }
  ];

  const studyTips = [
    "Focus on major wine regions and their signature grape varieties",
    "Practice identifying wine styles and production methods",
    "Learn proper wine service temperatures and techniques",
    "Understand wine and food pairing principles",
    "Study wine faults and how to identify them",
    "Practice systematic tasting approach (SAT)"
  ];

  return (
    <>
      <SEOHead
        title="WSET Level 2 Sample Questions & Practice Test - Wine Education"
        description="Practice WSET Level 2 exam questions with detailed explanations. Free sample questions covering wine regions, grape varieties, and tasting techniques. Prepare for your WSET certification with Matt Decanted."
        keywords="WSET Level 2, wine certification, sample questions, practice test, wine education, sommelier training, wine exam prep"
        ogType="article"
        articleData={{
          publishedTime: new Date().toISOString(),
          author: "Matt Decanted",
          section: "Wine Education",
          tags: ["WSET", "Wine Certification", "Education", "Practice Questions"]
        }}
      />

      <div className="min-h-screen py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              WSET Level 2 Sample Questions & Practice Test
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
              Prepare for your WSET Level 2 Award in Wines certification with these practice questions 
              covering wine regions, grape varieties, and tasting techniques.
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span>15 min read</span>
              </div>
              <div className="flex items-center">
                <BookOpen className="w-4 h-4 mr-1" />
                <span>WSET Level 2</span>
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1" />
                <span>Practice Questions</span>
              </div>
            </div>
          </header>

          {/* Introduction */}
          <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              About the WSET Level 2 Award in Wines
            </h2>
            <p className="text-gray-600 mb-4">
              The WSET Level 2 Award in Wines is an intermediate-level qualification for wine professionals 
              and enthusiasts. This certification covers wine production, major wine regions, grape varieties, 
              and systematic wine tasting.
            </p>
            <p className="text-gray-600 mb-6">
              The exam consists of 50 multiple-choice questions and must be completed within 60 minutes. 
              A score of 55% or higher is required to pass.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-800 mb-2">💡 Study Tip</h3>
              <p className="text-amber-700 text-sm">
                Practice with sample questions regularly and focus on understanding the reasoning behind 
                each answer rather than memorizing facts.
              </p>
            </div>
          </section>

          {/* Sample Questions */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              WSET Level 2 Practice Questions
            </h2>
            
            <div className="space-y-6">
              {sampleQuestions.map((q, index) => (
                <div key={q.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-start mb-4">
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full mr-4 mt-1">
                      Question {index + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">
                      {q.question}
                    </h3>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {q.options.map((option, optionIndex) => (
                      <div 
                        key={optionIndex}
                        className={`p-3 rounded-lg border ${
                          option === q.correct 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          {option === q.correct && (
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          )}
                          <span className={option === q.correct ? 'text-green-800 font-medium' : 'text-gray-700'}>
                            {String.fromCharCode(65 + optionIndex)}. {option}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">Explanation:</h4>
                    <p className="text-blue-700 text-sm">{q.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Study Tips */}
          <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              WSET Level 2 Study Tips & Preparation Guide
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Study Areas</h3>
                <ul className="space-y-2">
                  {studyTips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Format</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Questions:</span>
                    <span className="font-medium">50 multiple choice</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Limit:</span>
                    <span className="font-medium">60 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pass Mark:</span>
                    <span className="font-medium">55% (28/50)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Format:</span>
                    <span className="font-medium">Online or Paper</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">
              Ready to Master Wine Education?
            </h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Join Matt Decanted's comprehensive wine education courses and get access to more practice questions, 
              study materials, and expert guidance for your WSET certification journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-blue-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Explore Wine Courses
              </button>
              <button className="border border-white text-white hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center">
                <Download className="w-5 h-5 mr-2" />
                Download Study Guide
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default WSETLevel2Questions;
