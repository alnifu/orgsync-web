import React, { useEffect, useState } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import { useNavigate } from "react-router";
import { useAuth } from "../../../context/AuthContext";

const RoomGame: React.FC = () => {
  const { unityProvider, isLoaded, loadingProgression, sendMessage } = useUnityContext({
    loaderUrl: "/unity/game1/Build/This.loader.js",
    dataUrl: "/unity/game1/Build/This.data",
    frameworkUrl: "/unity/game1/Build/This.framework.js",
    codeUrl: "/unity/game1/Build/This.wasm",
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const [unityReady, setUnityReady] = useState(false);

  // Listen for Unity callback (NotifyReactUserReady)
 useEffect(() => {
  (window as any).NotifyReactUserReady = (userId: string) => {
    console.log("✅ Unity signaled ready for user:", userId);
    setUnityReady(true);
  };
  return () => {
    delete (window as any).NotifyReactUserReady;
  };
}, []);


  // Send user ID into Unity once both user + Unity are ready
  useEffect(() => {
    if (!user || !isLoaded) return;

    console.log("➡️ Sending user ID to Unity:", user.id);
    sendMessage("Gmanager", "InitializeFromJS", user.id);
  }, [user, isLoaded, sendMessage]);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#000" }}>
      <div style={{ padding: "10px", background: "rgba(0,0,0,0.7)", textAlign: "left" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: "8px 16px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          ← Back
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
        {!isLoaded && <p style={{ color: "#fff", marginBottom: "1rem" }}>Loading... {Math.round(loadingProgression * 100)}%</p>}
        <Unity
          unityProvider={unityProvider}
          style={{ width: "100%", height: "100%", maxWidth: "960px", maxHeight: "600px", background: "#000" }}
        />
      </div>
      {/*{!unityReady && (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", color: "#fff", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <p>Initializing game for your account...</p>
        </div>
      )}*/}
    </div>
  );
};

export default RoomGame;
