// netlify/functions/ocr-label.js
// OCR label → Google Cloud Vision (TEXT_DETECTION)
// Expects multipart/form-data with a single field named "file"

const parseMultipart = require('parse-multipart-data');

const json = (status, body) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*', // tighten in prod if you have a fixed origin
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

const getBoundary = (ct) => {
  const m = /boundary=([^;]+)/i.exec(ct || '');
  return m && m[1] ? m[1] : null;
};

const safeText = async (res) => {
  try {
    return await res.text();
  } catch {
    return '';
  }
};

exports.handler = async (event) => {
  const dbg = {
    stage: 'start',
    node: process.version,
    hasApiKey: !!process.env.GOOGLE_VISION_API_KEY,
  };

  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return json(200, { ok: true, dbg });
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method not allowed', dbg });
    }

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      return json(500, { error: 'GOOGLE_VISION_API_KEY missing', dbg });
    }

    const ct =
      event.headers['content-type'] ||
      event.headers['Content-Type'] ||
      '';
    if (!ct.toLowerCase().startsWith('multipart/form-data')) {
      return json(400, { error: 'Expected multipart/form-data', dbg: { ...dbg, contentType: ct } });
    }

    const boundary = getBoundary(ct);
    if (!boundary) {
      return json(400, { error: 'Missing multipart boundary', dbg: { ...dbg, contentType: ct } });
    }

    // Netlify sends base64 for binary bodies
    const bodyBuffer = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');

    dbg.contentType = ct;
    dbg.boundary = boundary;
    dbg.bodyBytes = bodyBuffer.length;

    let parts = [];
    try {
      parts = parseMultipart.parse(bodyBuffer, boundary) || [];
    } catch (err) {
      return json(400, { error: 'Failed to parse multipart form-data', detail: String(err?.message || err), dbg });
    }

    dbg.partsCount = parts.length;

    const filePart =
      parts.find((p) => p && p.name === 'file' && p.filename && p.data) ||
      parts.find((p) => p && p.filename && p.data);

    if (!filePart) {
      return json(400, { error: 'No file provided (field must be "file")', dbg });
    }

    dbg.file = {
      filename: filePart.filename,
      bytes: filePart.data?.length || 0,
      contentType: filePart.type || filePart.contentType || 'unknown',
    };

    const base64Content = filePart.data.toString('base64');

    // Build Vision request
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const payload = {
      requests: [
        {
          image: { content: base64Content },
          features: [{ type: 'TEXT_DETECTION' }],
        },
      ],
    };

    let res;
    try {
      res = await fetch(visionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      return json(502, { error: 'Failed to reach Google Vision API', detail: String(netErr?.message || netErr), dbg });
    }

    dbg.visionStatus = res.status;
    dbg.visionStatusText = res.statusText;

    if (!res.ok) {
      const detail = await safeText(res);
      return json(502, {
        error: 'Vision API error',
        status: res.status,
        statusText: res.statusText,
        detail,
        dbg,
      });
    }

    let result;
    try {
      result = await res.json();
    } catch (parseErr) {
      return json(502, { error: 'Failed to parse Vision API response', detail: String(parseErr?.message || parseErr), dbg });
    }

    const text =
      result?.responses?.[0]?.fullTextAnnotation?.text ??
      result?.responses?.[0]?.textAnnotations?.[0]?.description ??
      '';

    return json(200, { text, dbg });
  } catch (e) {
    // final safety net
    return json(500, { error: 'Internal Server Error', detail: String(e?.message || e), dbg });
  }
};
