// OrganizationPosts.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Plus, Search, Loader2, Edit3 } from "lucide-react";
import type { Posts, PostType } from '../../types/database.types';
import { useUserRoles } from '../../utils/roles';
import toast from 'react-hot-toast';
import CreatePostModal from './CreatePostModal';
import EditPostModal from './EditPostModal';
import DeletePostModal from './DeletePostModal';
import ResponsesModal from './ResponsesModal';
import PostCard from './PostCard';

interface OrganizationPostsProps {
  organizationId: string;
}

// Type for the user object from Supabase auth
interface AuthUser {
  id: string;
  email?: string;
}

export default function OrganizationPosts({ organizationId }: OrganizationPostsProps) {
  const [posts, setPosts] = useState<Posts[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Posts[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [responsesModalOpen, setResponsesModalOpen] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<Posts | null>(null);
  const [selectedPostType, setSelectedPostType] = useState<PostType>("general");

  // Get user roles
  const { isAdmin, loading: rolesLoading } = useUserRoles(currentUser?.id);
  const [isAdviser, setIsAdviser] = useState(false);
  const [isOfficer, setIsOfficer] = useState(false);

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
      
      if (user) {
        // Fetch all manager roles for this user in the organization
        const { data: managerRoles, error } = await supabase
          .from('org_managers')
          .select('manager_role')
          .eq('user_id', user.id)
          .eq('org_id', organizationId);
        
        if (!error && managerRoles) {
          const roles = managerRoles.map(role => role.manager_role);
          setIsAdviser(roles.includes('adviser'));
          setIsOfficer(roles.includes('officer'));
        } else {
          setIsAdviser(false);
          setIsOfficer(false);
        }
      }
    } catch (err) {
      console.error('Failed to get current user:', err);
      setIsAdviser(false);
      setIsOfficer(false);
    }
  }

  async function fetchPosts(): Promise<void> {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id, title, content, created_at, updated_at, user_id, tags, 
          status, is_pinned, org_id, media, post_type, visibility, game_route,
          post_views(user_id)
        `)
        .eq('org_id', organizationId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setPosts(data as Posts[] || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }  function filterAndSortPosts(): void {
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
      let aValue: any;
      let bValue: any;
      
      if (sortBy === "views") {
        aValue = a.post_views?.length ?? 0;
        bValue = b.post_views?.length ?? 0;
      } else {
        aValue = a[sortBy as keyof Posts];
        bValue = b[sortBy as keyof Posts];
      }
      
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
      toast.success('Post pin status updated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle pin');
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

  function handleViewResponses(post: Posts): void {
    setSelectedPost(post);
    setResponsesModalOpen(true);
  }

  // Handle create post button clicks
  const handleCreatePost = (postType: PostType) => {
    setSelectedPostType(postType);
    // Use setTimeout to ensure state update before opening modal
    setTimeout(() => setCreateModalOpen(true), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Organization Posts</h3>
            <p className="text-gray-600 text-sm mt-1">Share updates, announcements, and news with your organization</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            { (isAdmin() || isOfficer) && (
              <>
                <button 
                  onClick={() => handleCreatePost("general")}
                  className="flex flex-col items-center gap-2 p-4 bg-green-600 text-white rounded-xl shadow-sm hover:bg-green-700 transition-all duration-200 hover:shadow-md hover:scale-105"
                >
                  <Plus size={24} />
                  <span className="text-sm font-medium">General Post</span>
                </button>
                <button 
                  onClick={() => handleCreatePost("event")}
                  className="flex flex-col items-center gap-2 p-4 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-all duration-200 hover:shadow-md hover:scale-105"
                >
                  <Plus size={24} />
                  <span className="text-sm font-medium">Event</span>
                </button>
                <button 
                  onClick={() => handleCreatePost("poll")}
                  className="flex flex-col items-center gap-2 p-4 bg-purple-600 text-white rounded-xl shadow-sm hover:bg-purple-700 transition-all duration-200 hover:shadow-md hover:scale-105"
                >
                  <Plus size={24} />
                  <span className="text-sm font-medium">Poll</span>
                </button>
                <button 
                  onClick={() => handleCreatePost("feedback")}
                  className="flex flex-col items-center gap-2 p-4 bg-orange-600 text-white rounded-xl shadow-sm hover:bg-orange-700 transition-all duration-200 hover:shadow-md hover:scale-105"
                >
                  <Plus size={24} />
                  <span className="text-sm font-medium">Feedback Form</span>
                </button>
              </>
            )}
          </div>
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
            <option value="views_desc">Most Views</option>
          </select>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-green-600" />
            <p className="text-gray-500">Loading posts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
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
                : isAdviser
                  ? "Contact an administrator to create posts for your organization"
                  : "Be the first to share something with your organization!"
              }
            </p>
          </div>
        ) : (
          filteredPosts.map((post: Posts) => (
            <PostCard
              key={post.id}
              post={post}
              onView={(postId) => {
                window.location.href = `/admin/dashboard/posts/${postId}`;
              }}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              onPin={togglePin}
              onTagClick={setSelectedTag}
              onViewResponses={handleViewResponses}
              isOwner={isPostOwner(post)}
              isAdmin={isAdmin() || isOfficer}
              isOfficer={isOfficer}
              showOrgInfo={false}
              poster={(post as any).users}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <CreatePostModal
        key={selectedPostType}
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onPostCreated={fetchPosts}
        currentUser={currentUser}
        defaultPostType={selectedPostType}
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

      <ResponsesModal
        open={responsesModalOpen}
        onOpenChange={setResponsesModalOpen}
        post={selectedPost}
      />
    </div>
  );
}