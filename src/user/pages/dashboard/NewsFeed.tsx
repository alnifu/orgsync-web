import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";;
import { Heart, X, Search } from "lucide-react";
import type { Posts } from "../../../types/database.types";

interface PostWithEvent extends Posts {
  events?: {
    event_type: string;
    event_date: string;
    event_time: string;
    location: string;
  } | null;
}

export default function NewsFeed() {
  const [posts, setPosts] = useState<PostWithEvent[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithEvent[]>([]);
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState<{ [key: string]: boolean }>({});
  const [rsvp, setRsvp] = useState<{ [key: string]: boolean }>({});
  const [registered, setRegistered] = useState<{ [key: string]: boolean }>({});
  const [showModal, setShowModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithEvent | null>(null);

  // Registration modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    program: "",
    section: "",
  });

  // Fetch posts
  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        user_id,
        org_id,
        type,
        title,
        content,
        tags,
        status,
        view_count,
        is_pinned,
        created_at,
        updated_at,
        events (
          event_type,
          event_date,
          event_time,
          location
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      return;
    }

    const normalized: PostWithEvent[] = data.map((post: any) => ({
      ...post,
      events: post.events ?? null,
    }));

    setPosts(normalized);
    setFilteredPosts(normalized);
  }

  // Search filter
  useEffect(() => {
    if (!query) {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(
        posts.filter(
          (post) =>
            post.title.toLowerCase().includes(query.toLowerCase()) ||
            post.content.toLowerCase().includes(query.toLowerCase()) ||
            (post.tags &&
              post.tags.some((tag) =>
                tag.toLowerCase().includes(query.toLowerCase())
              )) ||
            (post.type === "event" &&
              post.events?.event_type
                ?.toLowerCase()
                .includes(query.toLowerCase()))
        )
      );
    }
  }, [query, posts]);

  const handleLike = (postId: string) => {
    setLiked((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleRSVPClick = (post: PostWithEvent) => {
    if (!rsvp[post.id]) {
      setSelectedPost(post);
      setShowModal(true);
    }
  };

  const confirmRSVP = () => {
    if (selectedPost) {
      setRsvp((prev) => ({ ...prev, [selectedPost.id]: true }));
    }
    setShowModal(false);
  };

  const cancelRSVP = () => {
    setShowModal(false);
  };

  // Registration handlers
  const handleRegisterClick = (post: PostWithEvent) => {
    if (!registered[post.id]) {
      setSelectedPost(post);
      setShowRegisterModal(true);
    }
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterData((prev) => ({ ...prev, [name]: value }));
  };

  const submitRegistration = () => {
    if (selectedPost) {
      console.log("Registering:", registerData, "for post:", selectedPost?.id);
      // TODO: Save registration in Supabase table

      // Mark post as registered
      setRegistered((prev) => ({ ...prev, [selectedPost.id]: true }));
    }
    setRegisterData({ name: "", email: "", program: "", section: "" });
    setShowRegisterModal(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatReadableDateTime = (dateString: string, timeString?: string) => {
    try {
      if (timeString) {
        const dateTime = new Date(`${dateString}T${timeString}`);
        return dateTime.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      } else {
        return new Date(dateString).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-3 max-w-2xl mx-auto">
      {/* 🔍 Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts..."
            className="w-full pl-10 pr-4 py-2 border border-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Posts */}
      {filteredPosts.length === 0 ? (
        <div className="text-center text-gray-500 mt-6">No posts found</div>
      ) : (
        filteredPosts.map((post) => (
          <div key={post.id} className="bg-white shadow rounded-lg p-6 mb-4">
            {/* Header */}
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                {post.org_id ? post.org_id.slice(0, 2).toUpperCase() : "O"}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {post.org_id ?? "Officer"}
                </h3>
                <p className="text-sm text-gray-500">
                  Posted on {formatDate(post.created_at)}
                </p>
                {post.type === "event" && post.events ? (
                  <span className="inline-block mt-2 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded">
                    {post.events.event_type}
                  </span>
                ) : (
                  post.tags &&
                  post.tags.length > 0 && (
                    <span className="inline-block mt-2 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                      {post.tags[0]}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Body */}
            <div className="mt-4">
              <h2 className="text-lg font-bold text-gray-900">{post.title}</h2>
              <p className="text-gray-700 mt-2">{post.content}</p>

              {post.type === "event" && post.events && (
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">When:</span>{" "}
                    {formatReadableDateTime(
                      post.events.event_date,
                      post.events.event_time
                    )}
                  </p>
                  <p>
                    <span className="font-medium">Location:</span>{" "}
                    {post.events.location}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between">
              {post.type === "event" && post.events && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRSVPClick(post)}
                    disabled={rsvp[post.id]}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      rsvp[post.id]
                        ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {rsvp[post.id] ? "RSVP'd" : "RSVP"}
                  </button>

                  <button
                    onClick={() => handleRegisterClick(post)}
                    disabled={registered[post.id]}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      registered[post.id]
                        ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {registered[post.id] ? "Registered" : "Register"}
                  </button>
                </div>
              )}

              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center transition-colors ${
                  liked[post.id]
                    ? "text-red-500"
                    : "text-gray-500 hover:text-red-500"
                }`}
              >
                <Heart
                  className={`h-5 w-5 mr-1 ${
                    liked[post.id] ? "fill-red-500" : ""
                  }`}
                />
                {liked[post.id] ? "Liked" : "Like"}
              </button>
            </div>
          </div>
        ))
      )}

      {/* RSVP Modal */}
      {showModal && selectedPost && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">RSVP</h2>
              <button
                onClick={cancelRSVP}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              RSVP to "{selectedPost.title}" to show you are interested in
              attending! Continue?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelRSVP}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                No
              </button>
              <button
                onClick={confirmRSVP}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && selectedPost && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Register for {selectedPost.title}
              </h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                name="name"
                value={registerData.name}
                onChange={handleRegisterChange}
                placeholder="Full Name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500"
              />
              <input
                type="email"
                name="email"
                value={registerData.email}
                onChange={handleRegisterChange}
                placeholder="Email"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500"
              />
              <input
                type="text"
                name="program"
                value={registerData.program}
                onChange={handleRegisterChange}
                placeholder="Program"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500"
              />
              <input
                type="text"
                name="section"
                value={registerData.section}
                onChange={handleRegisterChange}
                placeholder="Section"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowRegisterModal(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={submitRegistration}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
