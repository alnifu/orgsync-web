import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types/database.types';

type SelectOfficerProps = {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
};

export default function SelectOfficer({ isOpen, onClose, orgId, onError, onSuccess }: SelectOfficerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<User[]>([]);
  const [existingOfficerIds, setExistingOfficerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [position, setPosition] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Fetch all members and existing officers
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        
        // Fetch existing officers for this organization
        const { data: officerData, error: officerError } = await supabase
          .from('org_managers')
          .select('user_id')
          .eq('org_id', orgId)
          .eq('manager_role', 'officer');

        if (officerError) throw officerError;
        
        // Create set of existing officer IDs
        const officerIds = new Set(officerData?.map(officer => officer.user_id) || []);
        setExistingOfficerIds(officerIds);

        // Fetch all users
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('first_name');

        if (error) throw error;
        
        // Filter out existing officers
        const availableMembers = data?.filter(user => !officerIds.has(user.id)) || [];
        setMembers(availableMembers);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, onError, orgId]);

  // Handle officer assignment
  const handleAssignOfficer = async (userId: string) => {
    if (assigning) return; // Prevent multiple clicks
    
    setAssigning(true);
    try {
      // First, update or insert user_roles to ensure they have officer role
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
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
          .eq('user_id', userId);

        if (roleUpdateError) throw roleUpdateError;
      }

      const { error: assignError } = await supabase
        .from('org_managers')
        .insert({
          user_id: userId,
          org_id: orgId,
          manager_role: 'officer',
          position: position.trim() || null
        });

      if (assignError) throw assignError;
      onSuccess?.();
      onClose();
      setPosition('');
      setSelectedUser(null);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to assign officer');
      console.log('error:', err);
    } finally {
      setAssigning(false);
    }
  };

  // Filter members based on search query
  const filteredMembers = members.filter(member =>
    (member.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    (member.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    (member.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        setSelectedUser(null);
        setPosition('');
      }
    }}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg">

          <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
            Select Officer
          </DialogTitle>

        {/* Search input */}
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

        {/* Selected user and position input */}
        {selectedUser && (
          <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              {selectedUser.avatar_url ? (
                <img
                  src={selectedUser.avatar_url}
                  alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-700 font-medium text-sm">
                    {((selectedUser.first_name && selectedUser.first_name.length > 0) ? selectedUser.first_name.charAt(0).toUpperCase() : 'U')}{((selectedUser.last_name && selectedUser.last_name.length > 0) ? selectedUser.last_name.charAt(0).toUpperCase() : 'U')}
                  </span>
                </div>
              )}
              <div>
                <div className="font-medium text-gray-900">{selectedUser.first_name || 'Unknown'} {selectedUser.last_name || 'User'}</div>
                <div className="text-sm text-gray-500">{selectedUser.email || 'No email'}</div>
              </div>
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
                className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-green-600 sm:text-sm"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleAssignOfficer(selectedUser.id)}
                disabled={assigning}
                className="flex-1 inline-flex justify-center items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? 'Assigning...' : 'Assign Officer'}
              </button>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setPosition('');
                }}
                className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Members list */}
        <div className="relative max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">No members found</p>
          ) : (
            <div className="grid gap-2">
              {filteredMembers.map((member: User) => (
                <button
                  key={member.id}
                  onClick={() => {
                    setSelectedUser(member);
                    setPosition('');
                  }}
                  className="flex items-center space-x-3 rounded-lg p-3 hover:bg-gray-100 transition-colors text-left w-full"
                  disabled={!!selectedUser}
                >
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={`${member.first_name} ${member.last_name}`}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-700 font-medium text-sm">
                        {((member.first_name && member.first_name.length > 0) ? member.first_name.charAt(0).toUpperCase() : 'U')}{((member.last_name && member.last_name.length > 0) ? member.last_name.charAt(0).toUpperCase() : 'U')}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{member.first_name || 'Unknown'} {member.last_name || 'User'}</div>
                    <div className="text-sm text-gray-500">{member.email || 'No email'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}