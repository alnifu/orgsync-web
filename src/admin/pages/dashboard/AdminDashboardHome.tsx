import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Building,
  Users,
  FileText,
  UserCheck,
  AlertCircle,
  Plus,
  User,
  LayoutDashboard,
  BarChart3,
  Brain,
  Image
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
  managedOrgPic?: string; // org logo
}

export default function AdminDashboard() {
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
          .select('id, abbrev_name, org_pic')
          .eq('id', primaryOrgId)
          .single();

        if (orgError) throw orgError;

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
          managedPosts: postCount || 0,
          managedOrgPic: orgData?.org_pic || undefined
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
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
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Define shortcuts based on user role
  const getShortcuts = () => {
    const baseShortcuts = [
      { to: `profile/${user?.id}`, label: "My Profile", icon: User, description: "View and edit your profile" }
    ];

    // Only admins see additional admin shortcuts
    if (isAdmin()) {
      return [
        ...baseShortcuts, // My Profile
        { to: "organizations", label: "Organizations", icon: Building, description: "Manage all organizations" },
        { to: "officers", label: "Officers", icon: Users, description: "Assign and oversee officers" },
        { to: "members", label: "Members", icon: User, description: "Browse and manage members" },
        { to: "posts", label: "Posts", icon: FileText, description: "Review and moderate posts" },
        { to: "reports", label: "Reports", icon: BarChart3, description: "Check pending reports" }
      ];
    }

    // Officers and advisers see contest management shortcuts + officer tools
    if (isOfficer() || isAdviser()) {
      const shortcuts = [
        ...baseShortcuts.slice(0, 1), // My Profile
      ];

      // Add organization shortcut if they have assigned organizations
      if (stats.managedOrgId) {
        shortcuts.push(
          { to: `organizations/${stats.managedOrgId}`, label: "My Organization", icon: Building, description: "View and manage your organization" },
          { to: `organizations/${stats.managedOrgId}/ml-dashboard`, label: "ML Analytics", icon: Brain, description: "View ML insights for your org" }
        );
      }

      // Officer Tools landing page
      shortcuts.push({
        to: "/admin/dashboard/officer-tools",
        label: "Game Creators",
        icon: LayoutDashboard,
        description: "Access game creation tools"
      });

      shortcuts.push(
        { to: "/user/dashboard", label: "Member Portal", icon: LayoutDashboard, description: "Access member features and content" },
        { to: "submissions", label: "Submissions", icon: Image, description: "Review contest submissions" }
      );

      return shortcuts;
    }

    // Regular users only see basic shortcuts
    return baseShortcuts;
  };

  const shortcuts = getShortcuts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with branding */}
      <div className="bg-green-600 text-white p-6 mb-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isAdmin() ? (
                <img src="/DLSL.png" alt={stats.managedOrganization} className="h-20 auto rounded-lg mr-4" />
            ) : (
              stats.managedOrgPic ? (
                <img src={stats.managedOrgPic} alt={stats.managedOrganization} className="h-16 w-16 rounded-lg mr-4" />
              ) : (
                <div className="h-16 w-16 bg-white rounded-lg flex items-center justify-center mr-4">
                  <Building className="h-8 w-8 text-green-600" />
                </div>
              )
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {isAdmin() ? 'Admin Dashboard' : `${stats.managedOrganization || 'Organization'} Dashboard`}
              </h1>
              <p className="text-green-100">
                {isAdmin() ? 'Platform Administration' : `${roles?.role === 'adviser' ? 'Adviser' : 'Officer'} Tools`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin() ? (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building className="h-6 w-6 text-green-600" />
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
          {shortcuts.map(({ to, label, icon: Icon, description }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Icon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{label}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            </Link>
          ))}
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
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-green-600">1</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Create Organizations</h3>
                    <p className="text-sm text-gray-600">Set up new organizations for students and faculty</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-green-600">2</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Assign Officers</h3>
                    <p className="text-sm text-gray-600">Appoint organization leaders and moderators</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-green-600">3</span>
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