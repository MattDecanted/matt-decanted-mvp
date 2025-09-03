// netlify/functions/create-stripe-customer.js
// Creates a Stripe Customer for the current Supabase user (validated via JWT)
// and persists stripe_customer_id to public.profiles(id = user.id) if not already set.
//
// POST with Authorization: Bearer <supabase access_token>
// Body (optional): { name?: string, locale?: string }

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const json = (status, body) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

const requiredEnv = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing environment variable: ${key}`);
  return val;
};

const parseBody = (event) => {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    return JSON.parse(raw || '{}');
  } catch {
    throw new Error('Invalid JSON body');
  }
};

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    // ----- Env validation -----
    const SUPABASE_URL = requiredEnv('SUPABASE_URL');
    // Use SERVICE_ROLE_KEY (your build log lists both; this one has RLS bypass for admin ops)
    const SUPABASE_SERVICE_ROLE_KEY = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const STRIPE_SECRET_KEY = requiredEnv('STRIPE_SECRET_KEY');

    // ----- Auth header -> access token -----
    const auth = event.headers.authorization || event.headers.Authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return json(401, { error: 'Missing bearer token' });
    const accessToken = m[1];

    // ----- Supabase (admin) -----
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate token → get user
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userRes?.user) return json(401, { error: 'Invalid token' });
    const user = userRes.user;

    // ----- Read profile -----
    const { data: prof, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, alias, country, state, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (pErr) {
      return json(500, { error: 'Unable to read profile', detail: pErr.message });
    }

    if (prof?.stripe_customer_id) {
      return json(200, { status: 'exists', stripe_customer_id: prof.stripe_customer_id });
    }

    // ----- Body -----
    const body = parseBody(event);
    const name =
      body.name ||
      prof?.alias ||
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      undefined;

    // ----- Stripe -----
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const customer = await stripe.customers.create({
      email: prof?.email || user.email || undefined,
      name,
      metadata: {
        supabase_user_id: user.id,
        alias: prof?.alias || '',
        country: prof?.country || '',
        state: prof?.state || '',
      },
    });

    // Only update if still null to avoid overwriting in a race
    const { error: upErr } = await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user.id)
      .is('stripe_customer_id', null);

    if (upErr) {
      return json(500, {
        error: 'Failed to save stripe_customer_id',
        detail: upErr.message,
      });
    }

    return json(200, { status: 'created', stripe_customer_id: customer.id });
  } catch (e) {
    console.error('create-stripe-customer error:', e);
    return json(500, { error: 'Server error', detail: String(e?.message || e) });
  }
};
