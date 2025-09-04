// src/pages/ShortsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";
import { toast } from "sonner";
import { Lock, Play, Globe, Clock } from "lucide-react";
import i18n from "i18next";

/* ---------- Types (align with your DB) ---------- */
type Short = {
  id: string;
  slug: string;
  title: string;
  video_url: string | null;
  preview: boolean;
  is_published: boolean;
  created_at: string;
};

type GateMeta = {
  slug: string;
  required_points: number;
  required_tier: "free" | "pro" | "vip";
  is_active: boolean;
};

type ShortI18n = {
  id: string;
  short_id: string;
  locale: string;
  title_i18n: string | null;
  blurb_i18n: string | null;
  video_url_alt: string | null;
  pdf_url_alt: string | null;
};

/* ---------- Language options for the switcher ---------- */
const LANGS = [
  { code: "auto", name: "Auto (browser/i18n)", flag: "🌐" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

/* ---------- Helper: tier ranking ---------- */
const tierRank: Record<GateMeta["required_tier"], number> = { free: 0, pro: 1, vip: 2 };

/* =======================================================
   PAGE
======================================================= */
export default function ShortsPage() {
  const { user, profile } = useAuth() as any;
  const userTier = (profile?.membership_tier || "free") as GateMeta["required_tier"];
  const { totalPoints } = (usePoints() as any) || {};

  const [loading, setLoading] = useState(true);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [gates, setGates] = useState<Record<string, GateMeta>>({});
  const [i18nRows, setI18nRows] = useState<Record<string, ShortI18n | null>>({});
  const [userPoints, setUserPoints] = useState<number>(Number(totalPoints ?? 0));

  const [query, setQuery] = useState("");

  // NEW: language switcher (persist to localStorage for convenience)
  const [forcedLocale, setForcedLocale] = useState<string>(
    () => localStorage.getItem("md_locale") || "auto"
  );
  const detected = (i18n?.language || navigator.language || "en").slice(0, 2).toLowerCase();
  const locale = (forcedLocale === "auto" ? detected : forcedLocale).slice(0, 2);

  useEffect(() => {
    loadAll().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function loadAll() {
    setLoading(true);
    try {
      // 1) Shorts
      const { data: s, error: sErr } = await supabase
        .from("shorts")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (sErr) throw sErr;
      const list = (s || []) as Short[];
      setShorts(list);

      // 2) Gates by slug
      const slugs = list.map((x) => x.slug);
      let gatesMap: Record<string, GateMeta> = {};
      if (slugs.length) {
        const { data: g, error: gErr } = await supabase
          .from("content_shorts")
          .select("slug, required_points, required_tier, is_active")
          .in("slug", slugs);
        if (!gErr && g) {
          g.forEach((row: any) => {
            gatesMap[row.slug] = {
              slug: row.slug,
              required_points: Number(row.required_points ?? 0),
              required_tier: (row.required_tier ?? "free") as GateMeta["required_tier"],
              is_active: Boolean(row.is_active ?? true),
            };
          });
        }
      }
      setGates(gatesMap);

      // 3) I18n for selected locale
      const ids = list.map((x) => x.id);
      let i18Map: Record<string, ShortI18n | null> = {};
      if (ids.length) {
        const { data: t, error: tErr } = await supabase
          .from("shorts_i18n")
          .select("*")
          .eq("locale", locale)
          .in("short_id", ids);
        if (!tErr && t) {
          ids.forEach((id) => (i18Map[id] = null));
          (t as any[]).forEach((row) => {
            i18Map[row.short_id] = row as ShortI18n;
          });
        }
      }
      setI18nRows(i18Map);

      // 4) User points snapshot (if not in context yet)
      if (user?.id && (totalPoints === undefined || totalPoints === null)) {
        const { data: pt } = await supabase
          .from("user_points_totals_v1")
          .select("total_points")
          .eq("user_id", user.id)
          .maybeSingle();
        setUserPoints(Number(pt?.total_points ?? 0));
      } else {
        setUserPoints(Number(totalPoints ?? 0));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load shorts");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Derive display models ---------- */
  type VM = {
    id: string;
    slug: string;
    title: string;
    blurb: string;
    videoUrl: string | null;
    pdfUrl: string | null;
    preview: boolean;
    createdAt: string;
    gate?: GateMeta;
    locked: boolean;
  };

  const cards: VM[] = useMemo(() => {
    return shorts.map((s) => {
      const i = i18nRows[s.id];
      const gate = gates[s.slug];

      // lock logic
      let locked = false;
      if (gate && gate.is_active && !s.preview) {
        const tierOk = tierRank[userTier] >= tierRank[gate.required_tier];
        const pointsOk = userPoints >= Number(gate.required_points || 0);
        locked = !(tierOk && pointsOk);
      }

      return {
        id: s.id,
        slug: s.slug,
        title: i?.title_i18n || s.title,
        blurb: i?.blurb_i18n || "",
        videoUrl: i?.video_url_alt || s.video_url,
        pdfUrl: i?.pdf_url_alt || null,
        preview: Boolean(s.preview),
        createdAt: s.created_at,
        gate,
        locked,
      };
    });
  }, [shorts, i18nRows, gates, userTier, userPoints]);

  const filtered = useMemo(() => {
    if (!query.trim()) return cards;
    const q = query.trim().toLowerCase();
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.blurb.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [cards, query]);

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Shorts</h1>
            <p className="text-gray-600">
              Bite-sized micro-lessons (5–15 min). Localized when available{" "}
              <span className="inline-flex items-center gap-1 text-gray-500">
                <Globe className="w-4 h-4" />{" "}
                <span className="uppercase">{locale}</span>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <Input
              placeholder="Search shorts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-56"
            />

            {/* NEW: Language switcher */}
            <select
              value={forcedLocale}
              onChange={(e) => {
                const v = e.target.value;
                setForcedLocale(v);
                localStorage.setItem("md_locale", v);
              }}
              className="px-3 py-2 border rounded-md bg-white text-sm"
              title="Preview a different language"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KpiCard label="Available" value={cards.length} />
          <KpiCard label="Your points" value={userPoints} />
          <KpiCard label="Your tier" value={userTier.toUpperCase()} />
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-lg p-8 text-center shadow">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent mx-auto mb-3" />
            <p className="text-gray-500">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => (
              <Card key={c.id} className="overflow-hidden border border-[color:var(--line)]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg leading-snug">{c.title}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>5–15m</span>
                      </Badge>
                      {c.preview && <Badge variant="outline">Preview</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {c.blurb ? (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{c.blurb}</p>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3">
                      Quick micro-lesson with a short quiz to earn points.
                    </p>
                  )}

                  {/* Language assets quick view */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    {c.videoUrl ? (
                      <a
                        href={c.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        Open video
                      </a>
                    ) : (
                      <span>Video link missing</span>
                    )}
                    {c.pdfUrl && (
                      <>
                        <span>•</span>
                        <a
                          href={c.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-2"
                        >
                          PDF (locale)
                        </a>
                      </>
                    )}
                  </div>

                  {/* Gate chip */}
                  {c.gate?.is_active && !c.preview && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <Lock className="w-3 h-3" />
                      <span>
                        {c.gate.required_tier.toUpperCase()} • {c.gate.required_points} pts
                      </span>
                      {c.locked ? (
                        <Badge variant="outline" className="ml-1">Locked</Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-1">Unlocked</Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      className="flex-1"
                      variant={c.locked ? "outline" : "default"}
                      disabled={c.locked}
                    >
                      <Link to={`/shorts/${c.slug}`}>
                        <Play className="w-4 h-4 mr-2" />
                        {c.locked ? "Locked" : "Start"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link to={`/shorts/${c.slug}`}>Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Small UI bits ---------- */
function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums mt-1">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 bg-white rounded-lg shadow">
      <Play className="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-900 mb-1">No shorts yet</h3>
      <p className="text-gray-600">Check back soon—new micro-lessons coming.</p>
    </div>
  );
}
