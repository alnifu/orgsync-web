import { useAuth } from "../context/AuthContext";
import { useUserRoles } from "../utils/roles";
import { Navigate } from "react-router";
import type { UserRole } from "../utils/roles";

type RoleRouteProps = {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
};

export default function RoleRoute({ children, allowedRoles, redirectTo }: RoleRouteProps) {
  const { user } = useAuth();
  const { roles, loading, isAdmin, isOfficer, isAdviser, isMember } = useUserRoles(user?.id);

  // Show loading while checking roles
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Verifying Access</h3>
          <p className="text-gray-600">Checking your permissions...</p>
        </div>
      </div>
    );
  }

  // If there's no user, this should be handled by PrivateRoute,
  // but we'll add a fallback just in case
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading</h3>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  // Check if user has one of the allowed roles
  const hasAccess = allowedRoles.some(role => {
    switch (role) {
      case 'admin': return isAdmin();
      case 'officer': return isOfficer();
      case 'adviser': return isAdviser();
      case 'member': return isMember();
      default: return false;
    }
  });

  // If redirectTo is specified and user doesn't have access, redirect
  if (!hasAccess && redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  // If user doesn't have access and no redirect specified, show access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user has access, render the protected route
  return <>{children}</>;
}