import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '../../../lib/supabase';
import type { Organization } from '../../../types/database.types';
import { ChevronDown, ChevronUp } from 'lucide-react';

type SortField = 'name' | 'org_code' | 'date_established' | 'org_type' | 'department';
type SortDirection = 'asc' | 'desc';

export default function OrgTable() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch organizations with sorting
  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .order(sortField, { ascending: sortDirection === 'asc' });

      if (fetchError) throw fetchError;

      setOrganizations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [sortField, sortDirection]);

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
