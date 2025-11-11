import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { ArrowLeft } from "lucide-react";

interface FlappyConfig {
  id: string;
  challenge_id: string;
  org_id: string;
  name: string;
  description?: string; 
  player_image_url?: string;
  background_image_url?: string;
  start_time?: string;
  end_time?: string;
}

export default function FlappyChallengePicker() {
  const [configs, setConfigs] = useState<FlappyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConfigs = async () => {
      if (!user) return;

      try {
        // Get player's organization memberships
        const { data: memberships } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id);

        if (!memberships?.length) {
          setConfigs([]);
          setLoading(false);
          return;
        }

        const orgIds = memberships.map((m) => m.org_id);

        // ✅ Include "description" in the select query
        const { data, error } = await supabase
          .from("flappy_config")
          .select(
            "id, challenge_id, org_id, name, description, player_image_url, background_image_url, start_time, end_time"
          )
          .in("org_id", orgIds);

        if (error) throw error;

        const now = new Date();
        const availableConfigs = (data || []).filter((config) => {
          if (!config.end_time) return true;
          const end = new Date(config.end_time);
          return end > now;
        });

        setConfigs(availableConfigs);
      } catch (err) {
        console.error("Error fetching Flappy configs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, [user]);

  const handleSelect = (config: FlappyConfig) => {
    sessionStorage.setItem("selectedChallengeData", JSON.stringify(config));
    sessionStorage.setItem("currentOrgId", config.org_id);
    sessionStorage.setItem("currentChallengeId", config.challenge_id);
    navigate("../flappy-game");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-gray-600 text-lg">Loading challenges...</p>
      </div>
    );
  }

  if (!configs.length) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-6 bg-gray-50 text-center">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 flex items-center text-green-600 hover:text-green-700 font-medium"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <h2 className="text-2xl font-semibold mb-2 text-gray-800">
          No Challenges Available
        </h2>
        <p className="text-gray-600 max-w-md">
          There are currently no Flappy challenges available for your organization.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center px-4 py-6 bg-gray-50">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 flex items-center text-green-600 hover:text-green-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back
      </button>

      <div className="w-full max-w-6xl p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Choose Your Challenge
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {configs.map((config) => (
            <div
              key={config.challenge_id}
              className="bg-white rounded-2xl shadow hover:shadow-lg transition cursor-pointer flex flex-col border border-gray-100"
              onClick={() => handleSelect(config)}
            >
              <div className="w-full aspect-[16/9]">
                <img
                  src={
                    config.background_image_url ||
                    "https://cdn-icons-png.flaticon.com/512/3408/3408598.png"
                  }
                  alt={config.name}
                  className="w-full h-full object-cover rounded-t-2xl"
                />
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-1 text-gray-900">
                    {config.name}
                  </h2>

                  {/* ✅ Display description */}
                  {config.description && (
                    <p className="text-sm text-gray-700 mb-2 line-clamp-3">
                      {config.description}
                    </p>
                  )}

                  <p className="text-sm text-gray-600">
                    {config.start_time && config.end_time
                      ? `Available from ${new Date(
                          config.start_time
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })} to ${new Date(
                          config.end_time
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`
                      : "Available challenge"}
                  </p>
                </div>

                <button className="mt-4 w-full bg-green-600 text-white py-2 rounded-full hover:bg-green-700 transition">
                  Play Challenge
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
