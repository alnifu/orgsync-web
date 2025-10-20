import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../../lib/supabase";
import { ArrowLeft } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  data: any;
  org_id: string;
}

const QuizSelection: React.FC = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizzesForMember = async () => {
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
          .eq("user_id", user.id);
        if (memberError) throw memberError;

        if (!memberships || memberships.length === 0) {
          setError("You are not a member of any organization.");
          setLoading(false);
          return;
        }

        const orgIds = memberships.map((m) => m.org_id);
        const { data: quizzesData, error: quizError } = await supabase
          .from("quizzes")
          .select("id, title, data, org_id")
          .in("org_id", orgIds);
        if (quizError) throw quizError;

        setQuizzes(quizzesData || []);
        setError(null);
      } catch (err: any) {
        console.error("❌ Error fetching quizzes:", err.message);
        setError("Failed to load quizzes.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzesForMember();
  }, []);

  if (loading)
    return <p className="text-gray-500 text-center mt-6">Loading quizzes...</p>;
  if (error)
    return <p className="text-red-500 text-center mt-6">{error}</p>;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-6 bg-gray-50">
      {/* Back button fixed top-left */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 flex items-center text-green-600 hover:text-green-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back
      </button>

      {/* Page Title */}
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
        Select a Quiz
      </h1>

      {/* Quiz Buttons */}
      {quizzes.length === 0 ? (
        <p className="text-gray-500 text-center">
          No quizzes available for your organization(s).
        </p>
      ) : (
        <div className="flex flex-col items-center space-y-3 w-full">
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
                console.log("➡️ Stored in sessionStorage:", {
                  quizId: quiz.id,
                  orgId: quiz.org_id,
                });
                navigate("/quiz-games");
              }}
              className="w-full sm:w-64 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors text-center"
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
