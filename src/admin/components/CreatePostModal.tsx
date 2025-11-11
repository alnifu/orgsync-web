import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Upload, Image, Video, FileText, Calendar as CalendarIcon, BarChart3, MessageSquare } from "lucide-react";
import type { Posts, MediaItem, PostType } from '../../types/database.types';
import { uploadFiles, validateFile } from '../../lib/media';
import { sendNotificationsToOrgMembers } from '../../lib/notifications';

interface AuthUser {
  id: string;
  email?: string;
}

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
  currentUser: AuthUser | null;
  defaultPostType?: PostType;
  organizationId?: string;
}

export default function CreatePostModal({ open, onOpenChange, onPostCreated, currentUser, defaultPostType = "general", organizationId }: CreatePostModalProps) {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [status, setStatus] = useState<string>("published");
  const [postType, setPostType] = useState<PostType>("general");
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<MediaItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadController, setUploadController] = useState<AbortController | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [formFields, setFormFields] = useState<Array<{type: string, question: string, required: boolean}>>([
    {type: 'text', question: '', required: false}
  ]);
  const [eventDate, setEventDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [eventLocation, setEventLocation] = useState<string>("");
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [selectedGame, setSelectedGame] = useState<string>("");

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

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setContent("");
      setTags("");
      setStatus("published");
      setSelectedFiles([]);
      setMediaPreviews([]);
      setUploadProgress(0);
      setPollOptions(["", ""]);
      setFormFields([{type: 'text', question: '', required: false}]);
      setEventDate("");
      setStartTime("");
      setEndTime("");
      setEventLocation("");
      setVisibility('public');
      setSelectedGame("");
      // postType is set by the defaultPostType useEffect above
    }
  }, [open]);

  useEffect(() => {
    setPostType(defaultPostType);
  }, [defaultPostType]);

  const getFocusRingColor = () => {
    switch (postType) {
      case 'general': return 'focus:ring-green-500 focus:border-green-500';
      case 'event': return 'focus:ring-blue-500 focus:border-blue-500';
      case 'poll': return 'focus:ring-purple-500 focus:border-purple-500';
      case 'feedback': return 'focus:ring-orange-500 focus:border-orange-500';
      default: return 'focus:ring-green-500 focus:border-green-500';
    }
  };

  async function createPost(): Promise<void> {
    setLoading(true);
    setUploadProgress(0);

    if (!currentUser) {
      alert("You must be logged in");
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      alert("Please fill in the title");
      setLoading(false);
      return;
    }

    if (postType === 'poll') {
      if (!content.trim()) {
        alert("Please enter a poll question");
        setLoading(false);
        return;
      }
      const validOptions = pollOptions.filter(option => option.trim().length > 0);
      if (validOptions.length < 2) {
        alert("Please provide at least 2 poll options");
        setLoading(false);
        return;
      }
    } else if (postType === 'feedback') {
      if (!content.trim()) {
        alert("Please enter a form description");
        setLoading(false);
        return;
      }
      const validFields = formFields.filter(field => field.question.trim().length > 0);
      if (validFields.length === 0) {
        alert("Please add at least one form field");
        setLoading(false);
        return;
      }
    } else if (postType === 'event') {
      if (!eventDate) {
        alert("Please select an event date");
        setLoading(false);
        return;
      }
      if (!startTime) {
        alert("Please set a start time");
        setLoading(false);
        return;
      }
      if (!eventLocation.trim()) {
        alert("Please enter an event location");
        setLoading(false);
        return;
      }

      // ✅ Validate that end time (if provided) is after start time
      if (endTime) {
        const start = new Date(`${eventDate}T${startTime}`);
        const end = new Date(`${eventDate}T${endTime}`);

        if (end <= start) {
          alert("End time must be after start time");
          setLoading(false);
          return;
        }
      }
    } else if (!content.trim()) {
      alert("Please fill in the content");
      setLoading(false);
      return;
    }

    try {
      let uploadedMedia: MediaItem[] = [];

      // Upload media files if any
      if (selectedFiles.length > 0) {
        // Create abort controller for this upload session
        const controller = new AbortController();
        setUploadController(controller);
        setIsUploading(true);

        const uploadResults = await uploadFiles(selectedFiles, currentUser.id, (progress) => {
          setUploadProgress(progress);
        }, controller);
        
        const successfulUploads = uploadResults.filter(result => result.success && result.mediaItem);
        uploadedMedia = successfulUploads.map(result => result.mediaItem!);

        // Check if all uploads were successful
        if (successfulUploads.length !== selectedFiles.length) {
          const failedCount = selectedFiles.length - successfulUploads.length;
          const cancelledCount = uploadResults.filter(result => result.error === 'Upload cancelled').length;
          
          if (cancelledCount > 0) {
            alert(`Upload was cancelled. ${cancelledCount} file(s) were not uploaded.`);
          } else {
            alert(`${failedCount} file(s) failed to upload. Post will be created without those files.`);
          }
        }

        setUploadController(null);
        setIsUploading(false);
        // Progress is already set to 100% by the callback
      }

      const tagsArray: string[] = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      let postContent = content.trim();
      if (postType === 'poll') {
        const validOptions = pollOptions.filter(option => option.trim().length > 0);
        postContent = JSON.stringify({
          question: content.trim(),
          options: validOptions
        });
      } else if (postType === 'feedback') {
        const validFields = formFields.filter(field => field.question.trim().length > 0);
        postContent = JSON.stringify({
          description: content.trim(),
          fields: validFields
        });
      }

      const newPost: Omit<Posts, 'id' | 'created_at' | 'updated_at' | 'is_pinned'> = {
        title: title.trim(),
        content: postContent,
        user_id: currentUser.id,
        tags: tagsArray,
        status,
        org_id: organizationId || null,
        post_type: postType,
        media: uploadedMedia.length > 0 ? uploadedMedia : null,
        visibility,
        game_route:
          selectedGame === "quiz"
            ? "/user/dashboard/quiz-selection"
            : selectedGame === "room"
            ? "/user/dashboard/room-game"
            : selectedGame === "flappy"
            ? "/user/dashboard/flappy-challenges"
            : null,
          ...(postType === 'event' && {
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime || null,
          location: eventLocation
        })
      };

      const { data, error } = await supabase
        .from("posts")
        .insert(newPost)
        .select('id')
        .single();

      if (error) {
        console.error(error);
        alert("Error creating post: " + error.message);
      } else {
        // Send notifications if post is published and has an org_id
        if (status === 'published' && newPost.org_id && data) {
          // Fetch org name
          const { data: orgData } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', newPost.org_id)
            .single();
          const orgName = orgData?.name || 'Unknown Organization';
          await sendNotificationsToOrgMembers(newPost.org_id, `New post published from ${orgName}: ${title.trim()}`, data.id);
        }
        resetForm();
        onOpenChange(false);
        onPostCreated();
      }
    } catch (error) {
      console.error(error);
      alert("Error creating post");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }

  function resetForm(): void {
    setTitle("");
    setContent("");
    setTags("");
    setStatus("published");
    setPostType(defaultPostType);
    setSelectedFiles([]);
    setMediaPreviews([]);
    setUploadProgress(0);
    setPollOptions(["", ""]);
    setFormFields([{type: 'text', question: '', required: false}]);
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
    resetForm();
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

  function removeFile(index: number): void {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => {
      // Revoke object URL to prevent memory leaks
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
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
              <div className={`p-2 rounded-lg ${
                postType === 'general' ? 'bg-green-100' :
                postType === 'event' ? 'bg-blue-100' :
                postType === 'poll' ? 'bg-purple-100' :
                'bg-orange-100'
              }`}>
                {postType === 'general' ? <FileText className="w-5 h-5 text-green-600" /> :
                 postType === 'event' ? <CalendarIcon className="w-5 h-5 text-blue-600" /> :
                 postType === 'poll' ? <BarChart3 className="w-5 h-5 text-purple-600" /> :
                 <MessageSquare className="w-5 h-5 text-orange-600" />}
              </div>
              <Dialog.Title className="text-xl font-bold text-gray-900">
                Create {postType === 'general' ? 'General Post' : 
                       postType === 'event' ? 'Event' : 
                       postType === 'poll' ? 'Poll' : 
                       'Feedback Form'}
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
                className={`w-full border border-gray-300 rounded-lg p-3 focus:ring-2 outline-none transition-all ${getFocusRingColor()}`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {postType === 'poll' ? 'Poll Question' : 'Content'}
              </label>
              <textarea
                placeholder={postType === 'poll' ? "Enter your poll question..." : "Write your content here..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full border border-gray-300 rounded-lg p-3 focus:ring-2 outline-none transition-all resize-none ${getFocusRingColor()}`}
                rows={postType === 'poll' ? 3 : 6}
              />
            </div>

            {/* Game Link Selector */}
            {(postType === 'general' || postType === 'event') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link a Game (Optional)</label>
                <select
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                  className={`w-full border border-gray-300 rounded-lg p-3 focus:ring-2 outline-none transition-all ${getFocusRingColor()}`}
                >
                  <option value="">No Game</option>
                  <option value="quiz">Quiz Game</option>
                  <option value="room">Room Game</option>
                  <option value="flappy">Flappy Challenge</option>
                </select>
              </div>
            )}

            {/* Poll Options */}
            {postType === 'poll' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Poll Options</label>
                <div className="space-y-2">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions];
                          newOptions[index] = e.target.value;
                          setPollOptions(newOptions);
                        }}
                        className="flex-1 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = pollOptions.filter((_, i) => i !== index);
                            setPollOptions(newOptions);
                          }}
                          className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add Option
                  </button>
                </div>
              </div>
            )}

            {/* Form Fields */}
            {postType === 'feedback' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Form Fields</label>
                <div className="space-y-3">
                  {formFields.map((field, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex gap-2 mb-3">
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const newFields = [...formFields];
                            newFields[index].type = e.target.value;
                            setFormFields(newFields);
                          }}
                          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                        >
                          <option value="text">Short Text</option>
                          <option value="textarea">Long Text</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                        </select>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => {
                              const newFields = [...formFields];
                              newFields[index].required = e.target.checked;
                              setFormFields(newFields);
                            }}
                          />
                          <span className="text-sm">Required</span>
                        </label>
                        {formFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newFields = formFields.filter((_, i) => i !== index);
                              setFormFields(newFields);
                            }}
                            className="ml-auto p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Enter your question..."
                        value={field.question}
                        onChange={(e) => {
                          const newFields = [...formFields];
                          newFields[index].question = e.target.value;
                          setFormFields(newFields);
                        }}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormFields([...formFields, {type: 'text', question: '', required: false}])}
                    className="flex items-center gap-2 px-3 py-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add Field
                  </button>
                </div>
              </div>
            )}

            {/* Event Details */}
            {postType === 'event' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Date</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      placeholder="Enter event location"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time (Optional)</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <input
                type="text"
                placeholder="Enter tags separated by commas (e.g., tech, programming, tips)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className={`w-full border border-gray-300 rounded-lg p-3 focus:ring-2 outline-none transition-all ${getFocusRingColor()}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`w-full border border-gray-300 rounded-lg p-3 focus:ring-2 outline-none transition-all ${getFocusRingColor()}`}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                className={`w-full border border-gray-300 rounded-lg p-3 focus:ring-2 outline-none transition-all ${getFocusRingColor()}`}
              >
                <option value="public">Public</option>
                <option value="private">Private (Organization members only)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Media (Optional)</label>
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="media-upload"
                  />
                  <label htmlFor="media-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Click to upload photos or videos
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports JPEG, PNG, GIF, WebP images and MP4, WebM, OGG videos (max 50MB each)
                    </p>
                  </label>
                </div>

                {mediaPreviews.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Selected files:</p>
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
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
                          onClick={() => removeFile(index)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove file"
                        >
                          <X size={16} />
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
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
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