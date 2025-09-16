// OrganizationPosts.tsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Plus, Search, Tag, Eye, Pin, Calendar, User, Edit3, Trash2, MoreVertical } from "lucide-react";
import type { Posts } from '../types/database.types';
import CreatePostModal from './CreatePostModal';
import EditPostModal from './EditPostModal';
import DeletePostModal from './DeletePostModal';

interface OrganizationPostsProps {
  organizationId: string;
  onError: (error: string) => void;
}

// Type for the user object from Supabase auth
interface AuthUser {
  id: string;
  email?: string;
}

export default function OrganizationPosts({ organizationId, onError }: OrganizationPostsProps) {
  const [posts, setPosts] = useState<Posts[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Posts[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [sortBy, setSortBy] = useState<keyof Posts>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, [organizationId]);

  useEffect(() => {
    filterAndSortPosts();
  }, [posts, searchTerm, selectedTag, sortBy, sortOrder, statusFilter]);

  async function getCurrentUser(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (err) {
      console.error('Failed to get current user:', err);
    }
  }

  async function fetchPosts(): Promise<void> {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id, title, content, created_at, updated_at, user_id, tags, 
          status, view_count, is_pinned, org_id
        `)
        .eq('org_id', organizationId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setPosts(data as Posts[] || []);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
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

    // Sort
    filtered.sort((a: Posts, b: Posts) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      
      if (sortBy === "created_at" || sortBy === "updated_at") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPosts(filtered);
  }

  async function incrementViewCount(postId: string): Promise<void> {
    try {
      await supabase.rpc('increment_view_count', { post_id: postId });
      fetchPosts();
    } catch (err) {
      console.error('Failed to increment view count:', err);
    }
  }

  async function togglePin(postId: string, currentPinned: boolean): Promise<void> {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_pinned: !currentPinned })
        .eq('id', postId)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      fetchPosts();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to toggle pin');
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Organization Posts</h3>
            <p className="text-gray-600 text-sm mt-1">Share updates, announcements, and news with your organization</p>
          </div>
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors"
          >
            <Plus size={18} />
            Create Post
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
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
          <div className="bg-white rounded-lg shadow p-12 text-center">
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
                : "Be the first to share something with your organization!"
              }
            </p>
          </div>
        ) : (
          filteredPosts.map((post: Posts) => (
            <div
              key={post.id}
              className={`bg-white rounded-lg shadow border hover:shadow-md transition-all duration-200 p-6 ${post.is_pinned ? 'ring-2 ring-green-200 bg-green-50' : ''}`}
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

      {/* Stats 
      {posts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
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
      )}*/}

      {/* Modals */}
      <CreatePostModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onPostCreated={fetchPosts}
        currentUser={currentUser}
        organizationId={organizationId}
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