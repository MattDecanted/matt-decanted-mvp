// src/lib/imagePlaceholders.ts
// Consistent, brand-safe placeholders as inline SVG data URIs

/** 16:9 thumbnail for the weekly challenge grid/cards */
export function weekThumbPlaceholder(weekNumber: number) {
  const w = 1280, h = 720;
  const title = `Week ${String(weekNumber).padStart(2, "0")}`;
  const subtitle = `Blind Tasting Challenge`;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff8a00"/>
        <stop offset="100%" stop-color="#ff5e00"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <g fill="rgba(255,255,255,0.12)">
      <circle cx="${w*0.15}" cy="${h*0.85}" r="180"/>
      <circle cx="${w*0.9}" cy="${h*0.15}" r="120"/>
    </g>
    <text x="50%" y="48%" text-anchor="middle"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
      font-size="92" font-weight="800" fill="white">
      ${title}
    </text>
    <text x="50%" y="60%" text-anchor="middle"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
      font-size="36" font-weight="600" fill="rgba(255,255,255,0.85)">
      ${subtitle}
    </text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 2:3 bottle placeholder (for reveal) */
export function bottlePlaceholder() {
  const w = 600, h = 900;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff5e8"/>
        <stop offset="100%" stop-color="#ffe8d2"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <!-- simple bottle silhouette -->
    <g transform="translate(${w/2}, ${h/2})">
      <path d="M -35 -320 h 70 v 80 c 0 20 -10 35 -10 55 v 40 c 30 30 50 80 50 150 c 0 120 -50 200 -110 200 c -60 0 -110 -80 -110 -200 c 0 -70 20 -120 50 -150 v -40 c 0 -20 -10 -35 -10 -55 v -80 h 70 z"
            fill="#352f2a" fill-opacity="0.12"/>
      <rect x="-55" y="-40" width="110" height="140" rx="6" fill="#ffffff" fill-opacity="0.85" stroke="#e7d2bf"/>
    </g>
    <text x="50%" y="${h-40}" text-anchor="middle"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
      font-size="22" fill="#7a5a3a">Bottle image</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
