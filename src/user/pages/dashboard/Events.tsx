"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { supabase } from "../../../lib/supabase";

// Type
type EventDetails = {
  id: string;
  title: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
};

// Format date & time nicely
function formatReadableDateTime(
  dateString?: string,
  startTime?: string,
  endTime?: string
) {
  if (!dateString) return "No date provided";

  try {
    const date = new Date(dateString);

    // Format like "Fri, Oct 18, 2025"
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    let formattedTime = "";

    if (startTime) {
      const start = new Date(`${dateString}T${startTime}`);
      formattedTime = start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    if (endTime) {
      const end = new Date(`${dateString}T${endTime}`);
      const endFormatted = end.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      formattedTime += startTime ? ` - ${endFormatted}` : endFormatted;
    }

    return (
      <>
        <div>{formattedDate}</div>
        {formattedTime && <div>{formattedTime}</div>}
      </>
    );
  } catch {
    return <>{dateString}</>;
  }
}

export default function Events() {
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [highlightDates, setHighlightDates] = useState<Date[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      const { data, error } = await supabase
        .from("posts")
        .select("id, title, event_date, start_time, end_time, location")
        .eq("post_type", "event")
        .gte("event_date", today)
        .order("event_date", { ascending: true });

      if (error) {
        console.error("Error fetching events:", error.message);
        return;
      }

      setEvents(data ?? []);

      // Highlight event dates
      const dates = (data ?? [])
        .filter((p) => p.event_date)
        .map((p) => new Date(p.event_date!));
      setHighlightDates(dates);
    }

    fetchEvents();
  }, []);

  return (
    <div className="p-3">
      <div className="bg-white shadow-lg rounded-2xl p-6 max-w-md mx-auto">
        {/* Calendar */}
        <div className="flex justify-center">
        <Calendar
          value={null}
          selectRange={false}
          className="w-full max-w-md border-0"
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
        </div>

        {/* Upcoming Events Section */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Upcoming
          </h2>
          {events.length > 0 ? (
            events.map((event) => (
              <div
                key={event.id}
                className="p-4 mb-2 bg-green-50 rounded-lg border border-green-200"
              >
                <h3 className="font-bold text-green-800 text-base">
                  {event.title}
                </h3>
                <p className="text-sm text-gray-700 mt-1">
                  {formatReadableDateTime(
                    event.event_date,
                    event.start_time,
                    event.end_time
                  )}
                </p>
                {event.location && (
                  <p className="text-sm text-gray-700">@ {event.location}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No upcoming events</p>
          )}
        </div>
      </div>
    </div>
  );
}
