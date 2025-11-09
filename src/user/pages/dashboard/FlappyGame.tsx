import React, { useEffect, useState } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import { useNavigate } from "react-router";
import { useAuth } from "../../../context/AuthContext";

const FlappyGame: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [unityReady, setUnityReady] = useState(false);
  const [configSent, setConfigSent] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true); // New state for instructions

  const { unityProvider, isLoaded, loadingProgression, sendMessage, addEventListener, removeEventListener } = useUnityContext({
    loaderUrl: "/unity/game3/Build/Flappy.loader.js",
    dataUrl: "/unity/game3/Build/Flappy.data",
    frameworkUrl: "/unity/game3/Build/Flappy.framework.js",
    codeUrl: "/unity/game3/Build/Flappy.wasm",
  });

  const UNITY_OBJECT_NAME = "ConfigLoader";

  useEffect(() => {
    const storedConfig = sessionStorage.getItem("selectedChallengeData");
    const storedOrgId = sessionStorage.getItem("currentOrgId");
    const storedChallengeId = sessionStorage.getItem("currentChallengeId");

    if (!storedConfig || !storedChallengeId) {
      navigate("/flappy-challenges");
      return;
    }

    const config = JSON.parse(storedConfig);
    config.challenge_id = storedChallengeId;
    setSelectedConfig(config);
    setOrgId(storedOrgId);
  }, [navigate]);

  useEffect(() => {
    const handleUnityLoaded = () => {};
    const handleUnityLog = (message: string) => {};

    addEventListener("loaded", handleUnityLoaded);
    addEventListener("log", handleUnityLog);

    return () => {
      removeEventListener("loaded", handleUnityLoaded);
      removeEventListener("log", handleUnityLog);
    };
  }, [addEventListener, removeEventListener]);

  useEffect(() => {
    const handleConfigLoaderReady = () => setUnityReady(true);
    window.addEventListener("ConfigLoaderReady", handleConfigLoaderReady);

    return () => window.removeEventListener("ConfigLoaderReady", handleConfigLoaderReady);
  }, []);

  useEffect(() => {
    if (!isLoaded || !user || !selectedConfig || !unityReady || configSent) return;

    try {
      sendMessage(UNITY_OBJECT_NAME, "ReceiveUserId", user.id);

      if (orgId) sendMessage(UNITY_OBJECT_NAME, "ReceiveOrgId", orgId);

      sendMessage(UNITY_OBJECT_NAME, "ReceiveChallengeId", selectedConfig.challenge_id);
      sendMessage(UNITY_OBJECT_NAME, "ReceiveChallengeData", JSON.stringify(selectedConfig));

      setConfigSent(true);
    } catch {
      // fail silently
    }
  }, [isLoaded, unityReady, user, selectedConfig, orgId, sendMessage, configSent]);

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* Top bar */}
      <div className="p-3 bg-black/70 text-left z-10 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-green-600 rounded-lg text-white hover:bg-green-700"
        >
          ← Back
        </button>

        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700"
        >
          {showInstructions ? "Hide Instructions" : "How to Play"}
        </button>
      </div>

      {/* How to Play Overlay */}
      {showInstructions && (
        <div className="absolute inset-0 bg-black/80 z-20 flex flex-col justify-center items-center text-white p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">How to Play Flappy</h2>
          <p className="mb-2">1. Tap or click the screen to make your bird flap.</p>
          <p className="mb-2">2. Avoid hitting the pipes and the ground.</p>
          <p className="mb-4">3. The longer you survive, the higher your score!</p>
          <button
            onClick={() => setShowInstructions(false)}
            className="px-6 py-2 bg-green-600 rounded-lg text-white hover:bg-green-700"
          >
            Start Game
          </button>
        </div>
      )}

      {/* Unity Game */}
      <div className="flex-1 flex justify-center items-center bg-black">
        {!isLoaded && (
          <p className="text-white mb-3">
            Loading Unity... {Math.round(loadingProgression * 100)}%
          </p>
        )}

        <div
          className="bg-black"
          style={{
            width: "360px",
            height: "640px",
            maxWidth: "90vw",
            maxHeight: "90vh",
          }}
        >
          <Unity
            unityProvider={unityProvider}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      </div>
    </div>
  );
};

export default FlappyGame;
