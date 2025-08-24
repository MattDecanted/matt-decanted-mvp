// netlify/functions/ocr-label.js
const parseMultipart = require('parse-multipart-data');

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

const getBoundary = (ct) => {
  const m = /boundary=([^;]+)/i.exec(ct || '');
  return m && m[1] ? m[1] : null;
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) return json(500, { error: 'Server not configured: GOOGLE_VISION_API_KEY missing' });

    const ct = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!ct.toLowerCase().startsWith('multipart/form-data')) {
      return json(400, { error: 'Expected multipart/form-data upload' });
    }

    const boundary = getBoundary(ct);
    if (!boundary) return json(400, { error: 'Missing multipart boundary' });

    const bodyBuffer = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');
    const parts = parseMultipart.parse(bodyBuffer, boundary) || [];
    const filePart =
      parts.find(p => p.name === 'file' && p.filename && p.data) ||
      parts.find(p => p.filename && p.data);

    if (!filePart) return json(400, { error: 'No file detected (field name should be "file")' });

    const base64Content = filePart.data.toString('base64');

    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const payload = {
      requests: [
        {
          image: { content: base64Content },
          features: [{ type: 'TEXT_DETECTION' }]
        }
      ]
    };

    const res = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Vision API error:', res.status, res.statusText, detail);
      return json(502, { error: 'Vision API failed' });
    }

    const result = await res.json();
    const text =
      result?.responses?.[0]?.fullTextAnnotation?.text ??
      result?.responses?.[0]?.textAnnotations?.[0]?.description ??
      '';

    return json(200, { text });
  } catch (e) {
    console.error('ocr-label error:', e);
    return json(500, { error: 'Internal Server Error' });
  }
};
