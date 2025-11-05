import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function FlappyConfigUploader({ orgId }: { orgId: string }) {
  const [playerImage, setPlayerImage] = useState<File | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [configs, setConfigs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage("You must be signed in to manage challenges.");
        setAuthorized(false);
        return;
      }

      const { data } = await supabase
        .from("org_managers")
        .select("org_id, manager_role")
        .eq("user_id", user.id)
        .eq("org_id", orgId)
        .maybeSingle();

      setAuthorized(!!data);
      if (!data) setMessage("You do not have permission to manage this organization’s challenges.");
    };

    checkAccess();
  }, [orgId]);

  useEffect(() => {
    const fetchConfigs = async () => {
      if (!orgId || !authorized) return;
      const { data } = await supabase
        .from("flappy_config")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      setConfigs(data || []);
    };

    fetchConfigs();
  }, [orgId, authorized]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorized) {
      setMessage("You are not authorized to manage this challenge.");
      return;
    }
    if (!orgId) {
      setMessage("Organization ID is missing.");
      return;
    }
    if (!name) {
      setMessage("Please provide a challenge name.");
      return;
    }
    if (!startTime || !endTime) {
      setMessage("Please provide start and end availability times.");
      return;
    }

    setUploading(true);
    setMessage("Uploading...");

    try {
      const bucket = "flappy";
      const timestamp = Date.now();

      let playerUrl: string | null = editingConfig?.player_image_url || null;
      let backgroundUrl: string | null = editingConfig?.background_image_url || null;

      if (playerImage) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(`${orgId}/player-${timestamp}-${playerImage.name}`, playerImage, {
            upsert: true,
          });
        if (error) throw error;
        const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(data.path);
        playerUrl = publicUrl.publicUrl;
      }

      if (backgroundImage) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(`${orgId}/background-${timestamp}-${backgroundImage.name}`, backgroundImage, {
            upsert: true,
          });
        if (error) throw error;
        const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(data.path);
        backgroundUrl = publicUrl.publicUrl;
      }

      if (editingId) {
        const { error } = await supabase
          .from("flappy_config")
          .update({
            name,
            player_image_url: playerUrl,
            background_image_url: backgroundUrl,
            start_time: startTime,
            end_time: endTime,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);
        if (error) throw error;
        setMessage("Successfully updated the challenge.");
      } else {
        const { error } = await supabase.from("flappy_config").insert([
          {
            org_id: orgId,
            name,
            player_image_url: playerUrl,
            background_image_url: backgroundUrl,
            start_time: startTime,
            end_time: endTime,
          },
        ]);
        if (error) throw error;
        setMessage("Successfully created a new challenge.");
      }

      const { data: refreshed } = await supabase
        .from("flappy_config")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      setConfigs(refreshed || []);
      setPlayerImage(null);
      setBackgroundImage(null);
      setName("");
      setStartTime("");
      setEndTime("");
      setEditingId(null);
      setEditingConfig(null);
      setShowModal(false);
    } catch (err: any) {
      setMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (config: any) => {
    setEditingId(config.id);
    setEditingConfig(config);
    setName(config.name);
    setStartTime(config.start_time ? config.start_time.slice(0, 16) : "");
    setEndTime(config.end_time ? config.end_time.slice(0, 16) : "");
    setMessage(`Editing challenge: ${config.name}`);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!authorized) {
      setMessage("You cannot delete challenges from another organization.");
      return;
    }
    if (!confirm("Are you sure you want to delete this challenge?")) return;
    const { error } = await supabase.from("flappy_config").delete().eq("id", id);
    if (error) {
      setMessage("Failed to delete challenge.");
    } else {
      setConfigs(configs.filter((c) => c.id !== id));
      setMessage("Challenge deleted successfully.");
    }
  };

  const formatLocalTime = (timeString: string) => {
    if (!timeString) return "";
    const date = new Date(timeString);
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (!authorized) {
    return (
      <div className="max-w-md mx-auto bg-white shadow-md p-6 rounded-xl text-center">
        <p className="text-gray-700">{message || "Checking access..."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-xl p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-2 text-green-700">Upload Flappy Config</h2>

      {showModal && editingConfig && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="relative bg-white rounded-xl shadow-lg w-full max-w-3xl h-[90vh] overflow-y-auto p-8">
      {/* Close Button */}
      <button
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-2xl font-bold"
        onClick={() => setShowModal(false)}
      >
        ×
      </button>

      <h2 className="text-2xl font-bold mb-6 text-green-700 text-center">
        Edit Flappy Challenge
      </h2>

      <form onSubmit={handleUpload} className="flex flex-col gap-6">
        {/* Challenge Name */}
        <div>
          <label className="block font-semibold mb-1">Challenge Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 rounded-md w-full p-2 focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Image Section */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Player Image */}
          <div className="flex flex-col items-center">
            <div className="text-center font-semibold mb-3">Player Image</div>
            <div className="border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden shadow-inner w-40 h-40 mb-3">
              {playerImage ? (
                <img
                  src={URL.createObjectURL(playerImage)}
                  alt="New player preview"
                  className="w-full h-full object-contain"
                />
              ) : editingConfig?.player_image_url ? (
                <img
                  src={editingConfig.player_image_url}
                  alt="Current player"
                  className="w-full h-full object-contain"
                />
              ) : (
                <p className="text-sm text-gray-500">No image</p>
              )}
            </div>
            <label className="bg-green-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-green-700">
              Choose File
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPlayerImage(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>

          {/* Background Image */}
          <div className="flex flex-col items-center">
            <div className="text-center font-semibold mb-3">
              Background Image (Preview: 720×1280)
            </div>
            <div className="border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden shadow-inner w-[180px] h-[320px] mb-3">
              {backgroundImage ? (
                <img
                  src={URL.createObjectURL(backgroundImage)}
                  alt="New background preview"
                  className="w-full h-full object-cover"
                />
              ) : editingConfig?.background_image_url ? (
                <img
                  src={editingConfig.background_image_url}
                  alt="Current background"
                  className="w-full h-full object-cover"
                />
              ) : (
                <p className="text-sm text-gray-500 text-center p-2">No image</p>
              )}
            </div>
            <label className="bg-green-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-green-700">
              Choose File
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBackgroundImage(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Time Controls */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block font-semibold mb-1">Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border border-gray-300 rounded-md w-full p-2 focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border border-gray-300 rounded-md w-full p-2 focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 disabled:opacity-50 font-semibold"
        >
          {uploading ? "Saving..." : "Update Challenge"}
        </button>
      </form>
    </div>
  </div>
)}

      <form onSubmit={handleUpload} className="flex flex-col gap-6">
        <div>
          <label className="block font-semibold mb-1">Challenge Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 rounded-md w-full p-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
  {/* Player Image */}
  <div className="flex flex-col items-center justify-start">
    <div className="text-center font-semibold mb-3">Player Image</div>
    <div className="border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden shadow-inner w-40 h-40 mb-2">
      {playerImage ? (
        <img
          src={URL.createObjectURL(playerImage)}
          alt="Player preview"
          className="w-full h-full object-contain"
        />
      ) : (
        <p className="text-sm text-gray-500 text-center">No image selected</p>
      )}
    </div>
    <label className="bg-green-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-green-700 text-center">
      Choose File
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setPlayerImage(e.target.files?.[0] || null)}
        className="hidden"
      />
    </label>
  </div>

  {/* Background Image */}
  <div className="flex flex-col items-center justify-start">
    <div className="text-center font-semibold mb-3">Background Image (Preview: 720×1280)</div>
    <div className="border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden shadow-inner w-40 h-40 mb-2">
      {backgroundImage ? (
        <img
          src={URL.createObjectURL(backgroundImage)}
          alt="Background preview"
          className="w-full h-full object-cover"
        />
      ) : (
        <p className="text-sm text-gray-500 text-center p-2">No image selected</p>
      )}
    </div>
    <label className="bg-green-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-green-700 text-center">
      Choose File
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setBackgroundImage(e.target.files?.[0] || null)}
        className="hidden"
      />
    </label>
  </div>
</div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border border-gray-300 rounded-md w-full p-2"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border border-gray-300 rounded-md w-full p-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
        >
          {uploading ? "Saving..." : "Create Challenge"}
        </button>
      </form>

      {message && <p className="mt-2 text-center text-sm text-gray-700">{message}</p>}

      <hr className="my-6" />

      <h3 className="text-xl font-semibold text-green-700">Existing Challenges</h3>

      <div className="space-y-4">
        {configs.length === 0 && <p className="text-gray-500">No challenges found.</p>}

        {configs.map((config) => (
          <div
            key={config.id}
            className="border border-gray-300 rounded-lg p-4 flex justify-between items-start"
          >
            <div>
              <p className="font-bold text-lg">{config.name}</p>
              <p className="text-sm text-gray-600">
                {formatLocalTime(config.start_time)} → {formatLocalTime(config.end_time)}
              </p>
              {config.player_image_url && (
                <img
                  src={config.player_image_url}
                  alt="Player"
                  className="mt-2 w-16 h-16 object-contain border rounded"
                />
              )}
              {config.background_image_url && (
                <img
                  src={config.background_image_url}
                  alt="Background"
                  className="mt-2 w-24 h-16 object-cover border rounded"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleEdit(config)}
                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(config.id)}
                className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
