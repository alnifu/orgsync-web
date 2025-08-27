import { useState, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  Filter,
  Calendar,
  Building
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import type { Organization } from '../../types/database.types';

type SortField = 'name' | 'org_code' | 'date_established' | 'org_type';
type SortDirection = 'asc' | 'desc';

export default function Organizations() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOrgType, setFilterOrgType] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Fetch organizations with filters, sorting, and pagination
  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('organizations')
        .select('*', { count: 'exact' });

      // Apply search filters
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,org_code.ilike.%${searchQuery}%,abbrev_name.ilike.%${searchQuery}%`);
      }

      // Apply specific filters
      if (filterOrgType) {
        query = query.eq('org_type', filterOrgType);
      }
      if (filterDepartment) {
        query = query.eq('department', filterDepartment);
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
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [searchQuery, filterOrgType, filterDepartment, sortField, sortDirection, currentPage]);

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

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Organizations</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all registered organizations in the system
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={() => navigate('new')}
            type="button"
            className="flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Organization
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-green-600 sm:text-sm"
          />
        </div>

        <select
          value={filterOrgType}
          onChange={(e) => setFilterOrgType(e.target.value)}
          className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
        >
          <option value="">All Types</option>
          <option value="Prof">Professional</option>
          <option value="SPIN">Special Interest</option>
          <option value="Socio-Civic">Socio-Civic</option>
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
          <option value="OTHERS">Others</option>
        </select>
      </div>

      {/* Organizations Grid */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No organizations found
          </div>
        ) : (
          organizations.map((org) => (
            <Link
              key={org.id}
              to={org.id}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {org.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {org.org_code} • {org.abbrev_name}
                    </p>
                  </div>
                  <span className={
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium " + 
                    (org.status === 'active' 
                      ? "bg-green-100 text-green-700"
                      : org.status === 'inactive'
                      ? "bg-gray-100 text-gray-700"
                      : "bg-yellow-100 text-yellow-700"
                    )
                  }>
                    {org.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Building className="h-4 w-4 mr-2" />
                    {org.department}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    Est. {new Date(org.date_established).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Filter className="h-4 w-4 mr-2" />
                    {org.org_type}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
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
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage * itemsPerPage >= totalCount}
            className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Error Display */}
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
