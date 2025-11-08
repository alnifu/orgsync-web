import React, { useEffect, useState } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import { useNavigate } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";
import { Toaster, toast } from "react-hot-toast";

interface OrgMembership {
  org_id: string;
  organizations: { name: string } | { name: string }[] | null;
}

const RoomGame: React.FC = () => {
  const { unityProvider, isLoaded, loadingProgression, sendMessage } =
    useUnityContext({
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(window.matchMedia("(orientation: landscape)").matches);
  const [isIOS, setIsIOS] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(true); 
  // Fix iOS safe area and viewport cut-off globally
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      html, body {
        margin: 0;
        padding: 0;
        background: black;
        overscroll-behavior: none;
        height: 100%;
        width: 100%;
        touch-action: none;
      }
      body {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  useEffect(() => {
    const setVH = () => {
      const viewportHeight = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;

      const safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-top)") || "0");
      const vh = (viewportHeight + safeTop) * 0.01;

      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVH();
    window.addEventListener("resize", setVH);
    window.visualViewport?.addEventListener("resize", setVH);

    return () => {
      window.removeEventListener("resize", setVH);
      window.visualViewport?.removeEventListener("resize", setVH);
    };
  }, []);

  // Auto fullscreen + landscape lock
  useEffect(() => {
    const enableFullscreenAndLandscape = async () => {
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) await elem.requestFullscreen();
        else if ((elem as any).webkitRequestFullscreen)
          (elem as any).webkitRequestFullscreen();

        const orientation: any = screen.orientation;
        if (orientation && orientation.lock) {
          await orientation.lock("landscape");
        } else {
          console.warn("Orientation lock not supported.");
        }
      } catch (err) {
        console.warn("Fullscreen/orientation lock failed:", err);
      }
    };
    enableFullscreenAndLandscape();
  }, []);

  // Unity → React callbacks
  useEffect(() => {
    (window as any).NotifyReactUserReady = (userId: string) => {
      console.log("Unity ready:", userId);
      setUnityReady(true);
    };

    (window as any).SendScreenshotToReact = (base64: string) => {
      console.log("📸 Screenshot received");
      setScreenshot(base64);
    };

    return () => {
      delete (window as any).NotifyReactUserReady;
      delete (window as any).SendScreenshotToReact;
    };
  }, []);

  // Send user ID to Unity
  useEffect(() => {
    if (!user || !isLoaded) return;
    sendMessage("Gmanager", "InitializeFromJS", user.id);
  }, [user, isLoaded, sendMessage]);

  // Fetch org memberships
  useEffect(() => {
    const resolveOrg = async () => {
      if (!user) return;
      const { data: memberships, error } = await supabase
        .from("org_members")
        .select("org_id, organizations(name)")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) {
        console.error(" Error fetching org_members:", error);
        return;
      }

      if (memberships && memberships.length > 0) {
        const orgs = (memberships as OrgMembership[]).map((m) => {
          let orgName = "Unnamed Org";
          if (Array.isArray(m.organizations) && m.organizations.length > 0)
            orgName = m.organizations[0].name;
          else if (m.organizations && "name" in m.organizations)
            orgName = m.organizations.name;
          return { id: m.org_id, name: orgName };
        });
        setOrgOptions(orgs);
      }
    };
    resolveOrg();
  }, [user]);

  // Fetch contests
  useEffect(() => {
  const fetchContests = async () => {
    if (!resolvedOrgId) return;
    setLoadingContests(true);

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("room_contests")
      .select("id, title, start_date, end_date")
      .eq("org_id", resolvedOrgId)
      .eq("is_active", true)
      .or(
        // 1. Both start and end dates
        `and(start_date.lte.${now},end_date.gte.${now}),` +
        // 2. Only start date
        `and(start_date.lte.${now},end_date.is.null),` +
        // 3. Only end date
        `and(start_date.is.null,end_date.gte.${now}),` +
        // 4. No dates
        `and(start_date.is.null,end_date.is.null)`
      );

    setLoadingContests(false);

    if (!error) setContests(data || []);
  };

  fetchContests();
}, [resolvedOrgId]);

  // Screenshot functions
  const handleScreenshot = () => {
    if (!isLoaded) return toast.error("Game not loaded yet!");
    sendMessage("Managers", "CaptureScreenshot");
  };

  const handleSubmitScreenshot = async () => {
    if (!screenshot || !selectedContest || !user || !resolvedOrgId)
      return toast.error("Missing data.");
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

      const { error: insertError } = await supabase
        .from("contest_submissions")
        .insert({
          user_id: user.id,
          org_id: resolvedOrgId,
          contest_id: selectedContest,
          image_url: publicData.publicUrl,
          submitted_at: new Date().toISOString(),
        });
      if (insertError) throw insertError;

      toast.success("Screenshot submitted successfully!");
      setScreenshot(null);
      setSelectedContest("");
    } catch (err) {
      console.error(" Upload failed:", err);
      toast.error("Upload failed.");
    }
  };

  useEffect(() => {
    // Detect if user is on iOS
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window));

    // Listen for orientation changes
    const mql = window.matchMedia("(orientation: landscape)");
    const handleChange = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    mql.addEventListener("change", handleChange);

    return () => mql.removeEventListener("change", handleChange);
  }, []);

  // Auto-select org if only one available
