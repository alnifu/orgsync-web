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
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(
          "id, name, abbrev_name, org_pic, banner_pic, email, description, department, status, date_established, org_type"
        );

      if (error) {
        console.error("Error fetching orgs:", error);
      } else {
        setOrgs(data || []);
      }
    };

    fetchOrgs();
  }, []);

  return (
    <div className="p-3 max-w-2xl mx-auto">
      <div className="space-y-3">
        {orgs.map((org) => (
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

              {/* Show department and type if department exists, otherwise show type */}
              <p className="text-sm text-gray-500">
                {org.department !== 'OTHERS' ? org.department : org.org_type}
              </p>
            </div>
          </div>
        ))}
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

              {/* Show Department only if it exists */}
               <p>
                <strong>Department:</strong> {selectedOrg.department}
              </p>

              <p>
                <strong>Type:</strong> {selectedOrg.org_type.toUpperCase()}
              </p>

              <p>
                <strong>Established:</strong>{" "}
                {new Date(selectedOrg.date_established).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}