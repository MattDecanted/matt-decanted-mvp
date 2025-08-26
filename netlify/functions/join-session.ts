// netlify/functions/join-session.ts
import type { Handler } from '@netlify/functions';
import { supabase } from './_supabaseClient';

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    let { invite_code, user_id, display_name } = body as {
      invite_code?: string;
      user_id?: string;
      display_name?: string;
    };

    // Basic validation
    invite_code = (invite_code || '').trim().toUpperCase();
    display_name = (display_name || '').trim();

    if (!invite_code || !user_id || !display_name) {
      return { statusCode: 400, body: 'Missing required fields: invite_code, user_id, display_name' };
    }

    // Find session by invite_code
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id,status')
      .eq('invite_code', invite_code)
      .single();

    if (sessionError || !session) {
      return { statusCode: 404, body: 'Session not found' };
    }

    // Prevent joining closed sessions
    if (session.status === 'finished' || session.status === 'cancelled') {
      return { statusCode: 409, body: `Session is ${session.status} and cannot be joined` };
    }

    // Optional: prevent duplicate joins for same user in same session
    const { data: existing } = await supabase
      .from('session_participants')
      .select('id,user_id')
      .eq('session_id', session.id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Already joined', participant_id: existing.id, session_id: session.id }),
      };
    }

    // Insert participant (defaults)
    const { data: participant, error: joinError } = await supabase
      .from('session_participants')
      .insert([
        {
          session_id: session.id,
          user_id,
          display_name,
          is_host: false,
          score: 0,
        },
      ])
      .select('*')
      .single();

    if (joinError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'JOIN_SESSION_FAILED', detail: joinError.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Joined session successfully',
        session_id: session.id,
        participant,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'JOIN_SESSION_FAILED', detail: err?.message ?? String(err) }),
    };
  }
};
