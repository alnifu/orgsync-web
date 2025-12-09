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
  }, [timeRange, filters, customStartDate, customEndDate]);

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
    return {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    };
  };

  const applyDateFilter = (query: any, dateFilter: any, dateColumn: string) => {
    if (!dateFilter) return query;
    if (typeof dateFilter === 'string') {
      return query.gte(dateColumn, dateFilter);
    }
    if (dateFilter.start && dateFilter.end) {
      return query.gte(dateColumn, dateFilter.start).lte(dateColumn, dateFilter.end);
    }
    return query;
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
          ? supabase.from('org_members').select('user_id').in('org_id', filteredOrgIds)
          : supabase.from('users').select('id'),

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
          let query = supabase.from('posts').select('id', { count: 'exact', head: true });
          query = applyDateFilter(query, dateFilter, 'created_at');
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
          let query = supabase.from('post_views').select('id', { count: 'exact', head: true });
          query = applyDateFilter(query, dateFilter, 'viewed_at');
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
          let query = supabase.from('reward_log').select('action, user_id');
          query = applyDateFilter(query, dateFilter, 'created_at');
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
          baseQuery = applyDateFilter(baseQuery, dateFilter, 'created_at');
          if (filteredOrgIds) baseQuery = baseQuery.in('org_id', filteredOrgIds);
          return baseQuery;
        })(),

        // Views on event posts (for RSVP conversion rate, filtered by organization)
        (() => {
          let query = supabase.from('post_views').select('id', { count: 'exact', head: true });
          query = applyDateFilter(query, dateFilter, 'viewed_at');
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

      // Calculate total users (distinct users)
      const totalUsers = filteredOrgIds
        ? new Set(usersResult.data?.map((u: any) => u.user_id)).size
        : usersResult.data?.length || 0;

      setStats({
        totalUsers,
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
        {/* Header Section */}
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

        {/* Platform Health Insights */}
        <div className="mb-8">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-green-600">
              <h3 className="text-sm font-semibold text-white flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Platform Health Insights
              </h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {stats.engagementRate < 30 && (
                  <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">Critical: Low Platform Engagement</p>
                      <p className="text-sm text-red-700 mt-1">Only {stats.engagementRate.toFixed(1)}% of users are active. This indicates potential issues with user adoption or platform usability that may require investigation.</p>
                    </div>
                  </div>
                )}
                {stats.engagementRate >= 30 && stats.engagementRate < 50 && (
                  <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800">Moderate: Platform engagement at {stats.engagementRate.toFixed(1)}%</p>
                      <p className="text-sm text-yellow-700 mt-1">User activity levels are below optimal. Monitor growth trends and consider platform enhancements.</p>
                    </div>
                  </div>
                )}
                {stats.engagementRate >= 50 && (
                  <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">Healthy: Platform engagement at {stats.engagementRate.toFixed(1)}%</p>
                      <p className="text-sm text-green-700 mt-1">User activity levels are within acceptable ranges. Continue monitoring for sustained growth.</p>
                    </div>
                  </div>
                )}
                {stats.totalOrganizations > 0 && stats.activeOrganizations / stats.totalOrganizations < 0.7 && (
                  <div className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <Building2 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-800">Organization Activity: {Math.round((stats.activeOrganizations / stats.totalOrganizations) * 100)}% active</p>
                      <p className="text-sm text-orange-700 mt-1">Many organizations show low activity. This may indicate onboarding issues or lack of engagement from organization officers.</p>
                    </div>
                  </div>
                )}
                {stats.thirtyDayRetentionRate < 50 && (
                  <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <Users className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">Retention Concern: 30-day retention at {stats.thirtyDayRetentionRate.toFixed(1)}%</p>
                      <p className="text-sm text-red-700 mt-1">Users are not returning to the platform. Investigate user experience issues or content relevance.</p>
                    </div>
                  </div>
                )}
                {stats.totalPosts < 50 && (
                  <div className="flex items-start space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-800">Content Volume: {stats.totalPosts} total posts</p>
                      <p className="text-sm text-purple-700 mt-1">Low content creation across the platform. This may impact user engagement and community growth.</p>
                    </div>
                  </div>
                )}
                {stats.totalUsers > 1000 && stats.activeUsers / stats.totalUsers < 0.2 && (
                  <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <Users className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">Critical: Only {Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of {stats.totalUsers.toLocaleString()} users are active</p>
                      <p className="text-sm text-red-700 mt-1">Large user base with very low activity rates. Requires immediate attention to platform engagement strategies.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              title="RSVP Conversion"
              value={`${stats.rsvpConversionRate.toFixed(1)}%`}
              icon={Calendar}
              color="bg-green-600"
            />
            <StatCard
              title="30-Day Retention"
              value={`${stats.thirtyDayRetentionRate.toFixed(1)}%`}
              icon={TrendingUp}
              color="bg-green-600"
            />
          </div>
        </div>

        {/* Analytics Charts Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Analytics Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          </div>
        </div>
      </div>
    </div>
  );
}