import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, FileText, TrendingUp, Calendar, RefreshCw, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

// Types
export interface OrganizationStats {
  // Basic metrics
  totalMembers: number;
  totalPosts: number;
  recentPosts: number;
  totalViews: number;
  recentViews: number;

  // Content breakdown
  eventCount: number;
  pollCount: number;
  feedbackCount: number;
  generalCount: number;

  // Event analytics
  totalEventRegistrations: number;
  recentEventRegistrations: number;
  eventResponseRate: number;
  totalAttended: number;
  attendanceRate: number;

  // User analytics
  activeUsers: number;
  engagementRate: number;
  rsvpConversionRate: number;
  dailyRetentionRate: number;
  thirtyDayRetentionRate: number;
}

export interface EventDemographics {
  colleges: Record<string, number>;
  programs: Record<string, number>;
}

export interface EventRating {
  facilities: number;
  design: number;
  participation: number;
  speakers: number;
  overall: number;
}

interface OrganizationReportsProps {
  organizationId: string;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

// Custom hooks for data fetching
function useOrganizationStats(organizationId: string, timeRange: TimeRange) {
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [organizationId, timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parallel data fetching
      const [
        membersResult,
        postsResult,
        recentPostsResult,
        postTypesResult,
        totalViewsResult,
        recentViewsResult,
        eventRegistrationsResult,
        recentEventRegistrationsResult,
        eventViewsResult,
        eventAttendanceResult,
        yesterdayEngagementResult,
        todayEngagementResult,
        lastMonthEngagementResult,
        recentThirtyDayEngagementResult
      ] = await Promise.all([
        // Basic organization data
        supabase.from('org_members').select('*', { count: 'exact', head: true }).eq('org_id', organizationId),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('org_id', organizationId),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('org_id', organizationId).gte('created_at', getTimeRangeDate(timeRange)),
        supabase.from('posts').select('post_type').eq('org_id', organizationId),

        // View analytics - get from post_views table
        supabase.from('post_views').select('post_id').in('post_id', await getOrgPostIds(organizationId)),
        supabase.from('post_views').select('post_id').in('post_id', await getRecentOrgPostIds(organizationId, timeRange)),

        // Event data - use rsvps table
        supabase.from('rsvps').select('*').in('post_id', await getEventPostIds(organizationId)),
        supabase.from('rsvps').select('*').in('post_id', await getEventPostIds(organizationId)).gte('created_at', getTimeRangeDate(timeRange)),

        // Analytics data - event views from post_views table
        supabase.from('post_views').select('post_id').in('post_id', await getEventPostIds(organizationId)),

        // Event attendance
        supabase.from('event_attendance').select('user_id').in('post_id', await getEventPostIds(organizationId)).eq('attended', true),

        // Engagement data for retention calculations
        supabase.from('reward_log').select('user_id').in('user_id', await getOrgMemberIds(organizationId)).gte('created_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()).lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()), // Yesterday (24-48 hours ago)
        supabase.from('reward_log').select('user_id').in('user_id', await getOrgMemberIds(organizationId)).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()), // Today (last 24 hours)
        supabase.from('reward_log').select('user_id').in('user_id', await getOrgMemberIds(organizationId)).gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()).lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()), // 30-60 days ago
        supabase.from('reward_log').select('user_id').in('user_id', await getOrgMemberIds(organizationId)).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()), // Last 30 days
      ]);

      // Process post types
      const postTypes = postTypesResult.data || [];
      const eventCount = postTypes.filter(p => p.post_type === 'event').length;
      const pollCount = postTypes.filter(p => p.post_type === 'poll').length;
      const feedbackCount = postTypes.filter(p => p.post_type === 'feedback').length;
      const generalCount = postTypes.filter(p => p.post_type === 'general' || !p.post_type).length;

      // Process views - each record in post_views represents one view
      const totalViews = totalViewsResult.data?.length || 0;
      const recentViews = recentViewsResult.data?.length || 0;

      // Process event registrations
      const totalEventRegistrations = eventRegistrationsResult.data?.length || 0;
      const recentEventRegistrations = recentEventRegistrationsResult.data?.length || 0;
      const eventResponseRate = totalEventRegistrations > 0 ? (recentEventRegistrations / totalEventRegistrations) * 100 : 0;

      // Calculate analytics
      const eventViews = eventViewsResult.data?.length || 0;
      const rsvpConversionRate = eventViews > 0 ? (totalEventRegistrations / eventViews) * 100 : 0;

      // Process event attendance
      const totalAttended = eventAttendanceResult.data?.length || 0;
      const attendanceRate = totalEventRegistrations > 0 ? (totalAttended / totalEventRegistrations) * 100 : 0;

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

      const activeUsers = recentThirtyDayUsers.size;
      const totalMembers = membersResult.count || 0;
      const engagementRate = totalMembers > 0 ? (activeUsers / totalMembers) * 100 : 0;

      setStats({
        totalMembers,
        totalPosts: postsResult.count || 0,
        recentPosts: recentPostsResult.count || 0,
        totalViews,
        recentViews,
        eventCount,
        pollCount,
        feedbackCount,
        generalCount,
        totalEventRegistrations,
        recentEventRegistrations,
        eventResponseRate,
        totalAttended,
        attendanceRate,
        activeUsers,
        engagementRate,
        rsvpConversionRate,
        dailyRetentionRate,
        thirtyDayRetentionRate
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization stats');
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refetch: fetchStats };
}

