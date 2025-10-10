import { useState } from "react";
import { supabase } from "../../lib/supabase";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus } from "lucide-react";
import type { Posts } from '../../types/database.types';

interface AuthUser {
  id: string;
  email?: string;
}

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
  currentUser: AuthUser | null;
}

export default function CreatePostModal({ open, onOpenChange, onPostCreated, currentUser }: CreatePostModalProps) {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [status, setStatus] = useState<string>("published");
  const [loading, setLoading] = useState<boolean>(false);

  async function createPost(): Promise<void> {
    setLoading(true);
    
    if (!currentUser) {
      alert("You must be logged in");
      setLoading(false);
      return;
    }

    if (!title.trim() || !content.trim()) {
      alert("Please fill in both title and content");
      setLoading(false);
      return;
    }

    const tagsArray: string[] = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    const newPost: Omit<Posts, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'is_pinned'> = {
      title: title.trim(),
      content: content.trim(),
      user_id: currentUser.id,
      tags: tagsArray,
      status,
      org_id: null,
    };

    const { error } = await supabase.from("posts").insert(newPost);

    if (error) {
      console.error(error);
      alert("Error creating post: " + error.message);
    } else {
      resetForm();
      onOpenChange(false);
      onPostCreated();
    }
    setLoading(false);
  }

  function resetForm(): void {
    setTitle("");
    setContent("");
    setTags("");
    setStatus("published");
  }

  function handleClose(): void {
    onOpenChange(false);
    resetForm();
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Plus size={20} className="text-green-600" />
              </div>
              <Dialog.Title className="text-xl font-bold text-gray-900">
                Create a New Post
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                placeholder="Enter your post title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                placeholder="Write your content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
                rows={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <input
                type="text"
                placeholder="Enter tags separated by commas (e.g., tech, programming, tips)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Dialog.Close asChild>
              <button 
                onClick={handleClose}
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={createPost}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Post"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}