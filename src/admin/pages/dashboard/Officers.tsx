import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronDown,
  ChevronUp,
  Search,
  UserMinus,
  User as UserIcon
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { OrgManager, User, Organization } from '../../../types/database.types';

type SortField = 'first_name' | 'last_name' | 'email' | 'department' | 'manager_role' | 'position' | 'assigned_at';
type SortDirection = 'asc' | 'desc';

type OfficerWithDetails = OrgManager & {
  users: User;
  organizations: Organization;
};

export default function Officers() {
  const navigate = useNavigate();
  const [officers, setOfficers] = useState<OfficerWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOrganization, setFilterOrganization] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');

  // Filter options state
  const [filterOptions, setFilterOptions] = useState({
    organizations: [] as { id: string; name: string; abbrev_name: string | null }[],
    roles: ['officer', 'adviser'] as string[]
  });

  // Sorting states
  const [sortField, setSortField] = useState<SortField>('first_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Fetch filter options (organizations with officers/advisers)
  const fetchFilterOptions = async () => {
    try {
      // Get all org_ids that have managers
      const { data: managersData, error: managersError } = await supabase
        .from('org_managers')
        .select('org_id');

      if (managersError) {
        console.error('Error fetching managers for filter options:', managersError);
        return;
      }

      if (!managersData || managersData.length === 0) {
        setFilterOptions(prev => ({ ...prev, organizations: [] }));
        return;
      }

      // Get unique org_ids
      const uniqueOrgIds = [...new Set(managersData.map(m => m.org_id))];

      // Fetch organization details
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, abbrev_name')
        .in('id', uniqueOrgIds);

      if (orgsError) {
        console.error('Error fetching organizations for filter options:', orgsError);
        return;
      }

      const organizations = (orgsData || []).sort((a, b) => 
        (a.abbrev_name || a.name).localeCompare(b.abbrev_name || b.name)
      );

      setFilterOptions(prev => ({
        ...prev,
        organizations
      }));
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  // Fetch officers with their member details
  const fetchOfficers = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get the org_managers data
      let query = supabase
        .from('org_managers')
        .select('*', { count: 'exact' });

      // Apply specific filters
      if (filterOrganization) {
        query = query.eq('org_id', filterOrganization);
      }
      if (filterRole) {
        if (filterRole === 'adviser') {
          query = query.eq('manager_role', 'adviser');
        } else if (filterRole === 'officer') {
          query = query.neq('manager_role', 'adviser');
        }
      }

      // Apply sorting
      let orderColumn: string;
      if (sortField === 'manager_role' || sortField === 'position' || sortField === 'assigned_at') {
        orderColumn = sortField;
      } else {
        // For user fields, we'll sort after fetching
        orderColumn = 'assigned_at';
      }

      query = query.order(orderColumn, { ascending: sortDirection === 'asc' });

      // Always fetch all data for client-side filtering and pagination
      // Remove server-side pagination

      const { data: managersData, error: managersError, count } = await query;

      if (managersError) {
        console.error('Managers fetch error:', managersError);
        throw managersError;
      }

      if (!managersData || managersData.length === 0) {
        setOfficers([]);
        setTotalCount(0);
        return;
      }

      // Get unique user IDs and org IDs
      const userIds = [...new Set(managersData.map(m => m.user_id))];
      const orgIds = [...new Set(managersData.map(m => m.org_id))];

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, points, preferences, created_at, updated_at, student_number, program, department, year_level, employee_id, position, user_type, email')
        .in('id', userIds);

      if (usersError) {
        console.error('Users fetch error:', usersError);
        throw usersError;
      }

      // Fetch organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, org_code, name, abbrev_name, org_pic, email, description, department, status, date_established, org_type, created_at, updated_at, adviser_id')
        .in('id', orgIds);

      if (orgsError) {
        console.error('Organizations fetch error:', orgsError);
        throw orgsError;
      }

      // Create lookup maps
      const usersMap = new Map(usersData?.map(user => [user.id, user]) || []);
      const orgsMap = new Map(orgsData?.map(org => [org.id, org]) || []);

      // Apply additional filters and sorting
      let filteredManagers = managersData.map(manager => ({
        ...manager,
        users: usersMap.get(manager.user_id),
        organizations: orgsMap.get(manager.org_id)
      }));

      // Apply department filter
      if (filterDepartment) {
        filteredManagers = filteredManagers.filter(manager => 
          manager.users?.department === filterDepartment
        );
      }

      // Apply search on user data and position
      if (searchQuery.trim()) {
        filteredManagers = filteredManagers.filter(manager => {
          const user = manager.users;
          if (!user) return false;
          const searchLower = searchQuery.toLowerCase();
          return (
            user.first_name?.toLowerCase().includes(searchLower) ||
            user.last_name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            manager.position?.toLowerCase().includes(searchLower) ||
            manager.manager_role?.toLowerCase().includes(searchLower)
          );
        });
      }

      // Apply sorting for user fields
      if (['first_name', 'last_name', 'email', 'department'].includes(sortField)) {
        filteredManagers.sort((a, b) => {
          const aVal = a.users?.[sortField as keyof typeof a.users] || '';
          const bVal = b.users?.[sortField as keyof typeof b.users] || '';
          const comparison = String(aVal).localeCompare(String(bVal));
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }

      // Apply client-side pagination
      const start = (currentPage - 1) * itemsPerPage;
      const paginatedManagers = filteredManagers.slice(start, start + itemsPerPage);

      setOfficers(paginatedManagers);
      setTotalCount(filteredManagers.length);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching officers';
      console.error('Error fetching officers:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Demote officer to member
  const demoteOfficer = async (userId?: string, orgId?: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('org_managers')
        .delete()
        .eq('user_id', userId)
        .eq('org_id', orgId);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      // Check if user has any remaining manager roles
      const { data: remainingRoles, error: checkError } = await supabase
        .from('org_managers')
        .select('manager_role')
        .eq('user_id', userId);

      if (checkError) throw checkError;

      // If no remaining roles, demote back to member
      if (!remainingRoles || remainingRoles.length === 0) {
        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .update({ role: 'member' })
          .eq('user_id', userId);

        if (roleUpdateError) throw roleUpdateError;
      }

      // Refresh the list
      await fetchOfficers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to demote officer';
      console.error('Error demoting officer:', err);
      setError(errorMessage);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, [searchQuery, filterOrganization, filterRole, filterDepartment, sortField, sortDirection, currentPage]);

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterOrganization, filterRole, filterDepartment]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-4 w-4 text-gray-400" />;
    return sortDirection === 'asc' ?
      <ChevronUp className="h-4 w-4 text-green-600" /> :
      <ChevronDown className="h-4 w-4 text-green-600" />;
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Officers</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all organization officers ({totalCount} total)
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search officers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-green-600 sm:text-sm"
          />
        </div>

        <select
          value={filterOrganization}
          onChange={(e) => setFilterOrganization(e.target.value)}
          className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
        >
          <option value="">All Organizations</option>
          {filterOptions.organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.abbrev_name || org.name}
            </option>
          ))}
        </select>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
        >
          <option value="">All Roles</option>
          <option value="officer">Officer</option>
          <option value="adviser">Adviser</option>
        </select>

        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
        >
          <option value="">All Departments</option>
          <option value="CITE">CITE</option>
          <option value="CBEAM">CBEAM</option>
          <option value="COL">COL</option>
          <option value="CON">CON</option>
          <option value="CEAS">CEAS</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm text-red-600 underline hover:text-red-800 mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Table */}
      <div className="mt-8 bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-green-50 to-green-100">
              <tr>
                <th
                  scope="col"
                  className="py-4 pl-6 pr-3 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-green-200/50 transition-colors"
                  onClick={() => handleSort('first_name')}
                >
                  <div className="flex items-center gap-2">
                    Officer
                    <SortIcon field="first_name" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-green-200/50 transition-colors"
                  onClick={() => handleSort('manager_role')}
                >
                  <div className="flex items-center gap-2">
                    Role
                    <SortIcon field="manager_role" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-green-200/50 transition-colors"
                  onClick={() => handleSort('position')}
                >
                  <div className="flex items-center gap-2">
                    Position
                    <SortIcon field="position" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-left text-sm font-bold text-gray-900"
                >
                  Organization
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-green-200/50 transition-colors"
                  onClick={() => handleSort('department')}
                >
                  <div className="flex items-center gap-2">
                    Dept
                    <SortIcon field="department" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-green-200/50 transition-colors"
                  onClick={() => handleSort('assigned_at')}
                >
                  <div className="flex items-center gap-2">
                    Assigned
                    <SortIcon field="assigned_at" />
                  </div>
                </th>
                <th scope="col" className="relative py-4 pl-4 pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                      <p className="text-sm text-gray-500">Loading officers...</p>
                    </div>
                  </td>
                </tr>
              ) : officers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <UserIcon className="h-12 w-12 text-gray-300" />
                      <p className="text-sm text-gray-500">
                        {searchQuery || filterOrganization || filterRole || filterDepartment ?
                          'No officers match your search criteria' :
                          'No officers found'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                officers.map((officer) => (
                  <tr key={`${officer.user_id}-${officer.org_id}`} className="hover:bg-green-50/50 transition-colors">
                    <td className="py-4 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {officer.users?.avatar_url ? (
                            <img
                              src={officer.users.avatar_url}
                              alt={`${officer.users?.first_name} ${officer.users?.last_name}`}
                              className="h-10 w-10 rounded-full object-cover border-2 border-green-100"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center border-2 border-green-200">
                              <span className="text-sm font-semibold text-green-700">
                                {officer.users?.first_name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">
                            {officer.users?.first_name} {officer.users?.last_name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {officer.users?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        officer.manager_role === 'adviser'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {officer.manager_role?.charAt(0).toUpperCase() + officer.manager_role?.slice(1) || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {officer.position || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {officer.organizations?.org_pic && (
                          <img
                            src={officer.organizations.org_pic}
                            alt={officer.organizations.name}
                            className="h-6 w-6 rounded object-cover"
                          />
                        )}
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {officer.organizations?.abbrev_name || officer.organizations?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 font-medium">
                        {officer.users?.department}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(officer.assigned_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="pl-4 pr-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/dashboard/profile/${officer.user_id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                          title="View Profile"
                        >
                          <UserIcon className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => demoteOfficer(officer.user_id, officer.org_id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-colors"
                          title="Demote to member"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Demote
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{Math.min(((currentPage - 1) * itemsPerPage) + 1, totalCount)}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, totalCount)}
            </span>{' '}
            of <span className="font-medium">{totalCount}</span> results
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}