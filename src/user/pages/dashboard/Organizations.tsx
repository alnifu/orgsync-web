import { useState } from "react";
import { X } from "lucide-react";

type OrgKey = "jpcs" | "musikalista";

export default function Organizations() {
  const [selectedOrg, setSelectedOrg] = useState<OrgKey | null>(null);

  const orgs: Record<OrgKey, { name: string; desc: string; objectives: string[] }> = {
    jpcs: {
      name: "Junior Philippine Computers' Society (JPCS)",
      desc: `JPCS is the organization of students taking up Bachelor of Science in Computer Science (BSCS), Bachelor of Science in Information Technology (BSIT), and Associate in Computer Technology (ACT) programs in De La Salle Lipa.`,
      objectives: [
        "To promote enthusiasts' understanding and usage of Information Technology",
        "To encourage the development of higher standards of Computer Education among chapter Schools.",
        "To provide an organization for information exchange among its members, promoting and improving IT in the country",
        "To prepare the students for the technical, leadership and ethical challenges as a future IT professional",
      ],
    },
    musikalista: {
      name: "Musikalista",
      desc: `Musikalista is the official group to recognize all existing bands and musicians to perform at De La Salle Lipa College and the official organization to discharge its responsibility more effectively in elevating and improving the Music community in De La Salle Lipa.`,
      objectives: [
        "The organization is established to develop leadership skills, nurture its members on their talents, and provide an opportunity to share these nurtured talents in the community.",
        "The organization shall establish camaraderie among its members, thereby creating a community to embody Lasallian values through service to one another.",
        "The organization shall promote and enhance the abilities of every member of Musikalista. It shall also conversely train members to be appropriately integrated with a new member or in joining with another group as a “sessionist” and be assisted for whatever purpose that would favor the member and the organization.",
      ],
    },
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Joined Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Joined</h2>
        <div
          onClick={() => setSelectedOrg("jpcs")}
          className="flex items-center space-x-3 bg-white shadow rounded-lg p-4 cursor-pointer hover:bg-gray-50"
        >
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
            J
          </div>
          <p className="text-gray-800 font-medium">{orgs.jpcs.name}</p>
        </div>
      </div>

      {/* Others Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Others</h2>
        <div
          onClick={() => setSelectedOrg("musikalista")}
          className="flex items-center space-x-3 bg-white shadow rounded-lg p-4 cursor-pointer hover:bg-gray-50"
        >
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
            M
          </div>
          <p className="text-gray-800 font-medium">{orgs.musikalista.name}</p>
        </div>
      </div>

      {/* Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {orgs[selectedOrg].name}
              </h2>
              <button
                onClick={() => setSelectedOrg(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-700 mb-4">{orgs[selectedOrg].desc}</p>
            <h3 className="font-semibold text-gray-800 mb-2">Objectives:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {orgs[selectedOrg].objectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
