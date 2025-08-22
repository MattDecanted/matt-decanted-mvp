// src/components/WineOptions/OcrUploader.tsx
import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import { supabase } from '@/lib/supabase';

type Props = {
  onMatched: (args: { gameId: string, wineId: string, labelId: string }) => void;
  onManualNeeded: (imgUrl: string, rawText: string) => void; // fallback UI
};

export default function OcrUploader({ onMatched, onManualNeeded }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true); setError(null);
    try {
      // 1) Upload to storage
      const filename = `${crypto.randomUUID()}-${file.name.replace(/\s+/g,'_')}`;
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user?.id || 'anon';
      const storagePath = `${uid}/${filename}`;
      const { error: upErr } = await supabase.storage.from('labels').upload(storagePath, file, { upsert: false });
      if (upErr) throw upErr;

      // Signed URL for client preview (10m)
      const { data: urlData } = await supabase.storage.from('labels').createSignedUrl(storagePath, 600);
      const previewUrl = urlData?.signedUrl || '';

      // 2) OCR in browser
      const worker = await createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const rawText = (text || '').replace(/\s+/g, ' ').trim();

      // 3) Save label + text (and attempt a match via SQL/RPC)
      const { data: labelRow, error: insErr } = await supabase
        .from('wine_labels')
        .insert([{
          storage_path: storagePath,
          ocr_text: rawText,
          detected_words: rawText.split(/\W+/).filter(Boolean).slice(0, 50)
        }])
        .select()
        .single();
      if (insErr) throw insErr;

      // 4) Ask Postgres to find the closest wine using pg_trgm similarity
      const { data: match, error: mErr } = await supabase
        .rpc('match_wine_from_ocr', { _ocr: rawText })
        .single(); // returns {wine_id, confidence}
      if (mErr) throw mErr;

      if (!match?.wine_id || match?.confidence < 0.25) {
        // fallback to manual mapping UI
        onManualNeeded(previewUrl, rawText);
        return;
      }

      // 5) Create a game tied to this label + wine
      const { data: game, error: gErr } = await supabase
        .from('wine_options_games')
        .insert([{ wine_id: match.wine_id, label_id: labelRow.id }])
        .select('id, wine_id, label_id')
        .single();
      if (gErr) throw gErr;

      onMatched({ gameId: game.id, wineId: game.wine_id, labelId: game.label_id });
    } catch (e: any) {
      setError(e.message || 'OCR failed');
    } finally {
      setBusy(false);
      e.currentTarget.value = '';
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={onPick} disabled={busy} />
      {busy && <div className="text-sm text-gray-500 mt-2">Scanning label…</div>}
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
    </div>
  );
}
