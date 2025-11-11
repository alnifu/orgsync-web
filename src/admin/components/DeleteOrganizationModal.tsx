import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import type { Organization } from '../../types/database.types';
import toast from 'react-hot-toast';

type DeleteOrganizationProps = {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
};

export default function DeleteOrganization({
  isOpen,
  onClose,
  organization
}: DeleteOrganizationProps) {
  const [confirmCode, setConfirmCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .rpc('delete_organization', {
          organization_id: organization.id,
          org_code_input: confirmCode
        });

      if (error) throw error;
      onClose();
      navigate('/dashboard/organizations');
      toast.success('Organization deleted successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg">
        <DialogTitle className="text-lg font-semibold leading-none tracking-tight text-red-600">
          Delete Organization
        </DialogTitle>

        <div className="py-4">
          <p className="text-sm text-gray-500">
            This action cannot be undone. This will permanently delete the{' '}
            <span className="font-semibold">{organization.name}</span> organization and remove
            all associations.
          </p>

          <div className="mt-4">
            <p className="text-sm text-gray-700">
              Please type <span className="font-mono text-red-600">{organization.org_code}</span> to confirm.
            </p>
            <input
              type="text"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
              placeholder="Enter organization code"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={confirmCode !== organization.org_code || loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete Organization'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
