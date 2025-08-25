import { Handler } from '@netlify/functions'
import { supabase } from './_supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    const { invite_code, user_id, display_name } = body

    if (!invite_code || !user_id || !display_name) {
      return { statusCode: 400, body: 'Missing required fields' }
    }

    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('invite_code', invite_code)
      .single()

    if (sessionError || !session) {
      return { statusCode: 404, body: 'Session not found' }
    }

    const { error: joinError } = await supabase.from('session_participants').insert([
      {
        session_id: session.id,
        user_id,
        display_name,
      },
    ])

    if (joinError) throw joinError

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Joined session successfully' }),
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'JOIN_SESSION_FAILED', detail: err.message }),
    }
  }
}
