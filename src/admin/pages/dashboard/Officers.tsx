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
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterPosition, setFilterPosition] = useState<string>('');

  // Sorting states
  const [sortField, setSortField] = useState<SortField>('first_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Fetch officers with their member details
  const fetchOfficers = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get the org_managers data
      let query = supabase
        .from('org_managers')
        .select('*', { count: 'exact' });

      // Apply search filters - search in manager data only for now
      if (searchQuery.trim()) {
        query = query.or(`manager_role.ilike.%${searchQuery}%,position.ilike.%${searchQuery}%`);
      }

      // Apply specific filters
      if (filterDepartment) {
        // We'll filter by department after fetching users
      }
      if (filterPosition) {
        if (filterPosition === 'adviser') {
          query = query.eq('manager_role', 'adviser');
        } else {
          query = query.eq('position', filterPosition);
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

      // Apply pagination
      const start = (currentPage - 1) * itemsPerPage;
      query = query.range(start, start + itemsPerPage - 1);

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

      // Apply search on user data
      if (searchQuery.trim()) {
        filteredManagers = filteredManagers.filter(manager => {
          const user = manager.users;
          if (!user) return false;
          return (
            user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase())
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

      setOfficers(filteredManagers);
      setTotalCount(count || 0);

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
  }, [searchQuery, filterDepartment, filterPosition, sortField, sortDirection, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDepartment, filterPosition]);

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
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

        <select
          value={filterPosition}
          onChange={(e) => setFilterPosition(e.target.value)}
          className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
        >
          <option value="">All Positions</option>
          <option value="adviser">Adviser</option>
          <option value="president">President</option>
          <option value="vice_president">Vice President</option>
          <option value="secretary">Secretary</option>
          <option value="treasurer">Treasurer</option>
          <option value="auditor">Auditor</option>
          <option value="pro">Public Relations Officer</option>
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

      {/* Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('first_name')}
                    >
                      <div className="group inline-flex">
                        Name
                        <span className="ml-2 flex-none rounded"><SortIcon field="first_name" /></span>
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('manager_role')}
                    >
                      <div className="group inline-flex">
                        Role
                        <span className="ml-2 flex-none rounded"><SortIcon field="manager_role" /></span>
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('position')}
                    >
                      <div className="group inline-flex">
                        Position
                        <span className="ml-2 flex-none rounded"><SortIcon field="position" /></span>
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Organization
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('department')}
                    >
                      <div className="group inline-flex">
                        Department
                        <span className="ml-2 flex-none rounded"><SortIcon field="department" /></span>
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('assigned_at')}
                    >
                      <div className="group inline-flex">
                        Assigned Date
                        <span className="ml-2 flex-none rounded"><SortIcon field="assigned_at" /></span>
                      </div>
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                          <span className="ml-2 text-gray-500">Loading officers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : officers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        {searchQuery || filterDepartment || filterPosition ?
                          'No officers match your search criteria' :
                          'No officers found'
                        }
                      </td>
                    </tr>
                  ) : (
                    officers.map((officer) => (

                      <tr key={`${officer.user_id}-${officer.org_id}`} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          <div className="flex items-center">
                            {officer.users?.avatar_url ? (
                              <img
                                src={officer.users.avatar_url}
                                alt={`${officer.users?.first_name} ${officer.users?.last_name} avatar`}
                                className="h-10 w-10 rounded-full mr-3 object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                }}
                              />
                            ) : (
                              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-green-600">
                                  {officer.users?.first_name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{officer.users?.first_name} {officer.users?.last_name}</div>
                              <div className="text-gray-500 text-xs">{officer.users?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 text-s font-medium text-green-800">
                            {officer.manager_role ? officer.manager_role.charAt(0).toUpperCase() + officer.manager_role.slice(1) : 'N/A'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {officer.position || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="font-medium">{officer.organizations?.abbrev_name || officer.organizations?.name}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {officer.users?.department}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(officer.assigned_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => navigate(`/admin/dashboard/profile/${officer.user_id}`)}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition-colors"
                              title="View Profile"
                            >
                              <UserIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => demoteOfficer(officer.user_id, officer.org_id)}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                              title="Demote to member"
                            >
                              <UserMinus className="h-5 w-5" />
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