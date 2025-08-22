// src/lib/ocr.ts
export async function ocrLabel(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/.netlify/functions/ocr-label', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`OCR failed: ${res.status}`);
  return res.json() as Promise<{ text: string }>;
}
