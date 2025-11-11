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
  const [description, setDescription] = useState(""); // NEW
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [hasAvailability, setHasAvailability] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCreateConfirmModal, setShowCreateConfirmModal] = useState(false);

  // Check user access
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  // Fetch existing configs
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

  // Upload helper function
  const uploadChallenge = async () => {
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
          .upload(`${orgId}/player-${timestamp}-${playerImage.name}`, playerImage, { upsert: true });
        if (error) throw error;
        const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(data.path);
        playerUrl = publicUrl.publicUrl;
      }

      if (backgroundImage) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(`${orgId}/background-${timestamp}-${backgroundImage.name}`, backgroundImage, { upsert: true });
        if (error) throw error;
        const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(data.path);
        backgroundUrl = publicUrl.publicUrl;
      }

      const payload: any = {
        org_id: orgId,
        name,
        description, // NEW
        player_image_url: playerUrl,
        background_image_url: backgroundUrl,
        start_time: hasAvailability ? startTime : null,
        end_time: hasAvailability ? endTime : null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from("flappy_config").update(payload).eq("id", editingId);
        if (error) throw error;
        setMessage("Successfully updated the challenge.");
      } else {
        const { error } = await supabase.from("flappy_config").insert([payload]);
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
      setDescription(""); // RESET
      setStartTime("");
      setEndTime("");
      setEditingId(null);
      setEditingConfig(null);
      setHasAvailability(false);
    } catch (err: any) {
      setMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle form submit
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
  if (!name.trim()) {
    setMessage("Please provide a challenge name.");
    return;
  }
  if (!description.trim()) {
    setMessage("Please provide a description for the challenge.");
    return;
  }

  // Require images if creating a new challenge
  if (!editingId) {
    if (!playerImage) {
      setMessage("Please select a player image.");
      return;
    }
    if (!backgroundImage) {
      setMessage("Please select a background image.");
      return;
    }
  }

  // Show create confirmation if unchecked availability and creating a new challenge
  if (!editingId && !hasAvailability) {
    setShowCreateConfirmModal(true);
    return;
  }

  if (hasAvailability && (!startTime || !endTime)) {
    setMessage("Please provide start and end availability times.");
    return;
  }

  await uploadChallenge();
};

  const handleEdit = (config: any) => {
    setEditingId(config.id);
    setEditingConfig(config);
    setName(config.name);
    setDescription(config.description || ""); 
    setStartTime(config.start_time ? config.start_time.slice(0, 16) : "");
    setEndTime(config.end_time ? config.end_time.slice(0, 16) : "");
    setHasAvailability(!!config.start_time && !!config.end_time);
    setMessage(`Editing challenge: ${config.name}`);
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
    return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  };

  const handleAvailabilityChange = (checked: boolean) => {
    if (!checked && (startTime || endTime)) {
      setShowConfirmModal(true);
    } else {
      setHasAvailability(checked);
    }
  };

  const confirmNoAvailability = () => {
    setHasAvailability(false);
    setStartTime("");
    setEndTime("");
    setShowConfirmModal(false);
  };

  const cancelNoAvailability = () => {
    setHasAvailability(true);
    setShowConfirmModal(false);
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

      <form onSubmit={handleUpload} className="flex flex-col gap-6">
        {/* Challenge Name */}
        <div>
          <label className="block font-semibold mb-1">Challenge Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 rounded-md w-full p-2"
          />
        </div>

        {/* Challenge Description */}
        <div>
          <label className="block font-semibold mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="border border-gray-300 rounded-md w-full p-2"
            placeholder="Describe the challenge..."
          />
        </div>

        {/* Availability Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasAvailability}
            onChange={(e) => handleAvailabilityChange(e.target.checked)}
          />
          <label className="font-semibold">Enable Availability Time</label>
        </div>

        {/* Availability Inputs */}
        {hasAvailability && (
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
        )}

        {/* Image Uploads */}
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
  <div className="text-center font-semibold mb-3">
    Background Image (Preview: 720×1280)
  </div>
  <div
    className="border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden shadow-inner mb-2"
    style={{ width: "180px", height: "320px" }} // 720:1280 ratio scaled down
  >
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

        {editingId ? (
  <div className="flex gap-4">
    <button
      type="submit"
      disabled={uploading}
      className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
    >
      {uploading ? "Saving..." : "Update Challenge"}
    </button>
    <button
      type="button"
      onClick={() => {
        // Reset editing state
        setEditingId(null);
        setEditingConfig(null);
        setName("");
        setDescription("");
        setStartTime("");
        setEndTime("");
        setHasAvailability(false);
        setPlayerImage(null);
        setBackgroundImage(null);
        setMessage("");
      }}
      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
    >
      Cancel
    </button>
  </div>
) : (
  <button
    type="submit"
    disabled={uploading}
    className="bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
  >
    {uploading ? "Saving..." : "Create Challenge"}
  </button>
)}
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
              {config.description && <p className="text-sm text-gray-600">{config.description}</p>} {/* NEW */}
              {config.start_time && config.end_time && (
                <p className="text-sm text-gray-600">
                  {formatLocalTime(config.start_time)} → {formatLocalTime(config.end_time)}
                </p>
              )}
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

      {/* Confirm Disable Availability Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96 text-center">
            <p className="mb-4 font-semibold">
              Are you sure you want to disable availability dates? This will clear any set start/end times.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={confirmNoAvailability}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Yes, disable
              </button>
              <button
                onClick={cancelNoAvailability}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Create Without Availability Modal */}
      {showCreateConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96 text-center">
            <p className="mb-4 font-semibold">
              You have not enabled availability time. Do you want to continue creating this challenge without start/end times?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  uploadChallenge();
                  setShowCreateConfirmModal(false);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Yes, create
              </button>
              <button
                onClick={() => setShowCreateConfirmModal(false)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
