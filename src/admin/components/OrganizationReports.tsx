import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart3, Users, FileText, TrendingUp, Calendar } from 'lucide-react';

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
}

interface OrganizationReportsProps {
  organizationId: string;
  onError: (error: string) => void;
}

export default function OrganizationReports({ organizationId, onError }: OrganizationReportsProps) {
  const [stats, setStats] = useState<OrganizationReportStats>({
    totalMembers: 0,
    totalPosts: 0,
    recentPosts: 0,
    eventCount: 0,
    pollCount: 0,
    feedbackCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizationStats();
  }, [organizationId]);

  const fetchOrganizationStats = async () => {
    try {
      setLoading(true);

      // Fetch organization stats in parallel
      const [
        membersResult,
        postsResult,
        recentPostsResult,
        postTypesResult
      ] = await Promise.all([
        // Total members in organization
        supabase
          .from('org_members')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', organizationId),

        // Total posts by organization
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', organizationId),

        // Recent posts (last 30 days)
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', organizationId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

        // Post types count
        supabase
          .from('posts')
          .select('post_type')
          .eq('org_id', organizationId)
      ]);

      if (membersResult.error) throw membersResult.error;
      if (postsResult.error) throw postsResult.error;
      if (recentPostsResult.error) throw recentPostsResult.error;
      if (postTypesResult.error) throw postTypesResult.error;

      // Count post types
      const postTypes = postTypesResult.data as PostTypeData[] || [];
      const eventCount = postTypes.filter((p: PostTypeData) => p.post_type === 'event').length;
      const pollCount = postTypes.filter((p: PostTypeData) => p.post_type === 'poll').length;
      const feedbackCount = postTypes.filter((p: PostTypeData) => p.post_type === 'feedback').length;

      setStats({
        totalMembers: membersResult.count || 0,
        totalPosts: postsResult.count || 0,
        recentPosts: recentPostsResult.count || 0,
        eventCount,
        pollCount,
        feedbackCount
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load organization reports';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Members */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
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
        </div>

        {/* Total Posts */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
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
        </div>

        {/* Recent Posts */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Posts (Last 30 Days)
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.recentPosts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
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
        </div>

        {/* Polls */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
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
        </div>

        {/* Feedback Forms */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
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
        </div>
      </div>
    </div>
  );
}