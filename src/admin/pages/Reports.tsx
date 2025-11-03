import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Building2, FileText, TrendingUp, Calendar, RefreshCw } from 'lucide-react';

interface ReportStats {
  totalUsers: number;
  totalOrganizations: number;
  totalPosts: number;
  activeOrganizations: number;
  studentCount: number;
  facultyCount: number;
  recentPosts: number;
  totalViews: number;
  recentViews: number;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

interface OrganizationFilters {
  department: string;
  orgType: string;
  status: string;
}

export default function Reports() {
  const [stats, setStats] = useState<ReportStats>({
    totalUsers: 0,
    totalOrganizations: 0,
    totalPosts: 0,
    activeOrganizations: 0,
    studentCount: 0,
    facultyCount: 0,
    recentPosts: 0,
    totalViews: 0,
    recentViews: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<OrganizationFilters>({
    department: 'all',
    orgType: 'all',
    status: 'all'
  });

  useEffect(() => {
    fetchReportStats();
  }, [timeRange, filters]);

  const getDateRange = (range: TimeRange) => {
    if (range === 'all') return null;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  };

  const fetchReportStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const dateFilter = getDateRange(timeRange);

      // Fetch all stats in parallel
      const [
        usersResult,
        organizationsResult,
        postsResult,
        activeOrgsResult,
        userTypesResult,
        recentPostsResult,
        totalViewsResult,
        recentViewsResult
      ] = await Promise.all([
        // Total users
        supabase.from('users').select('id', { count: 'exact', head: true }),

        // Total organizations (with filters)
        (() => {
          let query = supabase.from('organizations').select('id', { count: 'exact', head: true });
          if (filters.department !== 'all') query = query.eq('department', filters.department);
          if (filters.orgType !== 'all') query = query.eq('org_type', filters.orgType);
          if (filters.status !== 'all') query = query.eq('status', filters.status);
          return query;
        })(),

        // Total posts
        dateFilter
          ? supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', dateFilter)
          : supabase.from('posts').select('id', { count: 'exact', head: true }),

        // Active organizations (with filters)
        (() => {
          let query = supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'active');
          if (filters.department !== 'all') query = query.eq('department', filters.department);
          if (filters.orgType !== 'all') query = query.eq('org_type', filters.orgType);
          return query;
        })(),

        // User types count
        supabase.from('users').select('user_type'),

        // Recent posts (last 30 days for comparison)
        supabase.from('posts').select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

        // Total views
        dateFilter
          ? supabase.from('posts').select('post_views(user_id)').gte('created_at', dateFilter)
          : supabase.from('posts').select('post_views(user_id)'),

        // Recent views (last 30 days)
        supabase.from('posts').select('post_views(user_id)')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      // Process user types
      const userTypes = userTypesResult.data || [];
      const studentCount = userTypes.filter(u => u.user_type === 'student').length;
      const facultyCount = userTypes.filter(u => u.user_type === 'faculty').length;

      // Calculate total views
      const totalViews = totalViewsResult.data?.reduce((sum, post) => sum + (post.post_views?.length ?? 0), 0) || 0;
      const recentViews = recentViewsResult.data?.reduce((sum, post) => sum + (post.post_views?.length ?? 0), 0) || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalOrganizations: organizationsResult.count || 0,
        totalPosts: postsResult.count || 0,
        activeOrganizations: activeOrgsResult.count || 0,
        studentCount,
        facultyCount,
        recentPosts: recentPostsResult.count || 0,
        totalViews,
        recentViews
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReportStats();
  };

  // const exportToCSV = () => {
  //   const csvData = [
  //     ['Metric', 'Value'],
  //     ['Total Users', stats.totalUsers],
  //     ['Total Organizations', `${stats.activeOrganizations}/${stats.totalOrganizations}`],
  //     ['Total Posts', stats.totalPosts],
  //     ['Total Views', stats.totalViews],
  //     ['Recent Posts (30d)', stats.recentPosts],
  //     ['Recent Views (30d)', stats.recentViews],
  //     ['Students', stats.studentCount],
  //     ['Faculty', stats.facultyCount],
  //     ['Time Range', timeRange],
  //     ['Department Filter', filters.department],
  //     ['Organization Type Filter', filters.orgType],
  //     ['Status Filter', filters.status]
  //   ];

  //   const csvContent = csvData.map(row => row.join(',')).join('\n');
  //   const blob = new Blob([csvContent], { type: 'text/csv' });
  //   const url = window.URL.createObjectURL(blob);
  //   const a = document.createElement('a');
  //   a.href = url;
  //   a.download = `reports-${new Date().toISOString().split('T')[0]}.csv`;
  //   a.click();
  //   window.URL.revokeObjectURL(url);
  // };

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
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
            <p className="mt-2 text-sm text-gray-700">
              Overview of system statistics and key metrics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {/* <button
              onClick={exportToCSV}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button> */}
          </div>
        </div>

        {/* Organization Filters */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              id="department-filter"
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Departments</option>
              <option value="CITE">CITE</option>
              <option value="CBEAM">CBEAM</option>
              <option value="COL">COL</option>
              <option value="CON">CON</option>
              <option value="CEAS">CEAS</option>
              <option value="OTHERS">Others</option>
            </select>
          </div>

          <div>
            <label htmlFor="org-type-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Organization Type
            </label>
            <select
              id="org-type-filter"
              value={filters.orgType}
              onChange={(e) => setFilters({ ...filters, orgType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Types</option>
              <option value="PROF">Professional</option>
              <option value="SPIN">Special Interest</option>
              <option value="SCRO">Socio-Civic</option>
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ department: 'all', orgType: 'all', status: 'all' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
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
          title="Total Views"
          value={stats.totalViews.toLocaleString()}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Recent Activity"
          value={`${stats.recentPosts} posts • ${stats.recentViews.toLocaleString()} views`}
          icon={Calendar}
          color="lime"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* User Distribution Chart */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">User Distribution</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Students</span>
                  <span>{stats.studentCount} ({stats.totalUsers > 0 ? Math.round((stats.studentCount / stats.totalUsers) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${stats.totalUsers > 0 ? (stats.studentCount / stats.totalUsers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Faculty</span>
                  <span>{stats.facultyCount} ({stats.totalUsers > 0 ? Math.round((stats.facultyCount / stats.totalUsers) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${stats.totalUsers > 0 ? (stats.facultyCount / stats.totalUsers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Overview */}
        {/* <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Activity Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Total Posts</span>
                </div>
                <span className="text-lg font-semibold text-blue-600">{stats.totalPosts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Recent Activity</span>
                </div>
                <span className="text-lg font-semibold text-green-600">{stats.recentPosts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <Building2 className="h-5 w-5 text-purple-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Active Organizations</span>
                </div>
                <span className="text-lg font-semibold text-purple-600">{stats.activeOrganizations}</span>
              </div>
            </div>
          </div>
        </div> */}
      </div>

      {/* User Type Breakdown 
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
      </div>*/}

      {/* Quick Actions */}
      {/* <div className="bg-white shadow rounded-lg">
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
      </div> */}

      {/* Placeholder for future features */}
      {/* <div className="mt-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Advanced Analytics Coming Soon</h3>
        <p className="mt-1 text-sm text-gray-500">
          Future features may include detailed charts, user engagement metrics, organization performance analytics, and more.
        </p>
      </div> */}
    </div>
  );
}