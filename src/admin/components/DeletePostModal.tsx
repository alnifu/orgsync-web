import { useState } from "react";
import { supabase } from "../../lib/supabase";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Trash2, AlertTriangle } from "lucide-react";
import type { Posts } from '../../types/database.types';

interface DeletePostModalProps {
  post: Posts | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostDeleted: () => void;
}

export default function DeletePostModal({ post, open, onOpenChange, onPostDeleted }: DeletePostModalProps) {
  const [loading, setLoading] = useState<boolean>(false);

  async function deletePost(): Promise<void> {
    if (!post) return;
    
    setLoading(true);

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq('id', post.id);

    if (error) {
      console.error(error);
      alert("Error deleting post: " + error.message);
    } else {
      onOpenChange(false);
      onPostDeleted();
    }
    setLoading(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <Dialog.Title className="text-xl font-bold text-gray-900">
                Delete Post
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            
            {post && (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-2">{post.title}</h4>
                <p className="text-gray-600 text-sm line-clamp-3">
                  {post.content.length > 100 
                    ? post.content.substring(0, 100) + '...' 
                    : post.content
                  }
                </p>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {post.tags.slice(0, 3).map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{post.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Dialog.Close asChild>
              <button className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={deletePost}
              disabled={loading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 size={16} />
              {loading ? "Deleting..." : "Delete Post"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}