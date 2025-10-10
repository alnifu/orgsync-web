"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { X } from "lucide-react";
import { Link } from "react-router";

// Type for event posts
type EventPost = {
  id: string;
  title: string;
  content?: string;
  events: {
    event_date: string;
    event_time: string;
    location: string;
  } | null; // one-to-one relation
};

// Utility: format date+time nicely
function formatReadableDateTime(dateString: string, timeString?: string) {
  try {
    if (timeString) {
      const dateTime = new Date(`${dateString}T${timeString}`);
      return dateTime.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export default function DashboardHome() {
  const [events, setEvents] = useState<EventPost[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventPost | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          id,
          title,
          content,
          events (
            event_date,
            event_time,
            location
          )
        `
        )
        .eq("type", "event")
        .gte("events.event_date", today)
        .order("event_date", { foreignTable: "events", ascending: true })
        .limit(3);

      if (error) {
        console.error("Error fetching events:", error.message);
      } else {
        setEvents(
          (data ?? []).map((post: any) => ({
            id: post.id,
            title: post.title,
            content: post.content,
            events: post.events ?? null,
          }))
        );
      }
    }

    fetchEvents();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome */}
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
          {events.length > 0 ? (
            events.map((event) => (
              <div
                key={event.id}
                className="bg-white shadow rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedEvent(event)}
              >
                <p className="font-medium text-gray-900">{event.title}</p>
                {event.events ? (
                  <>
                    <p className="text-sm text-gray-600">
                      {formatReadableDateTime(
                        event.events.event_date,
                        event.events.event_time
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {event.events.location}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No event details</p>
                )}
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
          <div className="bg-white shadow rounded-lg p-4 flex items-center justify-between">
            <p className="font-medium text-gray-900">My Virtual Room</p>
            <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition">
              Play
            </button>
          </div>
          <div className="bg-white shadow rounded-lg p-4 flex items-center justify-between">
            <p className="font-medium text-gray-900">Quiz Games</p>
            <Link
              to="/unity-game"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
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

            {selectedEvent.events && (
              <div className="mb-4 text-gray-700">
                <p>
                  <strong>Date & Time:</strong>{" "}
                  {formatReadableDateTime(
                    selectedEvent.events.event_date,
                    selectedEvent.events.event_time
                  )}
                </p>
                <p>
                  <strong>Location:</strong> {selectedEvent.events.location}
                </p>
              </div>
            )}

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
