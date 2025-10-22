import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  username?: string | null;
  score: number;
  created_at: string;
}

interface OrganizationLeaderboardProps {
  organizationId: string;
}

const OrganizationLeaderboard: React.FC<OrganizationLeaderboardProps> = ({ organizationId }) => {
  const [quizzes, setQuizzes] = useState<{ id: number; title: string }[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch quizzes for the organization
  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("quizzes")
          .select("id, title")
          .eq("org_id", organizationId);

        if (error) throw error;

        setQuizzes(data || []);
        if (data && data.length > 0) {
          setSelectedQuiz(data[0].id);
        }
      } catch (err: any) {
        console.error("❌ Error fetching quizzes:", err);
        setErrorMessage("Failed to load quizzes.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [organizationId]);

  // Fetch leaderboard for selected quiz
  useEffect(() => {
    if (!selectedQuiz) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setErrorMessage("");
      console.log("⏳ Fetching leaderboard for quizId:", selectedQuiz, "orgId:", organizationId);

      try {
        const { data, error } = await supabase
          .from("scores")
          .select("id, user_id, username, score, created_at, org_id")
          .eq("quiz_id", selectedQuiz)
          .eq("org_id", organizationId)
          .order("score", { ascending: false })
          .limit(10);

        console.log("📝 Raw data:", data, "Error:", error);

        if (error) throw error;

        if (!data || data.length === 0) {
          setEntries([]);
          setErrorMessage("No scores yet for this quiz.");
        } else {
          setEntries(data);
        }
      } catch (err: any) {
        console.error("❌ Error fetching leaderboard:", err);
        setErrorMessage(err.message || "Failed to fetch leaderboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedQuiz, organizationId]);

  const handleQuizChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setSelectedQuiz(isNaN(value) ? null : value);
  };

  if (loading && quizzes.length === 0) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      {quizzes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Quiz</label>
          <select
            value={selectedQuiz ?? ""}
            onChange={handleQuizChange}
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-green-500 focus:border-green-500"
          >
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
            ))}
          </select>
        </div>
      )}

      {selectedQuiz ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-center">🏆 Leaderboard</h3>

          {errorMessage && (
            <div className="text-center text-red-500 mb-4">{errorMessage}</div>
          )}

          {loading ? (
            <div className="text-center py-8">Loading leaderboard...</div>
          ) : entries.length > 0 ? (
            <ol className="divide-y divide-gray-200">
              {entries.map((entry, index) => (
                <li key={entry.id} className="py-3 flex justify-between">
                  <span>
                    {index + 1}.{" "}
                    <span className="font-medium">
                      {entry.username || entry.user_id.slice(0, 6)}
                    </span>
                  </span>
                  <span className="font-semibold">{entry.score}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-center text-gray-500 py-6">
              No leaderboard entries yet.
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-6">
          No quizzes available for this organization.
        </div>
      )}
    </div>
  );
};

export default OrganizationLeaderboard;