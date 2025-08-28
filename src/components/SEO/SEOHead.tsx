// src/components/SEO/SEOHead.tsx
import React from "react";

type Props = {
  title?: string;
  description?: string;
  image?: string; // optional: og:image
};

export default function SEOHead({ title, description, image }: Props) {
  React.useEffect(() => {
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
      setMeta// src/components/SEO/SEOHead.tsx
import React from "react";

type Props = {
  title?: string;
  description?: string;
  image?: string; // optional: og:image
};

export default function SEOHead({ title, description, image }: Props) {
  React.useEffect(() => {
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
  }, [title, description, image]);

  return null;
}

function setMeta(name: string, content: string, attr: "name" | "property") {
  const selector = attr === "name" ? `meta[name="${name}"]` : `meta[property="${name}"]`;
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
("twitter:image", image, "name");
      setMeta("twitter:card", "summary_large_image", "name");
    }
  }, [title, description, image]);

  return null;
}

function setMeta(name: string, content: string, attr: "name" | "property") {
  const selector = attr === "name" ? `meta[name="${name}"]` : `meta[property="${name}"]`;
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
