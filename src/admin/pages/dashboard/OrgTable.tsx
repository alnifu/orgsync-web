import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '../../../lib/supabase';
import type { Organization } from '../../../types/database.types';
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';

type SortField = 'name' | 'org_code' | 'date_established' | 'org_type' | 'department';
type SortDirection = 'asc' | 'desc';

export default function OrgTable() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // New state for filter options
  const [filterOptions, setFilterOptions] = useState({
    departments: [] as string[],
    orgTypes: [] as string[],
    statuses: ['active', 'inactive', 'pending'] as string[]
  });

  // New state for search, filter, and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 10;

  // Fetch filter options (all unique values)
  const fetchFilterOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('department, org_type, status');

      if (error) throw error;

      const departments = [...new Set(data?.map(org => org.department).filter(Boolean))].sort() as string[];
      const orgTypes = [...new Set(data?.map(org => org.org_type).filter(Boolean))].sort() as string[];

      setFilterOptions({
        departments,
        orgTypes,
        statuses: ['active', 'inactive', 'pending']
      });
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  // Fetch organizations with search, filters, sorting, and pagination
  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('organizations')
        .select('*', { count: 'exact' });

      // Apply search filters
      if (searchQuery.trim()) {
        query = query.or(
          `name.ilike.%${searchQuery}%,abbrev_name.ilike.%${searchQuery}%,org_code.ilike.%${searchQuery}%,department.ilike.%${searchQuery}%`
        );
      }

      // Apply specific filters
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      if (departmentFilter) {
        query = query.eq('department', departmentFilter);
      }
      if (typeFilter) {
        query = query.eq('org_type', typeFilter);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const start = (currentPage - 1) * itemsPerPage;
      query = query.range(start, start + itemsPerPage - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setOrganizations(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      // Handle 416 Range Not Satisfiable error by resetting to page 1
      if (err instanceof Error && (err.message.includes('416') || err.message.includes('Range Not Satisfiable'))) {
        setCurrentPage(1);
        return;
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchOrganizations();
  }, [searchQuery, statusFilter, departmentFilter, typeFilter, sortField, sortDirection, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, departmentFilter, typeFilter]);

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
          <h1 className="text-2xl font-semibold text-gray-900">Organizations</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all registered organizations in the system ({totalCount} total)
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="">All Statuses</option>
              {filterOptions.statuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="">All Departments</option>
              {filterOptions.departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="">All Types</option>
              {filterOptions.orgTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-8 bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-green-50 to-green-100">
              <tr>
                <th
                  scope="col"
                  className="py-4 pl-6 pr-3 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-green-200/50 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Organization
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-green-200/50 transition-colors"
                  onClick={() => handleSort('org_type')}
                >
                  <div className="flex items-center gap-2">
                    Type
                    <SortIcon field="org_type" />
                  </div>
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
                  className="px-4 py-4 text-left text-sm font-bold text-gray-900"
                >
                  Status
                </th>
                <th scope="col" className="relative py-4 pl-4 pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                      <p className="text-sm text-gray-500">Loading organizations...</p>
                    </div>
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 text-gray-300" />
                      <p className="text-sm text-gray-500">No organizations found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-green-50/50 transition-colors">
                    <td className="py-4 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {org.org_pic ? (
                            <img
                              src={org.org_pic}
                              alt={org.name}
                              className="h-10 w-10 rounded-lg object-cover border-2 border-green-100"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center border-2 border-green-200">
                              <span className="text-sm font-semibold text-green-700">
                                {org.abbrev_name?.charAt(0).toUpperCase() || org.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">
                            {org.abbrev_name || org.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {org.org_code} • {org.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {org.org_type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {org.department}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        org.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : org.status === 'inactive'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {org.status?.charAt(0).toUpperCase() + org.status?.slice(1)}
                      </span>
                    </td>
                    <td className="pl-4 pr-6 py-4 text-right">
                      <Link
                        to={`/admin/dashboard/organizations/${org.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 hover:border-green-300 transition-colors"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
