// src/components/VideoPlayer.tsx
import React, { Suspense } from "react";
import type { CSSProperties } from "react";

// Use the package's lazy entry
import ReactPlayer from "react-player/lazy";

type Props = {
  url: string;
  playing?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  width?: string | number;
  height?: string | number;
  light?: boolean | string; // thumbnail URL or true
  onEnded?: () => void;
  style?: CSSProperties;
};

export default function VideoPlayer({
  url,
  playing = false,
  controls = true,
  loop = false,
  muted = false,
  width = "100%",
  height = "100%",
  light = false,
  onEnded,
  style,
}: Props) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow">
      <Suspense
        fallback={
          <div className="aspect-video flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          </div>
        }
      >
        <ReactPlayer
          url={url}
          playing={playing}
          controls={controls}
          loop={loop}
          muted={muted}
          width={width}
          height={height}
          light={light}
          onEnded={onEnded}
          style={style}
        />
      </Suspense>
    </div>
  );
}
