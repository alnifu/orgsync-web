import React, { useEffect, useState } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import { useNavigate } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";

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
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [contests, setContests] = useState<any[]>([]);
  const [selectedContest, setSelectedContest] = useState<string>("");
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null);
  const [orgOptions, setOrgOptions] = useState<any[]>([]);
  const [loadingContests, setLoadingContests] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // 🔹 Detect orientation
  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🔹 Unity events
  useEffect(() => {
    (window as any).NotifyReactUserReady = (userId: string) => setUnityReady(true);
    (window as any).SendScreenshotToReact = (base64: string) => setScreenshot(base64);
    return () => {
      delete (window as any).NotifyReactUserReady;
      delete (window as any).SendScreenshotToReact;
    };
  }, []);

  // 🔹 Send user ID to Unity
  useEffect(() => {
    if (!user || !isLoaded) return;
    sendMessage("Gmanager", "InitializeFromJS", user.id);
  }, [user, isLoaded, sendMessage]);

  // 🔹 Fetch org memberships
  useEffect(() => {
    const resolveOrg = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("org_members")
        .select("org_id, organizations(name)")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) return console.error("Error fetching org_members:", error);

      if (data?.length) {
        const orgs = data.map((m) => ({
          id: m.org_id,
          name: m.organizations?.name || "Unnamed Org",
        }));
        setOrgOptions(orgs);
      }
    };
    resolveOrg();
  }, [user]);

  // 🔹 Fetch contests
  useEffect(() => {
    const fetchContests = async () => {
      if (!resolvedOrgId) return;
      setLoadingContests(true);
      const { data, error } = await supabase
        .from("room_contests")
        .select("id, title")
        .eq("org_id", resolvedOrgId)
        .eq("is_active", true);
      setLoadingContests(false);
      if (!error) setContests(data || []);
    };
    fetchContests();
  }, [resolvedOrgId]);

  const handleScreenshot = () => {
    if (!isLoaded) return alert("Game not loaded yet!");
    sendMessage("Managers", "CaptureScreenshot");
  };

  const handleSubmitScreenshot = async () => {
    if (!screenshot || !selectedContest || !user || !resolvedOrgId)
      return alert("Missing screenshot, contest, user, or org ID.");

    try {
      const blob = await (await fetch(screenshot)).blob();
      const fileName = `screenshots/${Date.now()}-${user.id}.png`;

      const { error: uploadError } = await supabase.storage
        .from("screenshots")
        .upload(fileName, blob);
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("screenshots")
        .getPublicUrl(fileName);
      const imageUrl = publicData.publicUrl;

      const { error: insertError } = await supabase.from("contest_submissions").insert({
        user_id: user.id,
        org_id: resolvedOrgId,
        contest_id: selectedContest,
        image_url: imageUrl,
        submitted_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      alert("✅ Screenshot submitted successfully!");
      setScreenshot(null);
      setSelectedContest("");
    } catch (err: any) {
      console.error("❌ Upload failed:", err);
      alert("Failed to submit screenshot.");
    }
  };

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
      {/* 🔸 Top Bar */}
      <div
        style={{
          padding: "8px",
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: "8px 16px",
            background: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ← Back
        </button>

        <button
          onClick={handleScreenshot}
          style={{
            padding: "8px 16px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          📸 Take Screenshot
        </button>

        {orgOptions.length > 1 && (
          <select
            value={resolvedOrgId || ""}
            onChange={(e) => setResolvedOrgId(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "6px",
              background: "#111",
              color: "#fff",
              border: "1px solid #333",
              flexShrink: 0,
            }}
          >
            <option value="">Select Organization</option>
            {orgOptions.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 🔸 Unity Game */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
          background: "#000",
          paddingTop: isLandscape ? "6px" : "10px",
          paddingBottom: isLandscape ? "6px" : "10px",
        }}
      >
        {!isLoaded && (
          <p style={{ color: "#fff" }}>
            Loading... {Math.round(loadingProgression * 100)}%
          </p>
        )}

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            maxWidth: "100vw",
            maxHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* This maintains 16:9 while filling screen height correctly */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "#000",
            }}
          >
            <div
              style={{
                width: "calc(min(100vw, (100vh - 90px) * (16 / 9)))",
                height: "calc(min(100vh - 90px, (100vw / (16 / 9))))",
                background: "#000",
              }}
            >
              <Unity
                unityProvider={unityProvider}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  background: "#000",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🔸 Screenshot Popup */}
      {screenshot && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.85)",
            padding: "20px",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            color: "#fff",
          }}
        >
          <img
            src={screenshot}
            alt="Screenshot preview"
            style={{
              width: "300px",
              borderRadius: "8px",
              marginBottom: "10px",
            }}
          />

          <select
            value={selectedContest}
            onChange={(e) => setSelectedContest(e.target.value)}
            size={Math.min(contests.length, 5)}
            style={{
              padding: "6px",
              borderRadius: "6px",
              marginBottom: "10px",
              width: "250px",
              color: "#000",
              backgroundColor: "#fff",
              border: "1px solid #ccc",
              overflowY: "auto",
              fontSize: "14px",
            }}
          >
            {contests.length === 0 && (
              <option value="">
                {loadingContests ? "Loading contests..." : "No active contests"}
              </option>
            )}
            {contests.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleSubmitScreenshot}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Submit to Contest
            </button>
            <button
              onClick={() => setScreenshot(null)}
              style={{
                background: "#dc2626",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomGame;
