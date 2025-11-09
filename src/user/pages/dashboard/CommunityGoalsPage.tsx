import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

interface Organization {
  id: string;
  name: string;
}

type GameType = "quiz" | "flappy";

interface CommunityGoal {
  id: string;
  org_id: string;
  quiz_id?: number;
  challenge_id?: string; // for Flappy
  goal_type: "score" | "participants";
  goal_target: number;
  reward_coins: number;
  current_progress: number;
  is_completed: boolean;
  created_at: string;
  title?: string; // quiz title or challenge name
}

const CommunityGoalsPage: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<GameType>("quiz");
  const [goals, setGoals] = useState<CommunityGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's organizations
  useEffect(() => {
    const fetchUserOrgs = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return;

        const { data: memberships, error: membershipsError } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (membershipsError) throw membershipsError;
        if (!memberships || memberships.length === 0) {
          setOrgs([]);
          setGoals([]);
          return;
        }

        const orgIds = memberships.map((m) => m.org_id);
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);

        if (orgError) throw orgError;

        setOrgs(orgData || []);
        if (orgData && orgData.length > 0) setSelectedOrg(orgData[0].id);
      } catch (err) {
        console.error("❌ Error fetching user orgs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrgs();
  }, []);

  // Fetch goals when org or game changes
  useEffect(() => {
    if (!selectedOrg) return;

    const fetchGoals = async () => {
      setLoading(true);
      try {
        if (selectedGame === "quiz") {
          const { data: goalsData, error: goalsError } = await supabase
            .from("community_goals")
            .select("*")
            .eq("org_id", selectedOrg)
            .order("created_at", { ascending: false });

          if (goalsError) throw goalsError;
          if (!goalsData) {
            setGoals([]);
            return;
          }

          const quizIds = goalsData.map((g) => g.quiz_id);
          const { data: quizzesData, error: quizzesError } = await supabase
            .from("quizzes")
            .select("id, title")
            .in("id", quizIds);

          if (quizzesError) throw quizzesError;

          const quizMap = new Map(quizzesData.map((q) => [q.id, q.title]));
          const goalsWithTitles = goalsData.map((g) => ({
            ...g,
            title: quizMap.get(g.quiz_id!) || `Quiz ID: ${g.quiz_id}`,
          }));
          setGoals(goalsWithTitles);
        } else if (selectedGame === "flappy") {
  const { data: goalsData, error: goalsError } = await supabase
    .from("community_goals_flappy")
    .select("*")
    .eq("org_id", selectedOrg)
    .order("created_at", { ascending: false });

  if (goalsError) throw goalsError;
  if (!goalsData || goalsData.length === 0) {
    setGoals([]);
    return;
  }

  // ✅ Collect valid challenge IDs only
  const challengeIds = goalsData
    .map((g) => g.challenge_id)
    .filter((id): id is string => !!id && id.trim() !== "");

  console.log("Challenge IDs:", challengeIds);

  // ✅ Fetch flappy config names by challenge_id
  const { data: challengeData, error: challengeError } = await supabase
    .from("flappy_config")
    .select("challenge_id, name")
    .in("challenge_id", challengeIds);

  if (challengeError) throw challengeError;

  console.log("Challenge Data:", challengeData);

  // ✅ Map challenge_id → name
  const challengeMap = new Map(
    (challengeData || []).map((c) => [c.challenge_id, c.name])
  );

  // ✅ Assign names to each goal
  const goalsWithNames = goalsData.map((g) => ({
    ...g,
    title:
      challengeMap.get(g.challenge_id?.trim() || "") ||
      `Challenge ${g.challenge_id}`,
  }));

  setGoals(goalsWithNames);
}
      } catch (err) {
        console.error("❌ Error fetching goals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [selectedOrg, selectedGame]);

  if (loading) return <div className="text-center py-10">Loading community goals...</div>;

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6">
        <div className="mb-6 text-center">
          <p className="text-gray-600 text-sm mt-1">
            Stay on top of your organization’s goals! 
            Track quiz progress, earn rewards, and celebrate every milestone your community achieves together.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Organization
          </label>
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full border rounded-lg p-2 mb-4"
          >
            <option value="">Select an organization</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Game
          </label>
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value as GameType)}
            className="w-full border rounded-lg p-2"
          >
            <option value="quiz">Quiz</option>
            <option value="flappy">Flappy Challenge</option>
          </select>
        </div>

        {goals.length === 0 ? (
          <p className="text-gray-500 text-center py-10">
            No active {selectedGame === "quiz" ? "quiz" : "Flappy"} goals found for this organization.
          </p>
        ) : (
          <div className="space-y-6">
            {goals.map((goal) => {
              const progressPercent = Math.min(
                (goal.current_progress / goal.goal_target) * 100,
                100
              );
              const goalTypeLabel =
                goal.goal_type === "score"
                  ? "Score Goal"
                  : "Participants Goal";

              return (
                <div
                  key={goal.id}
                  className={`border rounded-xl p-4 ${
                    goal.is_completed ? "bg-green-50 border-green-400" : "bg-white"
                  }`}
                >
                  <h2 className="text-lg font-semibold mb-1">
                    {selectedGame === "quiz" ? "🎯 Quiz:" : "🕹 Flappy:"} {goal.title}
                  </h2>

                  <p className="text-sm text-gray-600 mb-2">
                    {goalTypeLabel} — Target: {goal.goal_target} | Reward: 💰 {goal.reward_coins} coins
                  </p>

                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-4 rounded-full ${
                        goal.is_completed ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {goal.current_progress}/{goal.goal_target} ({progressPercent.toFixed(1)}%)
                  </p>

                  {goal.is_completed && (
                    <p className="text-green-600 font-semibold mt-2">
                      ✅ Goal completed! Participants have received their coins.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityGoalsPage;
