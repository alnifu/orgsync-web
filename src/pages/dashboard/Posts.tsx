import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Search, Tag, Eye, Pin, Calendar, User, Edit3, Trash2, MoreVertical } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { Posts, PostType, FormPost, PollPost, EventPost, GeneralPost, BasePost } from '../../types/database.types';
import CreatePostModal from '../../components/CreatePostModal';
import EditPostModal from '../../components/EditPostModal';
import DeletePostModal from '../../components/DeletePostModal';

// Type for the user object from Supabase auth
interface AuthUser {
  id: string;
  email?: string;
}

export default function PostsComponent() {
  const [posts, setPosts] = useState<Posts[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Posts[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [sortBy, setSortBy] = useState<keyof BasePost>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [postTypeFilter, setPostTypeFilter] = useState<PostType | "all">("all");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<Posts | null>(null);

  // Get all unique tags from posts
  const allTags: string[] = [...new Set(posts.flatMap(post => post.tags || []))];

  useEffect(() => {
    fetchPosts();
    getCurrentUser();
  }, []);

  useEffect(() => {
    filterAndSortPosts();
  }, [posts, searchTerm, selectedTag, sortBy, sortOrder, statusFilter, postTypeFilter]);

  async function getCurrentUser(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  async function fetchPosts(): Promise<void> {
    console.log("Fetching posts...");
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        form_posts(*),
        poll_posts(*),
        event_posts(
          id, start_date, end_date, location, max_participants,
          participants:event_participants(user_id)
        )
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching posts:", error);
      return;
    }
    
    console.log("Raw posts data:", data);
    
    if (data) {
      // Transform the data to match our Posts type
      const transformedData = data.map(post => {
        const basePost = {
          id: post.id,
          title: post.title,
          content: post.content,
          created_at: post.created_at,
          updated_at: post.updated_at,
          user_id: post.user_id,
          tags: post.tags,
          status: post.status as "published" | "draft" | "archived" | null,
          view_count: post.view_count,
          is_pinned: post.is_pinned,
          org_id: post.org_id,
          post_type: post.post_type as PostType
        } as BasePost;

        // Add type-specific data
        switch (basePost.post_type) {
          case 'Forms': {
            const formDetails = post.form_posts?.[0];
            if (formDetails) {
              return {
                ...basePost,
                post_type: 'Forms' as const,
                form_url: formDetails.form_url,
                deadline: formDetails.deadline,
                required_fields: formDetails.required_fields
              } satisfies FormPost;
            }
            break;
          }

          case 'Polls': {
            const pollDetails = post.poll_posts?.[0];
            if (pollDetails) {
              return {
                ...basePost,
                post_type: 'Polls' as const,
                options: pollDetails.options,
                multiple_choice: pollDetails.multiple_choice,
                end_date: pollDetails.end_date,
                results: pollDetails.results
              } satisfies PollPost;
            }
            break;
          }

          case 'Events': {
            const eventDetails = post.event_posts?.[0];
            if (eventDetails) {
              const participants = eventDetails.participants?.map(p => p.user_id) || [];
              return {
                ...basePost,
                post_type: 'Events' as const,
                start_date: eventDetails.start_date,
                end_date: eventDetails.end_date,
                location: eventDetails.location,
                max_participants: eventDetails.max_participants,
                participants
              } satisfies EventPost;
            }
            break;
          }
        }

        // Default to General post
        return {
          ...basePost,
          post_type: 'General' as const
        } satisfies GeneralPost;
      });

      setPosts(transformedData);
    }
  }

  function filterAndSortPosts(): void {
    let filtered: Posts[] = [...posts];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.tags && post.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    // Tag filter
    if (selectedTag) {
      filtered = filtered.filter(post => post.tags && post.tags.includes(selectedTag));
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(post => post.status === statusFilter);
    }

    // Post type filter
    if (postTypeFilter !== "all") {
      filtered = filtered.filter(post => post.post_type === postTypeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      // These properties are guaranteed to exist in all post types
      const commonProps = {
        created_at: (post: Posts) => post.created_at,
        updated_at: (post: Posts) => post.updated_at,
        title: (post: Posts) => post.title,
        view_count: (post: Posts) => post.view_count || 0
      };

      const getter = commonProps[sortBy as keyof typeof commonProps];
      if (!getter) return 0;

      const aValue = getter(a);
      const bValue = getter(b);

      // Handle null values
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;

      if (sortBy === "created_at" || sortBy === "updated_at") {
        const dateA = new Date(aValue as string).getTime();
        const dateB = new Date(bValue as string).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    setFilteredPosts(filtered);
  }

  async function incrementViewCount(postId: string): Promise<void> {
    await supabase.rpc('increment_view_count', { post_id: postId });
    fetchPosts();
  }

  async function togglePin(postId: string, currentPinned: boolean): Promise<void> {
    if (!currentUser) return;
    
    const { error } = await supabase
      .from('posts')
      .update({ is_pinned: !currentPinned })
      .eq('id', postId)
      .eq('user_id', currentUser.id);
    
    if (!error) fetchPosts();
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusColor(status: string | null): string {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function handleEditPost(post: Posts): void {
    setSelectedPost(post);
    setEditModalOpen(true);
  }

  function handleDeletePost(post: Posts): void {
    setSelectedPost(post);
    setDeleteModalOpen(true);
  }

  function isPostOwner(post: Posts): boolean {
    return currentUser?.id === post.user_id;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
              <p className="text-gray-600 mt-1">Share your thoughts and ideas with the community</p>
            </div>
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-all duration-200 hover:shadow-md"
            >
              <Plus size={20} />
              Create Post
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
            </div>
            
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('_');
                setSortBy(field as keyof Posts);
                setSortOrder(order as "asc" | "desc");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            >
              <option value="created_at_desc">Newest First</option>
              <option value="created_at_asc">Oldest First</option>
              <option value="title_asc">Title A-Z</option>
              <option value="title_desc">Title Z-A</option>
              <option value="view_count_desc">Most Views</option>
            </select>
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Edit3 className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-500 text-lg">
                {searchTerm || selectedTag || statusFilter !== "all" 
                  ? "No posts match your filters" 
                  : "No posts yet"
                }
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm || selectedTag || statusFilter !== "all" 
                  ? "Try adjusting your search or filters"
                  : "Be the first to share something!"
                }
              </p>
            </div>
          ) : (
            filteredPosts.map((post: Posts) => (
              <div
                key={post.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 ${post.is_pinned ? 'ring-2 ring-green-200 bg-green-50' : ''}`}
                onClick={() => incrementViewCount(post.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {post.is_pinned && (
                        <Pin size={16} className="text-green-600 fill-current" />
                      )}
                      <h3 className="text-xl font-semibold text-gray-900 hover:text-green-600 transition-colors cursor-pointer">
                        {post.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                        {post.status}
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{post.content}</p>
                  </div>
                  
                  {/* Actions Menu */}
                  <div className="flex items-center gap-2">
                    {isPostOwner(post) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(post.id, post.is_pinned || false);
                        }}
                        className={`p-2 rounded-lg transition-colors ${post.is_pinned ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={post.is_pinned ? 'Unpin post' : 'Pin post'}
                      >
                        <Pin size={16} className={post.is_pinned ? 'fill-current' : ''} />
                      </button>
                    )}
                    
                    {isPostOwner(post) && (
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                            title="More actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content 
                            className="min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50"
                            sideOffset={5}
                          >
                            <DropdownMenu.Item
                              onClick={() => handleEditPost(post)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer outline-none"
                            >
                              <Edit3 size={14} />
                              Edit Post
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                            <DropdownMenu.Item
                              onClick={() => handleDeletePost(post)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md cursor-pointer outline-none"
                            >
                              <Trash2 size={14} />
                              Delete Post
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    )}
                  </div>
                </div>

                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-200 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTag(tag);
                        }}
                      >
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      <span>{post.user_id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                    {post.updated_at && post.updated_at !== post.created_at && (
                      <span className="text-xs">
                        (edited {formatDate(post.updated_at)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      <span>{post.view_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        {posts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{posts.length}</div>
                <div className="text-sm text-gray-500">Total Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{posts.filter(p => p.status === 'published').length}</div>
                <div className="text-sm text-gray-500">Published</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{allTags.length}</div>
                <div className="text-sm text-gray-500">Unique Tags</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{posts.reduce((sum, p) => sum + (p.view_count || 0), 0)}</div>
                <div className="text-sm text-gray-500">Total Views</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreatePostModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onPostCreated={fetchPosts}
        currentUser={currentUser}
      />
      
      <EditPostModal
        post={selectedPost}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onPostUpdated={fetchPosts}
      />
      
      <DeletePostModal
        post={selectedPost}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onPostDeleted={fetchPosts}
      />
    </div>
  );
}