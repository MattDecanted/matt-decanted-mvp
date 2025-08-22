// netlify/functions/ocr-label.ts
import { Handler } from '@netlify/functions'
import { parse } from 'parse-multipart-data'
import vision from '@google-cloud/vision'

const PROJECT_ID = process.env.GCP_PROJECT_ID
const CLIENT_EMAIL = process.env.GCV_CLIENT_EMAIL
const RAW_PRIVATE_KEY = process.env.GCV_PRIVATE_KEY || ''
const PRIVATE_KEY = RAW_PRIVATE_KEY.includes('\\n') ? RAW_PRIVATE_KEY.replace(/\\n/g, '\n') : RAW_PRIVATE_KEY

const client = new vision.ImageAnnotatorClient({
  projectId: PROJECT_ID,
  credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY }
})

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || ''
    const match = contentType.match(/multipart\/form-data; boundary=(.+)/)
    if (!match) return { statusCode: 400, body: 'Missing multipart/form-data boundary' }

    const boundary = match[1]
    const bodyBuffer = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8')
    const parts = parse(bodyBuffer, boundary)
    const filePart = parts.find(p => p.filename && p.type?.startsWith('image/'))
    if (!filePart) return { statusCode: 400, body: 'No image file found (field "file")' }

    const [result] = await client.textDetection(filePart.data)
    const text = result?.fullTextAnnotation?.text || ''

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    }
  } catch (err: any) {
    console.error('OCR error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OCR_FAILED', message: err?.message || 'Unknown error' })
    }
  }
}
