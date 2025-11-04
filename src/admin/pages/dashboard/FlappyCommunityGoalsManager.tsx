import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

interface Organization {
  id: string;
  name: string;
}

interface FlappyConfig {
  challenge_id: string;
  name: string;
}

interface FlappyCommunityGoal {
  id: string;
  org_id: string;
  challenge_id: string;
  goal_type: "score" | "participants";
  goal_target: number;
  reward_coins: number;
  current_progress: number;
  is_completed: boolean;
  created_at: string;
}

const FlappyCommunityGoalsManager: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [challenges, setChallenges] = useState<FlappyConfig[]>([]);
  const [goals, setGoals] = useState<FlappyCommunityGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const [goalType, setGoalType] = useState<"score" | "participants">("score");
  const [goalTarget, setGoalTarget] = useState<string>("");
  const [rewardCoins, setRewardCoins] = useState<string>("");
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");

  // Edit mode state
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalType, setEditGoalType] = useState<"score" | "participants">("score");
  const [editGoalTarget, setEditGoalTarget] = useState<string>("");
  const [editRewardCoins, setEditRewardCoins] = useState<string>("");

  // Fetch orgs the officer manages
  useEffect(() => {
  const fetchOrg = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    // Fetch org managed by the user
    const { data: managerData } = await supabase
      .from("org_managers")
      .select("org_id")
      .eq("user_id", user.id);

    const orgIds = managerData?.map((o) => o.org_id) || [];
    if (!orgIds.length) {
      setOrgs([]);
      setLoading(false);
      return;
    }

    const { data: orgData } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgIds[0]); // Only the first org

    if (orgData?.length) {
      setOrgs(orgData);
      setSelectedOrg(orgData[0].id); // Automatically select
    }

    setLoading(false);
  };

  fetchOrg();
}, []);

  // Fetch challenges
  useEffect(() => {
    if (!selectedOrg) return;
    const fetchChallenges = async () => {
      const { data, error } = await supabase
        .from("flappy_config")
        .select("challenge_id, name")
        .eq("org_id", selectedOrg);
      if (!error) setChallenges(data || []);
    };
    fetchChallenges();
  }, [selectedOrg]);

  // Fetch goals
  const fetchGoals = async () => {
    if (!selectedOrg) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("community_goals_flappy")
      .select("*")
      .eq("org_id", selectedOrg)
      .order("created_at", { ascending: false });
    if (!error) setGoals(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchGoals();
  }, [selectedOrg]);

  // Create goal
  const handleCreateGoal = async () => {
    const goalTargetNum = Number(goalTarget);
    const rewardCoinsNum = Number(rewardCoins);

    if (
      !selectedOrg ||
      !selectedChallenge ||
      goalTargetNum <= 0 ||
      rewardCoinsNum <= 0
    )
      return alert("Please fill in all fields with valid numbers.");

    const { error } = await supabase.from("community_goals_flappy").insert([
      {
        org_id: selectedOrg,
        challenge_id: selectedChallenge,
        goal_type: goalType,
        goal_target: goalTargetNum,
        reward_coins: rewardCoinsNum,
      },
    ]);
    if (error) {
      console.error(error);
      return alert("Failed to create goal");
    }
    alert("Goal created!");
    setGoalTarget("");
    setRewardCoins("");
    fetchGoals();
  };

  // Delete goal
  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm("Delete this goal?")) return;
    await supabase.from("community_goals_flappy").delete().eq("id", id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  // Begin editing
  const startEditing = (goal: FlappyCommunityGoal) => {
    setEditingGoalId(goal.id);
    setEditGoalType(goal.goal_type);
    setEditGoalTarget(goal.goal_target.toString());
    setEditRewardCoins(goal.reward_coins.toString());
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingGoalId(null);
    setEditGoalTarget("");
    setEditRewardCoins("");
  };

  // Save edit
  const saveEdit = async (id: string) => {
    const newTarget = Number(editGoalTarget);
    const newReward = Number(editRewardCoins);

    if (newTarget <= 0 || newReward <= 0)
      return alert("Please enter valid numeric values.");

    const { error } = await supabase
      .from("community_goals_flappy")
      .update({
        goal_type: editGoalType,
        goal_target: newTarget,
        reward_coins: newReward,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      return alert("Failed to update goal");
    }

    alert("Goal updated!");
    setEditingGoalId(null);
    fetchGoals();
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="min-h-screen py-10 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Manage Flappy Community Goals
        </h1>

        {/* New goal form */}
        <div className="border-t pt-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Create New Goal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Challenge
              </label>
              <select
                value={selectedChallenge}
                onChange={(e) => setSelectedChallenge(e.target.value)}
                className="w-full border rounded-lg p-2"
              >
                <option value="">Select Challenge</option>
                {challenges.map((ch) => (
                  <option key={ch.challenge_id} value={ch.challenge_id}>
                    {ch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Goal Type
              </label>
              <select
                value={goalType}
                onChange={(e) =>
                  setGoalType(e.target.value as "score" | "participants")
                }
                className="w-full border rounded-lg p-2"
              >
                <option value="score">Score Goal</option>
                <option value="participants">Participants Goal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Goal Target
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                onKeyDown={(e) =>
                  (e.key === "ArrowUp" || e.key === "ArrowDown") &&
                  e.preventDefault()
                }
                placeholder="Enter goal target (number)"
                className="w-full border rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Reward Coins
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={rewardCoins}
                onChange={(e) => setRewardCoins(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                onKeyDown={(e) =>
                  (e.key === "ArrowUp" || e.key === "ArrowDown") &&
                  e.preventDefault()
                }
                placeholder="Enter reward amount (number)"
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>

          <button
            onClick={handleCreateGoal}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          >
            Create Goal
          </button>
        </div>

        {/* Existing goals */}
<div className="mt-10">
  <h2 className="text-xl font-semibold mb-4">Existing Goals</h2>
  {goals.length ? (
    goals.map((g) => {
      const pct = Math.min((g.current_progress / g.goal_target) * 100, 100);
      const isEditing = editingGoalId === g.id;

      return (
        <div
          key={g.id}
          className="border rounded-lg p-4 mb-3 bg-white"
        >
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Goal Type
                </label>
                <select
                  value={editGoalType}
                  onChange={(e) =>
                    setEditGoalType(e.target.value as "score" | "participants")
                  }
                  className="w-full border rounded-lg p-2"
                >
                  <option value="score">Score Goal</option>
                  <option value="participants">Participants Goal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Goal Target
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editGoalTarget}
                  onChange={(e) => setEditGoalTarget(e.target.value)}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Reward Coins
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editRewardCoins}
                  onChange={(e) => setEditRewardCoins(e.target.value)}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div className="flex gap-2 mt-2 md:mt-0">
                <button
                  onClick={() => saveEdit(g.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex-1"
                >
                  Save
                </button>
                <button
                  onClick={cancelEditing}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{g.challenge_id}</h3>
                <p className="text-sm text-gray-600">
                  Type: {g.goal_type} | Target: {g.goal_target} | Reward: {g.reward_coins}
                </p>
                <p className="text-sm text-gray-600">
                  Progress: {g.current_progress}/{g.goal_target} ({pct.toFixed(1)}%)
                </p>
              </div>
              <div className="flex gap-2 mt-2 md:mt-0 flex-shrink-0">
                <button
                  onClick={() => startEditing(g)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteGoal(g.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      );
    })
  ) : (
    <p className="text-gray-500 text-center">No goals yet.</p>
  )}
</div>
      </div>
    </div>
  );
};

export default FlappyCommunityGoalsManager;
