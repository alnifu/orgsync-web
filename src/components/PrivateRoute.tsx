import { useState, useEffect } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type PrivateRouteProps = {
  children: React.ReactNode;
};

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { user } = useAuth();
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfileCompleteness = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('first_name, last_name, department')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          // If there's an error, assume profile is incomplete to be safe
          setProfileComplete(false);
        } else {
          // Profile is complete if all required fields are filled
          // Allow "NONE" as a valid department value (for faculty not associated with a specific department)
          const hasBasicInfo = userProfile.first_name && userProfile.last_name;
          const hasValidDepartment = userProfile.department && 
            userProfile.department.trim() !== '' && 
            userProfile.department !== null;
          
          setProfileComplete(hasBasicInfo && hasValidDepartment);
        }
      } catch (err) {
        console.error('Unexpected error checking profile:', err);
        setProfileComplete(false);
      } finally {
        setLoading(false);
      }
    };

    checkProfileCompleteness();
  }, [user]);

  // Show loading while checking profile
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Verifying Profile</h3>
          <p className="text-gray-600">Checking your profile completion...</p>
        </div>
      </div>
    );
  }

  // If there's no user, redirect to log in page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If profile is incomplete, redirect to profile setup
  if (profileComplete === false) {
    return <Navigate to="/profile-setup" replace />;
  }

  // If there is a user and profile is complete, render the protected route
  return <>{children}</>;
}
