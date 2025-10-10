import type { Organization } from '../../types/database.types';

interface OrganizationOverviewProps {
  organization: Organization;
}

export default function OrganizationOverview({ organization }: OrganizationOverviewProps) {
  return (
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
  );
}