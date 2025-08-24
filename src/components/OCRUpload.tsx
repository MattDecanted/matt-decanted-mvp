import React from 'react';

type Props = {
  onText: (text: string) => void;
  onError?: (message: string) => void;
  maxFileSizeMB?: number;      // default 8
  maxEdgePx?: number;          // default 2000 (downscale largest edge)
  className?: string;
};

const OCRUpload: React.FC<Props> = ({
  onText,
  onError,
  maxFileSizeMB = 8,
  maxEdgePx = 2000,
  className = '',
}) => {
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const abortRef = React.useRef<AbortController | null>(null);

  const reportError = (msg: string) => {
    setError(msg);
    onError?.(msg);
  };

  const stopOngoing = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  React.useEffect(() => () => stopOngoing(), []);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setError('');
    setBusy(true);
    stopOngoing(); // cancel previous
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please choose an image file (JPG/PNG).');
      }
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        // Try to downscale if too big
        const smaller = await downscaleImage(file, maxEdgePx);
        await runOCR(smaller, ac.signal, onText);
        return;
      }

      // For medium/large images, still downscale to improve OCR speed
      const maybeDownscaled =
        file.size > 2 * 1024 * 1024 ? await downscaleImage(file, maxEdgePx) : file;

      await runOCR(maybeDownscaled, ac.signal, onText);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      reportError(e?.message || 'Upload failed.');
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  async function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    await handleFiles(e.target.files);
    // allow same-file reselect
    e.target.value = '';
  }

  async function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    await handleFiles(e.dataTransfer?.files || null);
  }

  return (
    <div className={className}>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`block border-2 border-dashed rounded-md p-4 text-sm cursor-pointer
          ${dragOver ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-gray-400'}
          ${busy ? 'opacity-70 pointer-events-none' : ''}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">Drop an image here, or click to upload</div>
            <div className="text-xs text-gray-500">
              JPG/PNG. We’ll auto-resize large images for faster OCR.
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            // capture helps mobile open camera (browsers may ignore)
            capture="environment"
            onChange={onInputChange}
            className="hidden"
          />
          <span className="px-3 py-2 border rounded-md">Choose file</span>
        </div>
      </label>

      {busy && (
        <div className="mt-2 text-xs text-gray-600">Uploading & running OCR…</div>
      )}
      {error && (
        <div className="mt-2 text-xs text-red-600">Error: {error}</div>
      )}
    </div>
  );
};

export default OCRUpload;

/* =========================
   Helpers
   ========================= */

async function runOCR(file: File, signal: AbortSignal, onText: (t: string) => void) {
  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch('/.netlify/functions/ocr-label', {
    method: 'POST',
    body: fd,
    signal,
  });

  const raw = await res.text();
  if (!res.ok) {
    try {
      const data = JSON.parse(raw);
      throw new Error(data?.error || `OCR failed (${res.status})`);
    } catch {
      throw new Error(raw || `OCR failed (${res.status})`);
    }
  }

  const { text } = JSON.parse(raw);
  onText((text || '').trim());
}

// Downscale to keep max edge under maxEdgePx, preserve aspect ratio.
// Output as JPEG ~0.9 quality to balance detail/size (tune if needed).
async function downscaleImage(file: File, maxEdgePx: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const scale = Math.min(1, maxEdgePx / Math.max(width, height));
  if (scale >= 1) return file; // already within bounds

  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  // Render onto canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  // Better scaling quality
  (ctx as any).imageSmoothingEnabled = true;
  (ctx as any).imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.9)
  );

  return new File([blob], renameToJpg(file.name), { type: 'image/jpeg' });
}

function renameToJpg(name: string) {
  const dot = name.lastIndexOf('.');
  const base = dot >= 0 ? name.slice(0, dot) : name;
  return `${base}.jpg`;
}
