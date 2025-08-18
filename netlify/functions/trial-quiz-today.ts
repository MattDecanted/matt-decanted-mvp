import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { locale = 'en' } = event.queryStringParameters || {};
    
    // Get today's date in the locale's timezone (simplified - using UTC for now)
    const today = new Date().toISOString().split('T')[0];

    const { data: quiz, error } = await supabase
      .from('trial_quizzes')
      .select('*')
      .eq('locale', locale)
      .eq('for_date', today)
      .eq('is_published', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!quiz) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No quiz available for today' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quiz),
    };
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};