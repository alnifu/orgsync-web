import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { X } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  abbrev_name: string;
  org_pic: string | null;
  banner_pic: string | null;
  email: string;
  description: string;
  department: string | null;
  status: string;
  date_established: string;
  org_type: string;
}

export default function Organizations() {
  const [joinedOrgs, setJoinedOrgs] = useState<Organization[]>([]);
  const [otherOrgs, setOtherOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgsData, error: orgsError } = await supabase
      .from("organizations")
      .select(
        "id, name, abbrev_name, org_pic, banner_pic, email, description, department, status, date_established, org_type"
      )
      .eq("status", "active");

      if (orgsError) throw orgsError;

      const { data: joinedData, error: joinedError } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (joinedError) throw joinedError;

      const joinedOrgIds = joinedData?.map((item) => item.org_id) || [];
      const joined = orgsData?.filter((org) => joinedOrgIds.includes(org.id)) || [];
      const others = orgsData?.filter((org) => !joinedOrgIds.includes(org.id)) || [];

      setJoinedOrgs(joined);
      setOtherOrgs(others);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchOrgs();
}, []);

  const renderOrgCard = (org: Organization) => (
    <div
      key={org.id}
      onClick={() => setSelectedOrg(org)}
      className="flex items-center space-x-3 bg-white shadow rounded-lg p-4 cursor-pointer hover:bg-gray-50"
    >
      {org.org_pic ? (
        <img
          src={org.org_pic}
          alt={org.abbrev_name || org.name}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
          {org.abbrev_name?.charAt(0) || org.name.charAt(0)}
        </div>
      )}
      <div>
        <p className="text-gray-800 font-medium">{org.abbrev_name || org.name}</p>
        <p className="text-sm text-gray-500">
          {org.department !== "OTHERS" ? org.department : org.org_type}
        </p>
      </div>
    </div>
  );

if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-green-700 mb-4 text-center">
        Organizations
      </h1>
      {/* Joined Organizations */}
      <div>
        <h2 className="text-lg font-semibold text-green-700 mb-2">Joined</h2>
        {joinedOrgs.length > 0 ? (
          <div className="space-y-3">{joinedOrgs.map(renderOrgCard)}</div>
        ) : (
          <p className="text-gray-500 text-sm">You haven't joined any organizations yet.</p>
        )}
      </div>

      {/* Other Organizations */}
      <div>
        <h2 className="text-lg font-semibold text-green-700 mb-2">Others</h2>
        {otherOrgs.length > 0 ? (
          <div className="space-y-3">{otherOrgs.map(renderOrgCard)}</div>
        ) : (
          <p className="text-gray-500 text-sm">No other organizations available.</p>
        )}
      </div>

      {/* Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {selectedOrg.name}
              </h2>
              <button
                onClick={() => setSelectedOrg(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedOrg.banner_pic && (
              <img
                src={selectedOrg.banner_pic}
                alt={selectedOrg.abbrev_name || selectedOrg.name}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
            )}

            <p className="text-gray-700 mb-4">{selectedOrg.description}</p>

            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Email:</strong> {selectedOrg.email}
              </p>
              <p>
                <strong>Department:</strong> {selectedOrg.department}
              </p>
              <p>
                <strong>Type:</strong> {selectedOrg.org_type.toUpperCase()}
              </p>
              <p>
                <strong>Established:</strong>{" "}
                {new Date(selectedOrg.date_established).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
