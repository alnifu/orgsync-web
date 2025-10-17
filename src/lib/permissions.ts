import type { UserRole, OrgManager } from '../context/AuthContext';

export type UserPermissions = {
  isAdmin: boolean;
  isOfficer: boolean;
  isAdviser: boolean;
  isMember: boolean;
  canManageOrg: (orgId: string) => boolean;
  canEditOrg: (orgId: string) => boolean;
  managedOrgs: string[];
};

export function getUserPermissions(userRole: UserRole | null, orgManagers: OrgManager[]): UserPermissions {
  const isAdmin = userRole?.role === 'admin';
  const isOfficer = orgManagers.some(manager => manager.manager_role === 'officer');
  const isAdviser = orgManagers.some(manager => manager.manager_role === 'adviser');
  const isMember = userRole?.role === 'member' || (!isAdmin && !isOfficer && !isAdviser);

  const managedOrgs = orgManagers.map(manager => manager.org_id);

  const canManageOrg = (orgId: string): boolean => {
    return isAdmin || managedOrgs.includes(orgId);
  };

  const canEditOrg = (orgId: string): boolean => {
    if (isAdmin) return true;
    const manager = orgManagers.find(m => m.org_id === orgId);
    return manager?.manager_role === 'officer'; // Only officers can edit
  };

  return {
    isAdmin,
    isOfficer,
    isAdviser,
    isMember,
    canManageOrg,
    canEditOrg,
    managedOrgs,
  };
}

export function hasPermission(userPermissions: UserPermissions, permission: keyof UserPermissions, orgId?: string): boolean {
  // Admins have access to everything
  if (userPermissions.isAdmin) {
    return true;
  }

  switch (permission) {
    case 'isAdmin':
      return userPermissions.isAdmin;
    case 'isOfficer':
      return userPermissions.isOfficer;
    case 'isAdviser':
      return userPermissions.isAdviser;
    case 'isMember':
      return userPermissions.isMember;
    case 'canManageOrg':
      return orgId ? userPermissions.canManageOrg(orgId) : false;
    case 'canEditOrg':
      return orgId ? userPermissions.canEditOrg(orgId) : false;
    default:
      return false;
  }
}