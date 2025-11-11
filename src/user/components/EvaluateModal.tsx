import { X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { useState } from "react";

interface EvaluationData {
  facilities: number;
  design: number;
  participation: number;
  speakers: number;
  overall: number;
  benefits: string;
  problems: string;
  comments: string;
}

interface EvaluationErrors {
  benefits: string;
  problems: string;
  comments: string;
}

interface EvaluationModalProps {
  showModal: boolean;
  selectedPost: any | null;
  evaluated: { [key: string]: boolean };
  setEvaluated: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function EvaluationModal({
  showModal,
  selectedPost,
  evaluated,
  setEvaluated,
  setShowModal
}: EvaluationModalProps) {
  const [evaluationData, setEvaluationData] = useState<EvaluationData>({
    facilities: 0,
    design: 0,
    participation: 0,
    speakers: 0,
    overall: 0,
    benefits: "",
    problems: "",
    comments: "",
  });

  const [evaluationError, setEvaluationError] = useState("");
  const [evaluationErrors, setEvaluationErrors] = useState<EvaluationErrors>({
    benefits: "",
    problems: "",
    comments: "",
  });

  if (!showModal || !selectedPost) return null;

  const resetEvaluationData = () => {
    setEvaluationData({
      facilities: 0,
      design: 0,
      participation: 0,
      speakers: 0,
      overall: 0,
      benefits: "",
      problems: "",
      comments: "",
    });
    setEvaluationErrors({ benefits: "", problems: "", comments: "" });
    setEvaluationError("");
  };

  const handleChangeRating = (key: keyof EvaluationData, value: number) => {
    setEvaluationData((prev) => {
      const updated = { ...prev, [key]: value };
      if (!updated.facilities || !updated.design || !updated.participation || !updated.speakers || !updated.overall) {
        setEvaluationError("Please rate all questions (1–5).");
      } else setEvaluationError("");
      return updated;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newErrors = { ...evaluationErrors };
    if (!value.trim()) newErrors[name as keyof EvaluationErrors] = "This field is required.";
    else newErrors[name as keyof EvaluationErrors] = "";

    setEvaluationData((prev) => ({ ...prev, [name]: value }));
    setEvaluationErrors(newErrors);
  };

  const validateEvaluation = () => {
    const { facilities, design, participation, speakers, overall, benefits, problems, comments } = evaluationData;
    const newErrors: EvaluationErrors = { benefits: "", problems: "", comments: "" };
    let valid = true;

    if (!facilities || !design || !participation || !speakers || !overall) {
      setEvaluationError("Please rate all questions (1–5).");
      valid = false;
    } else setEvaluationError("");

    if (!benefits.trim()) { newErrors.benefits = "This field is required."; valid = false; }
    if (!problems.trim()) { newErrors.problems = "This field is required."; valid = false; }
    if (!comments.trim()) { newErrors.comments = "This field is required."; valid = false; }

    setEvaluationErrors(newErrors);
    return valid;
  };

  const submitEvaluation = async () => {
  if (!validateEvaluation() || !selectedPost) return;

  // Check if current date/time is after event date & start time
  if (selectedPost.event_date && selectedPost.start_time) {
    const [hour, minute] = selectedPost.start_time.split(":").map(Number);
    const eventDateTime = new Date(selectedPost.event_date);
    eventDateTime.setHours(hour, minute, 0, 0); // set to event start time

    const now = new Date();
    if (now < eventDateTime) {
      toast.error("You can only submit an evaluation after the event has started.");
      return;
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    const { data: registration } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("post_id", selectedPost.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!registration) {
      toast.error("You must be registered for this event to submit an evaluation.");
      return;
    }

    const { error: evalError } = await supabase.from("event_evaluations").insert({
      post_id: selectedPost.id,
      user_id: user.id,
      ...evaluationData,
      created_at: new Date().toISOString(),
    });

    if (evalError) { toast.error("Failed to save evaluation."); return; }

    const { data: rpcData } = await supabase.rpc("award_user_coins_once", {
      p_user_id: user.id,
      p_post_id: selectedPost.id,
      p_action: "evaluate",
      p_points: 100,
    });

    if ((rpcData ?? 0) > 0) toast.success(`🎉 You earned ${rpcData} coins for evaluating!`);

    setEvaluated((prev) => ({ ...prev, [selectedPost.id]: true }));
    resetEvaluationData();
    setShowModal(false);

  } catch (err) {
    console.error("Unexpected error:", err);
    toast.error("Something went wrong.");
  }
};

const ratingQuestions = [
  { label: "Satisfaction on Facilities/Venue", key: "facilities" },
  { label: "Satisfaction on Activity Design", key: "design" },
  { label: "Satisfaction on Student Participation", key: "participation" },
  { label: "Satisfaction on Speakers/Facilitators", key: "speakers" },
  { label: "Overall Rating of the Activity", key: "overall" },
];

const textQuestions = [
  { label: "Benefit(s) Gained", key: "benefits" },
  { label: "Problem(s) Encountered", key: "problems" },
  { label: "Comments/Suggestions", key: "comments" },
];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/2 z-50 px-4">
    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm sm:max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Evaluate {selectedPost.title}</h2>
        <button
            onClick={() => { setShowModal(false); resetEvaluationData(); }}
            className="text-gray-500 hover:text-gray-700"
        >
            <X className="h-5 w-5" />
        </button>
        </div>

        {/* Ratings */}
        {ratingQuestions.map(({ label, key }) => (
        <div key={key} className="mb-4">
            <p className="font-medium text-gray-700 mb-2">{label}</p>
            <div className="flex gap-3">
            {[1,2,3,4,5].map((num) => (
                <label key={num} className="flex flex-col items-center">
                <input
                    type="radio"
                    name={key}
                    value={num}
                    checked={evaluationData[key as keyof EvaluationData] === num}
                    onChange={() => handleChangeRating(key as keyof EvaluationData, num)}
                    className="h-4 w-4"
                />
                <span className="text-sm text-gray-600 mt-1">{num}</span>
                </label>
            ))}
            </div>
        </div>
        ))}

        {/* Textareas */}
        {textQuestions.map(({ label, key }) => (
        <div key={key} className="mb-4">
            <p className="font-medium text-gray-700 mb-2">{label}</p>
            <textarea
            name={key}
            value={evaluationData[key as keyof EvaluationData]}
            onChange={handleInputChange}
            placeholder={label}
            required
            className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 ${
                evaluationErrors[key as keyof EvaluationErrors] ? "border-red-500" : "border-gray-300"
            }`}
            />
            {evaluationErrors[key as keyof EvaluationErrors] && (
            <p className="text-red-500 text-sm mt-1">{evaluationErrors[key as keyof EvaluationErrors]}</p>
            )}
        </div>
        ))}

        {evaluationError && <p className="text-red-500 text-sm mb-3">{evaluationError}</p>}

        <div className="flex justify-end space-x-2">
        <button
            onClick={() => { setShowModal(false); resetEvaluationData(); }}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
        >
            Cancel
        </button>
        <button
            onClick={submitEvaluation}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
            Submit
        </button>
        </div>
    </div>
    </div>
  );
}
