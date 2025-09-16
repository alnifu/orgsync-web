// OrganizationDetails.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Organization } from '../../types/database.types';
import OrganizationOverview from '../../components/OrganizationOverview';
import OrganizationMembers from '../../components/OrganizationMembers';
import OrganizationPosts from '../../components/OrganizationPosts';
import EditOrganizationModal from '../../components/EditOrganizationModal';
import DeleteOrganizationModal from '../../components/DeleteOrganizationModal';
import SelectAdviser from '../../components/SelectAdviser';

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch organization details and officers
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Fetch organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*, adviser:adviser_id(*)')
          .eq('id', id)
          .single();
        if (orgError) throw orgError;
        setOrganization(orgData);

        // Nothing additional to do here since we're using the SelectAdviser component
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load organization');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleAdviserChange = async (officerId: string | null) => {
    if (!id) return;
    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ adviser_id: officerId })
        .eq('id', id);

      if (updateError) throw updateError;

      // Refresh organization data
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*, adviser:adviser_id(*)')
        .eq('id', id)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update adviser');
    }
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
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{organization.name}</h1>
              <p className="text-sm text-gray-500">{organization.org_code} • {organization.abbrev_name}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="rounded-md bg-white p-2 text-gray-400 hover:text-gray-500"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="rounded-md bg-white p-2 text-red-400 hover:text-red-500"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Adviser Selection */}
        <SelectAdviser
          currentAdviserId={organization.adviser_id}
          onChange={handleAdviserChange}
          className="w-72"
        />
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

      {/* Edit Modal */}
      <EditOrganizationModal
        organization={organization}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={async () => {
          // Refresh organization data after edit
          const { data, error: refreshError } = await supabase
            .from('organizations')
            .select('*, adviser:adviser_id(*)')
            .eq('id', id!)
            .single();
          
          if (refreshError) {
            setError(refreshError.message);
          } else {
            setOrganization(data);
          }
        }}
      />

      {/* Delete Modal */}
      <DeleteOrganizationModal
        organizationId={organization.id}
        organizationName={organization.name}
        organizationCode={organization.org_code}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}