// netlify/functions/ocr-label.js
// OCR for wine labels using Google Cloud Vision (Text Detection).
// Expects multipart/form-data with a single "file" field (the image).
//
// Returns: { text: string }
//
// ENV REQUIRED (in Netlify):
//   GOOGLE_VISION_API_KEY   -> your Google Cloud Vision API key (keep secret)

const parseMultipart = require('parse-multipart-data');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method not allowed' });
    }

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      return json(500, { error: 'Server not configured: GOOGLE_VISION_API_KEY missing' });
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.startsWith('multipart/form-data')) {
      return json(400, { error: 'Expected multipart/form-data upload' });
    }

    const bodyBuffer = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');
    const boundary = getBoundary(contentType);
    if (!boundary) return json(400, { error: 'Missing multipart boundary' });

    const parts = parseMultipart.parse(bodyBuffer, boundary);
    const filePart =
      parts.find((p) => p.name === 'file' && p.filename) ||
      parts.find((p) => p.filename);

    if (!filePart || !filePart.data) {
      return json(400, { error: 'No file detected in form-data (field name should be "file")' });
    }

    const base64Content = filePart.data.toString('base64');

    const requestPayload = {
      requests: [
        {
          image: { content: base64Content },
          features: [{ type: 'TEXT_DETECTION' }],
        },
      ],
    };

    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return json(res.status, { error: `Vision error: ${res.status} ${res.statusText}`, detail });
    }

    const data = await res.json();
    const text =
      data?.responses?.[0]?.fullTextAnnotation?.text ||
      data?.responses?.[0]?.textAnnotations?.[0]?.description ||
      '';

    return json(200, { text });
  } catch (err) {
    console.error('ocr-label error:', err);
    return json(500, { error: 'Server error', detail: String(err?.message || err) });
  }
};

// Helpers
function json(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*', // OK for this MVP; tighten later if needed
    },
    body: JSON.stringify(body),
  };
}
function getBoundary(contentType) {
  const m = /boundary=([^;]+)/i.exec(contentType);
  return m && m[1] ? m[1] : null;
}
