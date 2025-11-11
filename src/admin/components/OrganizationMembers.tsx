// OrganizationMembers.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { User, OrgMember } from '../../types/database.types';
import toast from 'react-hot-toast';

type OrgMemberWithUser = OrgMember & {
  users: User;
};
import { UserPlus, Users, X, Search, Filter, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useNavigate } from 'react-router';

interface OrganizationMembersProps {
  organizationId: string;
}

export default function OrganizationMembers({ organizationId }: OrganizationMembersProps) {
  const [organizationMembers, setOrganizationMembers] = useState<OrgMemberWithUser[]>([]);
  const [availableMembers, setAvailableMembers] = useState<User[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // New state for enhanced member management
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [currentMemberSearch, setCurrentMemberSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [yearLevelFilter, setYearLevelFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const navigate = useNavigate();

  // Fetch organization members
  const fetchOrganizationMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select(`
          *,
          users(*)
        `)
        .eq('org_id', organizationId)
        .order('joined_at', { ascending: false });
      if (error) throw error;
      setOrganizationMembers(data || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  // Fetch available members (not yet in org)
  const fetchAvailableMembers = async () => {
    try {
      const { data: allMembers, error: membersError } = await supabase
        .from('users')
        .select('*')
        .order('first_name');

      if (membersError) throw membersError;

      const existingIds = new Set(organizationMembers.map(m => m.user_id));
      setAvailableMembers(allMembers?.filter(m => !existingIds.has(m.id)) || []);
    } catch (err) {
      console.error('Failed to fetch available members:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOrganizationMembers();
  }, [organizationId]);

  // Refetch available members when organization members change and add members section is open
  useEffect(() => {
    if (showAddMembers) {
      fetchAvailableMembers();
    }
  }, [organizationMembers, showAddMembers]);

  // Toggle add members section
  const toggleAddMembers = () => {
    setShowAddMembers(!showAddMembers);
  };

  // Remove member
  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('org_id', organizationId)
        .eq('user_id', memberId);
      if (error) throw error;
      fetchOrganizationMembers();
      toast.success('Member removed successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  // View member profile
  const viewProfile = (userId: string) => {
    navigate(`/admin/dashboard/profile/${userId}`);
  };

  // Get unique values for filters
  const departments = [...new Set(availableMembers.map(m => m.department).filter(Boolean))].sort() as string[];
  const programs = [...new Set(availableMembers.map(m => m.program).filter(Boolean))].sort() as string[];
  const yearLevels = [...new Set(availableMembers.map(m => m.year_level).filter(Boolean))].sort() as number[];

  // Helper function to format year level with correct ordinal
  const formatYearLevel = (year: number | null) => {
    if (!year) return 'N/A';
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const lastDigit = year % 10;
    const suffix = (year > 10 && year < 20) ? 'th' : suffixes[lastDigit] || 'th';
    return `${year}${suffix} Year`;
  };

  // Filter available members with search and filters
  const filteredAvailableMembers = availableMembers.filter(m => {
    const matchesSearch = !memberSearchQuery ||
      (m.first_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ?? false) ||
      (m.last_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ?? false) ||
      (m.email?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ?? false) ||
      (m.department?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ?? false) ||
      (m.program?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ?? false);

    const matchesDepartment = !departmentFilter || m.department === departmentFilter;
    const matchesProgram = !programFilter || m.program === programFilter;
    const matchesYearLevel = !yearLevelFilter || m.year_level?.toString() === yearLevelFilter;

    return matchesSearch && matchesDepartment && matchesProgram && matchesYearLevel;
  });

  // Filter current members
  const filteredCurrentMembers = organizationMembers.filter(m => {
    const matchesSearch = !currentMemberSearch ||
      (m.users?.first_name?.toLowerCase().includes(currentMemberSearch.toLowerCase()) ?? false) ||
      (m.users?.last_name?.toLowerCase().includes(currentMemberSearch.toLowerCase()) ?? false) ||
      (m.users?.email?.toLowerCase().includes(currentMemberSearch.toLowerCase()) ?? false) ||
      (m.users?.department?.toLowerCase().includes(currentMemberSearch.toLowerCase()) ?? false) ||
      (m.users?.program?.toLowerCase().includes(currentMemberSearch.toLowerCase()) ?? false);

    return matchesSearch;
  });

  // Handle member selection
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  // Add selected members
  const addSelectedMembers = async () => {
    if (selectedMembers.length === 0) return;

    try {
      setAddingMember(true);
      const membersToAdd = selectedMembers.map(userId => ({
        user_id: userId,
        org_id: organizationId
      }));

      const { error } = await supabase
        .from('org_members')
        .insert(membersToAdd);

      if (error) throw error;

      setSelectedMembers([]);
      fetchOrganizationMembers();
      toast.success('Members added successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add members');
    } finally {
      setAddingMember(false);
    }
  };

  return (
    <div className="padding-4 space-y-6">
      {/* Add Member */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between cursor-pointer hover:bg-green-50 hover:border-green-200 rounded-lg p-3 transition-all duration-200 border-2 border-transparent hover:shadow-sm" onClick={toggleAddMembers}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Add Members</h4>
              <p className="text-sm text-gray-600">Invite new members to join your organization</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {selectedMembers.length > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                {selectedMembers.length} selected
              </span>
            )}
            <div className="p-2 hover:bg-gray-100 rounded-md transition-colors">
              {showAddMembers ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
        </div>

        {showAddMembers && (
          <>
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, department, or program..."
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-md">
                  <select
                    value={departmentFilter}
                    onChange={e => setDepartmentFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  >
                    <option value="">All Departments</option>
                    {departments.map(department => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>

                  <select
                    value={programFilter}
                    onChange={e => setProgramFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  >
                    <option value="">All Programs</option>
                    {programs.map(program => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>

                  <select
                    value={yearLevelFilter}
                    onChange={e => setYearLevelFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  >
                    <option value="">All Year Levels</option>
                    {yearLevels.map(level => (
                      <option key={level} value={level.toString()}>{formatYearLevel(level)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Member Selection */}
            <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
              {filteredAvailableMembers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {availableMembers.length === 0 ? 'No available members' : 'No members match your search'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {availableMembers.length === 0
                      ? 'All users are already members of this organization'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredAvailableMembers.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center p-3 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => toggleMemberSelection(member.id)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {member.first_name || 'Unknown'} {member.last_name || 'User'}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatYearLevel(member.year_level)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{member.email}</p>
                        <p className="text-xs text-gray-500">
                          {member.department} - {member.program}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selection Summary and Add Button */}
            {selectedMembers.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                <span className="text-sm text-green-700">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={addSelectedMembers}
                  disabled={addingMember}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {addingMember ? 'Adding...' : 'Add Selected Members'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Current Members */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left Section */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Current Members</h4>
              <p className="text-sm text-gray-600">Manage existing organization members</p>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-2 sm:gap-0 w-full sm:w-auto">
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full text-center sm:text-left">
              {organizationMembers.length} members
            </span>

            <div className="relative w-full sm:w-auto">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={currentMemberSearch}
                onChange={e => setCurrentMemberSearch(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Program
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCurrentMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    {organizationMembers.length === 0 ? 'No members yet' : 'No members match your search'}
                  </td>
                </tr>
              ) : (
                filteredCurrentMembers.map(m => (
                  <tr key={m.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-green-600">
                            {m.users?.first_name ? m.users.first_name.charAt(0) : '?'}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {m.users?.first_name || 'Unknown'} {m.users?.last_name || 'User'}
                          </div>
                          <div className="text-sm text-gray-500">Member</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {m.users?.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {m.users?.department || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {m.users?.program || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatYearLevel(m.users?.year_level)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewProfile(m.user_id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeMember(m.user_id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Remove member"
                        >
                          <X className="h-4 w-4" />
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
  );
}