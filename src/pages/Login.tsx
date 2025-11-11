import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

type LoginProps = {
    onLoginSuccess?: (user: any) => void;
};

export default function Login({ onLoginSuccess }: LoginProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const { signInUser } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Attempting to log in with", email);
        const { success, error, data } = await signInUser({
            email,
            password,
        });
        console.log("Sign-in response:", { success, error, data });
        if (!success) {
            toast.error(error || 'An error occurred during log in');
        } else {
            if (onLoginSuccess) {
                onLoginSuccess(data.user);
            }

            // Check if user profile is complete
            const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('first_name, last_name, department')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.error('Error fetching user profile:', profileError);
                // If there's an error fetching profile, redirect to profile setup
                navigate("/profile-setup");
                return;
            }

            // If profile is incomplete, redirect to profile setup
            if (!userProfile.first_name || !userProfile.last_name || !userProfile.department) {
                navigate("/profile-setup");
            } else {
                // Redirect to dashboard after successful log in
                console.log("Log in successful, navigating to dashboard");
                navigate("/dashboard");
            }
        }
    };

    const handleForgotPassword = async () => {
    if (!email) {
        toast.error("Please enter your email to reset your password.");
        return;
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password` // optional: page to redirect after reset
    });

    if (error) {
        toast.error(error.message);
    } else {
        toast.success("Password reset email sent. Check your inbox.");
    }
};

    return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="flex-1 bg-gradient-to-br from-green-700 to-green-500 text-white flex flex-col justify-center items-center p-10">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg text-center">
          DLSL OrgSync
        </h1>
        <p className="text-lg md:text-xl text-center max-w-lg opacity-90">
          Your all-in-one organizational platform that connects students, officers, and organizations in one interactive space!
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-50 py-12 px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div>
            <h2 className="text-center text-3xl font-extrabold text-gray-900">
              Log in to your account
            </h2>
          </div>
          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm pr-10"
                  placeholder="Password"
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

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
              >
                Log in
              </button>
            </div>

            <div className="text-sm text-center mt-2">
    <button
        type="button"
        onClick={handleForgotPassword}
        className="font-medium text-green-600 hover:text-green-500"
    >
        Forgot password?
    </button>
</div>


            <p className="mt-4 text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-green-600 hover:text-green-500"
              >
                Sign up here
              </Link>
            </p>
          </form>
        </div>
      </div>
      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}