// Helper functions
function getTimeRangeDate(range: TimeRange): string {
  const now = new Date();
  switch (range) {
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case 'all': return new Date(0).toISOString();
    default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

async function getEventPostIds(organizationId: string): Promise<string[]> {
  const { data } = await supabase
    .from('posts')
    .select('id')
    .eq('org_id', organizationId)
    .eq('post_type', 'event');
  return data?.map(p => p.id) || [];
}

async function getOrgPostIds(organizationId: string): Promise<string[]> {
  const { data } = await supabase
    .from('posts')
    .select('id')
    .eq('org_id', organizationId);
  return data?.map(p => p.id) || [];
}

async function getRecentOrgPostIds(organizationId: string, timeRange: TimeRange): Promise<string[]> {
  const { data } = await supabase
    .from('posts')
    .select('id')
    .eq('org_id', organizationId)
    .gte('created_at', getTimeRangeDate(timeRange));
  return data?.map(p => p.id) || [];
}

async function getOrgMemberIds(organizationId: string): Promise<string[]> {
  const { data } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', organizationId);
  return data?.map(m => m.user_id) || [];
}

// UI Components
function StatCard({ title, value, icon: Icon, color }: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <Icon className={`h-5 w-5 ${color} mr-3`} />
        <span className="text-sm font-medium text-gray-900">{title}</span>
      </div>
      <span className="text-lg font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function ContentDistributionChart({ stats }: { stats: OrganizationStats }) {
  const total = stats.eventCount + stats.pollCount + stats.feedbackCount + stats.generalCount;
  if (total === 0) return null;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Content Distribution</h3>
      <div className="space-y-3">
        {stats.generalCount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">General Posts</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.generalCount / total) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-8 text-right">{stats.generalCount}</span>
            </div>
          </div>
        )}
        {stats.eventCount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Events</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.eventCount / total) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-8 text-right">{stats.eventCount}</span>
            </div>
          </div>
        )}
        {stats.pollCount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Polls</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.pollCount / total) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-8 text-right">{stats.pollCount}</span>
            </div>
          </div>
        )}
        {stats.feedbackCount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Feedback</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.feedbackCount / total) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-8 text-right">{stats.feedbackCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component
export default function OrganizationReports({ organizationId }: OrganizationReportsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const { stats, loading, error, refetch } = useOrganizationStats(organizationId, timeRange);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load organization reports</p>
      </div>
    );
  }

  const isEmpty = stats.totalMembers === 0 && stats.totalPosts === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No reports available for this organization yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Organization Reports</h2>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={refetch}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Summary */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h3>
          <div className="space-y-3">
            <StatCard title="Total Members" value={stats.totalMembers} icon={Users} color="text-blue-600" />
            <StatCard title="Total Posts" value={stats.totalPosts} icon={FileText} color="text-green-600" />
            <StatCard title="Total Views" value={stats.totalViews.toLocaleString()} icon={TrendingUp} color="text-purple-600" />
            <StatCard title="Recent Activity" value={`${stats.recentPosts} posts • ${stats.recentViews.toLocaleString()} views`} icon={Calendar} color="text-orange-600" />
          </div>
        </div>

        {/* User Analytics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Analytics</h3>
          <div className="space-y-3">
            <StatCard title="Active Users" value={`${stats.activeUsers} (${stats.engagementRate.toFixed(1)}%)`} icon={Users} color="text-indigo-600" />
            <StatCard title="Daily Retention" value={`${stats.dailyRetentionRate.toFixed(1)}%`} icon={TrendingUp} color="text-teal-600" />
            <StatCard title="30-Day Retention" value={`${stats.thirtyDayRetentionRate.toFixed(1)}%`} icon={TrendingUp} color="text-pink-600" />
            <StatCard title="RSVP Conversion" value={`${stats.rsvpConversionRate.toFixed(1)}%`} icon={Calendar} color="text-red-600" />
          </div>
        </div>
      </div>

      {/* Content Distribution */}
      <ContentDistributionChart stats={stats} />

      {/* Event Analytics */}
      {(stats.totalEventRegistrations > 0 || stats.eventCount > 0) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Event Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Registrations" value={stats.totalEventRegistrations} icon={Users} color="text-blue-600" />
            <StatCard title="Recent Registrations" value={stats.recentEventRegistrations} icon={TrendingUp} color="text-green-600" />
            <StatCard title="Attendance Rate" value={`${stats.attendanceRate.toFixed(1)}%`} icon={BarChart3} color="text-purple-600" />
          </div>
        </div>
      )}
    </div>
  );
}