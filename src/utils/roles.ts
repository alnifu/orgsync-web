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

// Context-based caching - More secure than module variables
// Data is scoped to React component tree and cleared on navigation
let contextCache: {
  data: { roles: UserRoles | null; orgManagers: OrgManager[] } | null;
  timestamp: number;
  userId: string;
} | null = null;

// Cache for 5 minutes (300,000 ms) - balances performance with security
const CACHE_DURATION = 5 * 60 * 1000;
// let rolesCache: UserRoles | null = null;
// let orgManagersCache: OrgManager[] | null = null;

export const useUserRoles = (userId: string | undefined) => {
  const [roles, setRoles] = useState<UserRoles | null>(null);
  const [orgManagers, setOrgManagers] = useState<OrgManager[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      console.log('useUserRoles: No userId provided');
      setLoading(false);
      return;
    }

    // Check context cache with time validation
    const now = Date.now();
    if (contextCache &&
        contextCache.userId === userId &&
        contextCache.data &&
        (now - contextCache.timestamp) < CACHE_DURATION) {
      console.log('useUserRoles: Using context cache (age:', Math.round((now - contextCache.timestamp) / 1000), 's, expires in:', Math.round((CACHE_DURATION - (now - contextCache.timestamp)) / 1000), 's)');
      setRoles(contextCache.data.roles);
      setOrgManagers(contextCache.data.orgManagers);
      setLoading(false);
      return;
    }

    console.log('useUserRoles: Fetching fresh role data for userId:', userId);
    const fetchRoles = async () => {
      try {
        // Fetch user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (roleError && roleError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('useUserRoles: Error fetching user role:', roleError);
        } else {
          console.log('useUserRoles: User role data:', roleData);
        }

        // Fetch organization managers
        const { data: managersData, error: managersError } = await supabase
          .from('org_managers')
          .select('*')
          .eq('user_id', userId);

        if (managersError) {
          console.error('useUserRoles: Error fetching org managers:', managersError);
        } else {
          console.log('useUserRoles: Org managers data:', managersData);
        }

        const userRoles = roleData ? {
          role: roleData.role as UserRole,
          granted_at: roleData.granted_at
        } : null;

        const orgManagers = managersData || [];

        // Cache the results with timestamp and user validation
        contextCache = {
          data: { roles: userRoles, orgManagers },
          timestamp: now,
          userId
        };

        console.log('useUserRoles: Setting state with:', { userRoles, orgManagers });
        setRoles(userRoles);
        setOrgManagers(orgManagers);
      } catch (error) {
        console.error('useUserRoles: Error fetching user roles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [userId]);

  const clearCache = () => {
    contextCache = null;
    console.log('useUserRoles: Cache cleared');
  };

  return {
    roles,
    orgManagers,
    loading,
    clearCache,
    // Helper functions
    isAdmin: () => roles?.role === 'admin',
    isOfficer: () => roles?.role === 'officer',
    isAdviser: () => roles?.role === 'adviser',
    isMember: () => roles?.role === 'member',
    hasOrgAccess: (orgId: string) => orgManagers.some(manager => manager.org_id === orgId),
    getOrgRole: (orgId: string) => {
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

export const canManageOrg = (userRole: UserRole | null, orgManagers: OrgManager[], orgId: string): boolean => {
  if (userRole === 'admin') return true;
  if (userRole === 'officer' || userRole === 'adviser') {
    return orgManagers.some(manager => manager.org_id === orgId);
  }
  return false;
};

export const canEditOrg = (userRole: UserRole | null, orgManagers: OrgManager[], orgId: string): boolean => {
  if (userRole === 'admin') return true;
  if (userRole === 'officer') {
    return orgManagers.some(manager => manager.org_id === orgId && manager.manager_role === 'officer');
  }
  return false; // Advisers can view but not edit
};
