import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../../lib/supabase";
import { Heart, Search, ChevronLeft, ChevronRight, Filter, Share2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

import RSVPModal from "../../components/RSVPModal";
import RegisterModal from "../../components/RegisterModal";
import EvaluationModal from "../../components/EvaluateModal";

const colleges: Record<string, string[]> = {
  "College of Business, Economics, Accountancy and Management": [
    "BS Accountancy",
    "BS Accounting Information System",
    "BS Legal Management",
    "BS Entrepreneurship",
    "BS Management Technology",
    "BSBA Financial Management",
    "BSBA Marketing Management",
    "Certificate in Entrepreneurship",
  ],
  "College of Education, Arts and Sciences": [
    "Bachelor of Elementary Education",
    "Bachelor of Secondary Education",
    "AB Communication",
    "Bachelor of Multimedia Arts",
    "BS Biology",
    "BS Forensic Science",
    "BS Mathematics",
    "BS Psychology",
  ],
  "College of International Hospitality and Tourism Management": [
    "BS Hospitality Management",
    "BS Tourism Management",
    "Certificate in Culinary Arts",
  ],
  "College of Information Technology and Engineering": [
    "BS Architecture",
    "BS Computer Engineering",
    "BS Computer Science",
    "BS Electrical Engineering",
    "BS Electronics Engineering",
    "BS Entertainment and Multimedia Computing",
    "BS Industrial Engineering",
    "BS Information Technology",
    "Associate in Computer Technology",
  ],
  "College of Nursing": ["BS Nursing"],
};

function PostCard({ post }: { post: any }) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !post?.media) return;
    const distance = touchStart - touchEnd;
    if (distance > 50 && currentMediaIndex < post.media.length - 1)
      setCurrentMediaIndex(currentMediaIndex + 1);
    if (distance < -50 && currentMediaIndex > 0)
      setCurrentMediaIndex(currentMediaIndex - 1);
  };

  const goToMedia = (index: number) => setCurrentMediaIndex(index);
  const goNext = () => {
    if (currentMediaIndex < post.media.length - 1)
      setCurrentMediaIndex(currentMediaIndex + 1);
  };
  const goPrev = () => {
    if (currentMediaIndex > 0) setCurrentMediaIndex(currentMediaIndex - 1);
  };

  return (
    <div
      className="mt-4 relative overflow-hidden rounded-lg bg-black"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {post?.media?.length > 0 && (
        <>
          {post.media[currentMediaIndex].type === "image" ? (
            <img
              src={post.media[currentMediaIndex].url}
              alt={post.media[currentMediaIndex].filename || "Post media"}
              className="w-full max-h-[70vh] object-contain cursor-pointer"
            />
          ) : (
            <video
              src={post.media[currentMediaIndex].url}
              controls
              preload="metadata"
              className="w-full max-h-[70vh] object-contain"
            />
          )}

          {post.media.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-700/60 hover:bg-gray-700 text-white rounded-full p-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-700/60 hover:bg-gray-700 text-white rounded-full p-2"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {post.media.map((_: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => goToMedia(index)}
                    className={`w-2 h-2 rounded-full ${currentMediaIndex === index ? "bg-white" : "bg-gray-500"
                      }`}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function UserNewsFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState<{ [key: string]: boolean }>({});

  const [showModal, setShowModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [rsvp, setRsvp] = useState<{ [key: string]: boolean }>({});

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registered, setRegistered] = useState<{ [key: string]: boolean }>({});

  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evaluated, setEvaluated] = useState<{ [key: string]: boolean }>({});

  const [pollSelections, setPollSelections] = useState<{ [key: string]: number | null }>({});
  const [pollVotes, setPollVotes] = useState<{ [key: string]: boolean }>({});
  const [pollUserVotes, setPollUserVotes] = useState<{ [key: string]: number | null }>({});

  const [feedbackResponses, setFeedbackResponses] = useState<{ [key: string]: { [key: string]: string } }>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<{ [key: string]: boolean }>({});

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [joinedOrgs, setJoinedOrgs] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const navigate = useNavigate();

  const [viewed, setViewed] = useState<{ [key: string]: boolean }>({});

  const [loading, setLoading] = useState(true);

  const postRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleView = async (postId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId || viewed[postId]) return;

    try {
      await supabase.from("post_views").insert({ user_id: userId, post_id: postId });
      await supabase.rpc(
        "award_user_coins_once",
        { p_user_id: userId, p_post_id: postId, p_action: "view", p_points: 1 }
      );
      setViewed((prev) => ({ ...prev, [postId]: true }));
    } catch (err) {
      // Already viewed
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postId = entry.target.getAttribute('data-post-id');
            if (postId) {
              handleView(postId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    Object.values(postRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [posts, viewed]);

  async function fetchPosts() {
  setLoading(true);
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user?.id) throw new Error(userError?.message || "No user found");
    const userId = user.id;

    // Get the organizations the user is part of
    const { data: memberData, error: memberError } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .eq("is_active", true);
    if (memberError) throw memberError;

    const memberOrgIds = memberData?.map((m) => m.org_id) ?? [];

    // Fetch details of joined organizations
    const { data: joinedOrgData, error: joinedOrgError } = await supabase
      .from("organizations")
      .select("id, name, abbrev_name")
      .in("id", memberOrgIds)
      .eq("status", "active");
    if (joinedOrgError) throw joinedOrgError;
    setJoinedOrgs(joinedOrgData ?? []);

    // Fetch all posts
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select(`
        *,
        organizations!inner (name, abbrev_name, org_pic, status),
        post_likes(user_id),
        post_views(user_id)
      `)
      .eq("organizations.status", "active")
      .order("created_at", { ascending: false });
    if (postsError) throw postsError;

    // Filter posts based on visibility and membership
    const visiblePosts = (postsData ?? []).filter((post: any) => {
      if (post.visibility === "public") return true;
      if (post.visibility === "private" && memberOrgIds.includes(post.org_id)) return true;
      return false;
    });

    // Fetch user-related data
    const [{ data: rsvpData }, { data: registrationData }, { data: pollVoteData }, { data: feedbackData }, { data: viewData }, { data: evalData }] = await Promise.all([
      supabase.from("rsvps").select("post_id").eq("user_id", userId),
      supabase.from("event_registrations").select("post_id").eq("user_id", userId), 
      supabase.from("poll_votes").select("post_id, option_index").eq("user_id", userId),
      supabase.from("form_responses").select("post_id, responses, user_id").eq("user_id", userId),
      supabase.from("post_views").select("post_id").eq("user_id", userId),
      supabase.from("event_evaluations").select("post_id").eq("user_id", userId),
    ]);

    // Build states
    const rsvpState: { [key: string]: boolean } = {};
    const registeredState: { [key: string]: boolean } = {};
    const likedState: { [key: string]: boolean } = {};
    const feedbackResponsesState: { [key: string]: { [key: string]: string } } = {};
    const feedbackSubmittedState: { [key: string]: boolean } = {};
    const newPollUserVotes: { [key: string]: number | null } = {};
    const evaluatedState: { [key: string]: boolean } = {};

    (visiblePosts ?? []).forEach((post: any) => {
      const postIdStr = post.id.toString();

      rsvpState[postIdStr] = rsvpData?.some((r) => r.post_id.toString() === postIdStr) ?? false;
      registeredState[postIdStr] = registrationData?.some((r) => r.post_id.toString() === postIdStr) ?? false; 
      likedState[postIdStr] = post.post_likes?.some((l: any) => l.user_id === userId) ?? false;
      evaluatedState[postIdStr] = evalData?.some((e) => e.post_id.toString() === postIdStr) ?? false;

      const feedback = feedbackData?.find((f: any) => f.post_id.toString() === postIdStr);
      if (feedback) {
        feedbackResponsesState[postIdStr] = feedback.responses || {};
        feedbackSubmittedState[postIdStr] = true;
      } else {
        feedbackResponsesState[postIdStr] = {};
        feedbackSubmittedState[postIdStr] = false;
      }
    });

    (pollVoteData ?? []).forEach((v: any) => {
      newPollUserVotes[v.post_id.toString()] = v.option_index;
    });

    // Set component state
    setPosts(visiblePosts);
    setFilteredPosts(visiblePosts);
    setRsvp(rsvpState);
    setRegistered(registeredState);
    setLiked(likedState);
    setEvaluated(evaluatedState);
    setPollUserVotes(newPollUserVotes);
    setPollVotes(visiblePosts.reduce((acc: any, post: any) => {
      const postIdStr = post.id.toString();
      acc[postIdStr] = newPollUserVotes[postIdStr] != null;
      return acc;
    }, {}));
    setPollSelections({});
    setFeedbackResponses(feedbackResponsesState);
    setFeedbackSubmitted(feedbackSubmittedState);

    const viewedState: { [key: string]: boolean } = {};
    (viewData ?? []).forEach((v: any) => {
      viewedState[v.post_id.toString()] = true;
    });
    setViewed(viewedState);
  } catch (err) {
    console.error("Error fetching posts:", err);
    toast.error("Failed to load posts. Please try again.");
  } finally {
    setLoading(false);
  }
}

  // Handle like/unlike + coins
  const handleLike = async (postId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const isLiked = liked[postId];

      try {
        if (isLiked) {
          // Unlike
          await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
          setLiked((prev) => ({ ...prev, [postId]: false }));
        } else {
          // Like
          await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
          setLiked((prev) => ({ ...prev, [postId]: true }));

          // Award coins
          const { data: rpcData, error: rpcError } = await supabase.rpc(
            "award_user_coins_once",
            { p_user_id: userId, p_post_id: postId, p_action: "like", p_points: 10 }
          );

          if (rpcError) {
            console.error("Error awarding coins:", rpcError);
            toast.error("Liked, but failed to award coins.");
          } else {
            const coinsAwarded = rpcData ?? 0;
            if (coinsAwarded > 0) {
              toast.success(`🎉 You earned ${coinsAwarded} coins for liking!`);
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong.");
      }
    };

    useEffect(() => {
      if (!query) setFilteredPosts(posts);
      else {
        const q = query.toLowerCase();
        setFilteredPosts(
          posts.filter(
            (p) =>
              p.title?.toLowerCase().includes(q) ||
              p.content?.toLowerCase().includes(q) ||
              p.tags?.some((tag: string) => tag.toLowerCase().includes(q))
          )
        );
      }
    }, [query, posts]);

    const formatDate = (dateString: string) =>
      new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    const formatTime = (timeString: string) => {
      if (!timeString) return "";
      const [hour, minute] = timeString.split(":");
      const date = new Date();
      date.setHours(Number(hour), Number(minute));
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    };

    const handleRSVPClick = (post: any) => {
      const now = new Date();
      const eventDateTime = new Date(`${post.event_date}T${post.end_time || "23:59"}`);
      
      if (eventDateTime < now) {
        toast.error("This event has already ended. You cannot RSVP.");
        return;
      }

      if (!rsvp[post.id]) {
        setSelectedPost(post);
        setShowModal(true);
      }
    };

    const handleRegisterClick = (post: any) => {
      const now = new Date();
      const eventEnd = new Date(`${post.event_date}T${post.end_time || "23:59"}`);

      if (eventEnd < now) {
        toast.error("This event has already ended. You cannot register.");
        return;
      }

      if (!registered[post.id]) {
        setSelectedPost(post);
        setShowRegisterModal(true);
      }
    };

    const handleEvaluateClick = (post: any) => {
      const now = new Date();
      const eventStart = new Date(`${post.event_date}T${post.start_time || "00:00"}`);

      if (eventStart > now) {
        toast.error("You can only evaluate after the event has started.");
        return;
      }

      if (!registered[post.id]) {
        toast.error("You must be registered to evaluate this event.");
        return;
      }

      if (!evaluated[post.id]) {
        setSelectedPost(post);
        setShowEvalModal(true);
      }
    };

    function FeedbackPost({
  post,
  feedbackResponses,
  setFeedbackResponses,
  feedbackSubmitted,
  setFeedbackSubmitted,
}: {
  post: any;
  feedbackResponses: { [key: string]: { [key: string]: string } };
  setFeedbackResponses: React.Dispatch<React.SetStateAction<{ [key: string]: { [key: string]: string } }>>;
  feedbackSubmitted: { [key: string]: boolean };
  setFeedbackSubmitted: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
}) {
  const [showButtons, setShowButtons] = useState(false);
  const [localValues, setLocalValues] = useState<{ [key: string]: string }>({});

  const parsed = useMemo(() => JSON.parse(post.content), [post.content]);
  const hasSubmitted = feedbackSubmitted[post.id] ?? false;

  // Initialize localValues with existing responses
  useEffect(() => {
    if (parsed.fields) {
      const initialValues: { [key: string]: string } = {};
      parsed.fields.forEach((f: any, i: number) => {
        initialValues[i] = feedbackResponses[post.id]?.[i] || "";
      });
      setLocalValues(initialValues);
    }
  }, [parsed.fields, feedbackResponses, post.id]);

  const handleInputChange = (index: number, value: string) => {
    setLocalValues((prev) => ({ ...prev, [index]: value }));
  };

  const handleFeedbackSubmit = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      // Make sure all required fields are filled
      const emptyRequired = parsed.fields?.some(
        (f: any, i: number) => f.required && !localValues[i]?.trim()
      );
      if (emptyRequired) {
        toast.error("Please fill out all required fields.");
        return;
      }

      await supabase.from("form_responses").insert({
        post_id: post.id,
        user_id: userId,
        responses: localValues,
        submitted_at: new Date().toISOString(),
      });

      await supabase.rpc("award_user_coins_once", {
        p_user_id: userId,
        p_post_id: post.id,
        p_action: "feedback",
        p_points: 50,
      });

      setFeedbackResponses((prev) => ({ ...prev, [post.id]: localValues }));
      setFeedbackSubmitted((prev) => ({ ...prev, [post.id]: true }));
      setShowButtons(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit feedback.");
    }
  };

  const handleCancel = () => {
    setLocalValues({});
    setShowButtons(false);
  };

  return (
    <div className="mt-2">
      <p className="font-medium text-gray-800">{parsed.description}</p>

      {parsed.fields?.map((field: any, index: number) => (
        <div key={index} className="mt-2">
          <p className="text-gray-700 font-medium">{field.question}</p>
          <textarea
            className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            rows={3}
            value={localValues[index] || ""}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onFocus={() => !hasSubmitted && setShowButtons(true)}
            disabled={hasSubmitted}
            placeholder={hasSubmitted ? "You have already responded." : "Your answer..."}
          />
        </div>
      ))}

      {!hasSubmitted && showButtons && (
        <div className="mt-2 flex space-x-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleFeedbackSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Submit
          </button>
        </div>
      )}

      {hasSubmitted && (
        <p className="mt-2 text-sm text-gray-500">
          You have already responded.
        </p>
      )}
    </div>
  );
}

    function PollPost({
      post,
      pollSelections,
      setPollSelections,
      pollUserVotes,
      setPollUserVotes,
    }: {
      post: any;
      pollSelections: { [key: string]: number | null };
      setPollSelections: React.Dispatch<
        React.SetStateAction<{ [key: string]: number | null }>
      >;
      pollUserVotes: { [key: string]: number | null };
      setPollUserVotes: React.Dispatch<
        React.SetStateAction<{ [key: string]: number | null }>
      >;
    }) {
      const parsed = JSON.parse(post.content);
      const selectedIndex = pollSelections[post.id] ?? null;
      const userVote = pollUserVotes[post.id] ?? null;
      const hasVoted = userVote !== null;

      const handleOptionClick = (index: number) => {
        if (hasVoted) return; // prevent changes if already voted
        setPollSelections((prev) => ({ ...prev, [post.id]: index }));
      };

      const handleSubmitPoll = async () => {
        try {
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id;
          if (!userId || selectedIndex === null) return;

          // Insert vote
          await supabase.from("poll_votes").insert({
            post_id: post.id,
            user_id: userId,
            option_index: selectedIndex,
          });

          // Award coins
          const { data: rpcData, error: rpcError } = await supabase.rpc(
            "award_user_coins_once",
            { p_user_id: userId, p_post_id: post.id, p_action: "poll", p_points: 30 }
          );

          if (rpcError) {
            console.error("Error awarding coins:", rpcError);
          } else if ((rpcData ?? 0) > 0) {
            toast.success(`🎉 You earned ${rpcData} coins for voting!`);
          }

          // Update local state
          setPollUserVotes((prev) => ({ ...prev, [post.id]: selectedIndex }));
          setPollSelections((prev) => ({ ...prev, [post.id]: null }));
        } catch (err) {
          console.error(err);
          toast.error("Failed to submit poll. Try again.");
        }
      };

      return (
        <div className="mt-2">
          <p className="font-medium text-gray-800">{parsed.question}</p>

          <ul className="mt-2 space-y-1">
            {parsed.options.map((opt: string, i: number) => (
              <li
                key={i}
                onClick={() => handleOptionClick(i)}
                className={`border rounded px-3 py-1 cursor-pointer transition-colors ${hasVoted
                    ? i === userVote
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : selectedIndex === i
                      ? "bg-green-600 text-white border-green-600"
                      : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
              >
                {opt}
              </li>
            ))}
          </ul>

          {!hasVoted && selectedIndex !== null && (
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() =>
                  setPollSelections((prev) => ({ ...prev, [post.id]: null }))
                }
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmitPoll}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Submit
              </button>
            </div>
          )}

          {hasVoted && (
            <p className="mt-2 text-sm text-gray-500">
              You voted for: {parsed.options[userVote]}
            </p>
          )}
        </div>
      );
    }

    function sharePost(postId: string) {
      const url = `${window.location.origin}/user/dashboard/posts/${postId}`;
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Post link copied to clipboard!");
      });
    }


    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading posts...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-3 max-w-2xl mx-auto overflow-hidden">
        <Toaster position="top-center" reverseOrder={false} />

        {/* Search Bar + Filter Icon */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search posts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className="h-10 w-10 flex items-center justify-center border border-gray-500 rounded-lg hover:bg-gray-100"
          >
            <Filter className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {filteredPosts.length === 0 ? (
          <p className="text-center text-gray-500 mt-6">No posts found.</p>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              ref={(el) => { postRefs.current[post.id] = el; }}
              data-post-id={post.id}
              className="bg-white shadow rounded-lg p-6 mb-4"
            >
              {/* Header */}
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold overflow-hidden">
                  {post.organizations?.org_pic ? (
                    <img
                      src={post.organizations.org_pic}
                      alt={post.organizations.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (post.organizations?.abbrev_name || "O").slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-semibold text-gray-900">{post.organizations?.name ?? "Organization"}</h3>
                  <p className="text-sm text-gray-500">Posted on {formatDate(post.created_at)} • {post.post_views?.length ?? 0} views</p>
                  {Array.isArray(post.tags) && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {post.tags.map((tag: string, i: number) => (
                        <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="mt-4">
                <h2 className="text-lg font-bold text-gray-900">{post.title}</h2>

                {post.post_type === "general" && <p className="text-gray-700 mt-4">{post.content}</p>}

                {post.post_type === "event" && (
                  <div className="text-gray-700 mt-2 space-y-1">
                    <p>{post.content}</p>
                    <p className="mt-4"><strong>Date:</strong> {new Date(post.event_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                    <p><strong>Time:</strong> {formatTime(post.start_time)} – {formatTime(post.end_time)}</p>
                    <p><strong>Location:</strong> {post.location}</p>

                    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleRSVPClick(post)}
                          disabled={rsvp[post.id] || new Date(`${post.event_date}T${post.end_time || "23:59"}`) < new Date()}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            rsvp[post.id] || new Date(`${post.event_date}T${post.end_time || "23:59"}`) < new Date()
                              ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          {rsvp[post.id] ? "RSVP'd" : "RSVP"}
                        </button>

                        <button
                          onClick={() => handleRegisterClick(post)}
                          disabled={
                            registered[post.id] ||
                            new Date(`${post.event_date}T${post.end_time || "23:59"}`) < new Date()
                          }
                          className={`px-4 py-2 rounded-md transition-colors ${
                            registered[post.id] ||
                            new Date(`${post.event_date}T${post.end_time || "23:59"}`) < new Date()
                              ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          {registered[post.id] ? "Registered" : "Register"}
                        </button>

                        <button
                          onClick={() => handleEvaluateClick(post)}
                          disabled={
                            evaluated[post.id] ||
                            !registered[post.id] ||
                            new Date(`${post.event_date}T${post.start_time || "00:00"}`) > new Date()
                          }
                          className={`px-4 py-2 rounded-md transition-colors ${
                            evaluated[post.id] ||
                            !registered[post.id] ||
                            new Date(`${post.event_date}T${post.start_time || "00:00"}`) > new Date()
                              ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          {evaluated[post.id] ? "Evaluated" : "Evaluate"}
                        </button>
                      </div>

                      <div className="flex gap-4 mt-3 sm:mt-0 sm:justify-end">
                        <button
                          onClick={() => sharePost(post.id)}
                          className="flex items-center text-gray-500 hover:text-green-700 transition-all"
                        >
                          <Share2 className="w-5 h-5 mr-1" />
                          Share
                        </button>
                        
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center text-gray-500 hover:text-green-700 transition-all ${
                            liked[post.id] ? "text-green-600" : ""
                          }`}
                        >
                          <Heart className="w-5 h-5 mr-1" />
                          Like
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {/* Game Link */}
                {post.game_route && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-indigo-700 mb-2">🎮 Ready to Play?</p>
                    <button
                      onClick={() => navigate(post.game_route)}
                      className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>
                        Play{" "}
                        {post.game_route === "/user/dashboard/quiz-selection"
                          ? "Quiz Game"
                          : post.game_route === "/user/dashboard/room-game"
                          ? "Room Game"
                          : post.game_route === "/user/dashboard/flappy-challenges"
                          ? "Flappy Challenge"
                          : "Game"}
                      </span>
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {post.post_type === "poll" && (
                  <PollPost
                    post={post}
                    pollSelections={pollSelections}
                    setPollSelections={setPollSelections}
                    pollUserVotes={pollUserVotes}
                    setPollUserVotes={setPollUserVotes}
                  />
                )}

                {post.post_type === "feedback" && (
                  <FeedbackPost
                    post={post}
                    feedbackResponses={feedbackResponses}
                    setFeedbackResponses={setFeedbackResponses}
                    feedbackSubmitted={feedbackSubmitted}
                    setFeedbackSubmitted={setFeedbackSubmitted}
                  />
                )}
              </div>

              <PostCard post={post} />

              {post.post_type !== "event" && (
                <div className="mt-4 flex justify-end">
                  <button
                      onClick={() => sharePost(post.id)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-500 rounded-lg hover:text-green-700 transition-all"
                    >
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center transition-colors ${liked[post.id] ? "text-red-500" : "text-gray-500 hover:text-red-500"
                      }`}
                  >
                    <Heart
                      className="h-5 w-5 mr-1"
                      color={liked[post.id] ? "red" : "currentColor"}
                      fill={liked[post.id] ? "red" : "none"}
                    />
                    {liked[post.id] ? "Liked" : "Like"}
                  </button>
                </div>
              )}

              <RSVPModal
                showModal={showModal}
                selectedPost={selectedPost}
                setRsvp={setRsvp}
                setShowModal={setShowModal}
              />

              <RegisterModal
                showModal={showRegisterModal}
                selectedPost={selectedPost}
                setRegistered={setRegistered}
                setRsvp={setRsvp}
                setShowModal={setShowRegisterModal}
                colleges={colleges}
                rsvp={rsvp}
              />

              <EvaluationModal
                showModal={showEvalModal}
                selectedPost={selectedPost}
                evaluated={evaluated}
                setEvaluated={setEvaluated}
                setShowModal={setShowEvalModal}
              />
            </div>
          ))
        )}

        {showFilterModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-80 shadow-lg">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Filter Posts</h2>

              {/* Organization Dropdown */}
              <label className="block text-sm text-gray-600 mb-1">Organization</label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 mb-4"
              >
                <option value="">All</option>
                {joinedOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.abbrev_name || org.name}
                  </option>
                ))}
              </select>

              {/* Post Type Dropdown */}
              <label className="block text-sm text-gray-600 mb-1">Post Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 mb-4"
              >
                <option value="">All</option>
                <option value="general">General</option>
                <option value="event">Event</option>
                <option value="poll">Poll</option>
                <option value="feedback">Feedback</option>
              </select>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setSelectedOrg("");
                    setSelectedType("");
                    setFilteredPosts(posts);
                    setShowFilterModal(false);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Reset
                </button>

                <button
                  onClick={() => {
                    let filtered = [...posts];
                    if (selectedOrg) filtered = filtered.filter(p => p.org_id === selectedOrg);
                    if (selectedType) filtered = filtered.filter(p => p.post_type === selectedType);
                    setFilteredPosts(filtered);
                    setShowFilterModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Filter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
