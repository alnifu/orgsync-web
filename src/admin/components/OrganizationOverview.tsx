import type { Organization, User } from '../../types/database.types';
import { UserPlus2 } from 'lucide-react';

interface OrganizationOverviewProps {
  organization: Organization;
  adviser: User | null;
  onAssignAdviser: () => void;
  onRemoveAdviser: (adviserId: string, orgId: string) => void;
}

export default function OrganizationOverview({
  organization,
  adviser,
  onAssignAdviser,
  onRemoveAdviser
}: OrganizationOverviewProps) {
  return (
    <div className="space-y-6">


      {/* Organization Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">About</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Department</dt>
            <dd className="mt-1 text-sm text-gray-900">{organization.department}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Organization Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{organization.org_type}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{organization.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Date Established</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(organization.date_established).toLocaleDateString()}
            </dd>
          </div>
        </dl>
        {organization.description && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-1 text-sm text-gray-900">{organization.description}</p>
          </div>
        )}
      </div>

      {/* Organization Adviser */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Adviser</h3>

        {adviser ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {adviser.avatar_url ? (
                <img
                  src={adviser.avatar_url}
                  alt={`${adviser.first_name} ${adviser.last_name}`}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {(adviser.first_name ? adviser.first_name.charAt(0).toUpperCase() : '?')}{(adviser.last_name ? adviser.last_name.charAt(0).toUpperCase() : '?')}
                  </span>
                </div>
              )}
              <div>
                <div className="font-medium text-gray-900">{adviser.first_name} {adviser.last_name}</div>
                <div className="text-sm text-gray-500">{adviser.email}</div>
              </div>
            </div>
            <button
              onClick={() => onRemoveAdviser(adviser.id, organization.id)}
              className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-500"
            >
              Remove adviser
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              No adviser assigned to this organization yet.
            </p>
            <button
              onClick={onAssignAdviser}
              className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500"
            >
              <UserPlus2 className="h-4 w-4 mr-2" />
              Assign Adviser
            </button>
          </div>
        )}
      </div>

    </div>
  );
}