import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Building2, FileText, TrendingUp, Calendar, RefreshCw, BarChart3, Filter } from 'lucide-react';

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
  // User engagement metrics
  totalLikes: number;
  totalRsvps: number;
  totalPollVotes: number;
  totalEvaluations: number;
  totalRegistrations: number;
  engagementRate: number;
  activeUsers: number;
  // New analytics metrics
  rsvpConversionRate: number;
  dailyRetentionRate: number;
  thirtyDayRetentionRate: number;
  eventAttendanceRate: number;
}

interface EngagementStats {
  totalInteractions: number;
  averageInteractionsPerUser: number;
  topEngagedUsers: Array<{
    user_id: string;
    first_name: string;
    last_name: string;
    totalInteractions: number;
  }>;
  interactionBreakdown: {
    views: number;
    likes: number;
    rsvps: number;
    pollVotes: number;
    evaluations: number;
    registrations: number;
  };
}

type TimeRange = '7d' | '30d' | '90d' | 'all' | 'custom';

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
    recentViews: 0,
    // User engagement metrics
    totalLikes: 0,
    totalRsvps: 0,
    totalPollVotes: 0,
    totalEvaluations: 0,
    totalRegistrations: 0,
    engagementRate: 0,
    activeUsers: 0,
    // New analytics metrics
    rsvpConversionRate: 0,
    dailyRetentionRate: 0,
    thirtyDayRetentionRate: 0,
    eventAttendanceRate: 0
  });
  const [engagementStats, setEngagementStats] = useState<EngagementStats>({
    totalInteractions: 0,
    averageInteractionsPerUser: 0,
    topEngagedUsers: [],
    interactionBreakdown: {
      views: 0,
      likes: 0,
      rsvps: 0,
      pollVotes: 0,
      evaluations: 0,
      registrations: 0
    }
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
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchReportStats();
  }, [timeRange, filters]);

  const getDateRange = (range: TimeRange) => {
    if (range === 'all') return null;
    if (range === 'custom') {
      if (!customStartDate || !customEndDate) return null;
      return {
        start: new Date(customStartDate).toISOString(),
        end: new Date(customEndDate).toISOString()
      };
    }
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  };

  const fetchReportStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const dateFilter = getDateRange(timeRange);

      // First, get filtered organization IDs if filters are applied
      let filteredOrgIds: string[] | null = null;
      if (filters.department !== 'all' || filters.orgType !== 'all' || filters.status !== 'all') {
        const orgQuery = supabase.from('organizations').select('id');
        if (filters.department !== 'all') orgQuery.eq('department', filters.department);
        if (filters.orgType !== 'all') orgQuery.eq('org_type', filters.orgType);
        if (filters.status !== 'all') orgQuery.eq('status', filters.status);
        
        const { data: orgData, error: orgError } = await orgQuery;
        if (orgError) throw orgError;
        filteredOrgIds = orgData?.map(org => org.id) || [];
      }

      // Get filtered post IDs for organization filtering
      let filteredPostIds: string[] | null = null;
      if (filteredOrgIds && filteredOrgIds.length > 0) {
        const { data: posts } = await supabase
          .from('posts')
          .select('id')
          .in('org_id', filteredOrgIds);
        filteredPostIds = posts?.map(p => p.id) || [];
      }

      // Get event post IDs for organization filtering
      let eventPostIds: string[] | null = null;
      if (filteredOrgIds && filteredOrgIds.length > 0) {
        const { data: eventPosts } = await supabase
          .from('posts')
          .select('id')
          .eq('post_type', 'event')
          .in('org_id', filteredOrgIds);
        eventPostIds = eventPosts?.map(p => p.id) || [];
      }

      // Fetch all stats in parallel
      const [
        usersResult,
        organizationsResult,
        postsResult,
        activeOrgsResult,
        userTypesResult,
        recentPostsResult,
        totalViewsResult,
        recentViewsResult,
        // Engagement metrics
        engagementResult,
        topUsersResult,
        // New analytics queries
        eventViewsResult,
        yesterdayEngagementResult,
        todayEngagementResult,
        lastMonthEngagementResult,
        recentThirtyDayEngagementResult,
        eventAttendanceResult
      ] = await Promise.all([
        // Total users (filtered by organization membership if filters applied)
        filteredOrgIds
          ? supabase.from('org_members').select('user_id', { count: 'exact', head: true }).in('org_id', filteredOrgIds)
          : supabase.from('users').select('id', { count: 'exact', head: true }),

        // Total organizations (with filters)
        (() => {
          let query = supabase.from('organizations').select('id', { count: 'exact', head: true });
          if (filters.department !== 'all') query = query.eq('department', filters.department);
          if (filters.orgType !== 'all') query = query.eq('org_type', filters.orgType);
          if (filters.status !== 'all') query = query.eq('status', filters.status);
          return query;
        })(),

        // Total posts (filtered by organization if filters applied)
        (() => {
          let query = dateFilter
            ? supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', dateFilter)
            : supabase.from('posts').select('id', { count: 'exact', head: true });
          if (filteredOrgIds) query = query.in('org_id', filteredOrgIds);
          return query;
        })(),

        // Active organizations (with filters)
        (() => {
          let query = supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'active');
          if (filters.department !== 'all') query = query.eq('department', filters.department);
          if (filters.orgType !== 'all') query = query.eq('org_type', filters.orgType);
          return query;
        })(),

        // User types count (filtered by organization membership if filters applied)
        filteredOrgIds
          ? supabase.from('org_members').select('users!inner(user_type)').in('org_id', filteredOrgIds)
          : supabase.from('users').select('user_type'),

        // Recent posts (last 30 days for comparison, filtered by organization)
        (() => {
          let query = supabase.from('posts').select('id', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
          if (filteredOrgIds) query = query.in('org_id', filteredOrgIds);
          return query;
        })(),

        // Total views (filtered by time and organization)
        (() => {
          let query = dateFilter
            ? supabase.from('post_views').select('id', { count: 'exact', head: true }).gte('viewed_at', dateFilter)
            : supabase.from('post_views').select('id', { count: 'exact', head: true });
          if (filteredPostIds && filteredPostIds.length > 0) {
            query = query.in('post_id', filteredPostIds);
          }
          return query;
        })(),        // Recent views (last 30 days, filtered by organization)
        (() => {
          let query = supabase.from('post_views').select('id', { count: 'exact', head: true })
            .gte('viewed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
          if (filteredPostIds && filteredPostIds.length > 0) {
            query = query.in('post_id', filteredPostIds);
          }
          return query;
        })(),

        // Engagement data from reward_log (filtered by organization)
        (() => {
          let query = dateFilter
            ? supabase.from('reward_log').select('action, user_id').gte('created_at', dateFilter)
            : supabase.from('reward_log').select('action, user_id');
          if (filteredOrgIds) {
            query = query.in('org_id', filteredOrgIds);
          }
          return query;
        })(),

        // Top engaged users (filtered by organization)
        (() => {
          let baseQuery = supabase
            .from('reward_log')
            .select(`
              user_id,
              users!inner (
                first_name,
                last_name
              )
            `);
          if (dateFilter) baseQuery = baseQuery.gte('created_at', dateFilter);
          if (filteredOrgIds) baseQuery = baseQuery.in('org_id', filteredOrgIds);
          return baseQuery;
        })(),

        // Views on event posts (for RSVP conversion rate, filtered by organization)
        (() => {
          let query = dateFilter
            ? supabase.from('post_views').select('id', { count: 'exact', head: true }).gte('viewed_at', dateFilter)
            : supabase.from('post_views').select('id', { count: 'exact', head: true });

          if (eventPostIds && eventPostIds.length > 0) {
            query = query.in('post_id', eventPostIds);
          }

          return query;
        })(),

        // Yesterday's engagement (24-48 hours ago, for daily retention)
        (() => {
          let query = supabase.from('reward_log').select('user_id')
            .gte('created_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
            .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
          if (filteredOrgIds) query = query.in('org_id', filteredOrgIds);
          return query;
        })(),

        // Today's engagement (last 24 hours, for daily retention)
        (() => {
          let query = supabase.from('reward_log').select('user_id')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
          if (filteredOrgIds) query = query.in('org_id', filteredOrgIds);
          return query;
        })(),

        // 30-60 days ago engagement (for 30-day retention)
        (() => {
          let query = supabase.from('reward_log').select('user_id')
            .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
            .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
          if (filteredOrgIds) query = query.in('org_id', filteredOrgIds);
          return query;
        })(),

        // Last 30 days engagement (for 30-day retention)
        (() => {
          let query = supabase.from('reward_log').select('user_id')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
          if (filteredOrgIds) query = query.in('org_id', filteredOrgIds);
          return query;
        })(),

        // Event attendance data (for attendance rate)
        supabase.from('event_attendance').select('user_id, post_id').eq('attended', true)
      ]);

      // Process user types
      const userTypes = userTypesResult.data || [];
      const studentCount = filteredOrgIds
        ? userTypes.filter((u: any) => u.users?.user_type === 'student').length
        : userTypes.filter((u: any) => u.user_type === 'student').length;
      const facultyCount = filteredOrgIds
        ? userTypes.filter((u: any) => u.users?.user_type === 'faculty').length
        : userTypes.filter((u: any) => u.user_type === 'faculty').length;

      // Calculate total views
      const totalViews = totalViewsResult.count || 0;
      const recentViews = recentViewsResult.count || 0;

      // Process engagement data
      const engagementData = engagementResult.data || [];
      const totalLikes = engagementData.filter(e => e.action === 'like').length;
      const totalRsvps = engagementData.filter(e => e.action === 'rsvp').length;
      const totalPollVotes = engagementData.filter(e => e.action === 'poll').length;
      const totalEvaluations = engagementData.filter(e => e.action === 'evaluate').length;
      const totalRegistrations = engagementData.filter(e => e.action === 'register').length;
      const totalEngagementViews = engagementData.filter(e => e.action === 'view').length;

      // Calculate engagement metrics
      const totalInteractions = totalViews + totalLikes + totalRsvps + totalPollVotes + totalEvaluations + totalRegistrations;
      const activeUsers = new Set(engagementData.map(e => e.user_id)).size;
      const engagementRate = stats.totalUsers > 0 ? (activeUsers / stats.totalUsers) * 100 : 0;

      // Calculate new analytics metrics
      const eventViews = eventViewsResult.count || 0;
      const rsvpConversionRate = eventViews > 0 ? (totalRsvps / eventViews) * 100 : 0;

      // Calculate retention rates
      const yesterdayUsers = new Set(yesterdayEngagementResult.data?.map((e: any) => e.user_id) || []);
      const todayUsers = new Set(todayEngagementResult.data?.map((e: any) => e.user_id) || []);
      const lastMonthUsers = new Set(lastMonthEngagementResult.data?.map((e: any) => e.user_id) || []);
      const recentThirtyDayUsers = new Set(recentThirtyDayEngagementResult.data?.map((e: any) => e.user_id) || []);

      // Daily retention: Users active yesterday who returned today
      const retainedDailyUsers = new Set([...yesterdayUsers].filter(userId => todayUsers.has(userId)));
      const dailyRetentionRate = yesterdayUsers.size > 0 ? (retainedDailyUsers.size / yesterdayUsers.size) * 100 : 0;

      // 30-day retention: Users active 30-60 days ago who returned in last 30 days
      const retainedThirtyDayUsers = new Set([...lastMonthUsers].filter(userId => recentThirtyDayUsers.has(userId)));
      const thirtyDayRetentionRate = lastMonthUsers.size > 0 ? (retainedThirtyDayUsers.size / lastMonthUsers.size) * 100 : 0;

      // Calculate event attendance rate
      const totalAttended = eventAttendanceResult.data?.length || 0;
      const eventAttendanceRate = totalRsvps > 0 ? (totalAttended / totalRsvps) * 100 : 0;

      // Process top engaged users
      const userInteractionMap = new Map<string, { count: number; user: any }>();
      topUsersResult.data?.forEach((record: any) => {
        const userId = record.user_id;
        const current = userInteractionMap.get(userId) || { count: 0, user: record.users };
        userInteractionMap.set(userId, { count: current.count + 1, user: record.users });
      });

      const topEngagedUsers = Array.from(userInteractionMap.entries())
        .map(([userId, data]) => ({
          user_id: userId,
          first_name: data.user?.first_name || '',
          last_name: data.user?.last_name || '',
          totalInteractions: data.count
        }))
        .sort((a, b) => b.totalInteractions - a.totalInteractions)
        .slice(0, 10);

      setStats({
        totalUsers: usersResult.count || 0,
        totalOrganizations: organizationsResult.count || 0,
        totalPosts: postsResult.count || 0,
        activeOrganizations: activeOrgsResult.count || 0,
        studentCount,
        facultyCount,
        recentPosts: recentPostsResult.count || 0,
        totalViews,
        recentViews,
        totalLikes,
        totalRsvps,
        totalPollVotes,
        totalEvaluations,
        totalRegistrations,
        engagementRate,
        activeUsers,
        rsvpConversionRate: rsvpConversionRate,
        dailyRetentionRate: dailyRetentionRate,
        thirtyDayRetentionRate: thirtyDayRetentionRate,
        eventAttendanceRate: eventAttendanceRate
      });

      setEngagementStats({
        totalInteractions,
        averageInteractionsPerUser: activeUsers > 0 ? totalInteractions / activeUsers : 0,
        topEngagedUsers,
        interactionBreakdown: {
          views: totalViews,
          likes: totalLikes,
          rsvps: totalRsvps,
          pollVotes: totalPollVotes,
          evaluations: totalEvaluations,
          registrations: totalRegistrations
        }
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

  const StatCard = ({ title, value, icon: Icon, color, gradient }: {
    title: string;
    value: number | string;
    icon: any;
    color: string;
    gradient?: string;
  }) => (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${gradient || ''}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-xs font-medium text-gray-600 truncate">{title}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-6 sm:mb-0">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-green-600 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                  <p className="text-sm text-gray-600">Platform performance and user engagement insights</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
                <option value="custom">Custom range</option>
              </select>
              
              {timeRange === 'custom' && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Start date"
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="End date"
                  />
                </div>
              )}
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 inline ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Organization Filters */}
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Filter className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">Filters</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 focus:border-green-500"
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.orgType}
                  onChange={(e) => setFilters({ ...filters, orgType: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Types</option>
                  <option value="PROF">Professional</option>
                  <option value="SPIN">Special Interest</option>
                  <option value="SCRO">Socio-Civic</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ department: 'all', orgType: 'all', status: 'all' })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="bg-green-600"
        />
        <StatCard
          title="Organizations"
          value={`${stats.activeOrganizations}/${stats.totalOrganizations}`}
          icon={Building2}
          color="bg-green-600"
        />
        <StatCard
          title="Total Posts"
          value={stats.totalPosts}
          icon={FileText}
          color="bg-green-600"
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews.toLocaleString()}
          icon={TrendingUp}
          color="bg-green-600"
        />
        <StatCard
          title="Recent Activity"
          value={`${stats.recentPosts} posts • ${stats.recentViews.toLocaleString()} views`}
          icon={Calendar}
          color="bg-green-600"
        />
      </div>

      {/* Engagement Stats Grid */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">User Engagement</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Users"
            value={`${stats.activeUsers} (${stats.engagementRate.toFixed(1)}%)`}
            icon={Users}
            color="bg-green-600"
          />
          <StatCard
            title="Total Interactions"
            value={engagementStats.totalInteractions.toLocaleString()}
            icon={TrendingUp}
            color="bg-green-600"
          />
          <StatCard
            title="Avg per Active User"
            value={engagementStats.averageInteractionsPerUser.toFixed(1)}
            icon={FileText}
            color="bg-green-600"
          />
          <StatCard
            title="Top Engaged Users"
            value={engagementStats.topEngagedUsers.length}
            icon={Users}
            color="bg-green-600"
          />
          <StatCard
            title="RSVP Conversion Rate"
            value={`${stats.rsvpConversionRate.toFixed(1)}%`}
            icon={Calendar}
            color="bg-green-600"
          />
          <StatCard
            title="Daily Retention Rate"
            value={`${stats.dailyRetentionRate.toFixed(1)}%`}
            icon={TrendingUp}
            color="bg-green-600"
          />
          <StatCard
            title="30-Day Retention Rate"
            value={`${stats.thirtyDayRetentionRate.toFixed(1)}%`}
            icon={TrendingUp}
            color="bg-green-600"
          />
          <StatCard
            title="Event Attendance Rate"
            value={`${stats.eventAttendanceRate.toFixed(1)}%`}
            icon={Calendar}
            color="bg-green-600"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Distribution Chart */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-green-600">
            <h3 className="text-sm font-semibold text-white flex items-center">
              <Users className="h-4 w-4 mr-2" />
              User Distribution
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Students</span>
                  <span className="font-medium">{stats.studentCount} ({stats.totalUsers > 0 ? Math.round((stats.studentCount / stats.totalUsers) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full"
                    style={{ width: `${stats.totalUsers > 0 ? (stats.studentCount / stats.totalUsers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Faculty</span>
                  <span className="font-medium">{stats.facultyCount} ({stats.totalUsers > 0 ? Math.round((stats.facultyCount / stats.totalUsers) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full"
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

      {/* Engagement Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Interaction Breakdown Chart */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-green-600">
            <h3 className="text-sm font-semibold text-white flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Interaction Breakdown
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Views</span>
                  <span className="font-medium">{engagementStats.interactionBreakdown.views.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${engagementStats.totalInteractions > 0 ? (engagementStats.interactionBreakdown.views / engagementStats.totalInteractions) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Likes</span>
                  <span className="font-medium">{engagementStats.interactionBreakdown.likes.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${engagementStats.totalInteractions > 0 ? (engagementStats.interactionBreakdown.likes / engagementStats.totalInteractions) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>RSVPs</span>
                  <span className="font-medium">{engagementStats.interactionBreakdown.rsvps.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${engagementStats.totalInteractions > 0 ? (engagementStats.interactionBreakdown.rsvps / engagementStats.totalInteractions) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Poll Votes</span>
                  <span className="font-medium">{engagementStats.interactionBreakdown.pollVotes.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${engagementStats.totalInteractions > 0 ? (engagementStats.interactionBreakdown.pollVotes / engagementStats.totalInteractions) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Evaluations</span>
                  <span className="font-medium">{engagementStats.interactionBreakdown.evaluations.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${engagementStats.totalInteractions > 0 ? (engagementStats.interactionBreakdown.evaluations / engagementStats.totalInteractions) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Registrations</span>
                  <span className="font-medium">{engagementStats.interactionBreakdown.registrations.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${engagementStats.totalInteractions > 0 ? (engagementStats.interactionBreakdown.registrations / engagementStats.totalInteractions) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Engaged Users */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-green-600">
            <h3 className="text-sm font-semibold text-white flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Top Engaged Users
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {engagementStats.topEngagedUsers.length > 0 ? (
                engagementStats.topEngagedUsers.map((user, index) => (
                  <div key={user.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-green-800">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{user.totalInteractions.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">interactions</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <p className="text-sm">No engagement data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
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
    </div>
  );
}