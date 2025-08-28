// src/components/SEO/SEOHead.tsx
import React, { useEffect } from "react";

type SEOProps = {
  title?: string;
  description?: string;
  image?: string;      // og:image
  noIndex?: boolean;   // robots noindex
};

export default function SEOHead({ title, description, image, noIndex = false }: SEOProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (title) {
      document.title = title;
      setMeta("og:title", title, "property");
      setMeta("twitter:title", title, "name");
    }

    if (description) {
      setMeta("description", description, "name");
      setMeta("og:description", description, "property");
      setMeta("twitter:description", description, "name");
    }

    if (image) {
      setMeta("og:image", image, "property");
      setMeta("twitter:image", image, "name");
      setMeta("twitter:card", "summary_large_image", "name");
    }

    setMeta("og:type", "article", "property");
    setMeta("og:site_name", "Matt Decanted", "property");

    if (noIndex) {
      setMeta("robots", "noindex,nofollow", "name");
    }
  }, [title, description, image, noIndex]);

  return null;
}

function setMeta(name: string, content: string, attr: "name" | "property") {
  const selector = attr === "name" ? `meta[name="${name}"]` : `meta[property="${name}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
