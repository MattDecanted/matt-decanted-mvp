// src/components/OCRUpload.tsx
import React from 'react';
import { ocrLabel } from '@/lib/ocr';

type Props = {
  onText?: (text: string) => void; // optional callback with OCR result
};

const OCRUpload: React.FC<Props> = ({ onText }) => {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<string>('');
  const [preview, setPreview] = React.useState<string | null>(null);

  const onPick = async (file?: File | null) => {
    if (!file) return;
    setError(null);
    setResult('');
    setBusy(true);
    setPreview(URL.createObjectURL(file));

    try {
      const { text } = await ocrLabel(file);
      setResult(text || '');
      onText?.(text || '');
    } catch (e: any) {
      setError(e?.message ?? 'OCR failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white space-y-3">
      <div className="text-sm font-medium">Label OCR</div>

      <label className="inline-block">
        <input
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <span className="px-3 py-2 rounded-md bg-black text-white text-sm cursor-pointer">
          {busy ? 'Uploading…' : 'Choose Image'}
        </span>
      </label>

      {preview && (
        <div className="flex items-start gap-3">
          <img
            src={preview}
            alt="preview"
            className="w-28 h-28 object-cover rounded border"
          />
          {busy && <div className="text-sm text-gray-600">Running OCR…</div>}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      {result && (
        <div className="text-sm">
          <div className="font-medium mb-1">Extracted Text</div>
          <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded border max-h-60 overflow-auto">
{result}
          </pre>
        </div>
      )}
    </div>
  );
};

export default OCRUpload;
