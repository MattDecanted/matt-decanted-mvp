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

    const guestData = JSON.parse(event.body);
    const { points, quiz } = guestData;

    if (!points && !quiz) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No guest data provided' }),
      };
    }

    // Start transaction-like operations
    const operations = [];

    // 1. Start 7-day trial
    operations.push(
      supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            trial_started_at: new Date().toISOString(),
            locale: 'en',
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false,
          }
        )
    );

    // 2. Add points to ledger if any
    if (points && points > 0) {
      operations.push(
        supabase
          .from('points_ledger')
          .insert([
            {
              user_id: user.id,
              points,
              reason: 'Guest Progress Merge',
              meta: {
                source: 'guest_data',
                merged_at: new Date().toISOString(),
              },
            },
          ])
      );
    }

    // 3. Create quiz attempt if quiz data exists
    if (quiz && quiz.for_date && quiz.correct_count !== undefined) {
      operations.push(
        supabase
          .from('trial_quiz_attempts')
          .insert([
            {
              user_id: user.id,
              locale: 'en',
              for_date: quiz.for_date,
              correct_count: quiz.correct_count,
              points_awarded: points || 0,
              source: 'guest_merge',
            },
          ])
      );
    }

    // Execute all operations
    const results = await Promise.all(operations);
    
    // Check for errors
    for (const result of results) {
      if (result.error) {
        throw result.error;
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        points_merged: points || 0,
        trial_started: true,
      }),
    };
  } catch (error) {
    console.error('Error merging guest progress:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};