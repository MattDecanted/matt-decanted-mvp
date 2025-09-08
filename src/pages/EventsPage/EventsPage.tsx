// src/pages/EventsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Raw = Record<string, any>;
type EventItem = {
  id: string;
  title: string;
  description: string;
  startsAt: string | null;   // ISO
  endsAt?: string | null;    // ISO
  dateLabel: string;         // e.g., "Tue 10 Sep"
  timeLabel: string;         // e.g., "6:30 PM"
  location?: string | null;
  instructor?: string | null;
  tier?: string | null;      // 'basic' | 'premium' | 'free' | null
  capacity?: number | null;
  registeredCount?: number | null;
};

function tryGet<T = any>(row: Raw, keys: string[], def: T | null = null): T | null {
  for (const k of keys) if (k in row && row[k] != null) return row[k] as T;
  return def;
}

function makeEvent(row: Raw): EventItem | null {
  const id = tryGet<string>(row, ["id", "event_id", "slug", "code"]) || crypto.randomUUID();

  const title = tryGet<string>(row, ["title", "name"]) || "Untitled event";
  const description = tryGet<string>(row, ["description", "summary"]) || "";

  // Start/end timestamps — tolerate many schemas
  const startIso =
    tryGet<string>(row, ["starts_at", "start_at", "start_time", "date", "scheduled_at"]) || null;
  const endIso = tryGet<string>(row, ["ends_at", "end_at", "end_time"]) || null;

  const start = startIso ? new Date(startIso) : null;
  const dateLabel = start ? start.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" }) : "";
  const timeLabel = start ? start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";

  const location =
    tryGet<string>(row, ["location", "venue"]) ||
    [tryGet(row, ["city"], ""), tryGet(row, ["state", "region"], ""), tryGet(row, ["country"], "")]
      .filter(Boolean)
      .join(", ") || null;

  const instructor =
    tryGet<string>(row, ["instructor", "host", "speaker", "presenter"]) || null;

  const tier = tryGet<string>(row, ["tier", "access_tier", "plan"]) || null;
  const capacity = tryGet<number>(row, ["max_participants", "capacity"], null);
  const registeredCount = tryGet<number>(row, ["current_participants", "registrations"], null);

  return {
    id,
    title,
    description,
    startsAt: startIso,
    endsAt: endIso,
    dateLabel,
    timeLabel,
    location,
    instructor,
    tier,
    capacity,
    registeredCount,
  };
}

