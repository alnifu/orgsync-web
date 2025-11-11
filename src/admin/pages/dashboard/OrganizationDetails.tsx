// OrganizationDetails.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useUserRoles, canManageOrg } from '../../../utils/roles';
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
import OrganizationOfficers from '../../components/OrganizationOfficers';
import FlappyCommunityGoalsManager from './FlappyCommunityGoalsManager';
import CommunityGoalsManager from './CommunityGoalsManager';
import OrganizationAttendance from '../../components/OrganizationAttendance';
import { Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles, orgManagers, loading: rolesLoading, isAdmin } = useUserRoles(user?.id);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [adviser, setAdviser] = useState<User | null>(null);
  const [isSelectAdviserOpen, setIsSelectAdviserOpen] = useState(false);
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

  if (!canManageOrg(roles?.role || null, orgManagers, id || '', rolesLoading)) {
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
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center bg-white px-3 py-2 text-md font-semibold text-gray-900 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
      </div>

      {/* Header */}
      <div className="space-y-4">
        {/* Banner Picture */}
        {organization.banner_pic && (
          <div className="w-full h-40 sm:h-60 md:h-72 lg:h-120 bg-gray-100 rounded-lg overflow-hidden">
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
            {isAdmin() && (
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
<TabsList className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap border-b border-gray-200 bg-white p-1 rounded-lg shadow-sm">
          <TabsTrigger
            value="overview"
            className="px-4 py-2.5 -mb-px transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-green-700 focus:outline-none rounded-md font-medium"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="px-4 py-2.5 -mb-px transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-green-700 focus:outline-none rounded-md font-medium"
          >
            Members
          </TabsTrigger>
          <TabsTrigger
            value="officers"
            className="px-4 py-2.5 -mb-px transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-green-700 focus:outline-none rounded-md font-medium"
          >
            Officers
          </TabsTrigger>
          <TabsTrigger
            value="posts"
            className="px-4 py-2.5 -mb-px transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-green-700 focus:outline-none rounded-md font-medium"
          >
            Posts
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="px-4 py-2.5 -mb-px transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-green-700 focus:outline-none rounded-md font-medium"
          >
            Reports
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="px-4 py-2.5 -mb-px transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-green-700 focus:outline-none rounded-md font-medium"
          >
            Attendance
          </TabsTrigger>
          <TabsTrigger
            value="quizzes"
            className="px-4 py-2.5 -mb-px transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-green-700 focus:outline-none rounded-md font-medium"
          >
            Quizzes
          </TabsTrigger>
          <TabsTrigger
            value="leaderboard"
            className="px-4 py-2.5 -mb-px transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-green-700 focus:outline-none rounded-md font-medium"
          >
            Leaderboard
          </TabsTrigger>
          <TabsTrigger
            value="quiz-goals"
            className="px-4 py-2.5 -mb-px transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-green-700 focus:outline-none rounded-md font-medium"
          >
            Quiz Goals
          </TabsTrigger>
          <TabsTrigger
            value="flappy-goals"
            className="px-4 py-2.5 -mb-px transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-green-700 focus:outline-none rounded-md font-medium"
          >
            Flappy Goals
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <OrganizationOverview
            organization={organization}
            adviser={adviser}
            onAssignAdviser={() => setIsSelectAdviserOpen(true)}
            onRemoveAdviser={handleRemoveAdviser}
          />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <OrganizationMembers
            organizationId={id!}
          />
        </TabsContent>

        {/* Officers Tab */}
        <TabsContent value="officers" className="space-y-4">
          <OrganizationOfficers
            organizationId={id!}
          />
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          <OrganizationPosts
            organizationId={id!}
          />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <OrganizationReports
            organizationId={id!}
          />
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <OrganizationAttendance
            orgId={id!}
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

        {/* Quiz Goals Tab */}
        <TabsContent value="quiz-goals" className="space-y-4">
          <CommunityGoalsManager />
        </TabsContent>

        {/* Flappy Goals Tab */}
        <TabsContent value="flappy-goals" className="space-y-4">
          <FlappyCommunityGoalsManager />
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
      />

      <EditOrganizationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        organization={organization}
      />

      <DeleteOrganizationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        organization={organization}
      />
      <Toaster position="top-center" />
    </div>
  );
}