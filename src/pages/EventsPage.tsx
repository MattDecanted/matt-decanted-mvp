import React, { useEffect, useState } from "react";
import { Calendar, Users, Clock, MapPin, Crown, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  start_at?: string | null;   // ISO
  end_at?: string | null;     // ISO
  location?: string | null;
  tier?: string | null;       // 'free' | 'pro' | 'vip' (or 'basic'/'premium' in older data)
  is_published?: boolean | null;
  max_participants?: number | null;
  current_participants?: number | null;
};

const mockEvents: EventRow[] = [
  {
    id: "e1",
    title: "Live Blind Tasting: Old World vs New World",
    description: "A fast, fun session to sharpen your palate.",
    start_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    end_at: new Date(Date.now() + 3 * 24 * 3600 * 1000 + 60 * 3600 * 1000).toISOString(),
    location: "Online (Zoom)",
    tier: "pro",
    is_published: true,
    max_participants: 50,
    current_participants: 23,
  },
  {
    id: "e2",
    title: "Community AMA with Matt",
    description: "Open Q&A—bring a glass and your questions.",
    start_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    end_at: new Date(Date.now() + 7 * 24 * 3600 * 1000 + 60 * 3600 * 1000).toISOString(),
    location: "Online (Zoom)",
    tier: "free",
    is_published: true,
    max_participants: 200,
    current_participants: 88,
  },
];

export default function EventsPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const myTier = (profile as any)?.membership_tier || (profile as any)?.role || "free";
  const tierRank = (t?: string | null) => {
    const norm = String(t || "free").toLowerCase();
    return norm === "vip" || norm === "premium" ? 3 : norm === "pro" || norm === "basic" ? 2 : 1;
  };
  const myRank = tierRank(myTier);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Try tables in order, fallback to mock
      try {
        // 1) Your dedicated events table (preferred)
        const r1 = await supabase
          .from("events")
          .select("*")
          .eq("is_published", true)
          .gte("start_at", new Date(Date.now() - 12 * 3600 * 1000).toISOString())
          .order("start_at", { ascending: true });
        if (!r1.error && Array.isArray(r1.data) && r1.data.length) {
          setEvents(r1.data as EventRow[]);
          setLoading(false);
          return;
        }

        // 2) If you use 'masterclasses' instead
        const r2 = await supabase
          .from("masterclasses")
          .select("id,title,description,date,time,duration,location,tier,is_published,max_participants,current_participants")
          .order("date", { ascending: true });
        if (!r2.error && Array.isArray(r2.data) && r2.data.length) {
          const mapped = (r2.data as any[]).map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            start_at: m.date ? new Date(`${m.date}T${m.time || "18:00"}`).toISOString() : null,
            end_at: null,
            location: m.location || "Online",
            tier: m.tier || "pro",
            is_published: m.is_published ?? true,
            max_participants: m.max_participants ?? null,
            current_participants: m.current_participants ?? null,
          })) as EventRow[];
          setEvents(mapped);
          setLoading(false);
          return;
        }

        // 3) Fallback to mock
        setEvents(mockEvents);
      } catch (e) {
        console.warn("[events] load failed:", e);
        setEvents(mockEvents);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Events</h1>
          <p className="text-gray-600">Live tastings, AMAs, and masterclasses.</p>
        </div>

        {events.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-gray-600">
            No upcoming events. Check back soon!
          </div>
        ) : (
          <ul className="space-y-4">
            {events.map((ev) => {
              const required = tierRank(ev.tier);
              const gate = required > myRank;
              return (
                <li key={ev.id} className="bg-white rounded-lg border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-gray-700" />
                        <h2 className="text-lg font-semibold">{ev.title}</h2>
                        <span
                          className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            (ev.tier || "free").toLowerCase() === "vip"
                              ? "bg-purple-100 text-purple-800"
                              : (ev.tier || "free").toLowerCase() === "pro" || (ev.tier || "free").toLowerCase() === "basic"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {(ev.tier || "free").toUpperCase()}
                          {(ev.tier || "free").toLowerCase() === "vip" && <Crown className="w-3 h-3" />}
                          {((ev.tier || "free").toLowerCase() === "pro" || (ev.tier || "free").toLowerCase() === "basic") && (
                            <Star className="w-3 h-3" />
                          )}
                        </span>
                      </div>
                      {ev.description && <p className="text-gray-700 mb-2">{ev.description}</p>}
                      <div className="text-sm text-gray-600 flex flex-wrap items-center gap-3">
                        {ev.start_at && (
                          <span className="inline-flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {new Date(ev.start_at).toLocaleString()}
                          </span>
                        )}
                        {ev.location && (
                          <span className="inline-flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {ev.location}
                          </span>
                        )}
                        {(ev.current_participants != null || ev.max_participants != null) && (
                          <span className="inline-flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {ev.current_participants ?? 0}/{ev.max_participants ?? "∞"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {gate ? (
                        <a
                          href="/pricing"
                          className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                        >
                          Upgrade to join
                        </a>
                      ) : (
                        <a
                          href="#"
                          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Register
                        </a>
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
