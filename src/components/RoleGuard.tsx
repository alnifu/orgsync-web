// components/RoleGuard.tsx
import React from 'react';
import { useNavigate } from 'react-router';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole, ManagerRole } from '../types/roles.types';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requireAll?: boolean;
  requireAny?: boolean;
  orgId?: string;
  managerRole?: ManagerRole;
  fallback?: React.ReactNode;
  showAccessDenied?: boolean;
}

export default function RoleGuard({
  children,
  requiredRoles = [],
  requireAll = false,
  requireAny = false,
  orgId,
  managerRole,
  fallback,
  showAccessDenied = true
}: RoleGuardProps) {
  const { user, userRoles, orgManagers } = useAuth();

  // If no user, don't render anything
  if (!user) {
    return null;
  }

  // Check global roles
  if (requiredRoles.length > 0) {
    const userRoleValues = userRoles.map((ur: any) => ur.role as UserRole);
    let hasRequiredRole = false;

    if (requireAll) {
      hasRequiredRole = requiredRoles.every(role => userRoleValues.includes(role));
    } else if (requireAny) {
      hasRequiredRole = requiredRoles.some(role => userRoleValues.includes(role));
    } else {
      // Default: user must have at least one of the required roles
      hasRequiredRole = requiredRoles.some(role => userRoleValues.includes(role));
    }

    if (!hasRequiredRole) {
      return fallback || (showAccessDenied ? <AccessDenied /> : null);
    }
  }

  // Check organization-specific access
  if (orgId) {
    const orgManager = orgManagers.find((om: any) => om.org_id === orgId);

    if (!orgManager) {
      // User is not a manager of this org
      return fallback || (showAccessDenied ? <AccessDenied /> : null);
    }

    if (managerRole && orgManager.manager_role !== managerRole) {
      // User doesn't have the required manager role for this org
      return fallback || (showAccessDenied ? <AccessDenied /> : null);
    }
  }

  return <>{children}</>;
}

function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <ShieldX className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

// Higher-order component version
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<RoleGuardProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <RoleGuard {...guardProps}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}