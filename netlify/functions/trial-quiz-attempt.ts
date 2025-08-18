import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get user from Authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    const body = JSON.parse(event.body);
    const { quiz_id, correct_count, source, utm, affiliate_code } = body;

    if (!quiz_id || correct_count === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Get quiz details to validate and get points
    const { data: quiz, error: quizError } = await supabase
      .from('trial_quizzes')
      .select('for_date, points_award')
      .eq('id', quiz_id)
      .single();

    if (quizError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid quiz ID' }),
      };
    }

    // Calculate points (could be based on correct_count ratio)
    const pointsAwarded = Math.round((correct_count / 3) * quiz.points_award);

    // Upsert attempt (1 per day per locale)
    const { data: attempt, error: attemptError } = await supabase
      .from('trial_quiz_attempts')
      .upsert(
        {
          user_id: user.id,
          locale: 'en', // Could be dynamic
          for_date: quiz.for_date,
          correct_count,
          points_awarded: pointsAwarded,
          source,
          utm: utm || {},
          affiliate_code,
        },
        {
          onConflict: 'user_id,locale,for_date',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (attemptError) {
      throw attemptError;
    }

    // Add points to ledger
    const { error: pointsError } = await supabase
      .from('points_ledger')
      .insert([
        {
          user_id: user.id,
          points: pointsAwarded,
          reason: 'Daily Trial Quiz',
          meta: {
            quiz_id,
            correct_count,
            for_date: quiz.for_date,
          },
        },
      ]);

    if (pointsError) {
      throw pointsError;
    }

    // Get user's total points
    const { data: pointsData } = await supabase
      .from('points_ledger')
      .select('points')
      .eq('user_id', user.id);

    const totalPoints = pointsData?.reduce((sum, record) => sum + record.points, 0) || 0;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        points_awarded: pointsAwarded,
        total_points: totalPoints,
        attempt_id: attempt.id,
      }),
    };
  } catch (error) {
    console.error('Error saving attempt:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};