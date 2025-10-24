// OrganizationDetails.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useUserRoles, canManageOrg, canEditOrg } from '../../../utils/roles';
import AccessDenied from '../../../components/AccessDenied';
import type { Organization, User } from '../../../types/database.types';
import OrganizationOverview from '../../components/OrganizationOverview';
import OrganizationMembers from '../../components/OrganizationMembers';
import OrganizationPosts from '../../components/OrganizationPosts';
import OrganizationReports from '../../components/OrganizationReports';
import SelectAdviser from '../../components/SelectAdviser';
import EditOrganizationModal from '../../components/EditOrganizationModal';
import DeleteOrganizationModal from '../../components/DeleteOrganizationModal';
import OrganizationLeaderboard from '../../components/OrganizationLeaderboard';
import OrganizationQuizzes from '../../components/OrganizationQuizzes';
import SelectOfficer from '../../components/SelectOfficer';
import { Pencil, Trash2, UserPlus2 } from 'lucide-react';

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { roles, orgManagers, loading: rolesLoading } = useUserRoles(user?.id);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [adviser, setAdviser] = useState<User | null>(null);
  const [officers, setOfficers] = useState<User[]>([]);
  const [isSelectAdviserOpen, setIsSelectAdviserOpen] = useState(false);
  const [isSelectOfficerOpen, setIsSelectOfficerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch organization details
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setOrganization(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load organization');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [id]);

  // Fetch adviser details
  useEffect(() => {
    const fetchAdviser = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('org_managers')
          .select(`
            user_id,
            org_id,
            manager_role,
            assigned_at,
            users (
              id,
              first_name,
              last_name,
              avatar_url,
              points,
              preferences,
              created_at,
              updated_at,
              student_number,
              program,
              year_level,
              employee_id,
              department,
              position,
              user_type,
              email
            )
          `)
          .eq('org_id', id)
          .eq('manager_role', 'adviser')
          .maybeSingle();
        console.log('Adviser data:', data, 'Error:', error);
        if (error) throw error;
        if (data) {
          setAdviser(data.users as unknown as User);
        } else {
          setAdviser(null);
        }
      } catch (err) {
        console.error('Error fetching adviser:', err);
        setAdviser(null);
      }
    };

    fetchAdviser();
  }, [id]);

  // Fetch officers details
  useEffect(() => {
    const fetchOfficers = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('org_managers')
          .select(`
            user_id,
            org_id,
            manager_role,
            assigned_at,
            users (
              id,
              first_name,
              last_name,
              avatar_url,
              points,
              preferences,
              created_at,
              updated_at,
              student_number,
              program,
              year_level,
              employee_id,
              department,
              position,
              user_type,
              email
            )
          `)
          .eq('org_id', id)
          .eq('manager_role', 'officer');
        console.log('Officers data:', data, 'Error:', error);
        if (error) throw error;
        if (data) {
          setOfficers(data.map(item => item.users as unknown as User));
        } else {
          setOfficers([]);
        }
      } catch (err) {
        console.error('Error fetching officers:', err);
        setOfficers([]);
      }
    };

    fetchOfficers();
  }, [id]);

  const refetchOfficers = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('org_managers')
        .select(`
          user_id,
          org_id,
          manager_role,
          assigned_at,
          users (
            id,
            first_name,
            last_name,
            avatar_url,
            points,
            preferences,
            created_at,
            updated_at,
            student_number,
            program,
            year_level,
            employee_id,
            department,
            position,
            user_type,
            email
          )
        `)
        .eq('org_id', id)
        .eq('manager_role', 'officer');
      if (error) throw error;
      if (data) {
        setOfficers(data.map(item => item.users as unknown as User));
      } else {
        setOfficers([]);
      }
    } catch (err) {
      console.error('Error refetching officers:', err);
    }
  };

  const handleRemoveAdviser = async (memberId: string, orgId: string) => {
    try {
      const { error: removeError } = await supabase
        .from('org_managers')
        .delete()
        .eq('user_id', memberId)
        .eq('org_id', orgId)
        .eq('manager_role', 'adviser');

      if (removeError) throw removeError;

      // Check if user has any remaining manager roles
      const { data: remainingRoles, error: checkError } = await supabase
        .from('org_managers')
        .select('manager_role')
        .eq('user_id', memberId);

      if (checkError) throw checkError;

      // If no remaining roles, demote back to member
      if (!remainingRoles || remainingRoles.length === 0) {
        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .update({ role: 'member' })
          .eq('user_id', memberId);

        if (roleUpdateError) throw roleUpdateError;
      }

      setAdviser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove adviser');
      console.log('error:', err);
    }
  };

  const handleRemoveOfficer = async (memberId: string, orgId: string) => {
    try {
      const { error: removeError } = await supabase
        .from('org_managers')
        .delete()
        .eq('user_id', memberId)
        .eq('org_id', orgId)
        .eq('manager_role', 'officer');

      if (removeError) throw removeError;

      // Check if user has any remaining manager roles
      const { data: remainingRoles, error: checkError } = await supabase
        .from('org_managers')
        .select('manager_role')
        .eq('user_id', memberId);

      if (checkError) throw checkError;

      // If no remaining roles, demote back to member
      if (!remainingRoles || remainingRoles.length === 0) {
        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .update({ role: 'member' })
          .eq('user_id', memberId);

        if (roleUpdateError) throw roleUpdateError;
      }

      // Update local state
      setOfficers(prev => prev.filter(officer => officer.id !== memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove officer');
      console.log('error:', err);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    console.log('Error:', errorMessage);
  };

  // Check if user has access to this organization
  if (rolesLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!canManageOrg(roles?.role || null, orgManagers, id || '')) {
    return <AccessDenied />;
  }

  if (loading) return (
    <div className="p-6 flex justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
    </div>
  );

  if (error || !organization) return (
    <div className="p-6">
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">{error || 'Organization not found'}</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Banner Picture */}
        {organization.banner_pic && (
          <div className="w-full h-90 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={organization.banner_pic}
              alt={`${organization.name} banner`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {/* Organization Picture */}
            {organization.org_pic ? (
              <img
                src={organization.org_pic}
                alt={`${organization.name} logo`}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-bold text-xl">
                  {organization.abbrev_name?.charAt(0)?.toUpperCase() || organization.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{organization.name}</h1>
              <p className="text-sm text-gray-500">{organization.abbrev_name}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Organization Adviser */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Organization Adviser</h3>

          {adviser ? (
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {adviser.avatar_url ? (
                    <img
                      src={adviser.avatar_url}
                      alt={`${adviser.first_name} ${adviser.last_name}`}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-700 font-medium text-sm">
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
                  onClick={() => handleRemoveAdviser(adviser.id, organization.id)}
                  className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Remove adviser
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="mt-2 text-sm text-gray-500">
                No adviser assigned to this organization yet.
              </p>
              <div className="mt-5">
                <button
                  onClick={() => setIsSelectAdviserOpen(true)}
                  className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                >
                  <UserPlus2 className="h-4 w-4 mr-2" />
                  Assign Adviser
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Organization Officers */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Organization Officers</h3>

          {officers.length > 0 ? (
            <div className="mt-2 space-y-3">
              {officers.map((officer) => (
                <div key={officer.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {officer.avatar_url ? (
                      <img
                        src={officer.avatar_url}
                        alt={`${officer.first_name} ${officer.last_name}`}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-700 font-medium text-sm">
                          {(officer.first_name ? officer.first_name.charAt(0).toUpperCase() : '?')}{(officer.last_name ? officer.last_name.charAt(0).toUpperCase() : '?')}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{officer.first_name} {officer.last_name}</div>
                      <div className="text-sm text-gray-500">{officer.email}</div>
                    </div>
                  </div>
                  {canEditOrg(roles?.role || null, orgManagers, id || '') && (
                    <button
                      onClick={() => handleRemoveOfficer(officer.id, organization.id)}
                      className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-500"
                    >
                      Remove officer
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              No officers assigned to this organization yet.
            </p>
          )}
          {canEditOrg(roles?.role || null, orgManagers, id || '') && (
            <div className="mt-5">
              <button
                onClick={() => setIsSelectOfficerOpen(true)}
                className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
              >
                <UserPlus2 className="h-4 w-4 mr-2" />
                Add Officer
              </button>
            </div>
          )}
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="border-b border-gray-200">
          <TabsTrigger
            value="overview"
            className="px-4 py-2 -mb-px transition transform active:scale-95 hover:bg-gray-100 focus:outline-none rounded-md"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="px-4 py-2 -mb-px transition transform active:scale-95 hover:bg-gray-100 focus:outline-none rounded-md"
          >
            Members
          </TabsTrigger>
          <TabsTrigger
            value="posts"
            className="px-4 py-2 -mb-px transition transform active:scale-95 hover:bg-gray-100 focus:outline-none rounded-md"
          >
            Posts
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="px-4 py-2 -mb-px transition transform active:scale-95 hover:bg-gray-100 focus:outline-none rounded-md"
          >
            Reports
          </TabsTrigger>
          <TabsTrigger
            value="quizzes"
            className="px-4 py-2 -mb-px transition transform active:scale-95 hover:bg-gray-100 focus:outline-none rounded-md"
          >
            Quizzes
          </TabsTrigger>
          <TabsTrigger
            value="leaderboard"
            className="px-4 py-2 -mb-px transition transform active:scale-95 hover:bg-gray-100 focus:outline-none rounded-md"
          >
            Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <OrganizationOverview organization={organization} />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <OrganizationMembers
            organizationId={id!}
            onError={handleError}
          />
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          <OrganizationPosts
            organizationId={id!}
            onError={handleError}
          />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <OrganizationReports
            organizationId={id!}
            onError={handleError}
          />
        </TabsContent>

        {/* Quizzes Tab */}
        <TabsContent value="quizzes" className="space-y-4">
          <OrganizationQuizzes organizationId={id!} />
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <OrganizationLeaderboard organizationId={id!} />
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Modals */}
      <SelectAdviser
        isOpen={isSelectAdviserOpen}
        onClose={() => setIsSelectAdviserOpen(false)}
        orgId={id!}
        onError={handleError}
      />

      <SelectOfficer
        isOpen={isSelectOfficerOpen}
        onClose={() => setIsSelectOfficerOpen(false)}
        orgId={id!}
        onError={handleError}
        onSuccess={refetchOfficers}
      />

      <EditOrganizationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        organization={organization}
        onError={handleError}
      />

      <DeleteOrganizationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        organization={organization}
        onError={handleError}
      />
    </div>
  );
}