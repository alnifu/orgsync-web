"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { X } from "lucide-react";
import { Link } from "react-router";

type EventPost = {
  id: string;
  title: string;
  content?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  org_id?: string;
  visibility?: "public" | "private";
};

function formatReadableDateTime(dateString?: string, startTime?: string, endTime?: string) {
  if (!dateString) return "No date provided";
  try {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formatTime = (time?: string) => {
      if (!time) return "";
      const [h, m] = time.split(":");
      const t = new Date();
      t.setHours(Number(h), Number(m));
      return t.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    };
    if (startTime && endTime) {
      return (
        <>
          <span>{formattedDate}</span>
          <br />
          <span className="text-gray-600">
            {formatTime(startTime)} – {formatTime(endTime)}
          </span>
        </>
      );
    } else if (startTime) {
      return (
        <>
          <span>{formattedDate}</span>
          <br />
          <span className="text-gray-600">{formatTime(startTime)}</span>
        </>
      );
    }
    return <span>{formattedDate}</span>;
  } catch {
    return <span>{dateString}</span>;
  }
}

export default function DashboardHome() {
  const [events, setEvents] = useState<EventPost[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) throw userError;

        // Get user's org memberships
        const { data: memberData, error: memberError } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .eq("is_active", true);
        if (memberError) throw memberError;
        const memberOrgIds = memberData?.map((m) => m.org_id) ?? [];

        // Fetch upcoming events (public or private)
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("posts")
          .select("id, title, content, event_date, start_time, end_time, location, org_id, visibility")
          .eq("post_type", "event")
          .gte("event_date", today)
          .order("event_date", { ascending: true })
          .limit(10);

        if (error) throw error;

        // Filter by visibility
        const visibleEvents = (data ?? []).filter((event) => {
          if (event.visibility === "public") return true;
          if (event.visibility === "private" && memberOrgIds.includes(event.org_id)) return true;
          return false;
        });

        // Sort upcoming events and keep only top 3
        const upcoming = visibleEvents.sort(
          (a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime()
        );
        setEvents(upcoming.slice(0, 3));
      } catch (err: any) {
        console.error("Error fetching events:", err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Welcome back 👋</h2>
        <p className="text-gray-600">
          Here’s a quick overview of what’s happening.
        </p>
      </div>

      {/* Upcoming Events */}
      <section>
        <h3 className="text-lg font-semibold mb-3">📅 Upcoming Events</h3>
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-3"></div>
              <p className="text-gray-600 text-md">Loading events...</p>
            </div>
          ) : events.length > 0 ? (
            events.map((event) => (
              <div
                key={event.id}
                className="bg-white shadow rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedEvent(event)}
              >
                <p className="font-medium text-gray-900">{event.title}</p>
                <p className="text-sm text-gray-700">
                  {formatReadableDateTime(event.event_date, event.start_time, event.end_time)}
                </p>
                <p className="text-sm text-gray-600">{event.location}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No upcoming events</p>
          )}
        </div>
      </section>

      {/* Featured Games */}
      <section>
        <h3 className="text-lg font-semibold mb-3">🎮 Featured Games</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* My Virtual Room */}
          <div className="bg-white shadow rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">My Virtual Room</p>
              <p className="text-sm text-gray-600 mt-1">
                Design your own virtual space and submit screenshots to earn rewards!
              </p>
            </div>
            <Link
              to="room-game"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition ml-4 whitespace-nowrap"
            >
              Play
            </Link>
          </div>

          {/* Quiz Games */}
          <div className="bg-white shadow rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Quiz Games</p>
              <p className="text-sm text-gray-600 mt-1">
                Test your knowledge, compete with others, and climb the leaderboard!
              </p>
            </div>
            <Link
              to="quiz-selection"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition ml-4 whitespace-nowrap"
            >
              Play
            </Link>
          </div>

          {/* Flappy Challenge */}
          <div className="bg-white shadow rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Flappy Challenge</p>
              <p className="text-sm text-gray-600 mt-1">
                Tap to fly through obstacles, beat your best score, and compete in challenges!
              </p>
            </div>
            <Link
              to="flappy-challenges"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition ml-4 whitespace-nowrap"
            >
              Play
            </Link>
          </div>
        </div>
      </section>

      {/* Modal */}
      {selectedEvent && (
        <div className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {selectedEvent.title}
            </h2>

            <div className="mb-4 text-gray-700">
              {selectedEvent.event_date && (
                <p>
                  <strong>Date & Time:</strong>
                  <br />
                  {formatReadableDateTime(
                    selectedEvent.event_date,
                    selectedEvent.start_time,
                    selectedEvent.end_time
                  )}
                </p>
              )}
              {selectedEvent.location && (
                <p className="mt-2">
                  <strong>Location:</strong> {selectedEvent.location}
                </p>
              )}
            </div>

            {selectedEvent.content && (
              <div className="text-gray-700">
                <p>{selectedEvent.content}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