export default function EventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [reg, setReg] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // event id while registering

  // Load upcoming events (try "events" then "masterclasses")
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let rows: Raw[] = [];
        // Prefer a generic 'events' table if present
        try {
          const { data, error } = await supabase.from("events").select("*").order("starts_at", { ascending: true }).limit(100);
          if (!error && Array.isArray(data)) rows = data as Raw[];
        } catch {
          // ignore
        }

        // Fallback to masterclasses
        if (rows.length === 0) {
          try {
            const { data, error } = await supabase.from("masterclasses").select("*").order("date", { ascending: true }).limit(100);
            if (!error && Array.isArray(data)) rows = data as Raw[];
          } catch {
            // ignore
          }
        }

        // Map + filter to upcoming (if startsAt missing, keep it anyway)
        const mapped = rows
          .map(makeEvent)
          .filter(Boolean) as EventItem[];

        const now = Date.now();
        const upcoming = mapped.filter((e) => !e.startsAt || new Date(e.startsAt).getTime() >= now);

        setEvents(upcoming);

        // Load current user's registrations if table exists
        if (user && upcoming.length) {
          try {
            const { data, error } = await supabase
              .from("event_registrations")
              .select("event_id")
              .eq("user_id", user.id);
            if (!error && Array.isArray(data)) {
              const map: Record<string, boolean> = {};
              for (const r of data) map[String((r as any).event_id)] = true;
              setReg(map);
            }
          } catch {
            // table might not exist; that's ok
          }
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load events.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const grouped = useMemo(() => {
    const g = new Map<string, EventItem[]>();
    for (const e of events) {
      const key = e.dateLabel || "TBA";
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(e);
    }
    return Array.from(g.entries());
  }, [events]);

  async function onRegister(ev: EventItem) {
    if (!user) {
      navigate("/signin");
      return;
    }
    setBusy(ev.id);
    setError(null);
    try {
      // optimistic local toggle if table missing
      let ok = false;
      try {
        const { error } = await supabase
          .from("event_registrations")
          .insert({ user_id: user.id, event_id: ev.id, status: "registered" });
        if (!error) ok = true;
        else if (!/relation.*event_registrations/i.test(error.message)) throw error;
      } catch (err: any) {
        if (err?.message && !/relation.*event_registrations/i.test(err.message)) {
          throw err;
        }
      }
      setReg((r) => ({ ...r, [ev.id]: true }));
      if (!ok) {
        // soft confirm if table missing
        console.warn("[events] event_registrations table missing — simulated register only.");
      }
    } catch (e: any) {
      setError(e?.message || "Could not register.");
    } finally {
      setBusy(null);
    }
  }

  async function onUnregister(ev: EventItem) {
    if (!user) return;
    setBusy(ev.id);
    setError(null);
    try {
      let ok = false;
      try {
        const { error } = await supabase
          .from("event_registrations")
          .delete()
          .eq("user_id", user.id)
          .eq("event_id", ev.id);
        if (!error) ok = true;
        else if (!/relation.*event_registrations/i.test(error.message)) throw error;
      } catch (err: any) {
        if (err?.message && !/relation.*event_registrations/i.test(err.message)) {
          throw err;
        }
      }
      setReg((r) => {
        const copy = { ...r };
        delete copy[ev.id];
        return copy;
      });
      if (!ok) {
        console.warn("[events] event_registrations table missing — simulated unregister only.");
      }
    } catch (e: any) {
      setError(e?.message || "Could not unregister.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-gray-600">Masterclasses, tastings, and community sessions.</p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-600">Loading…</div>
        ) : events.length === 0 ? (
          <div className="rounded-lg bg-white border p-6 text-center text-gray-600">
            No upcoming events. Check back soon!
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, items]) => (
              <section key={date} className="bg-white border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <h2 className="font-semibold">{date}</h2>
                </div>
                <ul className="divide-y">
                  {items.map((ev) => {
                    const isReg = !!reg[ev.id];
                    return (
                      <li key={ev.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{ev.title}</div>
                          {ev.description && (
                            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{ev.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                            {ev.timeLabel && (
                              <span className="inline-flex items-center">
                                <Clock className="w-3.5 h-3.5 mr-1" />
                                {ev.timeLabel}
                              </span>
                            )}
                            {ev.location && (
                              <span className="inline-flex items-center">
                                <MapPin className="w-3.5 h-3.5 mr-1" />
                                {ev.location}
                              </span>
                            )}
                            {typeof ev.capacity === "number" && (
                              <span className="inline-flex items-center">
                                <Users className="w-3.5 h-3.5 mr-1" />
                                {ev.registeredCount ?? 0}/{ev.capacity}
                              </span>
                            )}
                            {ev.tier && (
                              <span className="px-2 py-0.5 rounded-full border text-gray-700">
                                {ev.tier.toUpperCase()}
                              </span>
                            )}
                            {ev.instructor && <span>Host: {ev.instructor}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isReg ? (
                            <button
                              onClick={() => onUnregister(ev)}
                              disabled={busy === ev.id}
                              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
                              title="Unregister"
                            >
                              <XCircle className="w-4 h-4" />
                              {busy === ev.id ? "Working…" : "Unregister"}
                            </button>
                          ) : (
                            <button
                              onClick={() => onRegister(ev)}
                              disabled={busy === ev.id}
                              className="inline-flex items-center gap-1 rounded-md bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {busy === ev.id ? "Working…" : user ? "Register" : "Sign in to register"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-500">
          Want something specific? <Link to="/about" className="underline">Tell us</Link>.
        </div>
      </div>
    </div>
  );
}
