// netlify/functions/ocr-label.ts
import type { Handler } from '@netlify/functions';
import { parse } from 'parse-multipart-data';

type Creds = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

/** Build Google Vision client lazily so bundling/env is more forgiving */
async function getVisionClient() {
  // Lazy import to avoid bundler issues if lib not present locally
  const vision = await import('@google-cloud/vision');
  const ImageAnnotatorClient = (vision as any).ImageAnnotatorClient;

  // Preferred single-variable auth: GOOGLE_VISION_CREDENTIALS (raw JSON or base64)
  const raw = process.env.GOOGLE_VISION_CREDENTIALS;
  let creds: Creds | undefined;

  if (raw) {
    try {
      const json = raw.trim().startsWith('{')
        ? raw
        : Buffer.from(raw, 'base64').toString('utf8');
      creds = JSON.parse(json);
    } catch (e) {
      console.error('GOOGLE_VISION_CREDENTIALS parse error:', e);
    }
  }

  // Back-compat with your existing trio of env vars
  if (!creds && process.env.GCV_CLIENT_EMAIL && process.env.GCV_PRIVATE_KEY) {
    const pkRaw = process.env.GCV_PRIVATE_KEY || '';
    const private_key = pkRaw.includes('\\n') ? pkRaw.replace(/\\n/g, '\n') : pkRaw;
    creds = {
      client_email: process.env.GCV_CLIENT_EMAIL,
      private_key,
      project_id: process.env.GCP_PROJECT_ID,
    };
  }

  // If creds are present, pass them explicitly. Otherwise rely on ADC (may fail on Netlify).
  const client = creds
    ? new ImageAnnotatorClient({ credentials: creds, projectId: creds.project_id })
    : new ImageAnnotatorClient();

  return client;
}

function toLabelHints(text: string) {
  // Vintage year detection (simple, reliable)
  const vintageMatch = text.match(/\b(19|20)\d{2}\b/);
  // NV detection
  const isNV = /(^|\s)NV(\s|$)|\bnon[- ]vintage\b/i.test(text);

  // Some light cues from common Champagne phrasing
  const inferred_variety =
    /\bblanc de blancs?\b/i.test(text) ? 'Chardonnay' :
    /\bpinot noir\b/i.test(text)    ? 'Pinot Noir'  :
    /\bmeunier\b/i.test(text)       ? 'Pinot Meunier' :
    undefined;

  return {
    vintage_year: vintageMatch ? Number(vintageMatch[0]) : undefined,
    is_non_vintage: isNV || undefined,
    inferred_variety,
    raw_excerpt: text.slice(0, 400),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    const match = contentType.match(/multipart\/form-data;\s*boundary=(.+)/i);
    if (!match) {
      return { statusCode: 400, body: 'Missing multipart/form-data boundary' };
    }

    const boundary = match[1];
    const bodyBuf = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64')
      : Buffer.from(event.body || '', 'utf8');

    const parts = parse(bodyBuf, boundary);
    // Accept first image-like file (or field named "file")
    const filePart =
      parts.find((p) => p.filename && (p.type?.startsWith('image/') || p.name === 'file')) ||
      parts.find((p) => p.filename);

    if (!filePart || !filePart.data) {
      return { statusCode: 400, body: 'No image file found' };
    }

    const client = await getVisionClient();

    // Prefer passing content buffer explicitly
    const [result] = await client.textDetection({ image: { content: filePart.data } });
    const text: string = result?.fullTextAnnotation?.text || '';

    const labelHints = toLabelHints(text);

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, text, labelHints }),
    };
  } catch (err: any) {
    console.error('OCR error:', err?.message || err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'OCR_FAILED', message: err?.message || 'Unknown error' }),
    };
  }
};
