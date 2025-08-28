import React, { useState } from 'react';
import SEOHead from '../../components/SEO/SEOHead';
import { useTranslation } from 'react-i18next';
import { Brain, Trophy, RotateCcw, CheckCircle, XCircle, Star } from 'lucide-react';

interface QuizQuestion {
  id: number;
  term: string;
  definition: string;
  options: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const WineVocabularyQuiz: React.FC = () => {
  const { t } = useTranslation();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: boolean }>({});
  const [quizCompleted, setQuizCompleted] = useState(false);

  const quizQuestions: QuizQuestion[] = [
    {
      id: 1,
      term: "Terroir",
      definition: "The complete natural environment in which a wine is produced, including soil, climate, and topography",
      options: [
        "The complete natural environment in which a wine is produced, including soil, climate, and topography",
        "The process of aging wine in oak barrels",
        "The technique of blending different grape varieties",
        "The method of harvesting grapes at optimal ripeness"
      ],
      difficulty: 'intermediate'
    },
    {
      id: 2,
      term: "Tannins",
      definition: "Natural compounds found in grape skins, seeds, and stems that provide structure and astringency to wine",
      options: [
        "The sweetness level in dessert wines",
        "Natural compounds found in grape skins, seeds, and stems that provide structure and astringency to wine",
        "The bubbles in sparkling wine",
        "The alcohol content in fortified wines"
      ],
      difficulty: 'beginner'
    },
    {
      id: 3,
      term: "Malolactic Fermentation",
      definition: "A secondary fermentation process that converts sharp malic acid into softer lactic acid",
      options: [
        "The primary fermentation that converts sugar to alcohol",
        "The process of removing sediment from wine",
        "A secondary fermentation process that converts sharp malic acid into softer lactic acid",
        "The technique of concentrating grape juice before fermentation"
      ],
      difficulty: 'advanced'
    },
    {
      id: 4,
      term: "Vintage",
      definition: "The year in which the grapes were harvested",
      options: [
        "The region where the wine was produced",
        "The year in which the grapes were harvested",
        "The style of wine production used",
        "The grape variety used in the wine"
      ],
      difficulty: 'beginner'
    },
    {
      id: 5,
      term: "Appellation",
      definition: "A legally defined wine region with specific regulations for grape growing and winemaking",
      options: [
        "A type of wine glass used for tasting",
        "A legally defined wine region with specific regulations for grape growing and winemaking",
        "The process of decanting old wines",
        "A method of storing wine at proper temperature"
      ],
      difficulty: 'intermediate'
    }
  ];

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleNextQuestion = () => {
    const isCorrect = selectedAnswer === quizQuestions[currentQuestion].definition;
    setAnswers(prev => ({ ...prev, [currentQuestion]: isCorrect }));
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setShowResult(true);
    
    setTimeout(() => {
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer('');
        setShowResult(false);
      } else {
        setQuizCompleted(true);
      }
    }, 2000);
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer('');
    setShowResult(false);
    setScore(0);
    setAnswers({});
    setQuizCompleted(false);
  };

  const getScoreMessage = () => {
    const percentage = (score / quizQuestions.length) * 100;
    if (percentage >= 80) return "Excellent! You have a strong wine vocabulary.";
    if (percentage >= 60) return "Good job! Keep studying to improve your wine knowledge.";
    return "Keep learning! Wine vocabulary takes time to master.";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-amber-100 text-amber-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (quizCompleted) {
    return (
      <>
        <SEOHead
          title="Wine Vocabulary Quiz Results - Test Your Wine Knowledge"
          description="Complete your wine vocabulary quiz and see how well you know wine terminology. Learn essential wine terms with Matt Decanted's interactive quiz."
          keywords="wine vocabulary, wine quiz results, wine terminology, wine education"
        />
        
        <div className="min-h-screen py-12 bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <Trophy className="w-16 h-16 text-amber-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Quiz Complete!
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                You scored {score} out of {quizQuestions.length} questions correctly
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {Math.round((score / quizQuestions.length) * 100)}%
                </div>
                <p className="text-blue-800">{getScoreMessage()}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={resetQuiz}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Take Quiz Again
                </button>
                <button className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-semibold transition-colors">
                  Explore Wine Courses
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const question = quizQuestions[currentQuestion];

  return (
    <>
      <SEOHead
        title="Interactive Wine Vocabulary Quiz - Test Your Wine Knowledge"
        description="Test your wine vocabulary with this interactive quiz covering essential wine terms. Learn wine terminology from basic to advanced levels with Matt Decanted's educational quiz."
        keywords="wine vocabulary quiz, wine terminology, wine education, interactive wine quiz, wine terms, sommelier vocabulary"
        ogType="article"
        articleData={{
          publishedTime: new Date().toISOString(),
          author: "Matt Decanted",
          section: "Wine Education",
          tags: ["Wine Vocabulary", "Quiz", "Education", "Interactive Learning"]
        }}
      />

      <div className="min-h-screen py-12 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Wine Vocabulary Quiz
            </h1>
            <p className="text-gray-600 mb-6">
              Test your knowledge of essential wine terminology
            </p>
            
            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">
                Question {currentQuestion + 1} of {quizQuestions.length}
              </span>
              <span className="text-sm text-gray-500">
                Score: {score}/{currentQuestion + (showResult ? 1 : 0)}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
              />
            </div>
          </header>

          {/* Question Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                What does "{question.term}" mean?
              </h2>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getDifficultyColor(question.difficulty)}`}>
                {question.difficulty}
              </span>
            </div>

            {showResult ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  answers[currentQuestion] 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-red-500 bg-red-50'
                }`}>
                  <div className="flex items-center mb-2">
                    {answers[currentQuestion] ? (
                      <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 mr-2" />
                    )}
                    <span className={`font-semibold ${
                      answers[currentQuestion] ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {answers[currentQuestion] ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    answers[currentQuestion] ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {question.definition}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedAnswer === option
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium mr-3">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            )}

            {!showResult && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleNextQuestion}
                  disabled={!selectedAnswer}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentQuestion === quizQuestions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                </button>
              </div>
            )}
          </div>

          {/* Study Resources */}
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Expand Your Wine Vocabulary
            </h3>
            <p className="text-gray-600 mb-4">
              Master wine terminology with Matt Decanted's comprehensive courses and interactive learning tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center">
                <Star className="w-4 h-4 mr-2" />
                Wine Courses
              </button>
              <button className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors">
                Download Flashcards
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WineVocabularyQuiz;
