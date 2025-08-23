// netlify/functions/label-ocr.js
// OCR for wine labels using Google Cloud Vision (TEXT_DETECTION).
// Expects multipart/form-data with a single "file" field.
// Returns: { text: string }
//
// ENV REQUIRED:
//   GOOGLE_VISION_API_KEY   -> your Google Cloud Vision API key (keep secret in Netlify)

const parseMultipart = require('parse-multipart-data');

// Common JSON response helper with CORS
const json = (status, body) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  },
  body: JSON.stringify(body)
});

// Extract multipart boundary from header
function getBoundary(contentType) {
  const m = /boundary=([^;]+)/i.exec(contentType || '');
  return m && m[1] ? m[1] : null;
}

// Safely read a non-JSON error payload
async function safeText(res) {
  try { return await res.text(); } catch { return ''; }
}

exports.handler = async (event) => {
  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return json(200, { ok: true });
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method not allowed' });
    }

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      return json(500, { error: 'Server not configured: GOOGLE_VISION_API_KEY missing' });
    }

    // Ensure multipart/form-data with boundary
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      return json(400, { error: 'Expected multipart/form-data upload' });
    }

    const boundary = getBoundary(contentType);
    if (!boundary) {
      return json(400, { error: 'Missing multipart boundary' });
    }

    // Decode body (Netlify sets base64 for binary)
    const bodyBuffer = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');

    // Parse parts
    const parts = parseMultipart.parse(bodyBuffer, boundary) || [];
    const filePart =
      parts.find(p => p.name === 'file' && p.filename && p.data) ||
      parts.find(p => p.filename && p.data);

    if (!filePart) {
      return json(400, { error: 'No file detected in form-data (field name should be "file")' });
    }

    // Base64 image for Vision
    const base64Content = filePart.data.toString('base64');

    // Build Vision request
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const payload = {
      requests: [
        {
          image: { content: base64Content },
          features: [{ type: 'TEXT_DETECTION' }]
        }
      ]
    };

    // Node 18+ on Netlify has global fetch
    const res = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const detail = await safeText(res);
      console.error('Vision API error:', res.status, res.statusText, detail);
      return json(502, { error: 'Vision API failed', status: res.status, statusText: res.statusText, detail });
    }

    const result = await res.json();
    const text =
      result?.responses?.[0]?.fullTextAnnotation?.text ??
      result?.responses?.[0]?.textAnnotations?.[0]?.description ??
      '';

    return json(200, { text });
  } catch (err) {
    console.error('label-ocr error:', err);
    return json(500, { error: 'Internal Server Error', detail: String(err?.message || err) });
  }
};
