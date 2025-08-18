import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Clock, Trophy, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePoints } from '@/context/PointsContext';
import { supabase } from '@/lib/supabase';
import PaywallModal from '@/components/PaywallModal';

interface Short {
  id: string;
  slug: string;
  title: string;
  video_url: string;
  preview: boolean;
  is_published: boolean;
}

export default function ShortsPage() {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const { user } = useAuth();
  const { isTrialUser } = usePoints();

  useEffect(() => {
    loadShorts();
  }, []);

  const loadShorts = async () => {
    try {
      const { data, error } = await supabase
        .from('shorts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setShorts(data || []);
    } catch (error) {
      console.error('Error loading shorts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (short: Short) => {
    if (!user) {
      setShowPaywall(true);
      return;
    }

    if (!isTrialUser && !short.preview) {
      setShowPaywall(true);
      return;
    }

    // Allow access
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Learning Shorts</h1>
          <p className="text-muted-foreground">Quick 5-minute videos with follow-up quizzes</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="w-full h-48 bg-muted rounded-lg"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Learning Shorts</h1>
        <p className="text-muted-foreground">
          Quick 5-minute videos with follow-up quizzes to earn points
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shorts.map((short) => {
          const canAccess = user && (isTrialUser || short.preview);
          const isLocked = !canAccess;

          return (
            <Card key={short.id} className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="p-0">
                <div className="relative">
                  <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-t-lg flex items-center justify-center">
                    <div className="relative">
                      {isLocked && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Lock className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-primary-foreground ml-1" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute top-3 left-3 flex space-x-2">
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>~5 min</span>
                    </Badge>
                    {short.preview && (
                      <Badge variant="outline" className="bg-background/80">
                        Preview
                      </Badge>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge className="flex items-center space-x-1">
                      <Trophy className="h-3 w-3" />
                      <span>10 pts</span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                <CardTitle className="text-lg mb-2">{short.title}</CardTitle>
                <p className="text-sm text-muted-foreground mb-4">
                  Watch and answer questions to earn points
                </p>

                {canAccess ? (
                  <Link to={`/shorts/${short.slug}`}>
                    <Button className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Watch Now
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleVideoClick(short)}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {user ? 'Unlock' : 'Sign In to Watch'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {shorts.length === 0 && (
        <div className="text-center py-12">
          <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Videos Available</h3>
          <p className="text-muted-foreground">Check back soon for new learning content!</p>
        </div>
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Learning Shorts"
      />
    </div>
  );
}