import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

interface Organization {
  id: string;
  name: string;
}

interface CommunityGoal {
  id: string;
  org_id: string;
  quiz_id: number;
  goal_type: "score" | "participants";
  goal_target: number;
  reward_coins: number;
  is_completed: boolean;
  current_progress: number;
  created_at: string;
  quiz_title?: string; 
}

const CommunityGoalsPage: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [goals, setGoals] = useState<CommunityGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user org memberships
  useEffect(() => {
    const fetchUserOrgs = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return;

        // Fetch orgs where the user is an active member
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

  // Fetch community goals for selected org (with quiz titles)
  useEffect(() => {
    if (!selectedOrg) return;

    const fetchGoals = async () => {
      setLoading(true);
      try {
        // Fetch all goals
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

        // Fetch all quiz titles used in these goals
        const quizIds = goalsData.map((g) => g.quiz_id);
        const { data: quizzesData, error: quizzesError } = await supabase
          .from("quizzes")
          .select("id, title")
          .in("id", quizIds);

        if (quizzesError) throw quizzesError;

        const quizMap = new Map(quizzesData.map((q) => [q.id, q.title]));

        // Attach titles to goals
        const goalsWithTitles = goalsData.map((g) => ({
          ...g,
          quiz_title: quizMap.get(g.quiz_id) || `Quiz ID: ${g.quiz_id}`,
        }));

        setGoals(goalsWithTitles);
      } catch (err) {
        console.error("❌ Error fetching goals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [selectedOrg]);

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

        {/* Org selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Organization
          </label>
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option value="">Select an organization</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        {/* Goals list */}
        {goals.length === 0 ? (
          <p className="text-gray-500 text-center py-10">
            No active goals found for this organization.
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
                  ? "Total Score Goal"
                  : "Participants Goal";

              return (
                <div
                  key={goal.id}
                  className={`border rounded-xl p-4 ${
                    goal.is_completed ? "bg-green-50 border-green-400" : "bg-white"
                  }`}
                >
                  <h2 className="text-lg font-semibold mb-1">
                    🎯 Quiz: {goal.quiz_title}
                  </h2>

                  <p className="text-sm text-gray-600 mb-2">
                    {goalTypeLabel} — Target: {goal.goal_target} | Reward: 💰{" "}
                    {goal.reward_coins} coins
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
                    {goal.current_progress}/{goal.goal_target} (
                    {progressPercent.toFixed(1)}%)
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
