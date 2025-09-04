// src/pages/ShortDetailPage.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Trophy, CheckCircle, ArrowLeft, Clock, Globe, Link as LinkIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";
import { useAnalytics } from "@/context/AnalyticsContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/** 🔒 Entitlements */
import { Gate, LockBadge } from "@/components/LockGate";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import PointsProgressChip from "@/components/PointsProgressChip";
import type { Tier } from "@/lib/entitlements";
import { useShortProgress } from "@/hooks/useLocalProgress";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";
import PointsGainBubble from "@/components/PointsGainBubble";
import LevelUpBanner from "@/components/LevelUpBanner";

import i18n from "i18next";

/* ---------------- Types ---------------- */
type Short = {
  id: string;
  slug: string;
  title: string;
  video_url: string;
  preview: boolean;
  is_published: boolean;
  created_at: string;
};

type Question = {
  id: string;
  question: string;
  options: string[]; // for T/F we’ll store ["true","false"]
  correct_index: number;
  points_award: number;
};

type QuizState = {
  currentQuestion: number;
  answers: number[];
  showResults: boolean;
  correctCount: number;
};

type ShortMeta = {
  required_points: number;
  required_tier: Tier;
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

export default function ShortDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Language switcher
  const [forcedLocale, setForcedLocale] = useState<string>(() => localStorage.getItem("md_locale") || "auto");
  const detected = (i18n?.language || navigator.language || "en").slice(0, 2).toLowerCase();
  const locale = (forcedLocale === "auto" ? detected : forcedLocale).slice(0, 2);

  const [short, setShort] = useState<Short | null>(null);
  const [shortI18n, setShortI18n] = useState<ShortI18n | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [videoWatched, setVideoWatched] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const { setPercent: saveLocalPercent } = useShortProgress(slug);

  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: [],
    showResults: false,
    correctCount: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  /** 🎉 UI: “+points” bubble + level-up banner */
  const [justGained, setJustGained] = useState<number>(0);
  const [levelOpen, setLevelOpen] = useState(false);
  const [levelMsg, setLevelMsg] = useState<string>("You just crossed a points gate and unlocked more learning content.");

  /** 🔒 Entitlement state */
  const [meta, setMeta] = useState<ShortMeta>({
    required_points: 0,
    required_tier: "free",
    is_active: true,
  });
  const
