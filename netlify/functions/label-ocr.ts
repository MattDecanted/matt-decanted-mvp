// netlify/functions/label-ocr.ts
import type { Handler } from '@netlify/functions';
import parse from 'parse-multipart-data';
import vision from '@google-cloud/vision';

function json(status: number, body: any) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function getVisionClient() {
  // Expect a base64-encoded service account JSON in env var GCP_SA_KEY
  const b64 = process.env.GCP_SA_KEY;
  if (!b64) throw new Error('Missing env var GCP_SA_KEY (base64 of service account JSON)');
  const json = Buffer.from(b64, 'base64').toString('utf8');
  const creds = JSON.parse(json);
  return new vision.ImageAnnotatorClient({ credentials: creds });
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method Not Allowed' });
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return json(400, { error: 'Expected multipart/form-data' });
    }

    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/i);
    if (!boundaryMatch) return json(400, { error: 'No multipart boundary' });

    const bodyBuffer = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');
    const parts = parse.parse(bodyBuffer, boundaryMatch[1]);

    const filePart =
      parts.find((p) => p.filename && p.type && p.data) ||
      parts.find((p) => p.name?.toLowerCase() === 'file');

    if (!filePart) return json(400, { error: 'No file uploaded (field name "file")' });

    // Guardrails
    if (filePart.data.length > 8 * 1024 * 1024) {
      return json(413, { error: 'File too large (max 8MB)' });
    }

    // Call Google Vision
    const client = getVisionClient();
    const [result] = await client.textDetection({ image: { content: filePart.data } });
    const text = result?.fullTextAnnotation?.text || '';

    // Very simple label “signal” extraction
    const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/);
    const nv = /\bNV\b/i.test(text) || /non[-\s]?vintage/i.test(text);
    const varHint = ((): string | null => {
      const candidates = [
        'Chardonnay','Pinot Noir','Pinot Meunier','Merlot','Cabernet','Sauvignon','Riesling','Shiraz','Syrah',
        'Nebbiolo','Sangiovese','Tempranillo','Zinfandel','Primitivo','Malbec','Barbera','Grenache','Gamay',
      ];
      const found = candidates.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(text));
      return found || null;
    })();

    return json(200, {
      ok: true,
      text,
      labelHints: {
        vintage_year: yearMatch ? Number(yearMatch[0]) : null,
        is_non_vintage: nv,
        inferred_variety: varHint,
      },
    });
  } catch (err: any) {
    // Log full error to Netlify function logs
    console.error('OCR error:', err);
    return json(500, { error: 'OCR failed', detail: String(err?.message || err) });
  }
};

export default handler;
