import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  username?: string | null;
  score: number;
  created_at: string;
}

interface LeaderboardProps {
  quizId: number;
  orgId: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ quizId, orgId }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setErrorMessage("");
      console.log("⏳ Fetching leaderboard for quizId:", quizId, "orgId:", orgId);

      try {
        const { data, error } = await supabase
          .from("scores")
          .select("id, user_id, username, score, created_at, org_id")
          .eq("quiz_id", quizId)
          .eq("org_id", orgId)
          .order("score", { ascending: false })
          .limit(10);

        console.log("Raw data:", data, "Error:", error);

        if (error) throw error;

        if (!data || data.length === 0) {
          setEntries([]);
          setErrorMessage("No scores yet for this quiz in this organization.");
          console.warn("No leaderboard entries returned by Supabase.");
        } else {
          console.log("Leaderboard entries found:", data);
          setEntries(data);
        }
      } catch (err: any) {
        console.error("Error fetching leaderboard:", err);
        setErrorMessage(err.message || "Failed to fetch leaderboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [quizId, orgId]);

  if (loading) return <div className="text-center py-8">Loading leaderboard...</div>;

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">🏆 Leaderboard</h2>

      {errorMessage && (
        <div className="text-center text-red-500 mb-4">{errorMessage}</div>
      )}

      {entries.length > 0 ? (
        <ol className="divide-y divide-gray-200">
          {entries.map((entry, index) => (
            <li key={entry.id} className="py-3 flex justify-between items-center">
              <span>
                {index + 1}.{" "}
                <span className="font-medium">
                  {entry.username || entry.user_id.slice(0, 6)}
                </span>
              </span>
              <div className="text-right">
                <span className="font-semibold block">{entry.score}</span>
                <span className="text-xs text-gray-500">
                  {new Date(entry.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="text-center text-gray-500 py-6">
          No leaderboard entries yet.
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
