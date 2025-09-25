import { Calendar, ChartBar, CheckCircle } from 'lucide-react';
import type { PollPost } from '../../types/database.types';

interface PollPostCardProps {
  post: PollPost;
  onVote: (options: string[]) => void;
  userVoted?: boolean;
}

export default function PollPostCard({ post, onVote, userVoted = false }: PollPostCardProps) {
  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'No end date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getVoteCount(option: string): number {
    return post.results?.[option] || 0;
  }

  function getTotalVotes(): number {
    if (!post.results) return 0;
    return Object.values(post.results).reduce((sum, count) => sum + count, 0);
  }

  function getVotePercentage(option: string): number {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) return 0;
    return (getVoteCount(option) / totalVotes) * 100;
  }

  return (
    <div className="space-y-4">
      {/* Poll End Date */}
      <div className="flex items-center gap-2 text-gray-600">
        <Calendar size={18} />
        <span>Ends: {formatDate(post.end_date)}</span>
      </div>

      {/* Poll Options */}
      <div className="space-y-3">
        {post.options.map((option, index) => (
          <div key={index} className="space-y-2">
            {userVoted ? (
              // Results View
              <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                <div 
                  className="absolute inset-0 bg-blue-100 transition-all duration-500"
                  style={{ width: `${getVotePercentage(option)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3">
                  <span className="text-gray-700">{option}</span>
                  <span className="text-gray-600">
                    {getVoteCount(option)} votes ({Math.round(getVotePercentage(option))}%)
                  </span>
                </div>
              </div>
            ) : (
              // Voting View
              <button
                onClick={() => onVote([option])}
                className="w-full h-10 px-4 flex items-center justify-between border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>{option}</span>
                {post.multiple_choice ? (
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                ) : (
                  <input 
                    type="radio" 
                    name="poll-option" 
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Poll Info */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <ChartBar size={16} />
          <span>{getTotalVotes()} total votes</span>
        </div>
        {post.multiple_choice && (
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            <span>Multiple choice allowed</span>
          </div>
        )}
      </div>
    </div>
  );
}