// src/components/ShareButton.tsx
import React from 'react';

export default function ShareButton({ url, title="Play Wine Options with me!" }: { url: string, title?: string }) {
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };
  return (
    <button onClick={share} className="px-3 py-2 rounded bg-purple-600 text-white">
      Share with friends
    </button>
  );
}
