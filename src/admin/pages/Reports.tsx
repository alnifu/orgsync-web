import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart3, Users, Building2, FileText, TrendingUp, Calendar } from 'lucide-react';
import AccessControl from '../components/AccessControl';

interface ReportStats {
  totalUsers: number;
  totalOrganizations: number;
  totalPosts: number;
  activeOrganizations: number;
  studentCount: number;
  facultyCount: number;
  recentPosts: number;
}

export default function Reports() {
  const [stats, setStats] = useState<ReportStats>({
    totalUsers: 0,
    totalOrganizations: 0,
    totalPosts: 0,
    activeOrganizations: 0,
    studentCount: 0,
    facultyCount: 0,
    recentPosts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportStats();
  }, []);

  const fetchReportStats = async () => {
    try {
      setLoading(true);

      // Fetch all stats in parallel
      const [
        usersResult,
        organizationsResult,
        postsResult,
        activeOrgsResult,
        userTypesResult,
        recentPostsResult
      ] = await Promise.all([
        // Total users
        supabase.from('users').select('id', { count: 'exact', head: true }),

        // Total organizations
        supabase.from('organizations').select('id', { count: 'exact', head: true }),

        // Total posts
        supabase.from('posts').select('id', { count: 'exact', head: true }),

        // Active organizations
        supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'active'),

        // User types count
        supabase.from('users').select('user_type'),

        // Recent posts (last 30 days)
        supabase.from('posts').select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      // Process user types
      const userTypes = userTypesResult.data || [];
      const studentCount = userTypes.filter(u => u.user_type === 'student').length;
      const facultyCount = userTypes.filter(u => u.user_type === 'faculty').length;

      setStats({
        totalUsers: usersResult.count || 0,
        totalOrganizations: organizationsResult.count || 0,
        totalPosts: postsResult.count || 0,
        activeOrganizations: activeOrgsResult.count || 0,
        studentCount,
        facultyCount,
        recentPosts: recentPostsResult.count || 0
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: {
    title: string;
    value: number | string;
    icon: any;
    color: string;
  }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <AccessControl requiredPermission="isOfficer">
      <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
        <p className="mt-2 text-sm text-gray-700">
          Overview of system statistics and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Organizations"
          value={`${stats.activeOrganizations}/${stats.totalOrganizations}`}
          icon={Building2}
          color="emerald"
        />
        <StatCard
          title="Total Posts"
          value={stats.totalPosts}
          icon={FileText}
          color="teal"
        />
        <StatCard
          title="Recent Posts"
          value={`${stats.recentPosts} (30d)`}
          icon={TrendingUp}
          color="lime"
        />
      </div>

      {/* User Type Breakdown */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">User Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Students</p>
                  <p className="text-2xl font-bold text-green-900">{stats.studentCount}</p>
                  <p className="text-sm text-green-600">
                    {stats.totalUsers > 0 ? Math.round((stats.studentCount / stats.totalUsers) * 100) : 0}% of total users
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-emerald-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-emerald-600">Faculty</p>
                  <p className="text-2xl font-bold text-emerald-900">{stats.facultyCount}</p>
                  <p className="text-sm text-emerald-600">
                    {stats.totalUsers > 0 ? Math.round((stats.facultyCount / stats.totalUsers) * 100) : 0}% of total users
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions 
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <BarChart3 className="h-5 w-5 mr-2" />
              Export Report
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Calendar className="h-5 w-5 mr-2" />
              View Trends
            </button>
            <button
              onClick={fetchReportStats}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

       Placeholder for future features 
      <div className="mt-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />   
        <h3 className="mt-2 text-sm font-medium text-gray-900">Advanced Analytics Coming Soon</h3>
        <p className="mt-1 text-sm text-gray-500">
          Future features may include detailed charts, user engagement metrics, organization performance analytics, and more.
        </p>
      </div>*/}
    </div>
    </AccessControl>
  );
}