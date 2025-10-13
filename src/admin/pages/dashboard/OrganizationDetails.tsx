// OrganizationDetails.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { supabase } from '../../../lib/supabase';
import type { Organization, User } from '../../../types/database.types';
import OrganizationOverview from '../../components/OrganizationOverview';
import OrganizationMembers from '../../components/OrganizationMembers';
import OrganizationPosts from '../../components/OrganizationPosts';
import SelectAdviser from '../../components/SelectAdviser';
import EditOrganizationModal from '../../components/EditOrganizationModal';
import DeleteOrganizationModal from '../../components/DeleteOrganizationModal';
import { Pencil, Trash2, UserPlus2 } from 'lucide-react';

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
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
              college,
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
          setAdviser(data.users);
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
      setAdviser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove adviser');
      console.log('error:', err);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{organization.name}</h1>
          <p className="text-sm text-gray-500">{organization.org_code} • {organization.abbrev_name}</p>
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
                        {adviser.first_name.charAt(0).toUpperCase()}{adviser.last_name.charAt(0).toUpperCase()}
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

      {/* Tabs */}
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