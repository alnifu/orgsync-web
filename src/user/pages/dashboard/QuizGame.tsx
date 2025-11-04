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
  const [isLandscape, setIsLandscape] = useState(
    window.matchMedia("(orientation: landscape)").matches
  );
  const [isIOS, setIsIOS] = useState(false);

  const { unityProvider, isLoaded, loadingProgression, sendMessage } =
    useUnityContext({
      loaderUrl: "/unity/game2/Build/QuizNew.loader.js",
      dataUrl: "/unity/game2/Build/QuizNew.data",
      frameworkUrl: "/unity/game2/Build/QuizNew.framework.js",
      codeUrl: "/unity/game2/Build/QuizNew.wasm",
    });

  // Load quiz data from sessionStorage
  useEffect(() => {
    const quizData = sessionStorage.getItem("selectedQuizData");
    const quizId = sessionStorage.getItem("selectedQuizId");
    const orgId = sessionStorage.getItem("currentOrgId");

    if (!quizData || !quizId) {
      console.warn("⚠️ Missing quiz data, redirecting...");
      navigate("/dashboard");
      return;
    }

    setSelectedQuizData(quizData);
    setQuizId(quizId);
    setOrgId(orgId);
  }, [navigate]);

  // Send user info + quiz data to Unity
  useEffect(() => {
    if (!isLoaded || !user || !quizId || !selectedQuizData) return;

    sendMessage("GameManager", "ReceiveUserId", user.id);
    if (orgId) sendMessage("GameManager", "ReceiveOrgId", orgId);
    sendMessage("GameManager", "ReceiveQuizId", quizId);
    sendMessage("GameManager", "ReceiveQuizData", selectedQuizData);
  }, [isLoaded, user, quizId, orgId, selectedQuizData, sendMessage]);

  // Detect iOS and orientation
  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window));

    const mql = window.matchMedia("(orientation: landscape)");
    const handleChange = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    mql.addEventListener("change", handleChange);

    return () => mql.removeEventListener("change", handleChange);
  }, []);

  // Auto fullscreen + landscape lock (Android only)
  useEffect(() => {
    const enableFullscreenAndLandscape = async () => {
      try {
        const elem = document.documentElement;

        if (elem.requestFullscreen) await elem.requestFullscreen();
        else if ((elem as any).webkitRequestFullscreen)
          (elem as any).webkitRequestFullscreen();

        const orientation: any = (screen as any).orientation;
        if (orientation && orientation.lock) {
          await orientation.lock("landscape");
        } else {
          console.warn("Orientation lock not supported.");
        }
      } catch (err) {
        console.warn("Fullscreen/orientation lock failed:", err);
      }
    };

    if (!isIOS) enableFullscreenAndLandscape();
  }, [isIOS]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#000",
        overflow: "hidden",
      }}
    >
      {/* Top bar with Back button */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1000,
        }}
      >
        <button
          onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              const orientation: any = (screen as any).orientation;
              if (orientation && orientation.unlock) orientation.unlock();
              navigate(-1);
            } catch {
              navigate(-1);
            }
          }}
          style={{
            padding: "8px 16px",
            background: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>

      {/* Unity Game with 16:9 ratio based on height */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#000",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* iOS Portrait Overlay */}
        {isIOS && !isLandscape && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100dvh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "black",
              color: "white",
              fontSize: "20px",
              textAlign: "center",
              zIndex: 3000,
              padding: "20px",
            }}
          >
            Please rotate your device to landscape to play the quiz.
          </div>
        )}

        {!isLoaded && (
          <p style={{ color: "#fff", position: "absolute", top: "50%" }}>
            Loading Unity... {Math.round(loadingProgression * 100)}%
          </p>
        )}

        <div
          style={{
            position: "relative",
            width: "min(100vw, calc(100dvh * (16 / 9)))",
            height: "100dvh",
            background: "#000",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Unity
            unityProvider={unityProvider}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              background: "#000",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default QuizGame;
