import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../../lib/supabase";
import { ArrowLeft } from "lucide-react";

interface Organization {
  id: string;
  name: string;
}

interface Quiz {
  id: string;
  title: string;
  data: any;
  org_id: string;
  open_at?: string | null;
  close_at?: string | null;
}

const QuizSelection: React.FC = () => {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch orgs the user belongs to
  useEffect(() => {
    const fetchUserOrgs = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("No user logged in");

        const { data: memberships, error: memberError } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .eq("is_active", true);
        if (memberError) throw memberError;

        if (!memberships || memberships.length === 0) {
          setError("You are not a member of any organization.");
          setLoading(false);
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
        setError(null);
      } catch (err: any) {
        console.error("❌ Error fetching orgs:", err.message);
        setError("Failed to load organizations.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrgs();
  }, []);

  // Fetch quizzes based on selected organization
  useEffect(() => {
    if (!selectedOrg) {
      setQuizzes([]);
      return;
    }

    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const { data: quizzesData, error: quizError } = await supabase
          .from("quizzes")
          .select("id, title, data, org_id, open_at, close_at")
          .eq("org_id", selectedOrg);

        if (quizError) throw quizError;

        const now = new Date();
        const availableQuizzes = (quizzesData || []).filter((quiz) => {
          const openAt = quiz.open_at ? new Date(quiz.open_at) : null;
          const closeAt = quiz.close_at ? new Date(quiz.close_at) : null;
          return (!openAt || now >= openAt) && (!closeAt || now <= closeAt);
        });

        setQuizzes(availableQuizzes);
        setError(null);
      } catch (err: any) {
        console.error("❌ Error fetching quizzes:", err.message);
        setError("Failed to load quizzes.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [selectedOrg]);

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOrg(e.target.value);
  };

  if (loading)
    return <p className="text-gray-500 text-center mt-6">Loading quizzes...</p>;
  if (error)
    return <p className="text-red-500 text-center mt-6">{error}</p>;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-6 bg-gray-50">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 flex items-center text-green-600 hover:text-green-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
        Select a Quiz
      </h1>

      {/* Org Selector */}
      <div className="mb-4 w-full sm:w-72">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Organization
        </label>
        <select
          value={selectedOrg}
          onChange={handleOrgChange}
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

      {/* Quiz Buttons */}
      {quizzes.length === 0 ? (
        <p className="text-gray-500 text-center">
          {selectedOrg
            ? "No available quizzes for this organization."
            : "Select an organization to view its quizzes."}
        </p>
      ) : (
        <div className="flex flex-col items-center space-y-3 w-full sm:w-72">
          {quizzes.map((quiz) => (
            <button
              key={quiz.id}
              onClick={() => {
                sessionStorage.setItem("selectedQuizId", quiz.id);
                sessionStorage.setItem(
                  "selectedQuizData",
                  JSON.stringify(quiz.data)
                );
                sessionStorage.setItem("currentOrgId", quiz.org_id);
                navigate("/user/dashboard/quiz-games");
              }}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors text-center"
            >
              {quiz.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizSelection;
