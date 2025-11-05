import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useNavigate } from "react-router";

interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

function formatReadableDateTime(dateString: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MemberContests() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadActiveContests();
  }, []);

  const loadActiveContests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("room_contests")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date();

      const validContests = (data || []).filter((contest) => {
        const { start_date, end_date } = contest;

        // No start and end date → always visible
        if (!start_date && !end_date) return true;

        // Handle missing start or end
        const start = start_date ? new Date(start_date) : new Date(0); 
        const end = end_date ? new Date(end_date) : new Date(8640000000000000); 

        return now >= start && now <= end;
      });

      setContests(validContests);
    } catch (err) {
      console.error("Error loading contests:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50 text-gray-900">
      <div className="mb-6 text-center">
        <p className="text-gray-600 text-sm mt-1">
          Show off your creativity! Join active room design contests, personalize your virtual space, 
          and submit your masterpiece to earn exciting rewards.
        </p>
      </div>

      {loading ? (
        <p>Loading contests...</p>
      ) : contests.length === 0 ? (
        <p>No active contests at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.map((contest) => (
            <div
              key={contest.id}
              className="bg-white p-4 rounded-lg shadow-md border border-green-200 hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold mb-2 text-green-800">{contest.title}</h2>
              <p className="text-gray-700 mb-2">
                {contest.description || "No description provided."}
              </p>

              {contest.start_date && (
                <p className="text-sm text-green-600">
                  Starts: {formatReadableDateTime(contest.start_date)}
                </p>
              )}
              {contest.end_date && (
                <p className="text-sm text-green-600 mb-3">
                  Ends: {formatReadableDateTime(contest.end_date)}
                </p>
              )}

              <button
                onClick={() => navigate("../room-game")}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg w-full"
              >
                Join Contest
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
