import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, FileText, TrendingUp, Calendar, RefreshCw, Coins } from 'lucide-react';

interface PostTypeData {
  post_type: string;
}

interface OrganizationReportStats {
  totalMembers: number;
  totalPosts: number;
  recentPosts: number;
  eventCount: number;
  pollCount: number;
  feedbackCount: number;
  totalViews: number;
  recentViews: number;
  totalCoins: number;
  averageCoins: number;
}

interface OrganizationReportsProps {
  organizationId: string;
  onError: (error: string) => void;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export default function OrganizationReports({ organizationId, onError }: OrganizationReportsProps) {
  const [stats, setStats] = useState<OrganizationReportStats>({
    totalMembers: 0,
    totalPosts: 0,
    recentPosts: 0,
    eventCount: 0,
    pollCount: 0,
    feedbackCount: 0,
    totalViews: 0,
    recentViews: 0,
    totalCoins: 0,
    averageCoins: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrganizationStats();
  }, [organizationId, timeRange]);

  const getDateRange = (range: TimeRange) => {
    if (range === 'all') return null;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  };

  const fetchOrganizationStats = async () => {
    try {
      setLoading(true);
      console.log('Fetching stats for organization:', organizationId);

      const dateFilter = getDateRange(timeRange);

      // Fetch organization stats in parallel
      const [
        membersResult,
        postsResult,
        recentPostsResult,
        postTypesResult,
        totalViewsResult,
        recentViewsResult,
        coinsResult,
        memberCountResult
      ] = await Promise.all([
        // Total members in organization
        supabase
          .from('org_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('org_id', organizationId),

        // Total posts by organization
        dateFilter
          ? supabase
              .from('posts')
              .select('id', { count: 'exact', head: true })
              .eq('org_id', organizationId)
              .gte('created_at', dateFilter)
          : supabase
              .from('posts')
              .select('id', { count: 'exact', head: true })
              .eq('org_id', organizationId),

        // Recent posts (last 30 days for comparison)
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', organizationId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

        // Post types count
        dateFilter
          ? supabase
              .from('posts')
              .select('post_type')
              .eq('org_id', organizationId)
              .gte('created_at', dateFilter)
          : supabase
              .from('posts')
              .select('post_type')
              .eq('org_id', organizationId),

        // Total views
        dateFilter
          ? supabase
              .from('posts')
              .select('view_count')
              .eq('org_id', organizationId)
              .gte('created_at', dateFilter)
          : supabase
              .from('posts')
              .select('view_count')
              .eq('org_id', organizationId),

        // Recent views (last 30 days)
        supabase
          .from('posts')
          .select('view_count')
          .eq('org_id', organizationId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

        // Total coins from organization members
        supabase
          .from('game_rooms')
          .select('coins')
          .in('user_id', 
            (await supabase
              .from('organization_members')
              .select('user_id')
              .eq('org_id', organizationId)
            ).data?.map(m => m.user_id) || []
          ),

        // Member count for average calculation
        supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', organizationId)
      ]);

      console.log('Members result:', membersResult);
      console.log('Posts result:', postsResult);
      console.log('Recent posts result:', recentPostsResult);
      console.log('Post types result:', postTypesResult);

      if (membersResult.error) {
        console.error('Members error:', membersResult.error);
        throw membersResult.error;
      }
      if (postsResult.error) {
        console.error('Posts error:', postsResult.error);
        throw postsResult.error;
      }
      if (recentPostsResult.error) {
        console.error('Recent posts error:', recentPostsResult.error);
        throw recentPostsResult.error;
      }
      if (postTypesResult.error) {
        console.error('Post types error:', postTypesResult.error);
        throw postTypesResult.error;
      }

      // Count post types
      const postTypes = postTypesResult.data as PostTypeData[] || [];
      const eventCount = postTypes.filter((p: PostTypeData) => p.post_type === 'event').length;
      const pollCount = postTypes.filter((p: PostTypeData) => p.post_type === 'poll').length;
      const feedbackCount = postTypes.filter((p: PostTypeData) => p.post_type === 'feedback').length;

      // Calculate total views
      const totalViews = totalViewsResult.data?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0;
      const recentViews = recentViewsResult.data?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0;

      // Calculate coins
      const totalCoins = coinsResult.data?.reduce((sum, gameRoom) => sum + (gameRoom.coins || 0), 0) || 0;
      const memberCount = memberCountResult.count || 0;
      const averageCoins = memberCount > 0 ? Math.round(totalCoins / memberCount) : 0;

      setStats({
        totalMembers: membersResult.count || 0,
        totalPosts: postsResult.count || 0,
        recentPosts: recentPostsResult.count || 0,
        eventCount,
        pollCount,
        feedbackCount,
        totalViews,
        recentViews,
        totalCoins,
        averageCoins
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load organization reports';
      onError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrganizationStats();
  };

  // const exportToCSV = () => {
  //   const csvData = [
  //     ['Metric', 'Value'],
  //     ['Total Members', stats.totalMembers],
  //     ['Total Posts', stats.totalPosts],
  //     ['Total Views', stats.totalViews],
  //     ['Recent Posts (30d)', stats.recentPosts],
  //     ['Recent Views (30d)', stats.recentViews],
  //     ['Events', stats.eventCount],
  //     ['Polls', stats.pollCount],
  //     ['Feedback Forms', stats.feedbackCount],
  //     ['Time Range', timeRange],
  //     ['Organization ID', organizationId]
  //   ];

  //   const csvContent = csvData.map(row => row.join(',')).join('\n');
  //   const blob = new Blob([csvContent], { type: 'text/csv' });
  //   const url = window.URL.createObjectURL(blob);
  //   const a = document.createElement('a');
  //   a.href = url;
  //   a.download = `org-reports-${organizationId}-${new Date().toISOString().split('T')[0]}.csv`;
  //   a.click();
  //   window.URL.revokeObjectURL(url);
  // };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Check if all stats are empty
  const isEmpty = stats.totalMembers === 0 && stats.totalPosts === 0 && stats.recentPosts === 0 && 
                  stats.eventCount === 0 && stats.pollCount === 0 && stats.feedbackCount === 0 &&
                  stats.totalCoins === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No reports available for this organization yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Organization Reports</h2>
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

      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Members */}
        {/* <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Members
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalMembers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div> */}

        {/* Total Posts */}
        {/* <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Posts
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalPosts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div> */}

        {/* Total Views */}
        {/* <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Views
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalViews.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div> */}

        {/* Events */}
        {/* <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Events
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.eventCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div> */}

        {/* Polls */}
        {/* <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Polls
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pollCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div> */}

        {/* Feedback Forms */}
        {/* <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Feedback Forms
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.feedbackCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div> */}
      {/* </div> */}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Post Type Distribution */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Content Distribution</h3>
            <div className="space-y-4">
              {stats.eventCount > 0 && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Events</span>
                    <span>{stats.eventCount}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${stats.totalPosts > 0 ? (stats.eventCount / stats.totalPosts) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {stats.pollCount > 0 && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Polls</span>
                    <span>{stats.pollCount}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${stats.totalPosts > 0 ? (stats.pollCount / stats.totalPosts) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {stats.feedbackCount > 0 && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Feedback Forms</span>
                    <span>{stats.feedbackCount}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${stats.totalPosts > 0 ? (stats.feedbackCount / stats.totalPosts) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {stats.totalPosts === 0 && (
                <p className="text-gray-500 text-center py-4">No content yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Activity Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Total Members</span>
                </div>
                <span className="text-lg font-semibold text-blue-600">{stats.totalMembers}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Total Posts</span>
                </div>
                <span className="text-lg font-semibold text-green-600">{stats.totalPosts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-purple-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Total Views</span>
                </div>
                <span className="text-lg font-semibold text-purple-600">{stats.totalViews.toLocaleString()}</span>
              </div>
              {/* <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <Coins className="h-5 w-5 text-yellow-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Total Coins</span>
                </div>
                <span className="text-lg font-semibold text-yellow-600">{stats.totalCoins.toLocaleString()}</span>
              </div> */}
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-orange-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Recent Activity</span>
                </div>
                <span className="text-lg font-semibold text-orange-600">{stats.recentPosts} posts • {stats.recentViews.toLocaleString()} views</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}