useEffect(() => {
  if (orgOptions.length === 1) setResolvedOrgId(orgOptions[0].id);
}, [orgOptions]);

// Auto-select first contest when contests load
useEffect(() => {
  if (contests.length > 0) setSelectedContest(contests[0].id);
}, [contests]);

useEffect(() => {
  if (contests.length > 0 && resolvedOrgId) setSelectedContest(contests[0].id);
}, [contests, resolvedOrgId]);

  return (
    <div
      style={{
        position: "fixed",
        top: "env(safe-area-inset-top)",
        left: "env(safe-area-inset-left)",
        width: "calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right))",
        height: "calc(var(--vh, 1vh) * 100)",
        display: "flex",
        flexDirection: "column",
        background: "#000",
        overflow: "hidden",
      }}
    >
      {/* Burger Menu */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          style={{
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            border: "none",
            fontSize: "24px",
            padding: "8px 12px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          ☰
        </button>

        {menuOpen && (
          <div
            style={{
              marginTop: "8px",
              background: "rgba(0,0,0,0.85)",
              borderRadius: "10px",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              minWidth: "180px",
            }}
          >
            <button
              onClick={async () => {
                try {
                  if (document.fullscreenElement)
                    await document.exitFullscreen();
                  const orientation: any = screen.orientation;
                  if (orientation && orientation.unlock) orientation.unlock();
                  navigate(-1);
                } catch {
                  navigate(-1);
                }
              }}
              style={{
                padding: "8px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
              }}
            >
              ← Back
            </button>

            <button
              onClick={handleScreenshot}
              style={{
                padding: "8px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
              }}
            >
               Screenshot
            </button>

            <button
              onClick={() => setShowHowToPlay(true)}
              style={{
                padding: "8px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
              }}
            >
               How to Play
            </button>

            {orgOptions.length > 0 && (
              <select
                value={resolvedOrgId || ""}
                onChange={(e) => setResolvedOrgId(e.target.value)}
                style={{
                  padding: "8px",
                  borderRadius: "6px",
                  background: "#111",
                  color: "#fff",
                  border: "1px solid #333",
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
        )}
      </div>

      {/* Unity Game */}
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
            Please rotate your device to landscape to play the game.
          </div>
        )}

        <div
          style={{
            width: "100vw",
            height: "calc(var(--vh, 1vh) * 100)",
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
            background: "#000",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "calc(100vh * (16 / 9))",
              aspectRatio: "16 / 9",
              background: "#000",
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            {!isLoaded && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "black",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 10,
                }}
              >
                <p style={{ color: "#fff", fontSize: "18px" }}>
                  Loading... {Math.round(loadingProgression * 100)}%
                </p>
              </div>
            )}

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

      {/* Screenshot Preview */}
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
            zIndex: 2000,
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
              Submit
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

      {/* How to Play Overlay */}
      {showHowToPlay && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.9)",
            color: "#fff",
            zIndex: 3000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#111",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "600px",
              width: "90%",
              textAlign: "center",
              boxShadow: "0 0 15px rgba(0,0,0,0.6)",
            }}
          >
            <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>
              How to Play 
            </h2>
            <p style={{ fontSize: "16px", lineHeight: 1.6, marginBottom: "20px" }}>
              Welcome to <b>Room Builder!</b>  Your goal is to decorate and
              manage your virtual room.
            </p>
            <ul
              style={{
                textAlign: "left",
                fontSize: "15px",
                marginBottom: "20px",
                lineHeight: 1.6,
              }}
            >
              <li> -Use the <b>Build</b> button to add furniture and decorations.</li>
              <li> -Visit the <b>Shop</b> to buy new items using coins.</li>
              <li> -Your room automatically saves between sessions.</li>
              <li> -Take a screenshot to join room design contests!</li>
            </ul>
            <button
              onClick={() => setShowHowToPlay(false)}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      <Toaster position="bottom-center" />
    </div>
  );
};

export default RoomGame;
