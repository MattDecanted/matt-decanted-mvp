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
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
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