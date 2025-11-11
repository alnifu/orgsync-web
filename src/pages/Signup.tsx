import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import type { SignupFormData } from "../types/userTypes";
import { Eye, EyeOff } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

import TermsModal from "./TermsModal";
import PrivacyModal from "./PrivacyModal";

type SignupProps = {
  onSignupSuccess?: (user: any) => void;
};

export default function Signup({ onSignupSuccess }: SignupProps) {
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
    userType: "student",
    firstName: "",
    lastName: "",
    studentNumber: "",
    yearLevel: undefined,
    program: "",
    department: "",
    employeeId: "",
    position: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const [agree, setAgree] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const { signUpNewUser } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.endsWith("@dlsl.edu.ph")) {
      toast.error("Please use your official @dlsl.edu.ph email address.");
      return;
    }

    const { success, error, data } = await signUpNewUser(formData);

    if (!success) {
      toast.error(error || 'An error occurred during signup');
    } else {
      if (onSignupSuccess) {
        onSignupSuccess(data.user);
      }
      // Redirect to profile setup after successful signup
      navigate("/profile-setup");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="flex-1 bg-gradient-to-br from-green-700 to-green-500 text-white flex flex-col justify-center items-center p-10">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg text-center">
          DLSL OrgSync
        </h1>
        <p className="text-lg md:text-xl text-center max-w-lg opacity-90">
          Your all-in-one organizational platform that connects
          students, officers, and organizations in one interactive space!
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-50 py-12 px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-green-600 font-medium">
              Join the DLSL OrgSync community today!
            </p>
          </div>

          <form onSubmit={handleSignup} className="mt-8 space-y-6">
            <div className="space-y-4">
              {/* User type */}
              <div>
                <label
                  htmlFor="userType"
                  className="block text-sm font-medium text-gray-700"
                >
                  I am a
                </label>
                <select
                  id="userType"
                  name="userType"
                  required
                  value={formData.userType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address <span className="text-gray-500">(must end with @dlsl.edu.ph)</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="block w-full py-2 px-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-700">
  <input
    type="checkbox"
    checked={agree}
    onChange={(e) => setAgree(e.target.checked)}
    required
    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
  />
  <label className="text-gray-700">
    I agree to the{" "}
    <button
      type="button"
      className="text-green-600 hover:underline"
      onClick={() => setShowTerms(true)}
    >
      Terms and Conditions
    </button>{" "}
    and{" "}
    <button
      type="button"
      className="text-green-600 hover:underline"
      onClick={() => setShowPrivacy(true)}
    >
      Privacy Policy
    </button>
    .
  </label>
</div>

            {/* Submit */}
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:opacity-50"
            >
              Sign up
            </button>

            <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
            <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/"
                className="font-medium text-green-600 hover:text-green-500"
              >
                Log in here
              </Link>
            </p>
          </form>
        </div>
      </div>
      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}