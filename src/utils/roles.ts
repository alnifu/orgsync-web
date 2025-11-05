import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'admin' | 'member' | 'officer' | 'adviser';

export interface UserRoles {
  role: UserRole;
  granted_at: string;
}

export interface OrgManager {
  org_id: string;
  manager_role: 'officer' | 'adviser';
  position: string | null;
  assigned_at: string;
}

// TODO: Improve security by implementing proper RLS policies and role validation
// Current implementation relies on client-side checks which can be bypassed

export const useUserRoles = (userId: string | undefined) => {
  const [roles, setRoles] = useState<UserRoles | null>(null);
  const [orgManagers, setOrgManagers] = useState<OrgManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setRoles(null);
      setOrgManagers([]);
      setLoading(false);
      setInitialized(true);
      setRetryCount(0);
      return;
    }

    // Prevent multiple simultaneous fetches
    if (initialized) return;

    setRetryCount(0); // Reset retry count on new fetch

    const fetchUserRoles = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user role from user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role, granted_at')
          .eq('user_id', userId)
          .maybeSingle();

        if (roleError) {
          console.error('Error fetching user role:', roleError);
          setError('Failed to fetch user role');
          // Don't throw here, continue with org managers
        }

        // Fetch organization management roles
        const { data: managersData, error: managersError } = await supabase
          .from('org_managers')
          .select('org_id, manager_role, position, assigned_at')
          .eq('user_id', userId);

        if (managersError) {
          console.error('Error fetching org managers:', managersError);
          setError('Failed to fetch organization roles');
          // Don't throw here either
        }

        // Set the data
        const userRoles = roleData ? {
          role: roleData.role as UserRole,
          granted_at: roleData.granted_at
        } : null;

        setRoles(userRoles);
        setOrgManagers(managersData || []);

      } catch (err) {
        console.error('Error in fetchUserRoles:', err);
        setError('Failed to load user roles');
        // Set default values on error
        setRoles(null);
        setOrgManagers([]);
        // Retry after 5 seconds on error (max 3 retries)
        if (retryCount < 3) {
          setTimeout(() => {
            if (userId) {
              setRetryCount(prev => prev + 1);
              fetchUserRoles();
            }
          }, 5000);
        }
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    fetchUserRoles();
  }, [userId, initialized]);

  // Refresh function for manual re-fetching
  const refresh = () => {
    setInitialized(false);
    setError(null);
    setRetryCount(0);
  };

  return {
    roles,
    orgManagers,
    loading,
    error,
    initialized,
    refresh,
    // Helper functions - consider loading state
    isAdmin: () => !loading && roles?.role === 'admin',
    isOfficer: () => !loading && roles?.role === 'officer',
    isAdviser: () => !loading && roles?.role === 'adviser',
    isMember: () => !loading && roles?.role === 'member',
    hasOrgAccess: (orgId: string) => !loading && orgManagers.some(manager => manager.org_id === orgId),
    getOrgRole: (orgId: string) => {
      if (loading) return null;
      const manager = orgManagers.find(m => m.org_id === orgId);
      return manager?.manager_role || null;
    }
  };
};

// Utility functions for role checking
export const hasRoleAccess = (userRole: UserRole | null, requiredRoles: UserRole[]): boolean => {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
};

export const canManageOrg = (userRole: UserRole | null, orgManagers: OrgManager[], orgId: string, loading: boolean = false): boolean => {
  if (loading) return false; // Don't allow access while loading
  if (userRole === 'admin') return true;
  if (userRole === 'officer' || userRole === 'adviser') {
    return orgManagers.some(manager => manager.org_id === orgId);
  }
  return false;
};

export const canEditOrg = (userRole: UserRole | null, orgManagers: OrgManager[], orgId: string, loading: boolean = false): boolean => {
  if (loading) return false; // Don't allow access while loading
  if (userRole === 'admin') return true;
  if (userRole === 'officer') {
    return orgManagers.some(manager => manager.org_id === orgId && manager.manager_role === 'officer');
  }
  return false; // Advisers can view but not edit
};
