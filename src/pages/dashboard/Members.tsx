import { useState, useEffect } from 'react';
import {
  Shield,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Member } from '../../types/database.types';
import PromoteModal from '../../components/PromoteModal';

type SortField = 'name' | 'email' | 'department' | 'year' | 'course' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterCourse, setFilterCourse] = useState<string>('');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Fetch members with filters, sorting, and pagination
  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('members')
        .select('*', { count: 'exact' });

      // Apply search filters
      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,department.ilike.%${searchQuery}%,course.ilike.%${searchQuery}%`
        );
      }

      // Apply specific filters
      if (filterDepartment) {
        query = query.eq('department', filterDepartment);
      }
      if (filterYear) {
        query = query.eq('year', filterYear);
      }
      if (filterCourse) {
        query = query.eq('course', filterCourse);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const start = (currentPage - 1) * itemsPerPage;
      query = query.range(start, start + itemsPerPage - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      setMembers(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch members when dependencies change
  useEffect(() => {
    fetchMembers();
  }, [searchQuery, filterDepartment, filterYear, filterCourse, sortField, sortDirection, currentPage]);

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
          <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all members in the system
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={() => setShowPromoteModal(true)}
            type="button"
            className="flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            <Shield className="h-4 w-4 mr-2" />
            Promote to Officer
          </button>
        </div>
      </div>

      {/* Promote Modal */}
      <PromoteModal 
        isOpen={showPromoteModal}
        onClose={() => {
          setShowPromoteModal(false);
          setSelectedMember(null);
          setError(null);
        }}
        selectedMember={selectedMember}
        onPromote={async (memberId, orgId, position) => {
          try {
            // First check if the member is already an officer in any organization
            const { data: existingOfficer, error: checkError } = await supabase
              .from('officers')
              .select('*')
              .eq('id', memberId)
              .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
              throw checkError;
            }

            if (existingOfficer) {
              throw new Error('This member is already an officer in another organization');
            }

            // Attempt to promote the member
            const { error: promoteError } = await supabase.rpc('promote_to_officer', {
              member_id: memberId,
              organization_id: orgId,
              officer_position: position
            });

            if (promoteError) {
              // Handle specific error cases
              if (promoteError.message.includes('does not exist in this organization')) {
                throw new Error('Member must first be added to the organization before being promoted');
              }
              throw promoteError;
            }
            
            fetchMembers(); // Refresh the list after successful promotion
            setShowPromoteModal(false);
            setSelectedMember(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to promote member');
            // Don't close modal on error so user can try again
          }
        }}
      />

      {/* Search and filters */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search members..."
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
          <option value="OTHERS">Others</option>
        </select>

        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
        >
          <option value="">All Years</option>
          <option value="1st">1st Year</option>
          <option value="2nd">2nd Year</option>
          <option value="3rd">3rd Year</option>
          <option value="4th">4th Year</option>
        </select>

        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
        >
          <option value="">All Courses</option>
          <option value="BSIT">More to Come Soon</option>
          {/* Add more courses */}
        </select>
      </div>

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
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                      onClick={() => handleSort('name')}
                    >
                      <div className="group inline-flex cursor-pointer">
                        Name
                        <span className="ml-2 flex-none rounded"><SortIcon field="name" /></span>
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      onClick={() => handleSort('email')}
                    >
                      <div className="group inline-flex cursor-pointer">
                        Email
                        <span className="ml-2 flex-none rounded"><SortIcon field="email" /></span>
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      onClick={() => handleSort('department')}
                    >
                      <div className="group inline-flex cursor-pointer">
                        Department
                        <span className="ml-2 flex-none rounded"><SortIcon field="department" /></span>
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      onClick={() => handleSort('year')}
                    >
                      <div className="group inline-flex cursor-pointer">
                        Year
                        <span className="ml-2 flex-none rounded"><SortIcon field="year" /></span>
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      onClick={() => handleSort('course')}
                    >
                      <div className="group inline-flex cursor-pointer">
                        Course
                        <span className="ml-2 flex-none rounded"><SortIcon field="course" /></span>
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
                      <td colSpan={6} className="text-center py-4">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-gray-500">
                        No members found
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          <div className="flex items-center">
                            <img
                              src={member.avatar_url || 'https://via.placeholder.com/40'}
                              alt=""
                              className="h-10 w-10 rounded-full mr-3"
                            />
                            {member.name}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {member.email}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {member.department}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {member.year}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {member.course}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button 
                            onClick={() => {
                              setSelectedMember(member);
                              setShowPromoteModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Promote to Officer"
                          >
                            <Shield className="h-5 w-5" />
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
      <div className="mt-4 flex items-center justify-between">
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
