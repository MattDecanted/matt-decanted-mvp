// netlify/functions/label-ocr.js
// OCR for wine labels using Google Cloud Vision (Text Detection).
// Expects multipart/form-data with a single "file" field (the image).
//
// Returns: { text: string }
//
// ENV REQUIRED:
//   GOOGLE_VISION_API_KEY   -> your Google Cloud Vision API key (keep secret in Netlify)

// Small helper to parse multipart form-data (works in Netlify/AWS Lambda)
const parseMultipart = require('parse-multipart-data');

exports.handler = async (event) => {
  try {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method not allowed' });
    }

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      return json(500, { error: 'Server not configured: GOOGLE_VISION_API_KEY missing' });
    }

    // Ensure we have content-type with boundary
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.startsWith('multipart/form-data')) {
      return json(400, { error: 'Expected multipart/form-data upload' });
    }

    // Decode the body (Netlify sends base64 for binary)
    const bodyBuffer = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');

    // Parse multipart
    const boundary = getBoundary(contentType);
    if (!boundary) {
      return json(400, { error: 'Missing multipart boundary' });
    }
    const parts = parseMultipart.parse(bodyBuffer, boundary);

    // Find the "file" part (by field name or first file-like part)
    const filePart =
      parts.find((p) => p.name === 'file' && p.filename) ||
      parts.find((p) => p.filename);

    if (!filePart || !filePart.data) {
      return json(400, { error: 'No file detected in form-data (field name should be "file")' });
    }

    // Convert the image bytes to base64 for Vision
    const base64Content = filePart.data.toString('base64');

    // Construct Vision request
    const requestPayload = {
      requests: [
        {
          image: { content: base64Content },
          features: [{ type: 'TEXT_DETECTION' }],
        },
      ],
    };

    // Call Google Vision
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!res.ok) {
      const errText = await safeText(res);
      return json(res.status, { error: `Vision error: ${res.status} ${res.statusText}`, detail: errText });
    }

    const data = await res.json();
    const text =
      data?.responses?.[0]?.fullTextAnnotation?.text ||
      data?.responses?.[0]?.textAnnotations?.[0]?.description ||
      '';

    return json(200, { text });
  } catch (err) {
    console.error('label-ocr error:', err);
    return json(500, { error: 'Server error', detail: String(err?.message || err) });
  }
};

// Helpers
function json(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*', // optional: loosen for local testing; tighten for prod
    },
    body: JSON.stringify(body),
  };
}

function getBoundary(contentType) {
  // e.g. multipart/form-data; boundary=----WebKitFormBoundaryX
  const m = /boundary=([^;]+)/i.exec(contentType);
  return m && m[1] ? m[1] : null;
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
