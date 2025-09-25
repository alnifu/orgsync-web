import { Calendar, FileText, ListChecks } from 'lucide-react';
import type { FormPost } from '../../types/database.types';

interface FormPostCardProps {
  post: FormPost;
}

export default function FormPostCard({ post }: FormPostCardProps) {
  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="space-y-4">
      {/* Form Link */}
      <a
        href={post.form_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
      >
        <FileText size={20} />
        Open Form
      </a>

      {/* Deadline */}
      <div className="flex items-center gap-2 text-gray-600">
        <Calendar size={18} />
        <span>Deadline: {formatDate(post.deadline)}</span>
      </div>

      {/* Required Fields */}
      {post.required_fields && post.required_fields.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-600">
            <ListChecks size={18} />
            <span>Required Fields:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 pl-6">
            {post.required_fields.map((field, index) => (
              <li key={index}>{field}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}