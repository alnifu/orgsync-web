import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function OfficerSubmissions() {
  const [orgId, setOrgId] = useState<string>("");
  const [contests, setContests] = useState<any[]>([]);
  const [selectedContest, setSelectedContest] = useState<string>("");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    resolveOrgAndContests();
  }, []);

  const resolveOrgAndContests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get orgs this officer manages
      const { data: memberships } = await supabase
        .from("org_managers")
        .select("org_id")
        .eq("user_id", user.id);

      if (!memberships || memberships.length === 0) return;

      const org = memberships[0].org_id;
      setOrgId(org);

      // Fetch contests for this org
      const { data: contestData } = await supabase
        .from("room_contests")
        .select("id, title")
        .eq("org_id", org)
        .order("created_at", { ascending: false });

      setContests(contestData || []);
    } catch (err) {
      console.error("Error resolving org or contests:", err);
    }
  };

  useEffect(() => {
    if (selectedContest) loadSubmissions(selectedContest);
    else setSubmissions([]);
  }, [selectedContest]);

  const loadSubmissions = async (contestId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contest_submissions")
        .select(`
          id,
          image_url,
          submitted_at,
          user_id,
          users(first_name,last_name),
          contest_id
        `)
        .eq("contest_id", contestId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);
    } catch (err) {
      console.error("Error loading submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = url.split("/").pop() || "submission.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error downloading image:", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-green-700 mb-6">
        Contest Submissions
      </h1>

      {/* Contest selector */}
      <div className="mb-6">
        <select
          value={selectedContest}
          onChange={(e) => setSelectedContest(e.target.value)}
          className="border rounded px-3 py-2 w-64"
        >
          <option value="">Select a contest</option>
          {contests.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <p className="text-gray-600">No submissions found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-lg shadow-md overflow-hidden border"
            >
              <img
                src={sub.image_url}
                alt="Submission"
                className="w-full h-56 object-cover"
              />
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-1">
                  By {sub.users?.first_name} {sub.users?.last_name || ""}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  Submitted: {new Date(sub.submitted_at).toLocaleString()}
                </p>
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => window.open(sub.image_url, "_blank")}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => downloadImage(sub.image_url)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
