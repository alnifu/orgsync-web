import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Officer } from '../types/database.types';

type SelectAdviserProps = {
  currentAdviserId: string | null;
  onChange: (officerId: string | null) => void;
  className?: string;
};

export default function SelectAdviser({
  currentAdviserId,
  onChange,
  className = ''
}: SelectAdviserProps) {
  const [search, setSearch] = useState('');
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(false);

  const searchOfficers = async (searchTerm: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('officers')
        .select(`
          id,
          org_id,
          position,
          assigned_at,
          members!inner(
            name,
            avatar_url,
            email,
            department,
            year,
            course,
            created_at,
            updated_at
          )
        `);

      if (currentAdviserId) {
        query = query.neq('id', currentAdviserId);
      }

      if (searchTerm) {
        query = query.textSearch('members.name', searchTerm);
      }

      const { data, error } = await query
        .limit(10)
        .order('position');

      if (error) throw error;

      setOfficers(data.map(officer => ({
        id: officer.id,
        org_id: officer.org_id,
        position: officer.position,
        assigned_at: officer.assigned_at,
        name: officer.members?.name || '',
        avatar_url: officer.members?.avatar_url,
        email: officer.members?.email || '',
        department: officer.members?.department || '',
        year: officer.members?.year || '',
        course: officer.members?.course || '',
        created_at: officer.members?.created_at || new Date().toISOString(),
        updated_at: officer.members?.updated_at || new Date().toISOString()
      })));
    } catch (error) {
      console.error('Error searching officers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchOfficers(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, currentAdviserId]);

  return (
    <div className={className}>
      <label htmlFor="adviser" className="block text-sm font-medium text-gray-700">
        Organization Adviser
      </label>
      <div className="mt-1 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search officers..."
            className="block w-full rounded-t-md border-gray-300 pl-10 focus:border-green-500 focus:ring-green-500 sm:text-sm"
          />
        </div>
        <select
          id="adviser"
          value={currentAdviserId || ''}
          onChange={(e) => onChange(e.target.value || null)}
          className={`mt-1 block w-full rounded-b-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm ${loading ? 'opacity-50' : ''}`}
          size={5}
        >
          <option value="">No Adviser Selected</option>
          {officers.map((officer) => (
            <option key={officer.id} value={officer.id}>
              {officer.name} - {officer.position} ({officer.department})
            </option>
          ))}
        </select>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
          </div>
        )}
      </div>
    </div>
  );
}
