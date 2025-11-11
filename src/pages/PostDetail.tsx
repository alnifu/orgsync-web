import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Heart, Share2, Eye, Calendar, Tag, FileText, Calendar as CalendarIcon, BarChart3, MessageSquare, Users, CheckCircle, Clock, XCircle, Vote, ChevronRight, Loader2 } from "lucide-react";
import type { Posts, PostType, EventRsvp } from '../types/database.types';
import FormSubmission from '../admin/components/FormSubmission';

interface AuthUser {
  id: string;
  email?: string;
}

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState<Posts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [userRsvp, setUserRsvp] = useState<EventRsvp | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpStats, setRsvpStats] = useState({
    attending: 0,
    maybe: 0,
    not_attending: 0
  });
  const [userVote, setUserVote] = useState<number | null>(null);
  const [voteStats, setVoteStats] = useState<number[]>([]);
  const [voting, setVoting] = useState(false);
  const [userFormResponse, setUserFormResponse] = useState<any>(null);
  const [formResponses, setFormResponses] = useState<any[]>([]);
  const [orgData, setOrgData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (postId) {
      fetchPost();
      getCurrentUser();
      checkIfLiked();
      incrementViewCount();
    }
  }, [postId]);

  useEffect(() => {
    if (currentUser && postId && post) {
      // RSVP functionality disabled
      if (post.post_type === 'poll') {
        fetchUserVote();
        fetchVoteStats();
      }
      if (post.post_type === 'feedback') {
        fetchUserFormResponse();
      }
    }
  }, [currentUser, postId, post]);

  useEffect(() => {
    if (post) {
      if (post.org_id) {
        fetchOrgData();
      }
      if (post.user_id) {
        fetchUserData();
      }
    }
  }, [post]);

  async function fetchOrgData() {
    if (!post?.org_id) return;
    const { data } = await supabase
      .from('organizations')
      .select('name, abbrev_name, org_pic')
      .eq('id', post.org_id)
      .single();
    setOrgData(data);
  }

  async function fetchUserData() {
    if (!post?.user_id) return;
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .eq('id', post.user_id)
      .single();
    setUserData(data);
  }

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  async function fetchPost() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id, title, content, created_at, updated_at, user_id, tags,
          status, is_pinned, org_id, media, post_type,
          event_date, start_time, end_time, location, game_route,
          post_views(user_id)
        `)
        .eq('id', postId)
        .single();

      if (!error && data) {
        setPost(data as Posts);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function checkIfLiked() {
    if (!currentUser || !postId) return;

    const { data, error } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', currentUser.id)
      .single();

    if (data && !error) {
      setHasLiked(true);
    }

    // Get total likes count
    const { count } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    setLikesCount(count || 0);
  }

  async function incrementViewCount() {
    if (!currentUser || !postId) return;

    // Check if user has already viewed this post
    const viewedKey = `viewed_post_${postId}`;
    const hasViewed = localStorage.getItem(viewedKey);

    if (hasViewed) return; // Already viewed, don't increment

    // Mark as viewed
    localStorage.setItem(viewedKey, 'true');

    // Increment view count
    await supabase
      .from('post_views')
      .insert({ post_id: postId, user_id: currentUser.id });

    // Update local state
    if (post) {
      setPost({ 
        ...post, 
        post_views: [...(post.post_views || []), { user_id: currentUser.id }] 
      });
    }
  }

  async function fetchUserRsvp() {
    // Disabled - RSVP functionality not implemented
    return;
  }

  async function fetchRsvpStats() {
    // Disabled - RSVP functionality not implemented
    return;
  }

  async function handleRsvp(status: string) {
    // Disabled - RSVP functionality not implemented
    return;
  }

  async function fetchUserVote() {
    if (!currentUser || !postId) return;

    const { data, error } = await supabase
      .from('poll_votes')
      .select('option_index')
      .eq('post_id', postId)
      .eq('user_id', currentUser.id)
      .single();

    if (data && !error) {
      setUserVote(data.option_index);
    }
  }

  async function fetchVoteStats() {
    if (!postId) return;

    const { data, error } = await supabase
      .from('poll_votes')
      .select('option_index')
      .eq('post_id', postId);

    if (data && !error) {
      // Count votes for each option
      const stats: { [key: number]: number } = {};
      data.forEach(vote => {
        stats[vote.option_index] = (stats[vote.option_index] || 0) + 1;
      });
      
      // Convert to array format expected by the UI
      const maxIndex = Math.max(...Object.keys(stats).map(Number), -1);
      const statsArray: number[] = [];
      for (let i = 0; i <= maxIndex; i++) {
        statsArray[i] = stats[i] || 0;
      }
      
      setVoteStats(statsArray);
    }
  }

  async function handleVote(optionIndex: number) {
    if (!currentUser || !postId || userVote !== null || voting) return;

    setVoting(true);
    try {
      const { data, error } = await supabase
        .from('poll_votes')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          option_index: optionIndex
        })
        .select()
        .single();

      if (data && !error) {
        setUserVote(optionIndex);
        fetchVoteStats(); // Refresh stats
      }
    } finally {
      setVoting(false);
    }
  }

  function getPollOptions(): string[] {
    if (!post || post.post_type !== 'poll') return [];

    try {
      const content = JSON.parse(post.content);
      return content.options || [];
    } catch (error) {
      console.error('Failed to parse poll content:', error);
      return [];
    }
  }

  function getPollQuestion(): string {
    if (!post || post.post_type !== 'poll') return post?.content || '';

    try {
      const content = JSON.parse(post.content);
      return content.question || content.description || post.content;
    } catch (error) {
      console.error('Failed to parse poll content:', error);
      return post.content;
    }
  }

  async function fetchUserFormResponse() {
    if (!currentUser || !postId) return;

    const { data, error } = await supabase
      .from('form_responses')
      .select('responses')
      .eq('post_id', postId)
      .eq('user_id', currentUser.id)
      .single();

    if (data && !error) {
      setUserFormResponse(data.responses);
    }
  }

  async function handleFormSubmit(formData: any) {
    if (!currentUser || !postId) return;

    const { data, error } = await supabase
      .from('form_responses')
      .insert({
        post_id: postId,
        user_id: currentUser.id,
        responses: formData
      })
      .select()
      .single();

    if (data && !error) {
      setUserFormResponse(formData);
    }
  }

  function getFormFields(): any[] {
    if (!post || post.post_type !== 'feedback') return [];

    try {
      const content = JSON.parse(post.content);
      return content.fields || [];
    } catch {
      return [];
    }
  }

  function getFormDescription(): string {
    if (!post || post.post_type !== 'feedback') return post?.content || '';

    try {
      const content = JSON.parse(post.content);
      return content.description || post.content;
    } catch {
      return post.content;
    }
  }

  async function toggleLike() {
    if (!currentUser || !postId) return;

    if (hasLiked) {
      // Unlike
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUser.id);

      setHasLiked(false);
      setLikesCount(prev => prev - 1);
    } else {
      // Like
      await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: currentUser.id
        });

      setHasLiked(true);
      setLikesCount(prev => prev + 1);
    }
  }

  function sharePost() {
    if (!post) return;

    const url = `${window.location.origin}/user/dashboard/posts/${post.id}`;

    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!');
    });
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPostTypeIcon = (postType: PostType = 'general') => {
    switch (postType) {
      case 'event': return <CalendarIcon className="w-5 h-5" />;
      case 'poll': return <BarChart3 className="w-5 h-5" />;
      case 'feedback': return <MessageSquare className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getPostTypeColor = (postType: PostType = 'general') => {
    switch (postType) {
      case 'event': return 'bg-blue-100 text-blue-800';
      case 'poll': return 'bg-purple-100 text-purple-800';
      case 'feedback': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Swipe handling
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !post?.media) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentMediaIndex < post.media.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
    if (isRightSwipe && currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

  const goToMedia = (index: number) => {
    setCurrentMediaIndex(index);
  };

  const nextMedia = () => {
    if (post?.media && currentMediaIndex < post.media.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading post...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-500">Post not found</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Post Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Post Header */}
          <div className="p-8 pb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getPostTypeColor(post.post_type)}`}>
                    {getPostTypeIcon(post.post_type)}
                    <span className="capitalize">{post.post_type || 'general'}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                    {post.status}
                  </span>
                  {post.is_pinned && (
                    <div className="flex items-center gap-1 text-green-600">
                      📌 Pinned
                    </div>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

                {/* Post Meta */}
                <div className="flex items-center gap-6 text-sm text-gray-500 mb-6">
                  <div className="flex items-center gap-1">
                    {orgData ? (
                      <>
                        {orgData.org_pic ? (
                          <img
                            src={orgData.org_pic}
                            alt={orgData.abbrev_name || orgData.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {orgData.abbrev_name?.charAt(0) || orgData.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-gray-700">
                          {orgData.abbrev_name || orgData.name}
                        </span>
                      </>
                    ) : userData ? (
                      <>
                        {userData.avatar_url ? (
                          <img
                            src={userData.avatar_url}
                            alt={`${userData.first_name} ${userData.last_name}`}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {userData.first_name.charAt(0)}{userData.last_name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-gray-700">
                          {userData.first_name} {userData.last_name}
                        </span>
                      </>
                    ) : (
                      <span>{post.user_id.slice(0, 8)}...</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  {post.updated_at && post.updated_at !== post.created_at && (
                    <span className="text-xs">
                      (edited {formatDate(post.updated_at)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Post Content */}
            {post.post_type !== 'feedback' && post.post_type !== 'poll' && (
              <div className="prose prose-lg max-w-none mb-8">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>
            )}

            {/* Game Link */}
            {post.game_route && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-8">
                <p className="text-sm text-indigo-700 mb-2">🎮 Game Link</p>
                <button
                  onClick={() => {
                    if (location.pathname.startsWith('/user/')) {
                      window.open(post.game_route!, '_blank');
                    }
                  }}
                  disabled={!location.pathname.startsWith('/user/')}
                  title={!location.pathname.startsWith('/user/') ? "Games are only playable from the user dashboard" : "Play Game"}
                  className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    !location.pathname.startsWith('/user/')
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <span>Play {post.game_route === '/user/dashboard/quiz-selection' ? 'Quiz' : post.game_route === '/user/dashboard/room-game' ? 'Room' : 'Quiz'} Game</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Event Details */}
            {post.post_type === 'event' && (
              <div className="bg-blue-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CalendarIcon size={20} />
                  Event Details
                </h3>
                <div className="space-y-3">
                  {(() => {
                    console.log('Event Details Debug:', {
                      postType: post.post_type,
                      eventDate: post.event_date,
                      startTime: post.start_time,
                      endTime: post.end_time,
                      location: post.location,
                      fullPost: post
                    });
                    return null;
                  })()}
                  {post.event_date && (
                    <div className="flex items-center gap-3">
                      <CalendarIcon size={18} className="text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {new Date(post.event_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  {(post.start_time || post.end_time) && (
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🕐</span>
                      <div>
                        <div className="font-medium text-gray-900">
                          {post.start_time && new Date(`2000-01-01T${post.start_time}`).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                          {post.end_time && ` - ${new Date(`2000-01-01T${post.end_time}`).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}`}
                        </div>
                      </div>
                    </div>
                  )}
                  {post.location && (
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📍</span>
                      <div>
                        <div className="font-medium text-gray-900">{post.location}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Event RSVP Section - Commented out */}
            {false && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Event Attendance
                </h3>

                {/* RSVP Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{rsvpStats.attending}</div>
                    <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                      <CheckCircle size={14} />
                      Attending
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{rsvpStats.maybe}</div>
                    <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                      <Clock size={14} />
                      Maybe
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{rsvpStats.not_attending}</div>
                    <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                      <XCircle size={14} />
                      Not Attending
                    </div>
                  </div>
                </div>

                {/* RSVP Buttons */}
                {currentUser && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRsvp('attending')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                        userRsvp?.status === 'attending'
                          ? 'bg-green-600 text-white'
                          : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      <CheckCircle size={16} className="inline mr-2" />
                      Attending
                    </button>
                    <button
                      onClick={() => handleRsvp('maybe')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                        userRsvp?.status === 'maybe'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-white border border-yellow-600 text-yellow-600 hover:bg-yellow-50'
                      }`}
                    >
                      <Clock size={16} className="inline mr-2" />
                      Maybe
                    </button>
                    <button
                      onClick={() => handleRsvp('not_attending')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                        userRsvp?.status === 'not_attending'
                          ? 'bg-red-600 text-white'
                          : 'bg-white border border-red-600 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <XCircle size={16} className="inline mr-2" />
                      Not Attending
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Poll Voting Section */}
            {post.post_type === 'poll' && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 size={20} />
                  Poll
                </h3>

                <div className="mb-6">
                  <p className="text-gray-700 font-medium mb-4">{getPollQuestion()}</p>

                  {userVote !== null ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                        <BarChart3 size={16} />
                        Live Results:
                      </p>
                      {getPollOptions().map((option, index) => {
                        const voteCount = voteStats[index] || 0;
                        const totalVotes = voteStats.reduce((sum, count) => sum + (count || 0), 0);
                        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                        const isUserVote = userVote === index;

                        return (
                          <div key={index} className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-medium ${isUserVote ? 'text-purple-700' : 'text-gray-700'}`}>
                                  {option}
                                </span>
                                {isUserVote && (
                                  <div className="flex items-center gap-1 text-purple-600">
                                    <CheckCircle size={14} />
                                    <span className="text-xs font-medium">Your vote</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {voteCount} vote{voteCount !== 1 ? 's' : ''}
                                </span>
                                <span className="text-sm font-semibold text-gray-700 min-w-[3rem] text-right">
                                  {percentage}%
                                </span>
                              </div>
                            </div>
                            <div className="relative">
                              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                <div
                                  className={`h-4 rounded-full transition-all duration-1000 ease-out ${
                                    isUserVote ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-gradient-to-r from-purple-400 to-purple-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              {/* Animated pulse for user's vote */}
                              {isUserVote && (
                                <div className="absolute inset-0 rounded-full bg-purple-400 animate-pulse opacity-20"></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                        <Vote size={16} />
                        Cast your vote:
                      </p>
                      {getPollOptions().map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleVote(index)}
                          disabled={voting}
                          className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800 group-hover:text-purple-700 transition-colors">
                              {option}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 rounded-full group-hover:border-purple-400 transition-colors"></div>
                              <ChevronRight size={16} className="text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </button>
                      ))}
                      {voting && (
                        <div className="text-center py-2">
                          <div className="inline-flex items-center gap-2 text-purple-600">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm">Recording your vote...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users size={16} />
                    <span>Total votes: {voteStats.reduce((sum, count) => sum + (count || 0), 0)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Updated live
                  </div>
                </div>
              </div>
            )}

            {/* Form Submission Section */}
            {post.post_type === 'feedback' && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare size={20} />
                  Feedback Form
                </h3>

                {userFormResponse ? (
                  <div className="text-center py-8">
                    <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Thank you for your response!</h4>
                    <p className="text-gray-600">Your feedback has been submitted successfully.</p>
                  </div>
                ) : (
                  <FormSubmission
                    description={getFormDescription()}
                    fields={getFormFields()}
                    onSubmit={handleFormSubmit}
                  />
                )}
              </div>
            )}

            {/* Media Display */}
            {post.media && post.media.length > 0 && (
              <div className="mb-8 -mx-8">
                <div
                  className="relative overflow-hidden border border-gray-200 bg-black group"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      prevMedia();
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      nextMedia();
                    }
                  }}
                  tabIndex={post.media.length > 1 ? 0 : -1}
                >
                  {/* Media Carousel */}
                  <div className="relative aspect-video w-full">
                    {post.media.map((mediaItem, index) => (
                      <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-300 ${
                          index === currentMediaIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        {mediaItem.type === 'image' ? (
                          <img
                            src={mediaItem.url}
                            alt={mediaItem.filename}
                            className="w-full h-full object-contain cursor-pointer"
                            onClick={() => window.open(mediaItem.url, '_blank')}
                          />
                        ) : (
                          <video
                            src={mediaItem.url}
                            className="w-full h-full object-contain"
                            controls
                            preload="metadata"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Navigation Arrows */}
                  {post.media.length > 1 && isHovered && (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          prevMedia();
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={currentMediaIndex === 0}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          nextMedia();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={currentMediaIndex === post.media.length - 1}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Dots Indicator */}
                  {post.media.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                      {post.media.map((_, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.preventDefault();
                            goToMedia(index);
                          }}
                          className={`transition-all ${
                            isHovered 
                              ? 'w-3 h-3' 
                              : 'w-2 h-2'
                          } rounded-full ${
                            index === currentMediaIndex 
                              ? 'bg-white' 
                              : isHovered 
                                ? 'bg-white bg-opacity-50' 
                                : 'bg-white bg-opacity-30'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Media Counter */}
                  {post.media.length > 1 && isHovered && (
                    <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                      {currentMediaIndex + 1} / {post.media.length}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                  >
                    <Tag size={14} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <div className="flex items-center gap-6">
                {/* Like Button */}
                <button
                  onClick={toggleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    hasLiked
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`} />
                  <span>{likesCount}</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={sharePost}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Eye size={16} />
                  <span>{post.post_views?.length ?? 0} views</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}