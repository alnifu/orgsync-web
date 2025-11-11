import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  username?: string | null;
  score: number;
  created_at: string;
  rank?: number;
}

interface Quiz {
  id: number;
  title: string;
}

interface FlappyChallenge {
  challenge_id: string;
  name: string;
}

interface OrganizationLeaderboardProps {
  organizationId: string;
}

const OrganizationLeaderboard: React.FC<OrganizationLeaderboardProps> = ({ organizationId }) => {
  const [gameType, setGameType] = useState<"quiz" | "flappy">("quiz");

  // Quiz state
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);

  // Flappy state
  const [flappyChallenges, setFlappyChallenges] = useState<FlappyChallenge[]>([]);
  const [selectedFlappy, setSelectedFlappy] = useState<string>("");

  // Scores
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch quizzes for organization
  useEffect(() => {
    if (gameType !== "quiz") return;

    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("quizzes")
          .select("id, title")
          .eq("org_id", organizationId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setQuizzes(data || []);
        if (data && data.length > 0) setSelectedQuiz(data[0].id);
      } catch (err: any) {
        console.error("Error fetching quizzes:", err);
        setErrorMessage("Failed to load quizzes.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [organizationId, gameType]);

  // Fetch Flappy challenges
  useEffect(() => {
    if (gameType !== "flappy") return;

    const fetchFlappyChallenges = async () => {
      try {
        const { data, error } = await supabase
          .from("flappy_config")
          .select("challenge_id, name")
          .order("name");

        if (error) throw error;
        setFlappyChallenges(data || []);
        if (data && data.length > 0) setSelectedFlappy(data[0].challenge_id);
      } catch (err) {
        console.error("Error fetching flappy challenges:", err);
      }
    };

    fetchFlappyChallenges();
  }, [gameType]);

  // Fetch leaderboard scores
  useEffect(() => {
    if (
      (gameType === "quiz" && !selectedQuiz) ||
      (gameType === "flappy" && !selectedFlappy)
    )
      return;

    const fetchScores = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        let data: any[] = [];

        if (gameType === "quiz") {
          const res = await supabase
            .from("scores")
            .select("*")
            .eq("quiz_id", selectedQuiz)
            .eq("org_id", organizationId)
            .order("score", { ascending: false })
            .limit(10);
          data = res.data || [];
        } else if (gameType === "flappy") {
          const res = await supabase
            .from("flappy_scores")
            .select("*")
            .eq("challenge_id", selectedFlappy)
            .eq("org_id", organizationId)
            .order("score", { ascending: false })
            .limit(10);
          data = res.data || [];
        }

        const ranked = data.map((s, i) => ({ ...s, rank: i + 1 }));
        setScores(ranked);
      } catch (err: any) {
        console.error("Error fetching scores:", err);
        setErrorMessage("Failed to fetch leaderboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [gameType, selectedQuiz, selectedFlappy, organizationId]);

  return (
    <div className="space-y-4">
      {/* Game Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Game Type
        </label>
        <select
          value={gameType}
          onChange={(e) => setGameType(e.target.value as "quiz" | "flappy")}
          className="w-full border rounded-lg p-2"
        >
          <option value="quiz">Quiz</option>
          <option value="flappy">Flappy Challenge</option>
        </select>
      </div>

      {/* Quiz Selector */}
      {gameType === "quiz" && quizzes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Quiz
          </label>
          <select
            value={selectedQuiz ?? ""}
            onChange={(e) => setSelectedQuiz(Number(e.target.value))}
            className="w-full border rounded-lg p-2"
          >
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Flappy Selector */}
      {gameType === "flappy" && flappyChallenges.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Challenge
          </label>
          <select
            value={selectedFlappy}
            onChange={(e) => setSelectedFlappy(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            {flappyChallenges.map((c) => (
              <option key={c.challenge_id} value={c.challenge_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-lg shadow p-6 mt-4">
        <h3 className="text-lg font-semibold mb-4 text-center">🏆 Leaderboard</h3>

        {loading && <div className="text-center py-6 text-gray-500">Loading...</div>}
        {errorMessage && <div className="text-center text-red-500 mb-4">{errorMessage}</div>}

        {!loading && scores.length > 0 ? (
          <ol className="divide-y divide-gray-200">
            {scores.map((entry) => {
              // Format the created_at date
              const createdAt = new Date(entry.created_at);
              const formattedDate = createdAt.toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <li key={entry.id} className="py-3 flex flex-col sm:flex-row sm:justify-between">
                  <span>
                    {entry.rank}. <span className="font-medium">{entry.username || entry.user_id.slice(0, 6)}</span>
                  </span>
                  <div className="text-right">
                    <span className="font-semibold">{entry.score}</span>
                    <div className="text-xs text-gray-400">{formattedDate}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          !loading && <div className="text-center text-gray-500 py-6">No leaderboard entries yet.</div>
        )}
      </div>
    </div>
  );
};

export default OrganizationLeaderboard;
