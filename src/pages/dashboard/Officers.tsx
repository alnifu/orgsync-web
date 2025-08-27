import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
  UserMinus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Officer } from '../../types/database.types';

type SortField = 'name' | 'email' | 'department' | 'position' | 'assigned_at';
type SortDirection = 'asc' | 'desc';

export default function Officers() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterPosition, setFilterPosition] = useState<string>('');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('name');
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
      
      // Since officers.id = members.id, we join them properly
      let query = supabase
        .from('officers')
        .select(`
          id,
          org_id,
          position,
          assigned_at,
          members!inner(
            name,
            avatar_url,
            email,
            department,
            year,
            course
          ),
          organizations!inner(
            name,
            abbrev_name
          )
        `, { count: 'exact' });

      // Apply search filters - search in member data
      if (searchQuery.trim()) {
        query = query.or(`
          members.name.ilike.%${searchQuery}%,
          members.email.ilike.%${searchQuery}%,
          position.ilike.%${searchQuery}%
        `);
      }

      // Apply specific filters
      if (filterDepartment) {
        query = query.eq('members.department', filterDepartment);
      }
      if (filterPosition) {
        query = query.eq('position', filterPosition);
      }

      // Apply sorting
      let orderColumn: string;
      let orderTable: string | undefined;
      
      switch (sortField) {
        case 'name':
        case 'email':
        case 'department':
          orderColumn = sortField;
          orderTable = 'members';
          break;
        case 'position':
        case 'assigned_at':
          orderColumn = sortField;
          orderTable = undefined; // officers table
          break;
        default:
          orderColumn = 'name';
          orderTable = 'members';
      }

      if (orderTable) {
        query = query.order(orderColumn, { 
          ascending: sortDirection === 'asc',
          foreignTable: orderTable 
        });
      } else {
        query = query.order(orderColumn, { ascending: sortDirection === 'asc' });
      }

      // Apply pagination
      const start = (currentPage - 1) * itemsPerPage;
      query = query.range(start, start + itemsPerPage - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      // Transform the data to match our Officer type
      const transformedData: Officer[] = data?.map(row => ({
        id: row.id,
        org_id: row.org_id,
        position: row.position,
        assigned_at: row.assigned_at,
        // Flatten member data
        name: row.members.name,
        avatar_url: row.members.avatar_url,
        email: row.members.email,
        department: row.members.department,
        year: row.members.year,
        course: row.members.course,
        // Add organization data
        organization: {
          id: row.org_id, // We have the org_id from officers
          name: row.organizations.name,
          abbrev_name: row.organizations.abbrev_name,
          // Other org fields would need to be selected if needed
        }
      } as Officer)) || [];

      setOfficers(transformedData);
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
  const demoteOfficer = async (officerId: string, orgId: string) => {
    try {
      setError(null);
      
      const { error: rpcError } = await supabase
        .rpc('demote_to_member', {
          officer_id: officerId,
          organization_id: orgId
        });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw rpcError;
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
          <option value="President">President</option>
          <option value="Vice President">Vice President</option>
          <option value="Secretary">Secretary</option>
          <option value="Treasurer">Treasurer</option>
          <option value="Auditor">Auditor</option>
          <option value="Public Relations Officer">Public Relations Officer</option>
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
                      onClick={() => handleSort('name')}
                    >
                      <div className="group inline-flex">
                        Name
                        <span className="ml-2 flex-none rounded"><SortIcon field="name" /></span>
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
                      <tr key={`${officer.id}-${officer.org_id}`} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          <div className="flex items-center">
                            <img
                              src={officer.avatar_url || 'https://via.placeholder.com/40'}
                              alt={`${officer.name} avatar`}
                              className="h-10 w-10 rounded-full mr-3 object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/40';
                              }}
                            />
                            <div>
                              <div className="font-medium">{officer.name}</div>
                              <div className="text-gray-500 text-xs">{officer.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            {officer.position}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="font-medium">{officer.organization?.name}</div>
                          <div className="text-xs text-gray-400">
                            {officer.organization?.abbrev_name}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {officer.department}
                          <div className="text-xs text-gray-400">
                            {officer.year} - {officer.course}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(officer.assigned_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => demoteOfficer(officer.id, officer.org_id)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                            title="Demote to member"
                          >
                            <UserMinus className="h-5 w-5" />
                          </button>
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