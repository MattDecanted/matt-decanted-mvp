// src/components/VideoPlayer.tsx
import React from "react";
import ReactPlayer from "react-player/lazy";

type Props = {
  url: string;
  className?: string;
  /** Called with 0..100 */
  onProgress?: (percent: number) => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  muted?: boolean;
};

export default function VideoPlayer({
  url,
  className,
  onProgress,
  onEnded,
  autoPlay = false,
  muted = false,
}: Props) {
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <ReactPlayer
        url={url}
        width="100%"
        height="100%"
        controls
        playing={autoPlay}
        muted={muted}
        onProgress={({ played }) => {
          const pct = Math.round((played || 0) * 100);
          onProgress?.(pct);
        }}
        onEnded={onEnded}
        config={{
          youtube: {
            playerVars: {
              // cleaner YouTube embed
              modestbranding: 1,
              rel: 0,
            },
          },
          vimeo: {
            // keep defaults; can add options here
          },
        }}
      />
    </div>
  );
}
