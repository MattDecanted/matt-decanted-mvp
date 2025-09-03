// src/components/VideoPlayer.tsx
import React from "react";
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
}: Props) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow">
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
      />
    </div>
  );
}
