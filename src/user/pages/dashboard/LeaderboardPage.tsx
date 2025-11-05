import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";
import Leaderboard from "../../components/Leaderboard";

interface Organization {
  id: string;
  name: string;
}

interface Quiz {
  id: number;
  title: string;
}

interface FlappyChallenge {
  challenge_id: string;
  name: string;
}

interface Score {
  id: string;
  user_id: string;
  username: string | null;
  score: number;
  created_at: string;
  rank?: number;
}

const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");

  const [gameType, setGameType] = useState<"quiz" | "flappy">("quiz");

  // Quiz state
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);

  // Flappy state
  const [flappyChallenges, setFlappyChallenges] = useState<FlappyChallenge[]>([]);
  const [selectedFlappy, setSelectedFlappy] = useState<string>("");

  // Scores
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch orgs
  useEffect(() => {
    if (!user) return;

    const fetchOrgs = async () => {
      try {
        const { data: memberships } = await supabase
          .from("org_members")
          .select("org_id, organizations(name)")
          .eq("user_id", user.id)
          .eq("is_active", true);

        const orgList = (memberships || []).map((m: any) => ({
          id: m.org_id,
          name: m.organizations.name,
        }));

        setOrgs(orgList);
        if (orgList.length > 0) setSelectedOrg(orgList[0].id);
      } catch (err) {
        console.error("Error fetching orgs:", err);
      }
    };

    fetchOrgs();
  }, [user]);

  // Fetch quizzes for selected org
  useEffect(() => {
    if (!selectedOrg || gameType !== "quiz") return;

    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("quizzes")
          .select("id, title")
          .eq("org_id", selectedOrg);

        if (error) throw error;
        setQuizzes(data || []);
        if (data && data.length > 0) setSelectedQuiz(data[0].id);
      } catch (err) {
        console.error("Error fetching quizzes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [selectedOrg, gameType]);

  // Fetch flappy challenges
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

  // Fetch flappy scores
  useEffect(() => {
    if (gameType !== "flappy" || !selectedOrg || !selectedFlappy || !user) return;

    const fetchScores = async () => {
      setLoading(true);
      try {
        const { data: topScores } = await supabase
          .from("flappy_scores")
          .select("*")
          .eq("challenge_id", selectedFlappy)
          .eq("org_id", selectedOrg)
          .order("score", { ascending: false })
          .limit(10);

        let combined = topScores || [];
        const userInTop = combined.some((s) => s.user_id === user.id);

        if (!userInTop) {
          const { data: userScore } = await supabase
            .from("flappy_scores")
            .select("*")
            .eq("challenge_id", selectedFlappy)
            .eq("org_id", selectedOrg)
            .eq("user_id", user.id)
            .single();

          if (userScore) combined = [...combined, userScore];
        }

        combined.sort((a, b) => b.score - a.score);
        setScores(combined.map((s, i) => ({ ...s, rank: i + 1 })));
      } catch (err) {
        console.error("Error fetching flappy scores:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [gameType, selectedOrg, selectedFlappy]);

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow p-6">
        <p className="text-center text-sm text-gray-600 mb-6">
          View the top performers from quizzes or Flappy challenges in your organization.
        </p>

        {/* Game Type Selector */}
        <div className="mb-4">
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

        {/* Organization Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Organization
          </label>
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option value="">Select an organization</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        {/* Game-specific Selector */}
        {gameType === "quiz" && selectedOrg && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Quiz
            </label>
            <select
              value={selectedQuiz ?? ""}
              onChange={(e) =>
                setSelectedQuiz(Number(e.target.value) || null)
              }
              className="w-full border rounded-lg p-2"
            >
              <option value="">Select a quiz</option>
              {quizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {gameType === "flappy" && selectedOrg && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Challenge
            </label>
            <select
              value={selectedFlappy}
              onChange={(e) => setSelectedFlappy(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              <option value="">Select a challenge</option>
              {flappyChallenges.map((c) => (
                <option key={c.challenge_id} value={c.challenge_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Display Leaderboard */}
        {loading ? (
          <div className="text-center py-6 text-gray-500">Loading leaderboard...</div>
        ) : gameType === "quiz" && selectedQuiz && selectedOrg ? (
          <Leaderboard quizId={selectedQuiz} orgId={selectedOrg} />
        ) : gameType === "flappy" && selectedOrg && selectedFlappy ? (
          scores.length > 0 ? (
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-6 mt-4">
              <h2 className="text-2xl font-bold mb-4 text-center">🏆 Leaderboard</h2>

              <ol className="divide-y divide-gray-200">
                {scores.map((score, index) => (
                  <li
                    key={score.id}
                    className={`py-3 flex justify-between items-center ${
                      score.user_id === user?.id ? "bg-green-50 font-bold rounded-lg px-2" : ""
                    }`}
                  >
                    <span>
                      {score.rank}.{" "}
                      <span className="font-medium">
                        {score.username || score.user_id.slice(0, 6)}
                      </span>
                    </span>
                    <div className="text-right">
                      <span className="font-semibold block">{score.score}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(score.created_at).toLocaleString("en-US", {
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
            </div>
          ) : (
            <div className="text-center text-gray-500 py-6">
              No scores yet for this challenge.
            </div>
          )
        ) : (
          <div className="text-center text-gray-500 py-6">
            Select a quiz or challenge to view its leaderboard.
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
