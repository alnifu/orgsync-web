import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Shield,
  ChevronDown,
  ChevronUp,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { User } from '../../../types/database.types';
import PromoteModal from '../../components/PromoteModal';

type SortField = 'first_name' | 'last_name' | 'email' | 'department' | 'year_level' | 'program' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function Members() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [officerUserIds, setOfficerUserIds] = useState<Set<string>>(new Set());
  const [memberUserIds, setMemberUserIds] = useState<Set<string>>(new Set());
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterCourse, setFilterCourse] = useState<string>('');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('first_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Fetch members with filters, sorting, and pagination
  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // First, fetch officer user IDs
      const { data: officerData, error: officerError } = await supabase
        .from('org_managers')
        .select('user_id');

      if (officerError) {
        console.error('Error fetching officers:', officerError);
        // Continue anyway, just won't hide promote buttons
      } else {
        const officerIds = new Set((officerData || []).map(o => o.user_id));
        setOfficerUserIds(officerIds);
      }

      // Fetch member user IDs
      const { data: memberData, error: memberError } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('is_active', true);

      if (memberError) {
        console.error('Error fetching members:', memberError);
        // Continue anyway
      } else {
        const memberIds = new Set((memberData || []).map(m => m.user_id));
        setMemberUserIds(memberIds);
      }
      
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' });

      // Apply search filters
      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,department.ilike.%${searchQuery}%,program.ilike.%${searchQuery}%`
        );
      }

      // Apply specific filters
      const validDepartments = ['CITE', 'CBEAM', 'COL', 'CON', 'CEAS', 'OTHERS'];
      if (filterDepartment && validDepartments.includes(filterDepartment)) {
        query = query.eq('department', filterDepartment);
      }
        const validYears = ['1', '2', '3', '4', '5'];
      if (filterYear && validYears.includes(filterYear)) {
          query = query.eq('year_level', parseInt(filterYear, 10));
      }
      if (filterCourse) {
        query = query.eq('program', filterCourse);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const start = (currentPage - 1) * itemsPerPage;
      query = query.range(start, start + itemsPerPage - 1);

      const { data, error, count } = await query;

      if (error) {
        // Handle 416 Range Not Satisfiable error (offset too large for filtered results)
        if (error.code === 'PGRST116' || error.message?.includes('416') || error.message?.includes('Range Not Satisfiable')) {
          // Reset to first page and retry
          setCurrentPage(1);
          return;
        }
        throw error;
      }
      console.log('Fetched members:', data);
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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDepartment, filterYear, filterCourse]);

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
        
      </div>

      {/* Promote Modal */}
      <PromoteModal 
        isOpen={showPromoteModal}
        onClose={() => {
          setShowPromoteModal(false);
          setSelectedMember(null);
          setError(null);
          fetchMembers(); // Refresh the list after promotion
        }}
        selectedMember={selectedMember}
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
         <option value="1">1st Year</option>
         <option value="2">2nd Year</option>
         <option value="3">3rd Year</option>
         <option value="4">4th Year</option>
         <option value="5">5th Year</option>
        </select>

        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
        >
          <option value="">All Programs</option>

          <optgroup label="College of Business, Economics, Accountancy and Management">
            <option value="BS Accountancy">BS Accountancy</option>
            <option value="BS Accounting Information System">BS Accounting Information System</option>
            <option value="BS Legal Management">BS Legal Management</option>
            <option value="BS Entrepreneurship">BS Entrepreneurship</option>
            <option value="BS Management Technology">BS Management Technology</option>
            <option value="BSBA Financial Management">BSBA Financial Management</option>
            <option value="BSBA Marketing Management">BSBA Marketing Management</option>
            <option value="Certificate in Entrepreneurship">Certificate in Entrepreneurship</option>
          </optgroup>

          <optgroup label="College of Education, Arts and Sciences">
            <option value="Bachelor of Elementary Education">Bachelor of Elementary Education</option>
            <option value="Bachelor of Secondary Education">Bachelor of Secondary Education</option>
            <option value="AB Communication">AB Communication</option>
            <option value="Bachelor of Multimedia Arts">Bachelor of Multimedia Arts</option>
            <option value="BS Biology">BS Biology</option>
            <option value="BS Forensic Science">BS Forensic Science</option>
            <option value="BS Mathematics">BS Mathematics</option>
            <option value="BS Psychology">BS Psychology</option>
          </optgroup>

          <optgroup label="College of International Hospitality and Tourism Management">
            <option value="BS Hospitality Management">BS Hospitality Management</option>
            <option value="BS Tourism Management">BS Tourism Management</option>
            <option value="Certificate in Culinary Arts">Certificate in Culinary Arts</option>
          </optgroup>

          <optgroup label="College of Information Technology and Engineering">
            <option value="BS Architecture">BS Architecture</option>
            <option value="BS Computer Engineering">BS Computer Engineering</option>
            <option value="BS Computer Science">BS Computer Science</option>
            <option value="BS Electrical Engineering">BS Electrical Engineering</option>
            <option value="BS Electronics Engineering">BS Electronics Engineering</option>
            <option value="BS Entertainment and Multimedia Computing">BS Entertainment and Multimedia Computing</option>
            <option value="BS Industrial Engineering">BS Industrial Engineering</option>
            <option value="BS Information Technology">BS Information Technology</option>
            <option value="Associate in Computer Technology">Associate in Computer Technology</option>
          </optgroup>

          <optgroup label="College of Nursing">
            <option value="BS Nursing">BS Nursing</option>
          </optgroup>
        </select>
      </div>

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
                    Member
                    <SortIcon field="first_name" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-green-200/50 transition-colors"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Email
                    <SortIcon field="email" />
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
                  className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-green-200/50 transition-colors"
                  onClick={() => handleSort('year_level')}
                >
                  <div className="flex items-center gap-2">
                    Year
                    <SortIcon field="year_level" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-green-200/50 transition-colors"
                  onClick={() => handleSort('program')}
                >
                  <div className="flex items-center gap-2">
                    Program
                    <SortIcon field="program" />
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
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                      <p className="text-sm text-gray-500">Loading members...</p>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <UserIcon className="h-12 w-12 text-gray-300" />
                      <p className="text-sm text-gray-500">
                        {searchQuery || filterDepartment || filterYear || filterCourse ?
                          'No members match your search criteria' :
                          'No members found'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-green-50/50 transition-colors">
                    <td className="py-4 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={`${member.first_name} ${member.last_name}`}
                              className="h-10 w-10 rounded-full object-cover border-2 border-green-100"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center border-2 border-green-200">
                              <span className="text-sm font-semibold text-green-700">
                                {member.first_name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            ID: {member.student_number || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {member.email}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 font-medium">
                        {member.department}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        String(member.year_level) === '1' ? 'bg-blue-100 text-blue-800' :
                        String(member.year_level) === '2' ? 'bg-green-100 text-green-800' :
                        String(member.year_level) === '3' ? 'bg-yellow-100 text-yellow-800' :
                        String(member.year_level) === '4' ? 'bg-purple-100 text-purple-800' :
                        String(member.year_level) === '5' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {member.year_level ? `${member.year_level}${member.year_level === 1 ? 'st' : member.year_level === 2 ? 'nd' : member.year_level === 3 ? 'rd' : 'th'} Year` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 font-medium truncate max-w-xs">
                        {member.program || 'N/A'}
                      </span>
                    </td>
                    <td className="pl-4 pr-6 py-4 text-right">
                      <div className="flex items-center justify-start gap-2">
                        <button
                          onClick={() => navigate(`/admin/dashboard/profile/${member.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                          title="View Profile"
                        >
                          <UserIcon className="h-3.5 w-3.5" />
                          View
                        </button>
                        {!officerUserIds.has(member.id) && memberUserIds.has(member.id) && (
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setShowPromoteModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 hover:border-green-300 transition-colors"
                            title="Promote to Officer"
                          >
                            <Shield className="h-3.5 w-3.5" />
                            Promote
                          </button>
                        )}
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
