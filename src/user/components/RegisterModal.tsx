import { X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { useState } from "react";

interface RegisterModalProps {
  showModal: boolean;
  selectedPost: any | null;
  setRegistered: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  setRsvp: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  colleges: Record<string, string[]>;
  rsvp: { [key: string]: boolean };
}

export default function RegisterModal({
  showModal,
  selectedPost,
  setRegistered,
  setRsvp,
  setShowModal,
  colleges,
  rsvp
}: RegisterModalProps) {
  const [registerData, setRegisterData] = useState({
    last_name: "",
    first_name: "",
    middle_initial: "",
    email: "",
    college: "",
    program: "",
    section: "",
  });

  const [errors, setErrors] = useState({
    last_name: "",
    first_name: "",
    middle_initial: "",
    email: "",
    college: "",
    program: "",
    section: "",
  });

  const [selectedCollege, setSelectedCollege] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");

  if (!showModal || !selectedPost) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newErrors = { ...errors };

    if (name === "email" && !value.includes("@")) newErrors.email = "Invalid email address.";
    else if (!value.trim()) newErrors[name as keyof typeof newErrors] = "This field is required.";
    else newErrors[name as keyof typeof newErrors] = "";

    setRegisterData((prev) => ({ ...prev, [name]: value }));
    setErrors(newErrors);
  };

  const validateRegister = () => {
    const newErrors = { ...errors };

    if (!registerData.first_name.trim()) newErrors.first_name = "First name is required.";
    if (!registerData.middle_initial.trim()) newErrors.middle_initial = "Middle initial is required.";
    if (!registerData.last_name.trim()) newErrors.last_name = "Last name is required.";
    if (!registerData.email.trim()) newErrors.email = "Email is required.";
    else if (!/^[\w-.]+@dlsl\.edu\.ph$/.test(registerData.email.trim()))
      newErrors.email = "Use your valid DLSL email address.";
    if (!registerData.college.trim()) newErrors.college = "College is required.";
    if (!registerData.program.trim()) newErrors.program = "Program is required.";
    if (!registerData.section.trim()) newErrors.section = "Section is required.";

    setErrors(newErrors);
    return Object.values(newErrors).every((err) => !err);
  };

  const handleClose = () => {
    setShowModal(false);
    setRegisterData({
      last_name: "",
      first_name: "",
      middle_initial: "",
      email: "",
      college: "",
      program: "",
      section: "",
    });
    setErrors({
      last_name: "",
      first_name: "",
      middle_initial: "",
      email: "",
      college: "",
      program: "",
      section: "",
    });
    setSelectedCollege("");
    setSelectedProgram("");
  };

  const submitRegistration = async () => {
  if (!validateRegister()) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !selectedPost) return;

  try {
    // Auto-RSVP if not already RSVPed
    if (!rsvp[selectedPost.id]) {
      const { error: rsvpError } = await supabase.from("rsvps").insert({
        post_id: selectedPost.id,
        user_id: user.id,
      });

      if (rsvpError) {
        console.error("Error auto-RSVPing:", rsvpError);
        toast.error("Failed to auto-RSVP. Registration aborted.");
        return;
      }

      // Award coins for RSVP
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
        console.error("Error awarding RSVP coins:", rpcError);
        toast.error("RSVP saved, but failed to award coins.");
      } else if ((rpcData ?? 0) > 0) {
        toast.success(`🎉 You earned ${rpcData} coins for RSVPing!`);
      }

      // Update local RSVP state
      setRsvp((prev) => ({ ...prev, [selectedPost.id]: true }));
    }

    // Insert registration
    const { error } = await supabase.from("event_registrations").insert({
      post_id: selectedPost.id,
      user_id: user.id,
      first_name: registerData.first_name.trim(),
      middle_initial: registerData.middle_initial.trim(),
      last_name: registerData.last_name.trim(),
      email: registerData.email.trim(),
      college: registerData.college.trim(),
      program: registerData.program.trim(),
      section: registerData.section.trim(),
    });

    if (error) {
      console.error("Error saving registration:", error);
      toast.error("Failed to register. Please try again.");
      return;
    }

    // Award coins for registration
    const { data: rpcData2, error: rpcError2 } = await supabase.rpc(
      "award_user_coins_once",
      {
        p_user_id: user.id,
        p_post_id: selectedPost.id,
        p_action: "register",
        p_points: 50,
      }
    );

    if (rpcError2) {
      console.error("Error awarding registration coins:", rpcError2);
      toast.error("Registered, but failed to award coins.");
    } else if ((rpcData2 ?? 0) > 0) {
      toast.success(`🎉 You earned ${rpcData2} coins for registering!`);
    }

    // Update local state
    setRegistered((prev) => ({ ...prev, [selectedPost.id]: true }));

    // Reset form & close modal
    setRegisterData({
      last_name: "",
      first_name: "",
      middle_initial: "",
      email: "",
      college: "",
      program: "",
      section: "",
    });
    setErrors({
      last_name: "",
      first_name: "",
      middle_initial: "",
      email: "",
      college: "",
      program: "",
      section: "",
    });
    setShowModal(false);

  } catch (err) {
    console.error("Unexpected error during registration:", err);
    toast.error("Something went wrong.");
  }
};

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/2 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Confirm registration for {selectedPost.title}
          </h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <input
              type="text"
              name="first_name"
              placeholder="First Name"
              value={registerData.first_name}
              onChange={handleChange}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 ${errors.first_name ? "border-red-500" : "border-gray-300"}`}
            />
            {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1">
              <input
                type="text"
                name="middle_initial"
                placeholder="M.I."
                value={registerData.middle_initial}
                maxLength={1}
                onChange={handleChange}
                className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 ${errors.middle_initial ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.middle_initial && <p className="text-red-500 text-sm mt-1">{errors.middle_initial}</p>}
            </div>
            <div className="col-span-3">
              <input
                type="text"
                name="last_name"
                placeholder="Last Name"
                value={registerData.last_name}
                onChange={handleChange}
                className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 ${errors.last_name ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
            </div>
          </div>

          <div>
            <input
              type="email"
              name="email"
              placeholder="DLSL Email"
              value={registerData.email}
              onChange={handleChange}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 ${errors.email ? "border-red-500" : "border-gray-300"}`}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <select
              name="college"
              value={registerData.college}
              onChange={(e) => {
                const college = e.target.value;
                setRegisterData((prev) => ({ ...prev, college, program: "" }));
                setSelectedCollege(college);
                setSelectedProgram("");
                handleChange(e);
              }}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 ${errors.college ? "border-red-500" : "border-gray-300"}`}
            >
              <option value="">Select College</option>
              {Object.keys(colleges).map((college) => (
                <option key={college} value={college}>{college}</option>
              ))}
            </select>
            {errors.college && <p className="text-red-500 text-sm mt-1">{errors.college}</p>}
          </div>

          <div>
            <select
              name="program"
              value={registerData.program}
              onChange={handleChange}
              disabled={!registerData.college}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 ${errors.program ? "border-red-500" : "border-gray-300"} ${!registerData.college ? "bg-gray-100 cursor-not-allowed" : ""}`}
            >
              <option value="">Select Program</option>
              {registerData.college && colleges[registerData.college]?.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.program && <p className="text-red-500 text-sm mt-1">{errors.program}</p>}
          </div>

          <div>
            <input
              type="text"
              name="section"
              placeholder="Section"
              value={registerData.section}
              onChange={handleChange}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 ${errors.section ? "border-red-500" : "border-gray-300"}`}
            />
            {errors.section && <p className="text-red-500 text-sm mt-1">{errors.section}</p>}
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button onClick={handleClose} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
            Cancel
          </button>
          <button onClick={submitRegistration} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
