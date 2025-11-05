import { useState } from "react";
import { Tag, Eye, Calendar, User as UserIcon, FileText, Calendar as CalendarIcon, BarChart3, MessageSquare, Users } from "lucide-react";
import type { Posts, PostType, Organization, User } from '../../types/database.types';

interface PostCardProps {
  post: Posts;
  onView?: (postId: string) => void;
  onTagClick?: (tag: string) => void;
  onViewResponses?: (post: Posts) => void;
  showOrgInfo?: boolean; // Whether to show organization info (for general posts page)
  organization?: Organization | null; // Organization data
  poster?: User | null; // Poster user data
}

export default function PostCard({
  post,
  onView,
  onTagClick,
  onViewResponses,
  showOrgInfo = false,
  organization,
  poster
}: PostCardProps) {
  const [imageError, setImageError] = useState<{[key: number]: boolean}>({});
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string | null): string => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVisibilityColor = (visibility: string | null | undefined): string => {
    switch (visibility) {
      case 'public': return 'bg-blue-100 text-blue-800';
      case 'private': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getPostTypeIcon = (postType: PostType = 'general') => {
    switch (postType) {
      case 'event':
        return <CalendarIcon className="w-4 h-4" />;
      case 'poll':
        return <BarChart3 className="w-4 h-4" />;
      case 'feedback':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getPostTypeColor = (postType: PostType = 'general') => {
    switch (postType) {
      case 'event':
        return 'bg-blue-100 text-blue-800';
      case 'poll':
        return 'bg-purple-100 text-purple-800';
      case 'feedback':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPollQuestion = (): string => {
    if (!post || post.post_type !== 'poll') return post?.content || '';

    try {
      const content = JSON.parse(post.content);
      return content.question || content.description || post.content;
    } catch (error) {
      console.error('Failed to parse poll content:', error);
      return post.content;
    }
  };

  const getFormDescription = (): string => {
    if (!post || post.post_type !== 'feedback') return post?.content || '';

    try {
      const content = JSON.parse(post.content);
      return content.description || post.content;
    } catch {
      return post.content;
    }
  };

  // Swipe handling functions
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentMediaIndex < (post.media?.length || 0) - 1) {
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
    if (post.media && currentMediaIndex < post.media.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!post.media || post.media.length <= 1) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevMedia();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextMedia();
    }
  };

  const handleCardClick = () => {
    if (onView) {
      onView(post.id);
    }
  };

  const handleImageError = (index: number) => {
    setImageError(prev => ({ ...prev, [index]: true }));
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer ${
        post.is_pinned ? 'ring-2 ring-green-200 bg-green-50' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Post Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {post.is_pinned && (
                <span className="text-green-600 text-xs font-medium">📌 Pinned</span>
              )}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPostTypeColor(post.post_type)}`}>
                {getPostTypeIcon(post.post_type)}
                <span className="capitalize">{post.post_type || 'general'}</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                {post.status}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVisibilityColor(post.visibility)}`}>
                {post.visibility || 'public'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 hover:text-green-600 transition-colors line-clamp-2">
              {post.title}
            </h3>
            
            {/* Organization and User Info */}
            <div className="flex items-center gap-2 mt-2">
              {showOrgInfo && organization && (
                <>
                  <div className="flex items-center gap-2">
                    {organization.org_pic ? (
                      <img
                        src={organization.org_pic}
                        alt={organization.abbrev_name || organization.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {organization.abbrev_name?.charAt(0) || organization.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-semibold text-gray-900">
                      {organization.abbrev_name || organization.name}
                    </span>
                  </div>
                  <span className="text-gray-400">•</span>
                </>
              )}
              {poster && (
                <span className="text-sm text-gray-600">
                  {poster.first_name} {poster.last_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Post Content Preview */}
        <p className="text-gray-600 leading-relaxed line-clamp-3 mb-3">
          {post.post_type === 'poll' ? getPollQuestion() :
           post.post_type === 'feedback' ? getFormDescription() :
           post.content}
        </p>

        {/* Event Details */}
        {post.post_type === 'event' && (
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <div className="space-y-2">
              {post.event_date && (
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <CalendarIcon size={16} />
                  <span>{new Date(post.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              )}
              {(post.start_time || post.end_time) && (
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <span>🕐</span>
                  <span>
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
                  </span>
                </div>
              )}
              {post.location && (
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <span>📍</span>
                  <span>{post.location}</span>
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView?.(post.id);
                  }}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CalendarIcon size={16} />
                  RSVP Now
                </button>
                {onViewResponses && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewResponses(post);
                    }}
                    className="w-full px-3 py-2 bg-white border border-blue-600 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Users size={16} />
                    View RSVPs
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Poll Preview */}
        {post.post_type === 'poll' && (
          <div className="bg-purple-50 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-purple-700 font-medium">Poll</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView?.(post.id);
                }}
                className="w-full px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <BarChart3 size={16} />
                Vote Now
              </button>
              {onViewResponses && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewResponses(post);
                  }}
                  className="w-full px-3 py-2 bg-white border border-purple-600 text-purple-600 text-sm font-medium rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                >
                  <BarChart3 size={16} />
                  View Results
                </button>
              )}
            </div>
          </div>
        )}

        {/* Form Preview */}
        {post.post_type === 'feedback' && (
          <div className="bg-orange-50 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-orange-700 font-medium">Feedback Form</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView?.(post.id);
                }}
                className="w-full px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare size={16} />
                Submit Response
              </button>
              {onViewResponses && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewResponses(post);
                  }}
                  className="w-full px-3 py-2 bg-white border border-orange-600 text-orange-600 text-sm font-medium rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare size={16} />
                  View Responses
                </button>
              )}
            </div>
          </div>
        )}

        {/* Media Preview */}
        {post.media && post.media.length > 0 && (
          <div className="mb-4 -mx-6">
            <div
              className="relative overflow-hidden border border-gray-200 bg-black group"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onKeyDown={handleKeyDown}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              tabIndex={post.media && post.media.length > 1 ? 0 : -1}
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
                      !imageError[index] ? (
                        <img
                          src={mediaItem.url}
                          alt={mediaItem.filename}
                          className="w-full h-full object-contain cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(mediaItem.url, '_blank');
                          }}
                          onError={() => handleImageError(index)}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-400">
                          <FileText size={64} />
                        </div>
                      )
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
                      e.stopPropagation();
                      prevMedia();
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={currentMediaIndex === 0}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextMedia();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={currentMediaIndex === post.media.length - 1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Dots Indicator */}
              {post.media.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
                  {post.media.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToMedia(index);
                      }}
                      className={`transition-all ${
                        isHovered 
                          ? 'w-2 h-2' 
                          : 'w-1.5 h-1.5'
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
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {currentMediaIndex + 1} / {post.media.length}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.slice(0, 3).map((tag: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(tag);
                }}
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{post.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Post Footer */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-1">
              <UserIcon size={14} />
              <span>{post.user_id.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{formatDate(post.created_at)}</span>
            </div>
            {post.updated_at && post.updated_at !== post.created_at && (
              <span className="text-xs">
                (edited)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Eye size={14} />
            <span>{post.post_views?.length ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}