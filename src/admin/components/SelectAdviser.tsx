import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types/database.types';
import toast from 'react-hot-toast';

type SelectAdviserProps = {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
};

export default function SelectAdviser({ isOpen, onClose, orgId }: SelectAdviserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // Fetch all members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('first_name');

        if (error) throw error;
        setMembers(data || []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen]);

  // Handle adviser assignment
  const handleAssignAdviser = async (userId: string) => {
    if (assigning) return; // Prevent multiple clicks
    
    setAssigning(true);
    try {
      // First, update or insert user_roles to ensure they have adviser role
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleCheckError && roleCheckError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw roleCheckError;
      }

      // If no role exists or current role is 'member', update to 'adviser'
      if (!existingRole || existingRole.role === 'member') {
        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: 'adviser',
            granted_at: new Date().toISOString()
          });

        if (roleUpdateError) throw roleUpdateError;
      }

      const { error: assignError } = await supabase
        .from('org_managers')
        .insert({
          user_id: userId,
          org_id: orgId,
          manager_role: 'adviser',
          position: null
        });

      if (assignError) throw assignError;
      onClose();
      toast.success('Adviser assigned successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign adviser');
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg">
      
          <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
            Select Adviser
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
                  onClick={() => handleAssignAdviser(member.id)}
                  disabled={assigning}
                  className="flex items-center space-x-3 rounded-lg p-3 hover:bg-gray-100 transition-colors text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
