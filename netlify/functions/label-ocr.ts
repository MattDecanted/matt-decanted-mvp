// netlify/functions/label-ocr.ts
import type { Handler } from '@netlify/functions';
import { parse as parseMultipart } from 'parse-multipart-data';

type OCRResponse = {
  text: string;
  labelHints: {
    vintage_year?: number | null;
    is_non_vintage?: boolean;
    inferred_variety?: string | null;
  };
};

const VARIETY_HINTS = [
  'CHARDONNAY',
  'PINOT NOIR',
  'PINOT MEUNIER',
  'MERLOT',
  'CABERNET',
  'SYRAH',
  'SHIRAZ',
  'SANGIOVESE',
  'TEMPRANILLO',
  'ZINFANDEL',
  'PRIMITIVO',
  'RIESLING',
  'GEWURZTRAMINER',
  'SAUVIGNON',
  'ALBARINO',
  'CHENIN',
  'GRUNER',
  'NEBBIOLO',
  'BARBERA',
  'GAMAY',
];

function extractBase64FromDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(?:image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  return m ? m[1] : null;
}

function normalizeText(raw: string) {
  // collapse repeated whitespace, keep newlines
  return raw
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

function inferHints(text: string): OCRResponse['labelHints'] {
  const U = text.toUpperCase();

  // Vintage: find a plausible 19xx/20xx year
  const yearMatch = U.match(/\b(19[5-9]\d|20[0-4]\d)\b/);
  const vintage_year = yearMatch ? Number(yearMatch[1]) : null;

  // NV detection (non-vintage)
  const is_non_vintage =
    /\bNV\b/.test(U) || /\bNON[\s-]?VINTAGE\b/.test(U) || (!vintage_year && /\bCHAMPAGNE\b/.test(U));

  // Variety hints: find closest “single word” match in our shortlist
  const inferred_variety =
    VARIETY_HINTS.find((v) => U.includes(v)) || null;

  return { vintage_year, is_non_vintage, inferred_variety };
}

async function callVision(base64: string, apiKey: string) {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: 'TEXT_DETECTION' }],
      },
    ],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vision API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as any;
  const fullText = json?.responses?.[0]?.fullTextAnnotation?.text || '';
  return fullText as string;
}

export const handler: Handler = async (event) => {
  try {
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'GOOGLE_CLOUD_API_KEY not set' }),
      };
    }

    let base64: string | null = null;

    // 1) multipart form (file upload)
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (contentType.startsWith('multipart/form-data')) {
      const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
      if (!boundaryMatch) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Boundary not found' }) };
      }
      const boundary = boundaryMatch[1];
      const raw = event.isBase64Encoded && event.body ? Buffer.from(event.body, 'base64') : Buffer.from(event.body || '');
      const parts = parseMultipart(raw, boundary);

      const filePart = parts.find((p) => p.name === 'file' || (p.filename && p.type?.startsWith('image/')));
      if (!filePart || !filePart.data) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No file provided' }) };
      }
      base64 = Buffer.from(filePart.data).toString('base64');
    } else if (event.body) {
      // 2) JSON payload with imageBase64 (data URL or bare base64)
      const json = JSON.parse(event.body);
      if (json.imageBase64) {
        base64 = extractBase64FromDataUrl(json.imageBase64) ?? json.imageBase64;
      }
    }

    if (!base64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No image provided' }) };
    }

    const rawText = await callVision(base64, apiKey);
    const text = normalizeText(rawText);
    const labelHints = inferHints(text);

    const payload: OCRResponse = { text, labelHints };

    return {
      statusCode: 200,
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Unknown error' }),
    };
  }
};
