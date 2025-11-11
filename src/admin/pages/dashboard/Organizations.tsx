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
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useUserRoles } from '../../../utils/roles';
import AccessDenied from '../../../components/AccessDenied';
import type { Organization } from '../../../types/database.types';

type SortField = 'name' | 'org_code' | 'date_established' | 'org_type';
type SortDirection = 'asc' | 'desc';

export default function Organizations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles, loading: rolesLoading, isAdmin, isOfficer, isAdviser } = useUserRoles(user?.id);
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
      
      const isUserAdmin = isAdmin();
      
      let query = supabase
        .from('organizations')
        .select('*', { count: 'exact' });

      // Filter organizations based on user role
      if (!isUserAdmin) {
        // For officers and advisers, only show organizations they manage
        const { data: managedOrgs, error: orgError } = await supabase
          .from('org_managers')
          .select('org_id')
          .eq('user_id', user?.id);

        if (orgError) throw orgError;

        if (managedOrgs && managedOrgs.length > 0) {
          const orgIds = managedOrgs.map(org => org.org_id);
          query = query.in('id', orgIds);
        } else {
          // No managed organizations, return empty result
          setOrganizations([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
      }

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

      console.log('fetchOrganizations: filters applied', { searchQuery, filterOrgType, filterDepartment, sortField, sortDirection, currentPage });

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const start = (currentPage - 1) * itemsPerPage;
      query = query.range(start, start + itemsPerPage - 1);

      const { data, error: fetchError, count } = await query;

      console.log('fetchOrganizations: query result', { data, error: fetchError, count });

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
    if (!rolesLoading) {
      fetchOrganizations();
    }
  }, [searchQuery, filterOrgType, filterDepartment, sortField, sortDirection, currentPage, rolesLoading]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterOrgType, filterDepartment]);

  // Auto-navigate officers/advisers to single organization
  useEffect(() => {
    if (!loading && !rolesLoading && organizations.length === 1 && (isOfficer() || isAdviser()) && !isAdmin()) {
      navigate(organizations[0].id);
    }
  }, [organizations, loading, rolesLoading, navigate]);

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

  // Check if user has admin access
  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!isAdmin() && !isOfficer() && !isAdviser()) {
    return <AccessDenied />;
  }

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
          {isAdmin() && (
            <button
              onClick={() => navigate('new')}
              type="button"
              className="flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Organization
            </button>
          )}
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
          <option value="PROF">Professional</option>
          <option value="SPIN">Special Interest</option>
          <option value="SCRO">Socio-Civic</option>
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
              className="group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-green-300 transition-all duration-200 overflow-hidden"
            >
              {/* Header with gradient background */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                <div className="flex items-center space-x-4">
                  {/* Organization Logo */}
                  <div className="flex-shrink-0">
                    {org.org_pic ? (
                      <img
                        src={org.org_pic}
                        alt={`${org.name} logo`}
                        className="w-24 h-24 rounded-lg object-cover border-2 border-white/20 shadow-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    {/* Fallback icon */}
                    <div className={`w-24 h-24 rounded-lg bg-white/20 flex items-center justify-center border-2 border-white/20 shadow-sm ${org.org_pic ? 'hidden' : ''}`}>
                      <Building className="w-12 h-12 text-white/80" />
                    </div>
                  </div>

                  {/* Organization Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white truncate">
                      {org.abbrev_name || org.name}
                    </h3>
                    <p className="text-green-100 text-sm font-medium">
                      {org.org_code}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className={
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold " +
                        (org.status === 'active'
                          ? "bg-green-100 text-green-800"
                          : org.status === 'inactive'
                          ? "bg-gray-100 text-gray-800"
                          : "bg-yellow-100 text-yellow-800"
                        )
                      }>
                        {org.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {org.description || 'No description available'}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-gray-500">
                    <Building className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">{org.department}</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <Filter className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{org.org_type}</span>
                  </div>
                  <div className="flex items-center text-gray-500 col-span-2">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span>Established: {new Date(org.date_established).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Hover indicator */}
                <div className="mt-4 flex items-center text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-medium">View Details</span>
                  <ChevronDown className="w-4 h-4 ml-1 rotate-[-90deg]" />
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
