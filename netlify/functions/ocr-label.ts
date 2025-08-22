// netlify/functions/ocr-label.ts
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import vision from '@google-cloud/vision';

function visionClientFromEnv() {
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!json) throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS_JSON');
  const creds = JSON.parse(json);
  // @ts-ignore
  return new vision.ImageAnnotatorClient({ credentials: creds });
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ANON_SUPABASE = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

function isOldWorld(country: string) {
  const ow = new Set(['france','italy','spain','germany','portugal','greece','austria','hungary','georgia','slovenia','croatia']);
  return ow.has((country||'').toLowerCase());
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// NEW: quick label heuristics for vintage/variety
function parseVintageAndVarietyHints(ocr: string) {
  const text = (ocr || '').toLowerCase();

  // Years between 1900..2099, prune obvious false positive like address numbers by frequency
  const yearMatches = Array.from(text.matchAll(/\b(19\d{2}|20\d{2})\b/g)).map(m => parseInt(m[1], 10));
  const plausibleYears = yearMatches.filter(y => y >= 1950 && y <= new Date().getFullYear());

  const isNV = /\bnon[-\s]?vintage\b|\bnv\b/.test(text);

  // Champagne cues
  const isChampagne = /\bchampagne\b/.test(text) || /\bépernay\b|\bepernay\b/.test(text);

  // Variety cues (don’t assume certainty)
  const signals: string[] = [];
  const varieties = new Set<string>();

  if (/\bblanc\s+de\s+blancs?\b/.test(text)) {
    signals.push('blanc de blancs');
    varieties.add('Chardonnay'); // typical, but keep confidence low
  }
  if (/\bblanc\s+de\s+noirs?\b/.test(text)) {
    signals.push('blanc de noirs');
    // could be Pinot Noir and/or Pinot Meunier; mark as blend
    varieties.add('PinotNoir');
    varieties.add('PinotMeunier');
  }

  // Single-variety keywords (only if explicitly present)
  const singleMap: Record<string,string> = {
    chardonnay: 'Chardonnay',
    riesling: 'Riesling',
    'pinot noir': 'PinotNoir',
    'pinot meunier': 'PinotMeunier',
    'pinot grigio': 'PinotGrigio',
    'pinot gris': 'PinotGris',
    merlot: 'Merlot',
    zinfandel: 'Zinfandel',
    primitivo: 'Primitivo',
    syrah: 'Syrah',
    shiraz: 'Shiraz',
    cabernet: 'Cabernet', // catch-all per your one-word rule
    sangiovese: 'Sangiovese',
    nebbiolo: 'Nebbiolo',
    tempranillo: 'Tempranillo',
    grenache: 'Grenache',
    gamay: 'Gamay',
    chenin: 'Chenin', // for Chenin Blanc (one-word house rule)
    semillon: 'Semillon',
  };
  for (const k of Object.keys(singleMap)) {
    if (text.includes(k)) {
      signals.push(`found:${k}`);
      varieties.add(singleMap[k]);
    }
  }

  // If label mentions “cuvée”, “brut”, etc. they’re style words; don’t change variety.
  const styleSignals = /\bbrut|extra\s+brut|cuv[ée]e|sec|dosage|méthode traditionelle|traditional method\b/.test(text);
  if (styleSignals) signals.push('style-words');

  // Decide inferred variety field(s)
  let inferred_variety: string | null = null;
  let inferred_varieties: string[] = [];
  let variety_confidence = 0;

  if (varieties.size === 1) {
    inferred_variety = Array.from(varieties)[0];
    inferred_varieties = [inferred_variety];
    variety_confidence = 0.6;
  } else if (varieties.size > 1) {
    inferred_variety = 'Blend';
    inferred_varieties = Array.from(varieties);
    variety_confidence = 0.5;
  } else if (isChampagne && /\bblanc\s+de\s+blancs?\b/.test(text)) {
    inferred_variety = 'Chardonnay';
    inferred_varieties = ['Chardonnay'];
    variety_confidence = 0.5;
  } else if (isChampagne && /\bblanc\s+de\s+noirs?\b/.test(text)) {
    inferred_variety = 'Blend';
    inferred_varieties = ['PinotNoir','PinotMeunier'];
    variety_confidence = 0.45;
  }

  // Vintage
  let vintage_year: number | null = null;
  if (isNV) {
    vintage_year = null;
  } else if (plausibleYears.length) {
    // choose the most prominent (first) for MVP
    vintage_year = plausibleYears[0];
  }

  return {
    is_non_vintage: isNV || (!vintage_year && isChampagne), // many NV champagnes
    vintage_year,
    inferred_variety,
    inferred_varieties,
    inference_meta: {
      signals,
      confidence: {
        variety: variety_confidence,
        vintage: isNV ? 0.9 : (vintage_year ? 0.7 : 0.3),
      }
    }
  };
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method not allowed' };
    }
    const body = JSON.parse(event.body || '{}');
    const { storagePath, userId } = body;
    if (!storagePath) {
      return { statusCode: 400, body: 'storagePath required' };
    }

    // Signed URL and download
    const { data: signed, error: suErr } = await supabaseAdmin
      .storage
      .from('labels')
      .createSignedUrl(storagePath, 60 * 10);
    if (suErr || !signed?.signedUrl) throw suErr || new Error('signed URL failed');

    const imgRes = await fetch(signed.signedUrl);
    if (!imgRes.ok) throw new Error('download image failed');
    const arrayBuffer = await imgRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // OCR
    const client = visionClientFromEnv();
    const [result] = await client.textDetection({ image: { content: bytes } });
    const text = result?.fullTextAnnotation?.text || '';
    const ocrText = text.replace(/\s+/g, ' ').trim();

    // NEW: infer vintage & variety signals from OCR
    const hints = parseVintageAndVarietyHints(ocrText);

    // Save label row (with hints)
    const { data: labelRow, error: insErr } = await supabaseAdmin
      .from('wine_labels')
      .insert([{
        storage_path: storagePath,
        ocr_text: ocrText,
        detected_words: ocrText.split(/\W+/).filter(Boolean).slice(0, 50),
        created_by: userId || null,
        vintage_year: hints.vintage_year,
        is_non_vintage: hints.is_non_vintage,
        inferred_variety: hints.inferred_variety,
        inferred_varieties: hints.inferred_varieties?.length ? hints.inferred_varieties : null,
        inference_meta: hints.inference_meta
      }])
      .select('id')
      .single();
    if (insErr) throw insErr;

    // Match a wine (unchanged)
    const { data: match, error: mErr } = await supabaseAdmin
      .rpc('match_wine_from_ocr', { _ocr: ocrText })
      .single();
    if (mErr) throw mErr;

    if (!match?.wine_id || match.confidence < 0.25) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          matched: false,
          labelId: labelRow.id,
          ocrText,
          hints
        })
      };
    }

    // Load wine
    const { data: wine, error: wErr } = await supabaseAdmin
      .from('wines')
      .select('id, display_name, winery, variety, country, region, appellation, vintage')
      .eq('id', match.wine_id)
      .maybeSingle();
    if (wErr || !wine) throw wErr || new Error('wine not found');

    // Create game + share token
    const { data: game, error: gErr } = await supabaseAdmin
      .from('wine_options_games')
      .insert([{ wine_id: wine.id, label_id: labelRow.id, created_by: userId || null }])
      .select('id')
      .single();
    if (gErr) throw gErr;

    const { data: tokenRow, error: tErr } = await supabaseAdmin
      .from('share_tokens')
      .insert([{ game_id: game.id, created_by: userId || null }])
      .select('token')
      .single();
    if (tErr) throw tErr;

    const origin = event.headers['x-forwarded-proto'] && event.headers['x-forwarded-host']
      ? `${event.headers['x-forwarded-proto']}://${event.headers['x-forwarded-host']}`
      : (process.env.DEPLOY_URL || 'http://localhost:8888');
    const shareUrl = `${origin}/wine-options/play/${tokenRow.token}`;

    // Distractors
    const { data: dv } = await supabaseAdmin.rpc('get_distractors_for_variety', { _variety: wine.variety, _limit: 3 });
    const { data: dc } = await supabaseAdmin.rpc('get_distractors_for_country', { _country: wine.country, _limit: 3 });
    const { data: dr } = await supabaseAdmin.rpc('get_distractors_for_region',  { _region: wine.region,  _limit: 3 });

    // Build questions (now includes **Vintage** first)
    // Q0 Vintage / NV (when label hints something OR wine has vintage)
    const vintageOptions: string[] = [];
    let q0: any = null;

    const labelNV = !!hints.is_non_vintage;
    const labelYear = hints.vintage_year || null;
    const dbYear = wine.vintage || null;

    // We’ll always ask Vintage first for fizz & when label produced a signal
    const likelyFizz = /\bchampagne\b/i.test(ocrText) || /\bméthode|traditional method|sparkling|crémant|prosecco|cava\b/i.test(ocrText);

    if (likelyFizz || labelNV || labelYear || dbYear) {
      const pool = new Set<string>();
      if (labelNV || (!labelYear && !dbYear)) pool.add('Non-Vintage (NV)');
      if (dbYear) pool.add(String(dbYear));
      if (labelYear) pool.add(String(labelYear));
      // add a couple plausible distractor years
      const y = new Date().getFullYear();
      [y-1, y-2, y-3].forEach(v => pool.add(String(v)));
      const opts = shuffle(Array.from(pool)).slice(0,4);
      // Correct preference: NV if dbYear is null OR labelNV. Else dbYear.
      let correctText = 'Non-Vintage (NV)';
      if (dbYear) correctText = String(dbYear);
      else if (labelYear) correctText = String(labelYear);

      const idx = Math.max(0, opts.findIndex(o => o === correctText));
      q0 = { step: 0, question: 'Vintage or NV?', options: opts, correctIndex: idx };
    }

    // Q1 Old/New
    const q1 = {
      step: 1,
      question: 'Old World or New World?',
      options: ['Old World', 'New World'],
      correctIndex: isOldWorld(wine.country) ? 0 : 1
    };

    // Q2 Variety (if label inference is weak and catalog says e.g. “Blend”, include “Not stated”)
    const correctVar = wine.variety; // one-word canonical
    const baseVarOpts = [correctVar, ...(dv || [])].slice(0,4);
    let varOpts = shuffle(baseVarOpts);
    // inject "Not stated" if label gave no strong hint and it’s fizz
    if (likelyFizz && !hints.inferred_variety) {
      if (!varOpts.includes('Not stated')) {
        varOpts = shuffle([...varOpts.slice(0,3), 'Not stated']);
      }
    }
    const varCorrectIdx = varOpts.findIndex(v => v.toLowerCase() === correctVar.toLowerCase());
    const q2 = {
      step: 2,
      question: 'What grape variety is this?',
      options: varOpts,
      correctIndex: varCorrectIdx >= 0 ? varCorrectIdx : 0
    };

    // Q3 Country
    const q3opts = shuffle([wine.country, ...(dc || [])].slice(0,4));
    const q3correct = q3opts.findIndex(v => v.toLowerCase() === wine.country.toLowerCase());
    const q3 = {
      step: 3,
      question: `Which country is it from?`,
      options: q3opts,
      correctIndex: q3correct
    };

    // Q4 Region
    const q4opts = shuffle([wine.region, ...(dr || [])].slice(0,4));
    const q4correct = q4opts.findIndex(v => v.toLowerCase() === wine.region.toLowerCase());
    const q4 = {
      step: 4,
      question: `Which region is it?`,
      options: q4opts,
      correctIndex: q4correct
    };

    const questions = q0 ? [q0, q1, q2, q3, q4] : [q1, q2, q3, q4];

    return {
      statusCode: 200,
      body: JSON.stringify({
        matched: true,
        ocrText,
        gameId: game.id,
        shareUrl,
        wine,
        questions,
        // echo label hints for UI transparency
        labelHints: hints
      })
    };
  } catch (e: any) {
    console.error(e);
    return { statusCode: 500, body: e.message || 'Server error' };
  }
};
