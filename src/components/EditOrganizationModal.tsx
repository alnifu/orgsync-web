import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { supabase } from '../lib/supabase';
import type { Organization } from '../types/database.types';

type EditOrganizationProps = {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  onError?: (error: string) => void;
};

export default function EditOrganization({
  isOpen,
  onClose,
  organization,
  onError
}: EditOrganizationProps) {
  const [formData, setFormData] = useState({
    name: organization.name,
    abbrev_name: organization.abbrev_name,
    email: organization.email,
    description: organization.description || '',
    department: organization.department,
    org_type: organization.org_type,
    date_established: organization.date_established.split('T')[0], // Format date for input
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update(formData)
        .eq('id', organization.id);

      if (error) throw error;
      onClose();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg">
        <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
          Edit Organization
        </DialogTitle>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="abbrev_name" className="block text-sm font-medium text-gray-700">
                  Abbreviation
                </label>
                <input
                  type="text"
                  id="abbrev_name"
                  value={formData.abbrev_name}
                  onChange={(e) => setFormData({ ...formData, abbrev_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="date_established" className="block text-sm font-medium text-gray-700">
                  Date Established
                </label>
                <input
                  type="date"
                  id="date_established"
                  value={formData.date_established}
                  onChange={(e) => setFormData({ ...formData, date_established: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value as Organization['department'] })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  required
                >
                  <option value="CITE">CITE</option>
                  <option value="CBEAM">CBEAM</option>
                  <option value="COL">COL</option>
                  <option value="CON">CON</option>
                  <option value="CEAS">CEAS</option>
                  <option value="OTHERS">Others</option>
                </select>
              </div>

              <div>
                <label htmlFor="org_type" className="block text-sm font-medium text-gray-700">
                  Organization Type
                </label>
                <select
                  id="org_type"
                  value={formData.org_type}
                  onChange={(e) => setFormData({ ...formData, org_type: e.target.value as Organization['org_type'] })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  required
                >
                  <option value="Prof">Professional</option>
                  <option value="SPIN">Special Interest</option>
                  <option value="Socio-Civic">Socio-Civic</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
