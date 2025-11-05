import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Building,
  Users,
  FileText,
  UserCheck,
  AlertCircle,
  Plus
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useUserRoles } from '../../../utils/roles';

interface DashboardStats {
  totalOrganizations: number;
  totalMembers: number;
  totalPosts: number;
  totalOfficers: number;
  recentOrganizations: number;
  recentMembers: number;
  pendingReports: number;
  // Officer-specific stats (single organization)
  managedOrganization?: string; // org name
  managedOrgId?: string;
  managedMembers?: number;
  managedPosts?: number;
}

export default function AdminDashboardHome() {
  const { user } = useAuth();
  const { roles, loading: rolesLoading, isAdmin, isOfficer, isAdviser } = useUserRoles(user?.id);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    totalMembers: 0,
    totalPosts: 0,
    totalOfficers: 0,
    recentOrganizations: 0,
    recentMembers: 0,
    pendingReports: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rolesLoading && (isAdmin() || isOfficer() || isAdviser())) {
      fetchDashboardStats();
    }
  }, [rolesLoading, roles]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      const isUserAdmin = isAdmin();
      const isUserOfficer = isOfficer() || isAdviser();

      if (isUserAdmin) {
        // Admin stats - global platform stats
        // Get total organizations
        const { count: orgCount, error: orgError } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true });

        if (orgError) throw orgError;

        // Get total members
        const { count: memberCount, error: memberError } = await supabase
          .from('org_members')
          .select('*', { count: 'exact', head: true });

        if (memberError) throw memberError;

        // Get total posts
        const { count: postCount, error: postError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true });

        if (postError) throw postError;

        // Get total officers
        const { count: officerCount, error: officerError } = await supabase
          .from('org_managers')
          .select('*', { count: 'exact', head: true })
          .eq('manager_role', 'officer');

        if (officerError) throw officerError;

        // Get recent organizations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: recentOrgCount, error: recentOrgError } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (recentOrgError) throw recentOrgError;

        // Get recent members (last 30 days)
        const { count: recentMemberCount, error: recentMemberError } = await supabase
          .from('org_members')
          .select('*', { count: 'exact', head: true })
          .gte('joined_at', thirtyDaysAgo.toISOString());

        if (recentMemberError) throw recentMemberError;

        // Get pending reports (assuming reports table exists)
        const { count: reportCount, error: reportError } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        if (reportError && reportError.code !== 'PGRST116') { // Table might not exist
          console.warn('Reports table not found:', reportError);
        }

        setStats({
          totalOrganizations: orgCount || 0,
          totalMembers: memberCount || 0,
          totalPosts: postCount || 0,
          totalOfficers: officerCount || 0,
          recentOrganizations: recentOrgCount || 0,
          recentMembers: recentMemberCount || 0,
          pendingReports: reportCount || 0
        });
      } else if (isUserOfficer) {
        // Officer stats - organizations they manage
        // Get organizations managed by this officer
        const { data: managedOrgs, error: managedOrgsError } = await supabase
          .from('org_managers')
          .select('org_id')
          .eq('user_id', user?.id);

        if (managedOrgsError) throw managedOrgsError;

        const orgIds = managedOrgs?.map(m => m.org_id) || [];

        if (orgIds.length === 0) {
          setStats({
            totalOrganizations: 0,
            totalMembers: 0,
            totalPosts: 0,
            totalOfficers: 0,
            recentOrganizations: 0,
            recentMembers: 0,
            pendingReports: 0,
            managedOrganization: undefined,
            managedOrgId: undefined,
            managedMembers: 0,
            managedPosts: 0
          });
          return;
        }

        // Officers manage only one organization, so take the first one
        const primaryOrgId = orgIds[0];

        // Get organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, abbrev_name')
          .eq('id', primaryOrgId)
          .single();

        if (orgError) throw orgError;
        console.log('orgData:', orgData);
        // Get member count for the managed organization
        const { count: memberCount, error: memberError } = await supabase
          .from('org_members')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', primaryOrgId);

        if (memberError) throw memberError;

        // Get post count for the managed organization
        const { count: postCount, error: postError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', primaryOrgId);

        if (postError) throw postError;

        // Get recent members (last 30 days) in the managed organization
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: recentMemberCount, error: recentMemberError } = await supabase
          .from('org_members')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', primaryOrgId)
          .gte('joined_at', thirtyDaysAgo.toISOString());

        if (recentMemberError) throw recentMemberError;

        setStats({
          totalOrganizations: 0, // Not used for officers
          totalMembers: 0,
          totalPosts: 0,
          totalOfficers: 0,
          recentOrganizations: 0,
          recentMembers: recentMemberCount || 0,
          pendingReports: 0,
          managedOrganization: orgData?.abbrev_name || 'Unknown Organization',
          managedOrgId: primaryOrgId,
          managedMembers: memberCount || 0,
          managedPosts: postCount || 0
        });
      }

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Dashboard</h3>
          <p className="text-gray-600">Fetching your admin data...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin() && !isOfficer() && !isAdviser()) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Statistics</h3>
          <p className="text-gray-600">Calculating dashboard metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={fetchDashboardStats}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome to {isAdmin() ? 'OrgSync Admin' : 'Officer Dashboard'}
        </h1>
        <p className="text-blue-100">
          {isAdmin()
            ? 'Manage organizations, oversee members, and monitor platform activity from your central dashboard.'
            : 'Manage your organizations, oversee members, and monitor activity within your assigned organizations.'
          }
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin() ? (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Organizations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrganizations}</p>
                  {stats.recentOrganizations > 0 && (
                    <p className="text-sm text-green-600">
                      +{stats.recentOrganizations} this month
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
                  {stats.recentMembers > 0 && (
                    <p className="text-sm text-green-600">
                      +{stats.recentMembers} this month
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Organization Officers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOfficers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Your Organization</p>
                  <p className="text-lg font-bold text-gray-900 truncate" title={stats.managedOrganization}>
                    {stats.managedOrganization || 'No Organization'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.managedMembers || 0}</p>
                  {stats.recentMembers > 0 && (
                    <p className="text-sm text-green-600">
                      +{stats.recentMembers} this month
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Organization Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.managedPosts || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Your Role</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{roles?.role || 'Officer'}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isAdmin() ? (
            <>
              <Link
                to="/admin/dashboard/organizations/new"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Create Organization</h3>
                  <p className="text-sm text-gray-600">Add a new organization to the platform</p>
                </div>
              </Link>

              <Link
                to="/admin/dashboard/organizations"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Building className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Organizations</h3>
                  <p className="text-sm text-gray-600">View and edit existing organizations</p>
                </div>
              </Link>

              <Link
                to="/admin/dashboard/members"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">View Members</h3>
                  <p className="text-sm text-gray-600">Browse and manage platform members</p>
                </div>
              </Link>

              <Link
                to="/admin/dashboard/posts"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-orange-100 rounded-lg mr-3">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Posts</h3>
                  <p className="text-sm text-gray-600">Review and moderate posts</p>
                </div>
              </Link>

              <Link
                to="/admin/dashboard/reports"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-red-100 rounded-lg mr-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">View Reports</h3>
                  <p className="text-sm text-gray-600">Check pending reports and issues</p>
                </div>
              </Link>

              <Link
                to="/admin/dashboard/officers"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                  <UserCheck className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Officers</h3>
                  <p className="text-sm text-gray-600">Assign and oversee organization officers</p>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link
                to={stats.managedOrgId ? `/admin/dashboard/organizations/${stats.managedOrgId}` : "/admin/dashboard/organizations"}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Building className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Your Organization</h3>
                  <p className="text-sm text-gray-600">View and manage your organization details</p>
                </div>
              </Link>

              <Link
                to="/admin/dashboard/members"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Members</h3>
                  <p className="text-sm text-gray-600">View members in your organizations</p>
                </div>
              </Link>

              <Link
                to="/admin/dashboard/posts"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-orange-100 rounded-lg mr-3">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Organization Posts</h3>
                  <p className="text-sm text-gray-600">Review posts in your organizations</p>
                </div>
              </Link>

              <Link
                to="/admin/dashboard/officers"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                  <UserCheck className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Officers</h3>
                  <p className="text-sm text-gray-600">Assign officers to your organizations</p>
                </div>
              </Link>

              <Link
                to="/admin/dashboard/contests"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <AlertCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Contests</h3>
                  <p className="text-sm text-gray-600">Create and manage organization contests</p>
                </div>
              </Link>

              <Link
                to="/admin/dashboard/submissions"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-red-100 rounded-lg mr-3">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Review Submissions</h3>
                  <p className="text-sm text-gray-600">Check contest submissions and evaluations</p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isAdmin() ? 'Platform Overview' : 'Organization Overview'}
          </h2>
          <div className="space-y-4">
            {isAdmin() ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Organizations Created (30 days)</span>
                  <span className="font-semibold text-green-600">+{stats.recentOrganizations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">New Members (30 days)</span>
                  <span className="font-semibold text-green-600">+{stats.recentMembers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pending Reports</span>
                  <span className={`font-semibold ${stats.pendingReports > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.pendingReports}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Your Organization</span>
                  <span className="font-semibold text-blue-600">{stats.managedOrganization || 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">New Members (30 days)</span>
                  <span className="font-semibold text-green-600">+{stats.recentMembers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Posts in Organizations</span>
                  <span className="font-semibold text-orange-600">{stats.managedPosts || 0}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
          <div className="space-y-3">
            {isAdmin() ? (
              <>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">1</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Create Organizations</h3>
                    <p className="text-sm text-gray-600">Set up new organizations for students and faculty</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">2</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Assign Officers</h3>
                    <p className="text-sm text-gray-600">Appoint organization leaders and moderators</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">3</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Monitor Activity</h3>
                    <p className="text-sm text-gray-600">Keep track of posts, events, and member engagement</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-green-600">1</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Review Your Organizations</h3>
                    <p className="text-sm text-gray-600">Check the organizations you manage and their details</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-green-600">2</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Manage Members</h3>
                    <p className="text-sm text-gray-600">View and oversee members in your organizations</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-green-600">3</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Monitor Content</h3>
                    <p className="text-sm text-gray-600">Review posts and moderate content in your organizations</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}