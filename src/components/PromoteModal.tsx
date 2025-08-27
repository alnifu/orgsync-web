import { useState, useEffect, useRef } from 'react';
import { X, Search, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Member, Organization } from '../types/database.types';

interface PromoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPromote: (memberId: string, orgId: string, position: string) => Promise<void>;
  selectedMember: Member | null;
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
  onPromote, 
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
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
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
      // Call the RPC function with the original parameter names
      const { data, error } = await supabase.rpc('promote_to_officer', {
        member_id: selectedMember.id,
        organization_id: selectedOrg.id,
        officer_position: position.trim()
      });

      if (error) throw error;
      
      console.log('Promotion successful:', data);
      onClose();
    } catch (err: any) {
      console.error('Error promoting member:', err);
      
      // Handle specific database errors
      if (err.message?.includes('Member does not exist')) {
        setError('This member does not belong to the selected organization.');
      } else if (err.message?.includes('already an officer')) {
        setError('This member is already an officer in this organization.');
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else if (err.details) {
        setError(`Database error: ${err.details}`);
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
                alt={`${selectedMember.name}'s avatar`}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {selectedMember.name}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {selectedMember.email}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedMember.department} • {selectedMember.year} Year • {selectedMember.course}
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