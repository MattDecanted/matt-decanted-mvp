import React from 'react';

type Props = {
  onText: (text: string) => void;
  endpoint?: string; // optional override
};

const OCRUpload: React.FC<Props> = ({ onText, endpoint = '/.netlify/functions/ocr-label' }) => {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(endpoint, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'OCR failed');
      }
      const text = (json?.text || '').trim();
      onText(text);
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    // reset input so picking the same file twice still triggers
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="block w-full text-sm"
      />
      {uploading && (
        <div className="text-xs text-gray-600">Running OCR…</div>
      )}
      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}
    </div>
  );
};

export default OCRUpload;
