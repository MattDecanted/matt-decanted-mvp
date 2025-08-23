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
const getBoundary = (ct) => (/boundary=([^;]+)/i.exec(ct || '') || [])[1] || null;

exports.handler = async (event) => {
  const dbg = { stage: 'start' };
  try {
    if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed', dbg });

    dbg.node = process.version;
    dbg.hasApiKey = !!process.env.GOOGLE_VISION_API_KEY;
    if (!dbg.hasApiKey) return json(500, { error: 'GOOGLE_VISION_API_KEY missing', dbg });

    const ct = event.headers['content-type'] || event.headers['Content-Type'] || '';
    dbg.contentType = ct;
    if (!ct.toLowerCase().startsWith('multipart/form-data')) {
      return json(400, { error: 'Expected multipart/form-data', dbg });
    }

    const boundary = getBoundary(ct);
    dbg.boundary = boundary;
    if (!boundary) return json(400, { error: 'Missing multipart boundary', dbg });

    const bodyBuffer = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');
    dbg.bodyBytes = bodyBuffer.length;

    const parts = parseMultipart.parse(bodyBuffer, boundary) || [];
    dbg.partsCount = parts.length;

    const filePart = parts.find(p => p.name === 'file' && p.filename && p.data) || parts.find(p => p.filename && p.data);
    if (!filePart) {
      dbg.parts = parts.map(p => ({ name: p.name, hasFilename: !!p.filename, bytes: p.data?.length || 0 }));
      return json(400, { error: 'No file detected (field name should be "file")', dbg });
    }

    dbg.file = { filename: filePart.filename, bytes: filePart.data.length, contentType: filePart.type || null };
    const imageBase64 = filePart.data.toString('base64');

    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(process.env.GOOGLE_VISION_API_KEY)}`;
    const payload = { requests: [{ image: { content: imageBase64 }, features: [{ type: 'TEXT_DETECTION' }] }] };

    const res = await fetch(visionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    dbg.visionStatus = res.status; dbg.visionStatusText = res.statusText;

    const textBody = await res.text();
    let result; try { result = JSON.parse(textBody); } catch { result = { raw: textBody }; }

    if (!res.ok) return json(502, { error: 'Vision API failed', dbg, result });

    const text =
      result?.responses?.[0]?.fullTextAnnotation?.text ??
      result?.responses?.[0]?.textAnnotations?.[0]?.description ?? '';
    return json(200, { text, dbg });
  } catch (e) {
    dbg.stageError = String(e?.message || e);
    dbg.stack = e?.stack;
    return json(500, { error: 'Internal Server Error', dbg });
  }
};
