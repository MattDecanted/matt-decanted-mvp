import React from 'react';
import DailyTrialQuiz from '@/components/DailyTrialQuiz';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Trophy, Play, Brain, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Learn wine your way.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-6">
            Quick hits. Deep dives. Games. Challenges. Points. And a few surprises.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/trial-quiz">
              <button className="px-6 py-3 rounded-xl bg-primary text-white text-lg font-semibold shadow-md hover:bg-primary/80">
                Try the Daily Quiz
              </button>
            </Link>
            <Link to="/games/guess-what">
              <button className="px-6 py-3 rounded-xl bg-muted text-primary text-lg font-semibold border hover:border-primary">
                Play Guess What?
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Vocab & Shorts */}
      <section className="py-16 bg-muted">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold mb-2">Build your wine vocab</h2>
            <p className="text-muted-foreground mb-4">
              Learn one wine word a day and test your knowledge with micro-quizzes.
            </p>
            <Link to="/vocab" className="text-primary font-medium hover:underline">
              Go to Vino Vocab →
            </Link>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold mb-2">Watch and learn with Shorts</h2>
            <p className="text-muted-foreground mb-4">
              Quick lessons on labels, tasting, and regions. Just 90 seconds.
            </p>
            <Link to="/shorts" className="text-primary font-medium hover:underline">
              Explore Shorts →
            </Link>
          </div>
        </div>
      </section>

      {/* Community CTA */}
      <section className="py-20 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Make wine less confusing. And more fun.</h2>
          <p className="text-muted-foreground mb-6">
            Whether you're swirling your first glass or already lead tastings, Matt Decanted helps you learn, play, and grow.
          </p>
          <Link to={user ? "/account" : "/pricing"}>
            <button className="px-6 py-3 rounded-xl bg-primary text-white text-lg font-semibold shadow hover:bg-primary/80">
              {user ? 'Go to Account' : 'Join Now'}
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
clip-text text-transparent">
          Daily Brain Challenge
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Test your knowledge, earn points, and compete with others in our daily quiz challenge.
        </p>
      </section>

      {/* Daily Quiz */}
      <section>
        <DailyTrialQuiz />
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6">
        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Guess What Game</h3>
            <p className="text-muted-foreground">
              Progressive clues challenge your deductive reasoning. Can you guess the answer?
            </p>
            <Link to="/games/guess-what">
              <Button variant="outline" className="w-full">
                Play Now
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto group-hover:bg-blue-500/20 transition-colors">
              <Play className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold">Learning Shorts</h3>
            <p className="text-muted-foreground">
              Quick 5-minute videos with follow-up quizzes. Learn while you earn points.
            </p>
            <Link to="/shorts">
              <Button variant="outline" className="w-full">
                Watch & Learn
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto group-hover:bg-green-500/20 transition-colors">
              <Brain className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold">Daily Challenges</h3>
            <p className="text-muted-foreground">
              Fresh questions every day. Build your streak and climb the leaderboard.
            </p>
            <Button variant="outline" className="w-full" disabled>
              New Quiz Daily
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Stats or Benefits */}
      <section className="bg-muted/50 rounded-lg p-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold flex items-center justify-center space-x-2">
            <Star className="h-6 w-6 text-yellow-500" />
            <span>Why Play Daily?</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">15+</div>
              <div className="text-sm text-muted-foreground">Points per Quiz</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-500">5</div>
              <div className="text-sm text-muted-foreground">Minutes Daily</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-500">7</div>
              <div className="text-sm text-muted-foreground">Day Free Trial</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
