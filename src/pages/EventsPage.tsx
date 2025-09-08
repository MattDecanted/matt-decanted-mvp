import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Calendar, Clock, Users, Crown, Star } from "lucide-react";

type EventRow = {
  id: string;
  title: string;
  description: string;
  date: string;        // ISO
  time?: string | null;
  duration?: string | null;
  location?: string | null;
  min_tier?: "free" | "pro" | "vip" | null; // normalized in UI
  is_published?: boolean | null;
  max_participants?: number | null;
  current_participants?: number | null;
};

export default function EventsPage() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin =
    (profile as any)?.role === "admin" ||
    (profile as any)?.is_admin === true ||
    ((user?.user_metadata as any)?.role === "admin");

  const rawTier =
    (profile as any)?.membership_tier ||
    (profile as any)?.role ||
    "free";
  const myTier: "free" | "pro" | "vip" =
    rawTier === "vip" || rawTier === "pro" || rawTier === "free"
      ? rawTier
      : rawTier === "trial"
      ? "pro"
      : "free";

  const rank = (t: string) => (t === "vip" ? 3 : t === "pro" ? 2 : 1);

  const lockedForMe = (e: EventRow) => {
    const t = (e.min_tier || "free") as "free" | "pro" | "vip";
    return isAdmin ? false : rank(myTier) < rank(t);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);

      // Try a generic "events" table first
      const q1 = await supabase
        .from("events")
        .select("*")
        .gte("date", new Date().toISOString())
        .order("date");

      if (alive && !q1.error && Array.isArray(q1.data)) {
        setEvents(
          (q1.data as any[]).map((e) => normalize(e))
        );
        setLoading(false);
        return;
      }

      // Fallback to "masterclasses"
      const q2 = await supabase
        .from("masterclasses")
        .select("*")
        .gte("date", new Date().toISOString())
        .order("date");

      if (alive && !q2.error && Array.isArray(q2.data)) {
        setEvents(
          (q2.data as any[]).map((e) =>
            normalize({
              ...e,
              // map tier → min_tier
              min_tier:
                e.tier === "premium" ? "vip" :
                e.tier === "basic" ? "pro" : "free",
            })
          )
        );
      }

      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const upcoming = useMemo(
    () => events.filter((e) => !e.is_published || e.is_published).slice(0, 20),
    [events]
  );

  function normalize(e: any): EventRow {
    return {
      id: String(e.id),
      title: String(e.title ?? "Untitled event"),
      description: String(e.description ?? ""),
      date: String(e.date ?? e.starts_at ?? new Date().toISOString()),
      time: e.time ?? e.starts_at ? new Date(e.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : e.time ?? null,
      duration: e.duration ?? e.length ?? null,
      location: e.location ?? e.place ?? null,
      min_tier: (e.min_tier ?? "free") as any,
      is_published: e.is_published ?? true,
      max_participants: e.max_participants ?? e.capacity ?? null,
      current_participants: e.current_participants ?? e.current ?? 0,
    };
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Events & Masterclasses</h1>
          <p className="text-gray-600 mt-1">
            Live tastings, masterclasses, and community meetups.
          </p>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-lg bg-white border p-6 text-center text-gray-600">
            No upcoming events. Check back soon!
          </div>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {upcoming.map((e) => {
              const locked = lockedForMe(e);
              return (
                <li key={e.id} className="bg-white border rounded-lg p-5 flex flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-gray-500 mb-1 inline-flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(e.date).toLocaleDateString()}{" "}
                        {e.time ? `@ ${e.time}` : ""}
                      </div>
                      <h3 className="text-lg font-semibold">{e.title}</h3>
                      <div className="mt-1 text-sm text-gray-600 line-clamp-3">{e.description}</div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        {e.duration && (
                          <span className="inline-flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {e.duration}
                          </span>
                        )}
                        {e.max_participants && (
                          <span className="inline-flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {e.current_participants ?? 0}/{e.max_participants}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                            (e.min_tier || "free") === "vip"
                              ? "bg-purple-100 text-purple-800"
                              : (e.min_tier || "free") === "pro"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {(e.min_tier || "free").toUpperCase()}
                          {(e.min_tier || "free") === "vip" && <Crown className="w-3 h-3" />}
                          {(e.min_tier || "free") === "pro" && <Star className="w-3 h-3" />}
                        </span>
                      </div>
                    </div>

                    <div className="ml-4">
                      {locked ? (
                        <Link to="/pricing" className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm">
                          Upgrade to join
                        </Link>
                      ) : (
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm">
                          Register
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
