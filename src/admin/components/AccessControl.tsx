import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { getUserPermissions, hasPermission, type UserPermissions } from '../../lib/permissions';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

type AccessControlProps = {
  children: React.ReactNode;
  requiredPermission?: keyof UserPermissions;
  orgId?: string;
  fallback?: React.ReactNode;
  showAccessDenied?: boolean;
};

export default function AccessControl({
  children,
  requiredPermission,
  orgId,
  fallback,
  showAccessDenied = true
}: AccessControlProps) {
  const { userRole, orgManagers } = useAuth();
  const navigate = useNavigate();

  const permissions = getUserPermissions(userRole, orgManagers);
  const hasAccess = requiredPermission
    ? hasPermission(permissions, requiredPermission, orgId)
    : true;

  console.log('🔒 AccessControl check:', {
    requiredPermission,
    orgId,
    userRole,
    orgManagers,
    permissions: {
      isAdmin: permissions.isAdmin,
      isOfficer: permissions.isOfficer,
      isAdviser: permissions.isAdviser,
      isMember: permissions.isMember
    },
    hasAccess
  });

  useEffect(() => {
    if (!hasAccess && showAccessDenied) {
      console.log('🚫 Access denied - will navigate back in 3 seconds');
      // Show access denied for a moment, then navigate back
      const timer = setTimeout(() => {
        navigate(-1);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [hasAccess, showAccessDenied, navigate]);

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showAccessDenied) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}