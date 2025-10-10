import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Member } from '../../types/database.types';

type SelectAdviserProps = {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onError?: (error: string) => void;
};

export default function SelectAdviser({ isOpen, onClose, orgId, onError }: SelectAdviserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .order('name');

        if (error) throw error;
        setMembers(data || []);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, onError]);

  // Handle adviser assignment
  const handleAssignAdviser = async (memberId: string) => {
    try {
      const { error: assignError } = await supabase
        .rpc('assign_adviser', {
          m_id: memberId,
          o_id: orgId
        });

      if (assignError) throw assignError;
      onClose();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to assign adviser');
      console.log('error:', err);
    }
  };

  // Filter members based on search query
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
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
              {filteredMembers.map((member: Member) => (
                <button
                  key={member.id}
                  onClick={() => handleAssignAdviser(member.id)}
                  className="flex items-center space-x-3 rounded-lg p-3 hover:bg-gray-100 transition-colors text-left w-full"
                >
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-700 font-medium text-sm">
                        {member.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{member.name}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
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
