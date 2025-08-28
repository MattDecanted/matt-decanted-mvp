import React from 'react';
import SEOHead from '../../components/SEO/SEOHead';
import { useTranslation } from 'react-i18next';
import { Eye, DoorClosed as Nose, Zap, Wine, CheckCircle, Star, Download, Play } from 'lucide-react';

const WineTastingGuide: React.FC = () => {
  const { t } = useTranslation();

  const tastingSteps = [
    {
      icon: <Eye className="w-8 h-8 text-blue-600" />,
      title: "Look (Visual Examination)",
      description: "Examine the wine's color, clarity, and intensity against a white background",
      details: [
        "Hold glass at 45-degree angle against white surface",
        "Note color intensity from rim to center",
        "Check for clarity and any sediment",
        "Observe viscosity by swirling gently"
      ]
    },
    {
      icon: <Nose className="w-8 h-8 text-green-600" />,
      title: "Smell (Aroma Analysis)",
      description: "Identify primary, secondary, and tertiary aromas in the wine",
      details: [
        "First smell without swirling to catch delicate aromas",
        "Swirl wine to release more complex aromas",
        "Take short, quick sniffs rather than long inhales",
        "Identify fruit, floral, herbal, and oak characteristics"
      ]
    },
    {
      icon: <Zap className="w-8 h-8 text-purple-600" />,
      title: "Taste (Palate Evaluation)",
      description: "Assess sweetness, acidity, tannins, alcohol, and flavor intensity",
      details: [
        "Take a small sip and let it coat your palate",
        "Note initial taste, mid-palate, and finish",
        "Assess balance between acidity, sweetness, and tannins",
        "Consider wine's length and complexity"
      ]
    }
  ];

  const commonAromas = [
    { category: "Fruits", examples: "Apple, pear, citrus, berry, stone fruits, tropical fruits" },
    { category: "Flowers", examples: "Rose, violet, elderflower, orange blossom" },
    { category: "Herbs & Spices", examples: "Mint, thyme, black pepper, cinnamon, vanilla" },
    { category: "Earth & Minerals", examples: "Wet stone, chalk, mushroom, forest floor" },
    { category: "Oak & Aging", examples: "Vanilla, toast, smoke, leather, tobacco" }
  ];

  return (
    <>
      <SEOHead
        title="How to Taste Wine Like a Pro: Complete Wine Tasting Guide"
        description="Master professional wine tasting techniques with this comprehensive guide. Learn to evaluate wine appearance, aroma, and taste like a sommelier. Includes tasting vocabulary and tips."
        keywords="how to taste wine, wine tasting guide, professional wine tasting, sommelier techniques, wine evaluation, wine tasting steps"
        ogType="article"
        articleData={{
          publishedTime: new Date().toISOString(),
          author: "Matt Decanted",
          section: "Wine Education",
          tags: ["Wine Tasting", "Education", "Sommelier Skills", "Wine Appreciation"]
        }}
      />

      <div className="min-h-screen py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How to Taste Wine Like a Pro
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
              Master the systematic approach to wine tasting used by sommeliers and wine professionals. 
              Learn to evaluate wine with confidence and develop your palate.
            </p>
            <div className="flex items-center justify-center">
              <Wine className="w-6 h-6 text-amber-600 mr-2" />
              <span className="text-amber-600 font-medium">Professional Tasting Techniques</span>
            </div>
          </header>

          {/* Introduction */}
          <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              The Systematic Approach to Wine Tasting
            </h2>
            <p className="text-gray-600 mb-4">
              Professional wine tasting follows a systematic approach that engages all your senses. 
              This method, used by sommeliers worldwide, helps you evaluate wine objectively and 
              develop a consistent vocabulary for describing what you taste.
            </p>
            <p className="text-gray-600 mb-6">
              The three-step process—Look, Smell, Taste—allows you to gather maximum information 
              about the wine's quality, origin, and characteristics.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-800 mb-2">🍷 Before You Begin</h3>
              <p className="text-amber-700 text-sm">
                Use a proper wine glass (clear, tulip-shaped), ensure good lighting, 
                and have a white surface available for color evaluation.
              </p>
            </div>
          </section>

          {/* Tasting Steps */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              The Three-Step Wine Tasting Process
            </h2>
            
            <div className="space-y-8">
              {tastingSteps.map((step, index) => (
                <div key={index} className="bg-white rounded-lg shadow-lg p-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-gray-100 rounded-full p-3 mr-4">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                      <p className="text-gray-600">{step.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {step.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 text-sm">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Aroma Wheel */}
          <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Wine Aroma Categories & Vocabulary
            </h2>
            <p className="text-gray-600 mb-6">
              Developing your aroma vocabulary is crucial for wine tasting. Here are the main 
              categories of wine aromas you'll encounter:
            </p>
            
            <div className="space-y-4">
              {commonAromas.map((category, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{category.category}</h3>
                  <p className="text-gray-600 text-sm">{category.examples}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">💡 Pro Tip</h3>
              <p className="text-blue-700 text-sm">
                Don't worry if you can't identify specific aromas immediately. With practice, 
                your ability to detect and name different scents will improve dramatically.
              </p>
            </div>
          </section>

          {/* Tasting Notes Template */}
          <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Professional Tasting Notes Template
            </h2>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Sample Tasting Note Structure:</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <strong className="text-gray-900">Appearance:</strong>
                  <span className="text-gray-600 ml-2">Deep ruby red with purple rim, clear and bright</span>
                </div>
                <div>
                  <strong className="text-gray-900">Nose:</strong>
                  <span className="text-gray-600 ml-2">Intense aromas of blackcurrant, cedar, vanilla, and subtle mint</span>
                </div>
                <div>
                  <strong className="text-gray-900">Palate:</strong>
                  <span className="text-gray-600 ml-2">Full-bodied with firm tannins, balanced acidity, flavors of dark fruit and spice</span>
                </div>
                <div>
                  <strong className="text-gray-900">Finish:</strong>
                  <span className="text-gray-600 ml-2">Long and complex with lingering oak and fruit notes</span>
                </div>
                <div>
                  <strong className="text-gray-900">Conclusion:</strong>
                  <span className="text-gray-600 ml-2">Excellent quality Cabernet Sauvignon, likely from Napa Valley, ready to drink now or age 5-10 years</span>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">
              Practice Makes Perfect
            </h2>
            <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
              Join Matt Decanted's wine tasting courses and practice sessions to develop your palate 
              and master professional tasting techniques.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-purple-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center">
                <Play className="w-5 h-5 mr-2" />
                Watch Tasting Videos
              </button>
              <button className="border border-white text-white hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center">
                <Download className="w-5 h-5 mr-2" />
                Download Tasting Sheet
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default WineTastingGuide;
