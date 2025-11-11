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
  const [submitting, setSubmitting] = useState(false); 
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
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
  if (submitting) return; // prevent double click
  if (!orgId || !user) return;

  if (!newContest.title.trim()) {
    alert("Please enter a contest title.");
    return;
  }

  if (!newContest.description.trim()) {
    alert("Please enter a contest description.");
    return;
  }

  setSubmitting(true);
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
  } finally {
    setSubmitting(false);
  }
};

  const toggleContestStatus = async (contest: Contest) => {
    if (toggling) return; // Prevent multiple clicks
    
    setToggling(contest.id);
    try {
      const { error } = await supabase
        .from("room_contests")
        .update({ is_active: !contest.is_active })
        .eq("id", contest.id);

      if (error) throw error;

      setContests((prev) =>
        prev.map((c) =>
          c.id === contest.id ? { ...c, is_active: !contest.is_active } : c
        )
      );
    } catch (err) {
      alert("Failed to update contest status.");
    } finally {
      setToggling(null);
    }
  };

  const deleteContest = async (id: string) => {
    if (deleting) return; // Prevent multiple clicks
    
    if (!window.confirm("Delete this contest?")) return;

    setDeleting(id);
    try {
      const { error } = await supabase.from("room_contests").delete().eq("id", id);

      if (error) throw error;

      setContests((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert("Failed to delete contest.");
    } finally {
      setDeleting(null);
    }
  };

  return (
  <div className="min-h-screen text-gray-900 p-4 sm:p-6">
    {/* Header */}
    <div className="mb-6 text-center">
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">
        Room Design Contests
      </h1>
    </div>

    {/* Create Contest Form */}
    {creating ? (
  <div className="bg-white p-4 rounded-lg mb-6 shadow">
    <h2 className="text-lg sm:text-xl font-semibold mb-4">🆕 Create Contest</h2>

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-gray-500">Start Date (Optional)</label>
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
          <label className="text-sm text-gray-500">End Date (Optional)</label>
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

      <div className="flex flex-col sm:flex-row gap-3 mt-3">
        <button
          type="button"
          onClick={handleCreateContest}
          disabled={submitting}
          className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 text-white w-full sm:w-auto"
        >
          {submitting ? "Creating..." : "Create Contest"}
        </button>
        <button
          onClick={() => setCreating(false)}
          className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 text-white w-full sm:w-auto"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
) : (
  <div className="flex justify-center sm:justify-end mb-6">
    <button
      onClick={() => setCreating(true)}
      className="bg-blue-500 px-6 py-2 rounded hover:bg-blue-600 text-white inline-block"
    >
      New Contest
    </button>
  </div>
)}

    {/* Contest Table */}
    <div className="bg-white rounded-lg p-4 shadow overflow-x-auto">
      <h2 className="text-lg sm:text-xl font-semibold mb-4">Existing Contests</h2>

      {loading ? (
        <p>Loading contests...</p>
      ) : contests.length === 0 ? (
        <p>No contests yet.</p>
      ) : (
        <table className="w-full text-left border-collapse min-w-[600px]">
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
              <tr
                key={c.id}
                className="border-b border-gray-200 hover:bg-gray-50 text-sm"
              >
                <td className="p-2">{c.title}</td>
                <td className="p-2 text-gray-500">
                  {c.start_date
                    ? new Date(c.start_date).toLocaleString()
                    : "—"}
                </td>
                <td className="p-2 text-gray-500">
                  {c.end_date ? new Date(c.end_date).toLocaleString() : "—"}
                </td>
                <td className="p-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      c.is_active
                        ? "bg-green-500 text-white"
                        : "bg-gray-300 text-gray-700"
                    }`}
                  >
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
               <td className="p-2">
                  <div className="flex justify-center md:justify-end gap-2">
                    <button
                      onClick={() => toggleContestStatus(c)}
                      disabled={toggling === c.id}
                      className="bg-yellow-400 px-2 py-1 rounded text-xs hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {toggling === c.id
                        ? "..."
                        : c.is_active
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                    <button
                      onClick={() => deleteContest(c.id)}
                      disabled={deleting === c.id}
                      className="bg-red-400 px-2 py-1 rounded text-xs hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting === c.id ? "..." : "Delete"}
                    </button>
                  </div>
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
