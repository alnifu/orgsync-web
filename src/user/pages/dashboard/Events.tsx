"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { supabase } from "../../../lib/supabase";

// Type
type EventDetails = {
  id: string;
  title: string;
  events: {
    event_date: string;
    event_time: string;
    location: string;
  } | null;
};

export default function Events() {
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [highlightDates, setHighlightDates] = useState<Date[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          id,
          title,
          events (
            event_date,
            event_time,
            location
          )
        `
        )
        .eq("type", "event")
        .gte("events.event_date", today)
        .order("event_date", { foreignTable: "events", ascending: true });

      if (error) {
        console.error("Error fetching events:", error.message);
      } else {
        const mapped = (data ?? []).map((post: any) => ({
          id: post.id,
          title: post.title,
          events: post.events ?? null,
        }));

        setEvents(mapped);

        // Extract event_date → JS Date objects for highlighting
        const dates = mapped
          .filter((p) => p.events?.event_date)
          .map((p) => new Date(p.events!.event_date));
        setHighlightDates(dates);
      }
    }

    fetchEvents();
  }, []);

  function formatReadableDateTime(dateString: string, timeString?: string) {
    try {
      if (timeString) {
        const dateTime = new Date(`${dateString}T${timeString}`);
        return dateTime.toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  }


  return (
    <div className="p-3">
      <div className="bg-white shadow-lg rounded-2xl p-6 max-w-md mx-auto">
        {/* Calendar */}
        <Calendar
          value={null}
          selectRange={false}
          onChange={undefined}
          className="w-full border-0"
          prev2Label={null}
          next2Label={null}
          tileClassName={({ date, view }) => {
            const today = new Date();

            // Highlight event dates
            if (
              view === "month" &&
              highlightDates.some(
                (d) =>
                  d.getFullYear() === date.getFullYear() &&
                  d.getMonth() === date.getMonth() &&
                  d.getDate() === date.getDate()
              )
            ) {
              return "!bg-green-600 !text-white rounded-full";
            }

            // Today highlight
            if (
              view === "month" &&
              date.getFullYear() === today.getFullYear() &&
              date.getMonth() === today.getMonth() &&
              date.getDate() === today.getDate()
            ) {
              return "bg-green-200 text-green-800 rounded-full";
            }

            return "hover:bg-green-100 rounded-full";
          }}
        />

        {/* Upcoming Events Section */}
        <div className="mt-2 pt-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Upcoming
          </h2>
          {events.length > 0 ? (
            events.map((event) =>
              event.events ? (
                <div
                  key={event.id}
                  className="p-4 mb-2 bg-green-50 rounded-lg border border-green-200"
                >
                  <h3 className="font-bold text-green-800 text-base">
                    {event.title}
                  </h3>
                  <p className="text-sm text-gray-700 mt-1">
                  {formatReadableDateTime(
                    event.events.event_date,
                    event.events.event_time
                  )}{" "}
                  @ {event.events.location}
                </p>
                </div>
              ) : null
            )
          ) : (
            <p className="text-sm text-gray-500">No upcoming events</p>
          )}
        </div>
      </div>
    </div>
  );
}
