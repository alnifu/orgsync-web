import React from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import { useNavigate } from "react-router";

const UnityGame: React.FC = () => {
  const { unityProvider, isLoaded, loadingProgression } = useUnityContext({
    loaderUrl: "/unity/Build/thesis.loader.js",
    dataUrl: "/unity/Build/thesis.data",
    frameworkUrl: "/unity/Build/thesis.framework.js",
    codeUrl: "/unity/Build/thesis.wasm",
  });

  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#000",
      }}
    >
      {/* Back Button */}
      <div
        style={{
          padding: "10px",
          background: "rgba(0,0,0,0.7)",
          textAlign: "left",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: "8px 16px",
            background: "#16a34a", // Tailwind green-600
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>

      {/* Unity Game */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {!isLoaded && (
          <p style={{ color: "#fff", marginBottom: "1rem" }}>
            Loading... {Math.round(loadingProgression * 100)}%
          </p>
        )}
        <Unity
          unityProvider={unityProvider}
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "1280px",
            maxHeight: "720px",
            background: "#000",
          }}
        />
      </div>
    </div>
  );
};

export default UnityGame;
