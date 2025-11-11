import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import toast, { Toaster } from "react-hot-toast";

interface Answer {
  answerText: string;
  isCorrect: boolean;
}

interface Question {
  questionText: string;
  answers: Answer[];
}

interface CreateQuizProps {
  orgId: string;
  existingQuiz?: any;
  onClose?: () => void;
}

export default function CreateQuiz({ orgId, existingQuiz, onClose }: CreateQuizProps) {
  const [quizName, setQuizName] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [points, setPoints] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  const [hasTimeSpan, setHasTimeSpan] = useState(false);
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");

  useEffect(() => {
  if (existingQuiz) {
    setQuizName(existingQuiz.title || "");
    setTimeLimit(existingQuiz.data?.timeLimitInSeconds || 30);
    setPoints(existingQuiz.data?.pointsAddedForCorrectAnswer || 10);
    setQuestions(existingQuiz.data?.questions || []);
    setHasTimeSpan(!!(existingQuiz.open_at || existingQuiz.close_at));
    setOpenAt(existingQuiz.open_at ? new Date(existingQuiz.open_at).toISOString().slice(0, 16) : "");
    setCloseAt(existingQuiz.close_at ? new Date(existingQuiz.close_at).toISOString().slice(0, 16) : "");
  }
}, [existingQuiz]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionText: "", answers: [{ answerText: "", isCorrect: false }] },
    ]);
  };

  const deleteQuestion = (index: number) => {
    if (confirm("Are you sure you want to delete this question?")) {
      const updated = [...questions];
      updated.splice(index, 1);
      setQuestions(updated);
    }
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

  const deleteAnswer = (qIndex: number, aIndex: number) => {
    if (confirm("Are you sure you want to delete this answer?")) {
      const updated = [...questions];
      updated[qIndex].answers.splice(aIndex, 1);
      setQuestions(updated);
    }
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

    // Show validation errors as toasts instead of on-screen display
    errs.forEach(err => toast.error(err));

    return errs.length === 0;
  };

  const saveToSupabase = async () => {
  if (loading) return;
  if (!validateQuiz()) return;

  setLoading(true);
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      toast.error("You must be logged in to save a quiz.");
      return;
    }

    const quizData = {
      timeLimitInSeconds: timeLimit,
      pointsAddedForCorrectAnswer: points,
      questions,
    };

    const quizFields: any = {
      title: quizName,
      data: quizData,
      org_id: orgId,
      open_at: hasTimeSpan ? (openAt ? new Date(openAt).toISOString() : null) : null,
      close_at: hasTimeSpan ? (closeAt ? new Date(closeAt).toISOString() : null) : null,
    };

    let error;

    if (existingQuiz) {
      // UPDATE existing quiz
      const { error: updateError } = await supabase
        .from("quizzes")
        .update(quizFields)
        .eq("id", existingQuiz.id);
      error = updateError;
    } else {
      // CREATE new quiz
      const { error: insertError } = await supabase
        .from("quizzes")
        .insert([quizFields]);
      error = insertError;
    }

    if (error) {
      toast.error("Failed to save quiz. Please try again.");
      console.error("Error saving quiz:", error.message);
    } else {
      toast.success(existingQuiz ? "Quiz updated successfully!" : "Quiz created successfully!");
      if (onClose) onClose(); // Close modal
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex justify-center items-start px-4 py-4 bg-gray-50">
      <Toaster position="top-center" reverseOrder={false} />

      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-3xl">
        {/* Quiz Info */}
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

        {/* Time Span Section */}
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

        {/* Questions */}
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
            <div className="flex justify-between items-center mb-3">
              <input
                type="text"
                placeholder={`Question ${qi + 1}`}
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                value={q.questionText}
                onChange={(e) => updateQuestion(qi, e.target.value)}
              />
              <button
                onClick={() => deleteQuestion(qi)}
                className="ml-3 text-red-600 hover:text-red-700 font-semibold"
              >
                ✖
              </button>
            </div>

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
                  <button
                    onClick={() => deleteAnswer(qi, ai)}
                    className="text-red-500 hover:text-red-700 text-sm font-semibold"
                  >
                    Delete
                  </button>
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
          disabled={loading}
          className="w-full mt-6 bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : existingQuiz ? "Update Quiz" : "Save Quiz"}
        </button>
      </div>
    </div>
  );
}
