import React, { useEffect, useState } from "react";
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

const LeaderboardPage: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // 1️⃣ Fetch user orgs
  useEffect(() => {
    const fetchUserOrgs = async () => {
      setLoading(true);
      console.log("⏳ Fetching user orgs...");

      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        console.log("👤 Logged in user:", user);

        if (!user) return;

        const { data: memberships, error: membershipsError } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (membershipsError) throw membershipsError;
        console.log("📦 User memberships:", memberships);

        if (!memberships || memberships.length === 0) return;

        const orgIds = memberships.map((m) => m.org_id);
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);

        if (orgError) throw orgError;

        setOrgs(orgData || []);
        console.log("🏢 Fetched organizations:", orgData);
        if (orgData && orgData.length > 0) setSelectedOrg(orgData[0].id);

      } catch (err) {
        console.error("❌ Error fetching orgs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrgs();
  }, []);

  // 2️⃣ Fetch quizzes for selected org
  useEffect(() => {
    if (!selectedOrg) return;

    const fetchQuizzes = async () => {
      setLoading(true);
      console.log("⏳ Fetching quizzes for orgId:", selectedOrg);

      try {
        const { data, error } = await supabase
          .from("quizzes")
          .select("id, title")
          .eq("org_id", selectedOrg);

        if (error) throw error;

        setQuizzes(data || []);
        console.log(`🎯 Quizzes for org ${selectedOrg}:`, data);

        if (data && data.length > 0) setSelectedQuiz(data[0].id);
        else setSelectedQuiz(null);

      } catch (err) {
        console.error("❌ Error fetching quizzes:", err);
        setQuizzes([]);
        setSelectedQuiz(null);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [selectedOrg]);

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOrg(e.target.value);
    setSelectedQuiz(null);
    setQuizzes([]);
    console.log("🔹 Org selected:", e.target.value);
  };

  const handleQuizChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setSelectedQuiz(isNaN(value) ? null : value);
    console.log("🔹 Quiz selected:", value);
  };

  if (loading) return <div className="text-center py-10">Loading leaderboard data...</div>;

  console.log("➡️ Rendering LeaderboardPage with selectedOrg:", selectedOrg, "selectedQuiz:", selectedQuiz);

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow p-6">

        {/* Org selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Organization</label>
          <select
            value={selectedOrg}
            onChange={handleOrgChange}
            className="w-full border rounded-lg p-2"
          >
            <option value="">Select an organization</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        {/* Quiz selector */}
        {selectedOrg && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Quiz</label>
            <select
              value={selectedQuiz ?? ""}
              onChange={handleQuizChange}
              className="w-full border rounded-lg p-2"
            >
              <option value="">Select a quiz</option>
              {quizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Leaderboard */}
        {selectedQuiz && selectedOrg ? (
          <Leaderboard quizId={selectedQuiz} orgId={selectedOrg} />
        ) : (
          <div className="text-center text-gray-500 py-6">
            Select a quiz to view its leaderboard.
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;