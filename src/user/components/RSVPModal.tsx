// RSVPModal.tsx
import React from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";

interface RSVPModalProps {
  showModal: boolean;
  selectedPost: any;
  setRsvp: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function RSVPModal({
  showModal,
  selectedPost,
  setRsvp,
  setShowModal,
}: RSVPModalProps) {
  if (!showModal || !selectedPost) return null;

  const cancelRSVP = () => setShowModal(false);

  const confirmRSVP = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedPost) return;

    try {
      // Insert RSVP
      const { error: rsvpError } = await supabase
        .from("rsvps")
        .insert({ post_id: selectedPost.id, user_id: user.id });

      if (rsvpError) {
        console.error("Error saving RSVP:", rsvpError);
        toast.error("Failed to save RSVP.");
        return;
      }

      // Award coins via RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "award_user_coins_once",
        {
          p_user_id: user.id,
          p_post_id: selectedPost.id,
          p_action: "rsvp",
          p_points: 30,
        }
      );

      if (rpcError) {
        console.error("Error awarding coins for RSVP:", rpcError);
        toast.error("RSVP saved, but failed to award coins.");
      } else {
        const coinsAwarded = rpcData ?? 0;
        if (coinsAwarded > 0) toast.success(`🎉 You just earned ${coinsAwarded} coins for RSVPing!`);
      }

      // Update local RSVP state
      setRsvp((prev) => ({ ...prev, [selectedPost.id]: true }));
      setShowModal(false);
    } catch (err) {
      console.error("Unexpected error during RSVP:", err);
      toast.error("Something went wrong.");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/2 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">RSVP</h2>
          <button onClick={cancelRSVP} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-gray-600 mb-6">
          RSVP to "{selectedPost.title}" to show you are interested in attending! Continue?
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={cancelRSVP}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            No
          </button>
          <button
            onClick={confirmRSVP}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
