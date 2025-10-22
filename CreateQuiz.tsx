import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import toast, { Toaster } from "react-hot-toast";

interface Answer {
  answerText: string;
  isCorrect: boolean;
}

interface Question {
  questionText: string;
  answers: Answer[];
}

export default function CreateQuiz() {
  const [quizName, setQuizName] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [points, setPoints] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const [hasTimeSpan, setHasTimeSpan] = useState(false);
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionText: "", answers: [{ answerText: "", isCorrect: false }] },
    ]);
  };

  const updateQuestion = (index: number, value: string) => {
    const updated = [...questions];
    updated[index].questionText = value;
    setQuestions(updated);
  };

  const addAnswer = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].answers.push({ answerText: "", isCorrect: false });
    setQuestions(updated);
  };

  const updateAnswer = (
    qIndex: number,
    aIndex: number,
    key: keyof Answer,
    value: string | boolean
  ) => {
    const updated = [...questions];
    updated[qIndex].answers[aIndex][key] = value as never;
    setQuestions(updated);
  };

  const validateQuiz = () => {
    const errs: string[] = [];
    if (!quizName.trim()) errs.push("Quiz name is required.");
    if (timeLimit <= 0) errs.push("Time limit must be greater than 0.");
    if (points <= 0) errs.push("Points must be greater than 0.");
    if (questions.length === 0) errs.push("At least one question is required.");

    questions.forEach((q, qi) => {
      if (!q.questionText.trim())
        errs.push(`Question ${qi + 1} cannot be empty.`);
      if (q.answers.length < 2)
        errs.push(`Question ${qi + 1} must have at least 2 answers.`);
      if (!q.answers.some((a) => a.isCorrect))
        errs.push(`Question ${qi + 1} must have at least 1 correct answer.`);
      q.answers.forEach((a, ai) => {
        if (!a.answerText.trim())
          errs.push(`Answer ${ai + 1} in Question ${qi + 1} cannot be empty.`);
      });
    });

    setErrors(errs);
    return errs.length === 0;
  };

  const saveToSupabase = async () => {
  if (!validateQuiz()) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    toast.error("You must be logged in to save a quiz.");
    return;
  }

  // find organization linked to this user
  const { data: orgManager, error: orgError } = await supabase
    .from("org_managers")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (orgError || !orgManager) {
    toast.error("Could not find your organization. Please check your access.");
    console.error("Error finding organization:", orgError?.message);
    return;
  }

  const quizData = {
    timeLimitInSeconds: timeLimit,
    pointsAddedForCorrectAnswer: points,
    questions,
  };

  // prepare data for insert
  const quizInsertData: any = {
    title: quizName,
    data: quizData,
    org_id: orgManager.org_id,
  };

  // only include time span if toggle is on
  if (hasTimeSpan) {
    quizInsertData.open_at = openAt ? new Date(openAt).toISOString() : null;
    quizInsertData.close_at = closeAt ? new Date(closeAt).toISOString() : null;
  } else {
    quizInsertData.open_at = null;
    quizInsertData.close_at = null;
  }

  const { error } = await supabase.from("quizzes").insert([quizInsertData]);

  if (error) {
    toast.error("Failed to save quiz. Please try again.");
    console.error("Error saving quiz:", error.message);
  } else {
    toast.success("Quiz saved successfully!");
    setQuestions([]);
    setQuizName("");
    setHasTimeSpan(false);
    setOpenAt("");
    setCloseAt("");
  }
};

  return (
    <div className="min-h-screen flex justify-center items-start px-4 py-4 bg-gray-50">
      <Toaster position="top-center" reverseOrder={false} />

      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-3xl">
        {errors.length > 0 && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {errors.map((err, i) => (
              <p key={i}>⚠️ {err}</p>
            ))}
          </div>
        )}

        <div className="mb-4">
          <label className="block font-semibold mb-1 text-gray-700">
            Quiz Name
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter quiz title..."
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block font-semibold mb-1 text-gray-700">
              Time Limit (seconds)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={timeLimit}
              onChange={(e) => setTimeLimit(+e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700">
              Points per Correct Answer
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={points}
              onChange={(e) => setPoints(+e.target.value)}
            />
          </div>
        </div>

        <div className="mb-6 border-t pt-4">
  <label className="flex items-center gap-2 text-gray-700 mb-3">
    <input
      type="checkbox"
      checked={hasTimeSpan}
      onChange={(e) => setHasTimeSpan(e.target.checked)}
      className="accent-green-600"
    />
    <span className="font-semibold">Set quiz availability time</span>
  </label>

  {hasTimeSpan && (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block font-semibold mb-1 text-gray-700">
          Open Time
        </label>
        <input
          type="datetime-local"
          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          value={openAt}
          onChange={(e) => setOpenAt(e.target.value)}
        />
      </div>
      <div>
        <label className="block font-semibold mb-1 text-gray-700">
          Close Time
        </label>
        <input
          type="datetime-local"
          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          value={closeAt}
          onChange={(e) => setCloseAt(e.target.value)}
        />
      </div>
    </div>
  )}
</div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Questions</h2>
          <button
            onClick={addQuestion}
            className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 transition"
          >
            + Add Question
          </button>
        </div>

        {questions.map((q, qi) => (
          <div
            key={qi}
            className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50"
          >
            <input
              type="text"
              placeholder={`Question ${qi + 1}`}
              className="w-full border border-gray-300 rounded-md p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={q.questionText}
              onChange={(e) => updateQuestion(qi, e.target.value)}
            />

            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Answers</h4>
              {q.answers.map((a, ai) => (
                <div
                  key={ai}
                  className="flex flex-wrap items-center gap-3 mb-2 bg-white border border-gray-200 rounded-md p-2"
                >
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder={`Answer ${ai + 1}`}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={a.answerText}
                      onChange={(e) =>
                        updateAnswer(qi, ai, "answerText", e.target.value)
                      }
                    />
                  </div>
                  <label className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={a.isCorrect}
                      onChange={(e) =>
                        updateAnswer(qi, ai, "isCorrect", e.target.checked)
                      }
                      className="accent-green-500"
                    />
                    Correct
                  </label>
                </div>
              ))}
              <button
                onClick={() => addAnswer(qi)}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                + Add Answer
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={saveToSupabase}
          className="w-full mt-6 bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition"
        >
          💾 Save Quiz
        </button>
      </div>
    </div>
  );
}
