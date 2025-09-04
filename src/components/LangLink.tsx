import * as React from "react";
import {
  Link as RRLink,
  NavLink as RRNavLink,
  LinkProps as RRLinkProps,
  NavLinkProps as RRNavLinkProps,
  useLocation,
  To,
} from "react-router-dom";
import { useLocale } from "@/context/LocaleContext";

function withLang(to: To, locale?: string): To {
  if (!locale) return to;
  if (typeof to === "string") {
    const url = new URL(to, window.location.origin);
    url.searchParams.set("lang", locale);
    return url.pathname + url.search + url.hash;
  }
  const pathname = to.pathname ?? window.location.pathname;
  const params = new URLSearchParams(to.search || "");
  params.set("lang", locale);
  const search = "?" + params.toString();
  return { ...to, pathname, search };
}

export function LangLink(props: RRLinkProps) {
  const { locale } = useLocale();
  return <RRLink {...props} to={withLang(props.to, locale || "en")} />;
}

export function LangNavLink(props: RRNavLinkProps) {
  const { locale } = useLocale();
  return <RRNavLink {...props} to={withLang(props.to, locale || "en")} />;
}
