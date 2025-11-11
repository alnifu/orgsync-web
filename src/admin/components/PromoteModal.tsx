import { useState, useEffect, useRef } from 'react';
import { X, Search, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { User, Organization } from '../../types/database.types';

interface PromoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMember: User | null;
}

const PRESET_POSITIONS = [
  'President',
  'Vice President', 
  'Secretary',
  'Treasurer',
  'PRO',
  'Auditor'
] as const;

export default function PromoteModal({ 
  isOpen, 
  onClose, 
  selectedMember 
}: PromoteModalProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      fetchOrganizations();
      setError(null);
    } else {
      resetForm();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setSelectedOrg(null);
    setSearchQuery('');
    setPosition('');
    setIsSubmitting(false);
    setError(null);
    setIsDropdownOpen(false);
  };

  const fetchOrganizations = async () => {
    if (!selectedMember) return;

    try {
      // First, get organizations where the user is a member
      const { data: memberOrgs, error: memberError } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', selectedMember.id)
        .eq('is_active', true);

      if (memberError) throw memberError;

      if (!memberOrgs || memberOrgs.length === 0) {
        setOrganizations([]);
        setError('This user is not a member of any organizations and cannot be promoted.');
        return;
      }

      const orgIds = memberOrgs.map(m => m.org_id);

      // Fetch the organization details
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)
        .order('name');

      if (error) throw error;

      setOrganizations(data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations. Please try again.');
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.abbrev_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOrgSelect = (org: Organization) => {
    setSelectedOrg(org);
    setSearchQuery(org.name);
    setIsDropdownOpen(false);
    setError(null);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedOrg(null);
    setIsDropdownOpen(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMember || !selectedOrg || !position.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // First, update or insert user_roles to ensure they have officer role
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', selectedMember.id)
        .maybeSingle();

      if (roleCheckError && roleCheckError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw roleCheckError;
      }

      // If no role exists or current role is 'member', update to 'officer'
      if (!existingRole || existingRole.role === 'member') {
        if (existingRole) {
          // Update existing role
          const { error: roleUpdateError } = await supabase
            .from('user_roles')
            .update({
              role: 'officer',
              granted_at: new Date().toISOString()
            })
            .eq('user_id', selectedMember.id);

          if (roleUpdateError) throw roleUpdateError;
        } else {
          // Insert new role
          const { error: roleInsertError } = await supabase
            .from('user_roles')
            .insert({
              user_id: selectedMember.id,
              role: 'officer',
              granted_at: new Date().toISOString()
            });

          if (roleInsertError) throw roleInsertError;
        }
      }

      // Insert into org_managers table
      const { error } = await supabase
        .from('org_managers')
        .insert({
          user_id: selectedMember.id,
          org_id: selectedOrg.id,
          manager_role: 'officer',
          position: position.trim()
        });

      if (error) throw error;
      
      console.log('Promotion successful');
      onClose();
    } catch (err) {
      console.error('Error promoting member:', err);
      
      // Handle specific database errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Member does not exist')) {
        setError('This member does not belong to the selected organization.');
      } else if (errorMessage.includes('already an officer')) {
        setError('This member is already an officer in this organization.');
      } else if (errorMessage) {
        setError(`Error: ${errorMessage}`);
      } else if ((err as any).details) {
        setError(`Database error: ${(err as any).details}`);
      } else {
        setError('Failed to promote member. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !selectedMember) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Promote to Officer</h2>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Member Info Card */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <img
                src={selectedMember.avatar_url || '/api/placeholder/48/48'}
                alt={`${selectedMember.first_name} ${selectedMember.last_name}'s avatar`}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {selectedMember.first_name} {selectedMember.last_name}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {selectedMember.email}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedMember.department} • {selectedMember.year_level} Year • {selectedMember.program}
                </p>
              </div>
            </div>
          </div>

          {/* Organization Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Organization *
            </label>
            <div className="relative" ref={searchInputRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {selectedOrg && (
                  <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" size={16} />
                )}
              </div>

              {/* Dropdown */}
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredOrganizations.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      {searchQuery ? 'No organizations match your search' : 'No organizations available'}
                    </div>
                  ) : (
                    filteredOrganizations.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleOrgSelect(org)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        <div className="font-medium text-gray-900">{org.name}</div>
                        <div className="text-sm text-gray-500">{org.abbrev_name}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Position Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Position *
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Enter position title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            
            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-2">
              {PRESET_POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosition(pos)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    position === pos
                      ? 'bg-green-100 text-green-800 ring-1 ring-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !selectedOrg || !position.trim()}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Promoting...' : 'Promote to Officer'}
          </button>
        </form>
      </div>
    </div>
  );
}