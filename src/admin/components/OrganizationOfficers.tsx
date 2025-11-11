// OrganizationOfficers.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types/database.types';
import toast from 'react-hot-toast';
import { UserPlus, Users, X, Search, Filter, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useNavigate } from 'react-router';

interface OrganizationOfficersProps {
  organizationId: string;
}

// Helper function to format ordinal numbers
const formatOrdinal = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + 'st';
  if (j === 2 && k !== 12) return num + 'nd';
  if (j === 3 && k !== 13) return num + 'rd';
  return num + 'th';
};

export default function OrganizationOfficers({ organizationId }: OrganizationOfficersProps) {
  const [officers, setOfficers] = useState<User[]>([]);
  const [availableOfficers, setAvailableOfficers] = useState<User[]>([]);
  const [officerSearchQuery, setOfficerSearchQuery] = useState('');
  const [currentOfficerSearch, setCurrentOfficerSearchQuery] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [yearLevelFilter, setYearLevelFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddOfficers, setShowAddOfficers] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<User | null>(null);
  const [position, setPosition] = useState('');
  const navigate = useNavigate();

  // Fetch officers details
  const fetchOfficers = async () => {
    try {
      const { data, error } = await supabase
        .from('org_managers')
        .select(`
          user_id,
          org_id,
          manager_role,
          position,
          assigned_at,
          users (
            id,
            first_name,
            last_name,
            avatar_url,
            points,
            preferences,
            created_at,
            updated_at,
            student_number,
            program,
            year_level,
            employee_id,
            department,
            user_type,
            email
          )
        `)
        .eq('org_id', organizationId)
        .eq('manager_role', 'officer');

      if (error) throw error;
      if (data) {
        setOfficers(data.map(item => ({
          ...(item.users as unknown as User),
          position: item.position // Use position from org_managers table
        })));
      } else {
        setOfficers([]);
      }
    } catch (err) {
      console.error('Error fetching officers:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch officers');
    }
  };

  // Fetch available officers (users who are members but not already officers)
  const fetchAvailableOfficers = async () => {
    try {
      // First get all members of the organization
      const { data: membersData, error: membersError } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', organizationId);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setAvailableOfficers([]);
        return;
      }

      const memberIds = membersData.map(m => m.user_id);

      // Get user details for these members
      const { data: memberUsers, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', memberIds)
        .order('first_name');

      if (usersError) throw usersError;

      // Filter out users who are already officers
      const existingOfficerIds = new Set(officers.map(o => o.id));
      setAvailableOfficers(memberUsers?.filter(u => !existingOfficerIds.has(u.id)) || []);
    } catch (err) {
      console.error('Failed to fetch available officers:', err);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, [organizationId]);

  // Refetch available officers when officers change and add officers section is open
  useEffect(() => {
    if (showAddOfficers) {
      fetchAvailableOfficers();
    }
  }, [officers, showAddOfficers]);

  // Toggle add officers section
  const toggleAddOfficers = () => {
    setShowAddOfficers(!showAddOfficers);
  };

  // Get unique values for filters
  const colleges = [...new Set(availableOfficers.map(o => o.college).filter(Boolean))].sort() as string[];
  const programs = [...new Set(availableOfficers.map(o => o.program).filter(Boolean))].sort() as string[];
  const yearLevels = [...new Set(availableOfficers.map(o => o.year_level).filter(Boolean))].sort() as number[];

  // Filter available officers with search and filters
  const filteredAvailableOfficers = availableOfficers.filter(o => {
    const matchesSearch = !officerSearchQuery ||
      (o.first_name?.toLowerCase().includes(officerSearchQuery.toLowerCase()) ?? false) ||
      (o.last_name?.toLowerCase().includes(officerSearchQuery.toLowerCase()) ?? false) ||
      (o.email?.toLowerCase().includes(officerSearchQuery.toLowerCase()) ?? false) ||
      (o.college?.toLowerCase().includes(officerSearchQuery.toLowerCase()) ?? false) ||
      (o.program?.toLowerCase().includes(officerSearchQuery.toLowerCase()) ?? false);

    const matchesCollege = !collegeFilter || o.college === collegeFilter;
    const matchesProgram = !programFilter || o.program === programFilter;
    const matchesYearLevel = !yearLevelFilter || o.year_level?.toString() === yearLevelFilter;

    return matchesSearch && matchesCollege && matchesProgram && matchesYearLevel;
  });

  // Filter current officers
  const filteredCurrentOfficers = officers.filter(officer =>
    !currentOfficerSearch ||
    (officer.first_name?.toLowerCase().includes(currentOfficerSearch.toLowerCase()) ?? false) ||
    (officer.last_name?.toLowerCase().includes(currentOfficerSearch.toLowerCase()) ?? false) ||
    (officer.email?.toLowerCase().includes(currentOfficerSearch.toLowerCase()) ?? false)
  );

  const handleRemoveOfficer = async (memberId: string) => {
    try {
      const { error: removeError } = await supabase
        .from('org_managers')
        .delete()
        .eq('user_id', memberId)
        .eq('org_id', organizationId)
        .eq('manager_role', 'officer');

      if (removeError) throw removeError;

      // Check if user has any remaining manager roles
      const { data: remainingRoles, error: checkError } = await supabase
        .from('org_managers')
        .select('manager_role')
        .eq('user_id', memberId);

      if (checkError) throw checkError;

      // If no remaining roles, demote back to member
      if (!remainingRoles || remainingRoles.length === 0) {
        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .update({ role: 'member' })
          .eq('user_id', memberId);

        if (roleUpdateError) throw roleUpdateError;
      }

      // Update local state
      setOfficers(prev => prev.filter(officer => officer.id !== memberId));
      toast.success('Officer removed successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove officer');
    }
  };

  const viewProfile = (userId: string) => {
    navigate(`/admin/dashboard/profile/${userId}`);
  };

  const handleAssignOfficer = async () => {
    if (!selectedOfficer) return;

    try {
      // First, update or insert user_roles to ensure they have officer role
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', selectedOfficer.id)
        .maybeSingle();

      if (roleCheckError && roleCheckError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw roleCheckError;
      }

      // If no role exists or current role is 'member', update to 'officer'
      if (!existingRole || existingRole.role === 'member' || existingRole.role === 'adviser') {
        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .update({
            role: 'officer',
            granted_at: new Date().toISOString()
          })
          .eq('user_id', selectedOfficer.id);

        if (roleUpdateError) throw roleUpdateError;
      }

      const { error: assignError } = await supabase
        .from('org_managers')
        .insert({
          user_id: selectedOfficer.id,
          org_id: organizationId,
          manager_role: 'officer',
          position: position.trim() || null
        });

      if (assignError) throw assignError;

      // Reset form and refresh data
      setSelectedOfficer(null);
      setPosition('');
      setShowAddOfficers(false);
      await fetchOfficers();
      toast.success('Officer assigned successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign officer');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Officer */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between cursor-pointer hover:bg-blue-50 hover:border-blue-200 rounded-lg p-3 transition-all duration-200 border-2 border-transparent hover:shadow-sm" onClick={toggleAddOfficers}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Add Officers</h4>
              <p className="text-sm text-gray-600">Assign officer roles to organization members</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {selectedOfficer && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                1 selected
              </span>
            )}
            <div className="p-2 hover:bg-gray-100 rounded-md transition-colors">
              {showAddOfficers ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
        </div>

        {showAddOfficers && (
          <>
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, college, or program..."
                    value={officerSearchQuery}
                    onChange={e => setOfficerSearchQuery(e.target.value)}
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
                    value={collegeFilter}
                    onChange={e => setCollegeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  >
                    <option value="">All Colleges</option>
                    {colleges.map(college => (
                      <option key={college} value={college}>{college}</option>
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
                      <option key={level} value={level.toString()}>{formatOrdinal(level)} Year</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Officer Selection */}
            <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
              {filteredAvailableOfficers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {availableOfficers.length === 0 ? 'No available officers' : 'No officers match your search'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {availableOfficers.length === 0
                      ? 'Users must be members first before becoming officers'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredAvailableOfficers.map(officer => (
                    <div
                      key={officer.id}
                      className="flex items-center p-3 hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="officer-selection"
                        checked={selectedOfficer?.id === officer.id}
                        onChange={() => {
                          setSelectedOfficer(officer);
                          setPosition('');
                        }}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {officer.first_name || 'Unknown'} {officer.last_name || 'User'}
                          </p>
                          <span className="text-xs text-gray-500">
                            {officer.year_level ? `${formatOrdinal(officer.year_level)} Year` : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{officer.email}</p>
                        <p className="text-xs text-gray-500">
                          {officer.college} - {officer.program}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selection Summary and Position Input */}
            {selectedOfficer && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-700">
                        {(selectedOfficer.first_name ? selectedOfficer.first_name.charAt(0).toUpperCase() : '?')}{(selectedOfficer.last_name ? selectedOfficer.last_name.charAt(0).toUpperCase() : '?')}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-blue-900">
                      {selectedOfficer.first_name} {selectedOfficer.last_name}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedOfficer(null);
                      setPosition('');
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                    Position (Optional)
                  </label>
                  <input
                    type="text"
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. President, Vice President, Secretary..."
                    className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAssignOfficer}
                    className="flex-1 inline-flex justify-center items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    Assign Officer
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOfficer(null);
                      setPosition('');
                    }}
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Current Officers */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          {/* Left Section */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Current Officers</h4>
              <p className="text-sm text-gray-600">Manage organization officers and their roles</p>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-2 sm:gap-0 w-full sm:w-auto">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full text-center sm:text-left">
              {officers.length} officers
            </span>

            <div className="relative w-full sm:w-auto">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search officers..."
                value={currentOfficerSearch}
                onChange={e => setCurrentOfficerSearchQuery(e.target.value)}
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
                  Officer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCurrentOfficers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    {officers.length === 0 ? 'No officers assigned yet' : 'No officers match your search'}
                  </td>
                </tr>
              ) : (
                filteredCurrentOfficers.map(officer => (
                  <tr key={officer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {officer.avatar_url ? (
                          <img
                            src={officer.avatar_url}
                            alt={`${officer.first_name} ${officer.last_name}`}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-green-600">
                              {(officer.first_name ? officer.first_name.charAt(0).toUpperCase() : '?')}{(officer.last_name ? officer.last_name.charAt(0).toUpperCase() : '?')}
                            </span>
                          </div>
                        )}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {officer.first_name || 'Unknown'} {officer.last_name || 'User'}
                          </div>
                          <div className="text-sm text-gray-500">Officer</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {officer.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {officer.department || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {officer.position || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewProfile(officer.id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveOfficer(officer.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Remove officer"
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