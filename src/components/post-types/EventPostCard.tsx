import { Calendar, MapPin, Users } from 'lucide-react';
import type { EventPost } from '../../types/database.types';

interface EventPostCardProps {
  post: EventPost;
  onJoin?: () => void;
  onLeave?: () => void;
  currentUserId?: string;
}

export default function EventPostCard({ post, onJoin, onLeave, currentUserId }: EventPostCardProps) {
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const isParticipant = currentUserId && post.participants?.includes(currentUserId);
  const participantsCount = post.participants?.length ?? 0;
  const isFull = post.max_participants !== null && post.max_participants !== undefined && 
    participantsCount >= post.max_participants;

  return (
    <div className="space-y-4">
      {/* Event Dates */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar size={18} />
          <span>Starts: {formatDate(post.start_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar size={18} />
          <span>Ends: {formatDate(post.end_date)}</span>
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 text-gray-600">
        <MapPin size={18} />
        <span>{post.location}</span>
      </div>

      {/* Participants */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Users size={18} />
            <span>
              {participantsCount} participant{participantsCount !== 1 ? 's' : ''}
              {post.max_participants ? ` / ${post.max_participants}` : ''}
            </span>
          </div>

          {onJoin && onLeave && currentUserId && (
            isParticipant ? (
              <button
                onClick={onLeave}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Leave Event
              </button>
            ) : (
              <button
                onClick={onJoin}
                disabled={isFull}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFull ? 'Event Full' : 'Join Event'}
              </button>
            )
          )}
        </div>

        {/* Progress bar for participation */}
        {post.max_participants && (
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-0 bg-blue-500 transition-all duration-500"
              style={{
                width: `${(participantsCount / post.max_participants) * 100}%`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}