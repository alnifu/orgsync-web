import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Heart, Share2, Eye, Calendar, User, Tag, FileText, Calendar as CalendarIcon, BarChart3, MessageSquare } from "lucide-react";
import type { Posts, PostType } from '../../types/database.types';

interface AuthUser {
  id: string;
  email?: string;
}

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Posts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    if (postId) {
      fetchPost();
      getCurrentUser();
      checkIfLiked();
      incrementViewCount();
    }
  }, [postId]);

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
          status, view_count, is_pinned, org_id, media, post_type
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
    await supabase.rpc('increment_view_count', { post_id: postId });

    // Update local state
    if (post) {
      setPost({ ...post, view_count: (post.view_count || 0) + 1 });
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
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      // Could show a toast notification here
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
                    <User size={16} />
                    <span>{post.user_id.slice(0, 8)}...</span>
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
            <div className="prose prose-lg max-w-none mb-8">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>

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
                  <span>{post.view_count || 0} views</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}