import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Edit3, Upload, Image, Video, Trash2 } from "lucide-react";
import type { Posts, MediaItem, PostType } from '../../types/database.types';
import { uploadFiles, validateFile } from '../../lib/media';
import { sendNotificationsToOrgMembers } from '../../lib/notifications';

interface EditPostModalProps {
  post: Posts | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated: () => void;
}

export default function EditPostModal({ post, open, onOpenChange, onPostUpdated }: EditPostModalProps) {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [status, setStatus] = useState<string>("published");
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [postType, setPostType] = useState<PostType>("general");
  const [loading, setLoading] = useState<boolean>(false);
  const [existingMedia, setExistingMedia] = useState<MediaItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<MediaItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadController, setUploadController] = useState<AbortController | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedGame, setSelectedGame] = useState<string>("");

  // Update form when post changes
  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setTags(post.tags ? post.tags.join(', ') : '');
      setStatus(post.status || 'published');
      setVisibility(post.visibility || 'public');
      setPostType(post.post_type || 'general');
      setExistingMedia(post.media || []);
      setSelectedFiles([]);
      setMediaPreviews([]);
      setUploadProgress(0);
      setSelectedGame(post.game_route ? (post.game_route === '/user/dashboard/quiz-selection' ? 'quiz' : 'room') : '');
    }
  }, [post]);

  // Handle page unload/navigation cancellation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = 'Upload in progress. Are you sure you want to leave?';
        // Cancel the upload
        uploadController?.abort();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Cancel any ongoing uploads when component unmounts
      if (uploadController) {
        uploadController.abort();
      }
    };
  }, [isUploading, uploadController]);

  async function updatePost(): Promise<void> {
    if (!post) return;
    
    setLoading(true);
    setUploadProgress(0);

    if (!title.trim() || !content.trim()) {
      alert("Please fill in both title and content");
      setLoading(false);
      return;
    }

    try {
      let finalMedia: MediaItem[] = [...existingMedia];

      // Upload new files if any
      if (selectedFiles.length > 0) {
        // Create abort controller for this upload session
        const controller = new AbortController();
        setUploadController(controller);
        setIsUploading(true);

        try {
          const uploadResults = await uploadFiles(selectedFiles, post.user_id, (progress) => {
            setUploadProgress(progress);
          }, controller);
          
          const successfulUploads = uploadResults.filter(result => result.success && result.mediaItem);
          finalMedia = [...finalMedia, ...successfulUploads.map(result => result.mediaItem!)];

          // Check if all uploads were successful
          if (successfulUploads.length !== selectedFiles.length) {
            const failedCount = selectedFiles.length - successfulUploads.length;
            const cancelledCount = uploadResults.filter(result => result.error === 'Upload cancelled').length;
            
            if (cancelledCount > 0) {
              alert(`Upload was cancelled. ${cancelledCount} file(s) were not uploaded.`);
            } else {
              alert(`${failedCount} file(s) failed to upload. Post will be updated with successful uploads only.`);
            }
          }
        } catch (error) {
          if (controller.signal.aborted) {
            alert("Upload was cancelled.");
          } else {
            throw error;
          }
        } finally {
          setUploadController(null);
          setIsUploading(false);
        }

        // Progress is already set to 100% by the callback
      }

      const tagsArray: string[] = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      const updates: Partial<Posts> = {
        title: title.trim(),
        content: content.trim(),
        tags: tagsArray,
        status,
        visibility,
        post_type: postType,
        updated_at: new Date().toISOString(),
        media: finalMedia.length > 0 ? finalMedia : null,
        game_route: selectedGame ? (selectedGame === 'quiz' ? '/user/dashboard/quiz-selection' : '/user/dashboard/room-game') : null,
      };

      const { error } = await supabase
        .from("posts")
        .update(updates)
        .eq('id', post.id);

      if (error) {
        console.error(error);
        alert("Error updating post: " + error.message);
      } else {
        // Send notifications if status changed to published and has org_id
        if (status === 'published' && post.status !== 'published' && post.org_id) {
          // Fetch org name
          const { data: orgData } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', post.org_id)
            .single();
          const orgName = orgData?.name || 'Unknown Organization';
          await sendNotificationsToOrgMembers(post.org_id, `New post published from ${orgName}: ${title.trim()}`, post.id);
        }
        onOpenChange(false);
        onPostUpdated();
      }
    } catch (error) {
      console.error(error);
      alert("Error updating post");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }

  function handleClose(): void {
    // Cancel any ongoing uploads
    if (uploadController) {
      uploadController.abort();
      setUploadController(null);
      setIsUploading(false);
      setUploadProgress(0);
    }
    onOpenChange(false);
    // Reset form when closing
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setTags(post.tags ? post.tags.join(', ') : '');
      setStatus(post.status || 'published');
      setPostType(post.post_type || 'general');
      setExistingMedia(post.media || []);
      setSelectedFiles([]);
      setMediaPreviews([]);
      setUploadProgress(0);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files || []);
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      alert(`Some files were rejected:\n${errors.join('\n')}`);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);

      // Create preview URLs for valid files
      const newPreviews: MediaItem[] = validFiles.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'video',
        filename: file.name,
        size: file.size
      }));

      setMediaPreviews(prev => [...prev, ...newPreviews]);
    }

    // Reset input
    event.target.value = '';
  }

  function removeNewFile(index: number): void {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => {
      // Revoke object URL to prevent memory leaks
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function removeExistingMedia(index: number): void {
    setExistingMedia(prev => prev.filter((_, i) => i !== index));
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Edit3 size={20} className="text-blue-600" />
              </div>
              <Dialog.Title className="text-xl font-bold text-gray-900">
                Edit Post
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
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                placeholder="Write your content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                rows={8}
              />
            </div>

            {/* Game Link Selector */}
            {(postType === 'general' || postType === 'event') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link a Game (Optional)</label>
                <select
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">No Game</option>
                  <option value="quiz">Quiz Game</option>
                  <option value="room">Room Game</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <input
                type="text"
                placeholder="Enter tags separated by commas (e.g., tech, programming, tips)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="public">Public</option>
                <option value="private">Private (Organization members only)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Post Type</label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as PostType)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="general">General Post</option>
                <option value="event">Event</option>
                <option value="poll">Poll</option>
                <option value="feedback">Feedback Form</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Media</label>
              <div className="space-y-3">
                {/* Existing Media */}
                {existingMedia.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Current media:</p>
                    {existingMedia.map((mediaItem, index) => (
                      <div key={`existing-${index}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {mediaItem.type === 'image' ? (
                            <Image className="w-5 h-5 text-green-600" />
                          ) : (
                            <Video className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {mediaItem.filename}
                          </p>
                          {mediaItem.size && (
                            <p className="text-xs text-gray-500">
                              {formatFileSize(mediaItem.size)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeExistingMedia(index)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove media"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="edit-media-upload"
                  />
                  <label htmlFor="edit-media-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Click to add more photos or videos
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports JPEG, PNG, GIF, WebP images and MP4, WebM, OGG videos (max 50MB each)
                    </p>
                  </label>
                </div>

                {/* New Files Preview */}
                {mediaPreviews.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">New files to add:</p>
                    {mediaPreviews.map((preview, index) => (
                      <div key={`new-${index}`} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {preview.type === 'image' ? (
                            <Image className="w-5 h-5 text-green-600" />
                          ) : (
                            <Video className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {preview.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(preview.size || 0)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeNewFile(index)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Uploading files...</span>
                      <button
                        onClick={() => {
                          uploadController?.abort();
                          setIsUploading(false);
                          setUploadController(null);
                          setUploadProgress(0);
                        }}
                        className="text-sm text-red-600 hover:text-red-700 underline"
                      >
                        Cancel upload
                      </button>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
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
              onClick={updatePost}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Post"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}