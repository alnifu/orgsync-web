// OrganizationMembers.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Member, OrganizationMember } from '../types/database.types';
import { UserPlus, Users, X, Mail, GraduationCap } from 'lucide-react';

interface OrganizationMembersProps {
  organizationId: string;
  onError: (error: string) => void;
}

export default function OrganizationMembers({ organizationId, onError }: OrganizationMembersProps) {
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberPosition, setMemberPosition] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const PRESET_POSITIONS = [
    'Member'
  ] as const;

  // Fetch organization members
  const fetchOrganizationMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          member:members(*)
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
        .from('members')
        .select('*')
        .order('name');

      if (membersError) throw membersError;

      const existingIds = new Set(organizationMembers.map(m => m.member_id));
      setAvailableMembers(allMembers?.filter(m => !existingIds.has(m.id)) || []);
    } catch (err) {
      console.error('Failed to fetch available members:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOrganizationMembers();
  }, [organizationId]);

  // Refetch available members when organization members change
  useEffect(() => {
    fetchAvailableMembers();
  }, [organizationMembers]);

  // Add member to organization
  const addMember = async () => {
    if (!selectedMemberId) return;
    try {
      setAddingMember(true);
      const { error } = await supabase.from('organization_members').insert({
        member_id: selectedMemberId,
        org_id: organizationId,
        position: memberPosition
      });
      if (error) throw error;
      setSelectedMemberId('');
      setMemberPosition('');
      fetchOrganizationMembers();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  // Remove member
  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('org_id', organizationId)
        .eq('member_id', memberId);
      if (error) throw error;
      fetchOrganizationMembers();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  // Filter available members by search
  const filteredAvailableMembers = availableMembers.filter(
    m =>
      m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.department.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add Member */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h4 className="text-md font-medium text-gray-900 flex items-center">
          <UserPlus className="h-5 w-5 mr-2" />Add Member
        </h4>

        <input
          type="text"
          placeholder="Search members..."
          value={memberSearchQuery}
          onChange={e => setMemberSearchQuery(e.target.value)}
          className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-green-600 sm:text-sm"
        />

        <select
          value={selectedMemberId}
          onChange={e => setSelectedMemberId(e.target.value)}
          className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
        >
          <option value="">Select a member</option>
          {filteredAvailableMembers.map(m => (
            <option key={m.id} value={m.id}>{m.name} - {m.department} ({m.year})</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Position"
          value={memberPosition}
          onChange={e => setMemberPosition(e.target.value)}
          className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
        />

        {/* Quick Select Buttons */}
        <div className="flex flex-wrap gap-2">
          {PRESET_POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setMemberPosition(pos)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${memberPosition === pos
                ? 'bg-green-100 text-green-800 ring-1 ring-green-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {pos}
            </button>
          ))}
        </div>

        <button
          onClick={addMember}
          disabled={!selectedMemberId || addingMember}
          className="w-full flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addingMember ? 'Adding...' : 'Add Member'}
        </button>
      </div>

      {/* Current Members */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h4 className="text-md font-medium text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2" />Current Members ({organizationMembers.length})
        </h4>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {organizationMembers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No members yet</p>
          ) : (
            organizationMembers.map(m => (
              <div key={m.member_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600">{m.member?.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.member?.name}</p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Mail className="h-3 w-3 mr-1" />{m.member?.email}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {m.member?.department} - {m.member?.course} ({m.member?.year})
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 font-medium mt-1">{m.position}</p>
                  <p className="text-xs text-gray-400">Joined: {new Date(m.joined_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => removeMember(m.member_id)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}