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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const auth = event.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return json(401, { error: 'Missing bearer token' });
    const accessToken = m[1];

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Validate token → get user
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userRes?.user) return json(401, { error: 'Invalid token' });
    const user = userRes.user;

    // Load profile (need alias, country, state, email)
    const { data: prof, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, alias, country, state, stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (pErr) return json(500, { error: 'Unable to read profile', detail: pErr.message });

    if (prof?.stripe_customer_id) {
      return json(200, { status: 'exists', stripe_customer_id: prof.stripe_customer_id });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const body = event.body ? JSON.parse(event.body || '{}') : {};
    const name = body.name || prof?.alias || user.user_metadata?.name || undefined;

    // Create Stripe customer
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

    // Persist back to profiles (only if still null to avoid overwriting)
    const { error: upErr } = await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user.id)
      .is('stripe_customer_id', null);
    if (upErr) return json(500, { error: 'Failed to save stripe_customer_id', detail: upErr.message });

    return json(200, { status: 'created', stripe_customer_id: customer.id });
  } catch (e) {
    console.error('create-stripe-customer error:', e);
    return json(500, { error: 'Server error', detail: String(e?.message || e) });
  }
};
