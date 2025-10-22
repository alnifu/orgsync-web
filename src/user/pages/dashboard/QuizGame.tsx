import React, { useEffect, useState } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import { useNavigate } from "react-router";
import { useAuth } from "../../../context/AuthContext";

const QuizGame: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedQuizData, setSelectedQuizData] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);

  const {
    unityProvider,
    isLoaded,
    loadingProgression,
    sendMessage,
  } = useUnityContext({
    loaderUrl: "/unity/game2/Build/QuizNew.loader.js",
    dataUrl: "/unity/game2/Build/QuizNew.data",
    frameworkUrl: "/unity/game2/Build/QuizNew.framework.js",
    codeUrl: "/unity/game2/Build/QuizNew.wasm",
  });

  // Load quiz from sessionStorage (set on QuizSelection)
  useEffect(() => {
    const quizData = sessionStorage.getItem("selectedQuizData");
    const quizId = sessionStorage.getItem("selectedQuizId");
    const orgId = sessionStorage.getItem("currentOrgId"); // optional

    if (!quizData || !quizId) {
      console.warn("⚠️ Quiz or quiz ID not found in sessionStorage. Redirecting...");
      navigate("/dashboard");
      return;
    }

    setSelectedQuizData(quizData);
    setQuizId(quizId);
    setOrgId(orgId);
    console.log("✅ Loaded from sessionStorage:", { quizId, orgId, quizData: quizData.substring(0, 50) + "..." });
  }, [navigate]);

  // Send IDs and Quiz JSON to Unity once loaded
  useEffect(() => {
    if (!isLoaded || !user || !quizId || !selectedQuizData) return;

    console.log("➡️ Sending UserId, OrgId, QuizId, QuizData to Unity...");

    sendMessage("GameManager", "ReceiveUserId", user.id);
    console.log("➡️ UserId sent:", user.id);

    if (orgId) {
      sendMessage("GameManager", "ReceiveOrgId", orgId);
      console.log("➡️ OrgId sent:", orgId);
    } else {
      console.warn("⚠️ OrgId not available");
    }

    sendMessage("GameManager", "ReceiveQuizId", quizId);
    console.log("➡️ QuizId sent:", quizId);

    sendMessage("GameManager", "ReceiveQuizData", selectedQuizData);
    console.log("➡️ QuizData sent (first 100 chars):", selectedQuizData.substring(0, 100) + "...");
  }, [isLoaded, user, quizId, orgId, selectedQuizData, sendMessage]);

  return (
    <div style={{ position: "fixed", top: 0, left: 64, width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#000" }}>
      <div style={{ padding: "10px", background: "rgba(0,0,0,0.7)", textAlign: "left" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: "8px 16px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          ← Back
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
        {!isLoaded && <p style={{ color: "#fff", marginBottom: "1rem" }}>Loading Unity... {Math.round(loadingProgression * 100)}%</p>}
        <Unity
          unityProvider={unityProvider}
          style={{ width: "100%", height: "100%", maxWidth: "960px", maxHeight: "600px", background: "#000" }}
        />
      </div>
    </div>
  );
};

export default QuizGame;
