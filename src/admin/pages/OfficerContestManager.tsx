import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";

interface Contest {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const OfficerContestManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newContest, setNewContest] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    const fetchOrg = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("org_managers")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("❌ Error fetching org:", error);
        return;
      }
      if (data?.org_id) {
        setOrgId(data.org_id);
      } else {
        alert("You are not an officer of any organization.");
        navigate("/");
      }
    };
    fetchOrg();
  }, [user]);

  useEffect(() => {
    const loadContests = async () => {
      if (!orgId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("room_contests")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      setLoading(false);
      if (error) {
        console.error("❌ Failed to load contests:", error);
      } else {
        setContests(data || []);
      }
    };
    loadContests();
  }, [orgId]);

  const handleCreateContest = async () => {
    if (!orgId || !user) return;
    if (!newContest.title.trim()) return alert("Enter a contest title.");

    try {
      const { error } = await supabase.from("room_contests").insert({
        org_id: orgId,
        title: newContest.title.trim(),
        description: newContest.description.trim(),
        start_date: newContest.start_date || null,
        end_date: newContest.end_date || null,
        created_by: user.id,
        is_active: true,
      });

      if (error) throw error;

      alert("✅ Contest created!");
      setNewContest({ title: "", description: "", start_date: "", end_date: "" });
      setCreating(false);

      const { data } = await supabase
        .from("room_contests")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      setContests(data || []);
    } catch (err) {
      console.error("❌ Failed to create contest:", err);
      alert("Error creating contest.");
    }
  };

  const toggleContestStatus = async (contest: Contest) => {
    const { error } = await supabase
      .from("room_contests")
      .update({ is_active: !contest.is_active })
      .eq("id", contest.id);

    if (error) return alert("Failed to update contest status.");

    setContests((prev) =>
      prev.map((c) =>
        c.id === contest.id ? { ...c, is_active: !contest.is_active } : c
      )
    );
  };

  const deleteContest = async (id: string) => {
    if (!window.confirm("Delete this contest?")) return;

    const { error } = await supabase.from("room_contests").delete().eq("id", id);

    if (error) {
      alert("Failed to delete contest.");
    } else {
      setContests((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Officer Contest Manager</h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-green-500 px-4 py-2 rounded-lg hover:bg-green-600 text-white"
        >
          ← Back
        </button>
      </div>

      {creating ? (
        <div className="bg-white p-4 rounded-lg mb-6 shadow">
          <h2 className="text-xl font-semibold mb-4">🆕 Create Contest</h2>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Contest Title"
              value={newContest.title}
              onChange={(e) =>
                setNewContest({ ...newContest, title: e.target.value })
              }
              className="w-full p-2 rounded border border-gray-300"
            />
            <textarea
              placeholder="Contest Description"
              value={newContest.description}
              onChange={(e) =>
                setNewContest({ ...newContest, description: e.target.value })
              }
              className="w-full p-2 rounded border border-gray-300"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-500">Start Date</label>
                <input
                  type="datetime-local"
                  value={newContest.start_date}
                  onChange={(e) =>
                    setNewContest({ ...newContest, start_date: e.target.value })
                  }
                  className="w-full p-2 rounded border border-gray-300"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">End Date</label>
                <input
                  type="datetime-local"
                  value={newContest.end_date}
                  onChange={(e) =>
                    setNewContest({ ...newContest, end_date: e.target.value })
                  }
                  className="w-full p-2 rounded border border-gray-300"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-3">
              <button
                onClick={handleCreateContest}
                className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 text-white"
              >
                Create Contest
              </button>
              <button
                onClick={() => setCreating(false)}
                className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 text-white mb-6"
        >
          New Contest
        </button>
      )}

      <div className="bg-white rounded-lg p-4 shadow">
        <h2 className="text-xl font-semibold mb-4"> Existing Contests</h2>

        {loading ? (
          <p>Loading contests...</p>
        ) : contests.length === 0 ? (
          <p>No contests yet.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-300 text-gray-600">
                <th className="p-2">Title</th>
                <th className="p-2">Start</th>
                <th className="p-2">End</th>
                <th className="p-2">Status</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contests.map((c) => (
                <tr key={c.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-2">{c.title}</td>
                  <td className="p-2 text-sm text-gray-500">
                    {c.start_date ? new Date(c.start_date).toLocaleString() : "—"}
                  </td>
                  <td className="p-2 text-sm text-gray-500">
                    {c.end_date ? new Date(c.end_date).toLocaleString() : "—"}
                  </td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        c.is_active ? "bg-green-500 text-white" : "bg-gray-300 text-gray-700"
                      }`}
                    >
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-2 text-right space-x-2">
                    <button
                      onClick={() => toggleContestStatus(c)}
                      className="bg-yellow-400 px-2 py-1 rounded text-xs hover:bg-yellow-500"
                    >
                      {c.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => deleteContest(c.id)}
                      className="bg-red-400 px-2 py-1 rounded text-xs hover:bg-red-500"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default OfficerContestManager;
