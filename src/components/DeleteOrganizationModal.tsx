import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router';

type DeleteOrganizationModalProps = {
  organizationId: string;
  organizationName: string;
  organizationCode: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function DeleteOrganizationModal({
  organizationId,
  organizationName,
  organizationCode,
  isOpen,
  onClose,
}: DeleteOrganizationModalProps) {
  const navigate = useNavigate();
  const [confirmCode, setConfirmCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmCode !== organizationCode) {
      setError('Organization code does not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId);

      if (deleteError) throw deleteError;

      onClose();
      navigate('/dashboard/organizations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete organization');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Delete Organization</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500">
            This action cannot be undone. This will permanently delete the
            organization <span className="font-medium text-gray-900">{organizationName}</span> and all associated data.
          </p>

          <form onSubmit={handleDelete} className="mt-4">
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
                Please type <span className="font-medium text-gray-900">{organizationCode}</span> to confirm.
              </label>
              <input
                type="text"
                id="confirm"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || confirmCode !== organizationCode}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete Organization'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
