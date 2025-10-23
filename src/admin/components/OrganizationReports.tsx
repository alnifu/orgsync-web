import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, FileText, TrendingUp, Calendar, RefreshCw, Building2, Palette, Mic, Star } from 'lucide-react';

interface PostTypeData {
  post_type: string;
}

interface EventRegistration {
  id: string;
  post_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  middle_initial: string;
  email: string;
  college: string;
  program: string;
  section: string;
  created_at: string;
}

interface EventEvaluation {
  id: string;
  post_id: string;
  user_id: string;
  facilities: number; // Satisfaction on Facilities/Venue (1-5)
  design: number; // Satisfaction on Activity Design (1-5)
  participation: number; // Satisfaction on Student Participation (1-5)
  speakers: number; // Satisfaction on Speakers/Facilitators (1-5)
  overall: number; // Overall Rating of the Activity (1-5)
  benefits: string;
  problems: string;
  comments: string;
  created_at: string;
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
  // Event analytics
  totalEventRegistrations: number;
  recentEventRegistrations: number;
  eventRatings: {
    facilities: number;
    design: number;
    participation: number;
    speakers: number;
    overall: number;
  };
  eventResponseRate: number;
  eventDemographics: {
    colleges: Record<string, number>;
    programs: Record<string, number>;
  };
  // Event attendance (to be added by officers)
  totalActualAttendance: number;
  averageAttendanceRate: number;
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
    averageCoins: 0,
    // Event analytics
    totalEventRegistrations: 0,
    recentEventRegistrations: 0,
    eventRatings: {
      facilities: 0,
      design: 0,
      participation: 0,
      speakers: 0,
      overall: 0
    },
    eventResponseRate: 0,
    eventDemographics: {
      colleges: {},
      programs: {}
    },
    // Event attendance (to be added by officers)
    totalActualAttendance: 0,
    averageAttendanceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventOptions, setEventOptions] = useState<Array<{ id: string, title: string }>>([]);
  const [eventDetails, setEventDetails] = useState<{
    registrations: EventRegistration[];
    evaluations: EventEvaluation[];
    actualAttendance?: number;
  } | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<string | null>(null);
  const [attendanceInput, setAttendanceInput] = useState<string>('');

  useEffect(() => {
    fetchOrganizationStats();
    fetchEventOptions();
  }, [organizationId, timeRange]);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventDetails(selectedEventId);
    } else {
      setEventDetails(null);
    }
  }, [selectedEventId]);

  const fetchEventOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title')
        .eq('org_id', organizationId)
        .eq('post_type', 'event')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEventOptions(data || []);
    } catch (err) {
      console.error('Error fetching event options:', err);
    }
  };

  const fetchEventDetails = async (eventId: string) => {
    try {
      // Fetch registrations and evaluations first
      const [registrationsResult, evaluationsResult] = await Promise.all([
        supabase
          .from('event_registrations')
          .select('*')
          .eq('post_id', eventId),
        supabase
          .from('event_evaluations')
          .select('*')
          .eq('post_id', eventId)
      ]);

      // Fetch attendance separately (might not exist yet)
      let attendanceResult: any = { data: null, error: null };
      try {
        attendanceResult = await supabase
          .from('event_attendance')
          .select('*')
          .eq('post_id', eventId)
          .single();
      } catch (attendanceErr) {
        console.warn('Event attendance table may not exist yet:', attendanceErr);
      }

      console.log('Individual event attendance result:', attendanceResult);

      if (attendanceResult.error && attendanceResult.error.code !== 'PGRST116') {
        console.error('Error fetching attendance:', attendanceResult.error);
      }

      if (evaluationsResult.error) {
        console.error('Error fetching evaluations:', evaluationsResult.error);
      }

      setEventDetails({
        registrations: registrationsResult.data || [],
        evaluations: evaluationsResult.data || [],
        actualAttendance: attendanceResult.data?.actual_attendance || undefined
      });
    } catch (err) {
      console.error('Error fetching event details:', err);
      // If attendance doesn't exist yet, still set the other data
      try {
        const [registrationsResult, evaluationsResult] = await Promise.all([
          supabase
            .from('event_registrations')
            .select('*')
            .eq('post_id', eventId),
          supabase
            .from('event_evaluations')
            .select('*')
            .eq('post_id', eventId)
        ]);

        setEventDetails({
          registrations: registrationsResult.data || [],
          evaluations: evaluationsResult.data || [],
          actualAttendance: undefined
        });
      } catch (fallbackErr) {
        console.error('Error fetching fallback event details:', fallbackErr);
      }
    }
  };

  const handleEditAttendance = (eventId: string, currentAttendance?: number) => {
    setEditingAttendance(eventId);
    setAttendanceInput(currentAttendance?.toString() || '');
  };

  const handleSaveAttendance = async (eventId: string) => {
    const attendance = parseInt(attendanceInput);
    if (isNaN(attendance) || attendance < 0) {
      onError('Please enter a valid attendance number');
      return;
    }

    try {
      // First try to insert (for new records)
      const { error: insertError } = await supabase
        .from('event_attendance')
        .insert({
          post_id: eventId,
          actual_attendance: attendance,
          updated_at: new Date().toISOString()
        });

      // If insert failed due to duplicate key, try update
      if (insertError && insertError.code === '23505') { // PostgreSQL duplicate key error
        const { error: updateError } = await supabase
          .from('event_attendance')
          .update({
            actual_attendance: attendance,
            updated_at: new Date().toISOString()
          })
          .eq('post_id', eventId);

        if (updateError) throw updateError;
      } else if (insertError) {
        throw insertError;
      }

      // Update local state
      if (eventDetails && selectedEventId === eventId) {
        setEventDetails({
          ...eventDetails,
          actualAttendance: attendance
        });
      }

      // Refresh organization stats to update totals
      await fetchOrganizationStats();

      setEditingAttendance(null);
      setAttendanceInput('');
    } catch (err) {
      console.error('Error saving attendance:', err);
      onError('Failed to save attendance');
    }
  };

  const handleCancelEdit = () => {
    setEditingAttendance(null);
    setAttendanceInput('');
  };

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

      // Fetch organization stats in parallel (excluding attendance which might not exist yet)
      const [
        membersResult,
        postsResult,
        recentPostsResult,
        postTypesResult,
        totalViewsResult,
        recentViewsResult,
        coinsResult,
        memberCountResult,
        eventRegistrationsResult,
        recentEventRegistrationsResult,
        eventEvaluationsResult
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
          .eq('org_id', organizationId),

        // Event registrations for organization's events
        dateFilter
          ? supabase
            .from('event_registrations')
            .select('*')
            .in('post_id',
              (await supabase
                .from('posts')
                .select('id')
                .eq('org_id', organizationId)
                .eq('post_type', 'event')
              ).data?.map(p => p.id) || []
            )
            .gte('created_at', dateFilter)
          : supabase
            .from('event_registrations')
            .select('*')
            .in('post_id',
              (await supabase
                .from('posts')
                .select('id')
                .eq('org_id', organizationId)
                .eq('post_type', 'event')
              ).data?.map(p => p.id) || []
            ),

        // Recent event registrations (last 30 days)
        supabase
          .from('event_registrations')
          .select('*')
          .in('post_id',
            (await supabase
              .from('posts')
              .select('id')
              .eq('org_id', organizationId)
              .eq('post_type', 'event')
            ).data?.map(p => p.id) || []
          )
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

        // Event evaluations for organization's events
        supabase
          .from('event_evaluations')
          .select('*')
          .in('post_id',
            (await supabase
              .from('posts')
              .select('id')
              .eq('org_id', organizationId)
              .eq('post_type', 'event')
            ).data?.map(p => p.id) || []
          )
      ]);

      // Fetch event attendance separately (might not exist yet)
      let eventAttendanceResult: any = { data: [], error: null };
      try {
        eventAttendanceResult = await supabase
          .from('event_attendance')
          .select('*')
          .in('post_id',
            (await supabase
              .from('posts')
              .select('id')
              .eq('org_id', organizationId)
              .eq('post_type', 'event')
            ).data?.map(p => p.id) || []
          );
      } catch (attendanceErr) {
        console.warn('Event attendance table may not exist yet:', attendanceErr);
      }

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

      // Calculate event analytics
      const eventRegistrations = eventRegistrationsResult.data || [];
      const recentEventRegistrations = recentEventRegistrationsResult.data || [];
      const eventEvaluations = eventEvaluationsResult.data || [];

      const totalEventRegistrations = eventRegistrations.length;
      const recentEventRegistrationsCount = recentEventRegistrations.length;

      // Calculate average ratings for each category
      const eventRatings = {
        facilities: eventEvaluations.length > 0
          ? eventEvaluations.reduce((sum, evaluation) => sum + evaluation.facilities, 0) / eventEvaluations.length
          : 0,
        design: eventEvaluations.length > 0
          ? eventEvaluations.reduce((sum, evaluation) => sum + evaluation.design, 0) / eventEvaluations.length
          : 0,
        participation: eventEvaluations.length > 0
          ? eventEvaluations.reduce((sum, evaluation) => sum + evaluation.participation, 0) / eventEvaluations.length
          : 0,
        speakers: eventEvaluations.length > 0
          ? eventEvaluations.reduce((sum, evaluation) => sum + evaluation.speakers, 0) / eventEvaluations.length
          : 0,
        overall: eventEvaluations.length > 0
          ? eventEvaluations.reduce((sum, evaluation) => sum + evaluation.overall, 0) / eventEvaluations.length
          : 0
      };

      // Calculate event response rate (evaluations / registrations)
      const eventResponseRate = totalEventRegistrations > 0
        ? (eventEvaluations.length / totalEventRegistrations) * 100
        : 0;

      // Calculate event demographics
      const colleges: Record<string, number> = {};
      const programs: Record<string, number> = {};

      eventRegistrations.forEach(registration => {
        // Count colleges
        if (registration.college) {
          colleges[registration.college] = (colleges[registration.college] || 0) + 1;
        }
        // Count programs
        if (registration.program) {
          programs[registration.program] = (programs[registration.program] || 0) + 1;
        }
      });

      // Calculate event attendance stats
      let totalActualAttendance = 0;
      let averageAttendanceRate = 0;

      try {
        const eventAttendance = eventAttendanceResult.data || [];
        totalActualAttendance = eventAttendance.reduce((sum: number, attendance: any) => sum + (attendance.actual_attendance || 0), 0);
        const eventsWithAttendance = eventAttendance.filter((attendance: any) => attendance.actual_attendance && attendance.actual_attendance > 0).length;
        averageAttendanceRate = eventsWithAttendance > 0 ? (totalActualAttendance / eventsWithAttendance) : 0;
      } catch (attendanceError) {
        console.error('Error processing attendance data:', attendanceError);
        // Keep defaults (0) if there's an error
      }

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
        averageCoins,
        // Event analytics
        totalEventRegistrations,
        recentEventRegistrations: recentEventRegistrationsCount,
        eventRatings: {
          facilities: Math.round(eventRatings.facilities * 10) / 10,
          design: Math.round(eventRatings.design * 10) / 10,
          participation: Math.round(eventRatings.participation * 10) / 10,
          speakers: Math.round(eventRatings.speakers * 10) / 10,
          overall: Math.round(eventRatings.overall * 10) / 10
        },
        eventResponseRate: Math.round(eventResponseRate * 10) / 10, // Round to 1 decimal
        eventDemographics: {
          colleges,
          programs
        },
        // Event attendance (to be added by officers)
        totalActualAttendance: totalActualAttendance,
        averageAttendanceRate: Math.round(averageAttendanceRate * 10) / 10
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

      {/* Event Analytics Section */}
      {(stats.totalEventRegistrations > 0 || stats.eventCount > 0) && (
        <div className="space-y-6">


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Event Participation */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Event Participation</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-600 mr-3" />
                      <span className="text-sm font-medium text-gray-900">Total Registrations</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">{stats.totalEventRegistrations}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <TrendingUp className="h-5 w-5 text-green-600 mr-3" />
                      <span className="text-sm font-medium text-gray-900">Recent Registrations</span>
                    </div>
                    <span className="text-lg font-semibold text-green-600">{stats.recentEventRegistrations}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-purple-600 mr-3" />
                      <span className="text-sm font-medium text-gray-900">Total Events</span>
                    </div>
                    <span className="text-lg font-semibold text-purple-600">{stats.eventCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Feedback */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Event Feedback</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-blue-600 mr-3" />
                        <span className="text-sm font-medium text-gray-900">Facilities/Venue</span>
                      </div>
                      <span className="text-lg font-semibold text-blue-600">
                        {stats.eventRatings.facilities > 0 ? `${stats.eventRatings.facilities}/5` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <Palette className="h-5 w-5 text-green-600 mr-3" />
                        <span className="text-sm font-medium text-gray-900">Activity Design</span>
                      </div>
                      <span className="text-lg font-semibold text-green-600">
                        {stats.eventRatings.design > 0 ? `${stats.eventRatings.design}/5` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-purple-600 mr-3" />
                          <span className="text-sm font-medium text-gray-900">Participation</span>
                        </div>
                      </div>
                      <span className="text-lg font-semibold text-purple-600">
                        {stats.eventRatings.participation > 0 ? `${stats.eventRatings.participation}/5` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center">
                        <Mic className="h-5 w-5 text-orange-600 mr-3" />
                        <span className="text-sm font-medium text-gray-900">Speakers</span>
                      </div>
                      <span className="text-lg font-semibold text-orange-600">
                        {stats.eventRatings.speakers > 0 ? `${stats.eventRatings.speakers}/5` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-600 mr-3" />
                      <span className="text-sm font-medium text-gray-900">Overall Rating</span>
                    </div>
                    <span className="text-lg font-semibold text-yellow-600">
                      {stats.eventRatings.overall > 0 ? `${stats.eventRatings.overall}/5` : 'No ratings yet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-red-600 mr-3" />
                      <span className="text-sm font-medium text-gray-900">Response Rate</span>
                    </div>
                    <span className="text-lg font-semibold text-red-600">
                      {stats.eventResponseRate > 0 ? `${stats.eventResponseRate}%` : 'No responses yet'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Attendance Tracking */}
      {(stats.totalEventRegistrations > 0 || stats.eventCount > 0) && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Event Attendance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-indigo-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Total Actual Attendance</span>
                </div>
                <span className="text-lg font-semibold text-indigo-600">
                  {stats.totalActualAttendance > 0 ? stats.totalActualAttendance : 'Not tracked yet'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-teal-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Average Attendance Rate</span>
                </div>
                <span className="text-lg font-semibold text-teal-600">
                  {stats.averageAttendanceRate > 0 ? `${stats.averageAttendanceRate}%` : 'Not available yet'}
                </span>
              </div>
              {stats.totalActualAttendance === 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Note:</strong> Actual attendance tracking will be available once the database schema is updated to include attendance fields.
                    Officers will be able to input actual attendance numbers for each event.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Demographics */}
      {Object.keys(stats.eventDemographics.colleges).length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Event Demographics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* College Distribution */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">College Distribution</h4>
                <div className="space-y-2">
                  {Object.entries(stats.eventDemographics.colleges)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([college, count]) => (
                      <div key={college} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 truncate mr-2">{college}</span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Program Distribution */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Program Distribution</h4>
                <div className="space-y-2">
                  {Object.entries(stats.eventDemographics.programs)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([program, count]) => (
                      <div key={program} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 truncate mr-2">{program}</span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Selector */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Individual Event Reports</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select an event to view detailed reports</option>
              {eventOptions.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Individual Event Details */}
      {eventDetails && selectedEventId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Registrations */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-lg leading-6 font-medium text-gray-900 mb-4">Event Registrations</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-blue-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Total Registrations</span>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">{eventDetails.registrations.length}</span>
                </div>
                {/* College/Program breakdown for this event */}
                {eventDetails.registrations.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Registration Demographics</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h6 className="text-xs font-medium text-gray-600 mb-1">By College</h6>
                        <div className="space-y-1">
                          {Object.entries(
                            eventDetails.registrations.reduce((acc, reg) => {
                              acc[reg.college] = (acc[reg.college] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          )
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([college, count]) => (
                              <div key={college} className="flex justify-between text-xs">
                                <span className="text-gray-600">{college}</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                      <div>
                        <h6 className="text-xs font-medium text-gray-600 mb-1">By Program</h6>
                        <div className="space-y-1">
                          {Object.entries(
                            eventDetails.registrations.reduce((acc, reg) => {
                              acc[reg.program] = (acc[reg.program] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          )
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([program, count]) => (
                              <div key={program} className="flex justify-between text-xs">
                                <span className="text-gray-600">{program}</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Event Evaluations */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-lg leading-6 font-medium text-gray-900 mb-4">Event Evaluations</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Total Evaluations</span>
                  </div>
                  <span className="text-lg font-semibold text-green-600">{eventDetails.evaluations.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-5 w-5 bg-purple-600 rounded-full mr-3 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">%</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Response Rate</span>
                  </div>
                  <span className="text-lg font-semibold text-purple-600">
                    {eventDetails.registrations.length > 0
                      ? `${Math.round((eventDetails.evaluations.length / eventDetails.registrations.length) * 100)}%`
                      : 'N/A'
                    }
                  </span>
                </div>
                {/* Detailed ratings for this event */}
                {eventDetails.evaluations.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Average Ratings</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'facilities', label: 'Facilities', icon: Building2 },
                        { key: 'design', label: 'Design', icon: Palette },
                        { key: 'participation', label: 'Participation', icon: Users },
                        { key: 'speakers', label: 'Speakers', icon: Mic },
                        { key: 'overall', label: 'Overall', icon: Star }
                      ].map(({ key, label, icon: IconComponent }) => {
                        const avg = eventDetails.evaluations.reduce((sum, evaluation) => sum + (evaluation[key as keyof EventEvaluation] as number), 0) / eventDetails.evaluations.length;
                        return (
                          <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center">
                              <IconComponent className="h-4 w-4 text-gray-600 mr-2" />
                              <span className="text-xs font-medium text-gray-600">{label}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {avg > 0 ? `${Math.round(avg * 10) / 10}/5` : 'N/A'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Event Attendance */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-lg leading-6 font-medium text-gray-900 mb-4">Event Attendance</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-teal-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Actual Attendance</span>
                  </div>
                  {editingAttendance === selectedEventId ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={attendanceInput}
                        onChange={(e) => setAttendanceInput(e.target.value)}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                        placeholder="0"
                        min="0"
                      />
                      <button
                        onClick={() => handleSaveAttendance(selectedEventId)}
                        className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-teal-600">
                        {eventDetails.actualAttendance !== undefined ? eventDetails.actualAttendance : 'Not set'}
                      </span>
                      <button
                        onClick={() => handleEditAttendance(selectedEventId, eventDetails.actualAttendance)}
                        className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
                      >
                        {eventDetails.actualAttendance !== undefined ? 'Edit' : 'Set'}
                      </button>
                    </div>
                  )}
                </div>
                {eventDetails.actualAttendance !== undefined && eventDetails.registrations.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-5 w-5 bg-blue-600 rounded-full mr-3 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">%</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Attendance Rate</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">
                      {Math.round((eventDetails.actualAttendance / eventDetails.registrations.length) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}