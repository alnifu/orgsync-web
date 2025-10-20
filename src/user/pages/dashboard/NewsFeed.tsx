import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { Heart, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
                    className={`w-2 h-2 rounded-full ${
                      currentMediaIndex === index ? "bg-white" : "bg-gray-500"
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

export default function NewsFeed() {
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

  const [feedbackResponses, setFeedbackResponses] = useState<{ [key: string]: string }>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user?.id) throw new Error(userError?.message || "No user found");
      const userId = user.id;

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          organizations (name, abbrev_name, org_pic),
          post_likes(user_id)
        `)
        .order("created_at", { ascending: false });
      if (postsError) throw postsError;

      // Fetch RSVPs
      const { data: rsvpData, error: rsvpError } = await supabase
        .from("rsvps")
        .select("post_id")
        .eq("user_id", userId);
      if (rsvpError) throw rsvpError;

      // Fetch existing poll votes for this user
      const { data: pollVoteData, error: pollVoteError } = await supabase
        .from("poll_votes")
        .select("post_id, option_index")
        .eq("user_id", userId);
      if (pollVoteError) throw pollVoteError;

      // Fetch feedback responses
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("form_responses")
        .select("post_id, responses, user_id")
        .eq("user_id", userId);
      if (feedbackError) console.error("Error fetching feedback:", feedbackError);

      // Map post_id → selected option index for polls
      const newPollUserVotes: { [key: string]: number | null } = {};
      (pollVoteData ?? []).forEach((v: any) => {
        newPollUserVotes[v.post_id.toString()] = v.option_index;
      });

      const newPollVotes: { [key: string]: boolean } = {};
      (postsData ?? []).forEach((post: any) => {
        const postIdStr = post.id.toString();
        newPollVotes[postIdStr] = newPollUserVotes[postIdStr] != null;
      });

      // Build state maps for RSVPs, likes, and feedback
      const rsvpState: { [key: string]: boolean } = {};
      const likedState: { [key: string]: boolean } = {};
      const feedbackResponsesState: { [key: string]: string } = {};
      const feedbackSubmittedState: { [key: string]: boolean } = {};

      (postsData ?? []).forEach((post: any) => {
        const postIdStr = post.id.toString();

        // RSVPs
        rsvpState[postIdStr] = rsvpData?.some((r) => r.post_id.toString() === postIdStr) ?? false;

        // Likes
        likedState[postIdStr] = post.post_likes?.some((l: any) => l.user_id === userId) ?? false;

        // Feedback
        const feedback = feedbackData?.find((f: any) => f.post_id.toString() === postIdStr);
        if (feedback) {
          feedbackResponsesState[postIdStr] = feedback.responses?.answer || "";
          feedbackSubmittedState[postIdStr] = true;
        } else {
          feedbackResponsesState[postIdStr] = "";
          feedbackSubmittedState[postIdStr] = false;
        }
      });

      // Update component state
      setPosts(postsData ?? []);
      setFilteredPosts(postsData ?? []);
      setRsvp(rsvpState);
      setLiked(likedState);
      setPollUserVotes(newPollUserVotes);
      setPollVotes(newPollVotes);
      setPollSelections({}); // reset selections
      setFeedbackResponses(feedbackResponsesState);
      setFeedbackSubmitted(feedbackSubmittedState);
    } catch (err) {
      console.error("Error fetching posts:", err);
      toast.error("Failed to load posts. Please try again.");
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
    if (!rsvp[post.id]) {
      setSelectedPost(post);
      setShowModal(true);
    }
  };

  const handleRegisterClick = (post: any) => {
    if (!registered[post.id]) {
      setSelectedPost(post);
      setShowRegisterModal(true);
    }
  };

  const handleEvaluateClick = (post: any) => {
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
    feedbackResponses: { [key: string]: string };
    setFeedbackResponses: React.Dispatch<
      React.SetStateAction<{ [key: string]: string }>
    >;
    feedbackSubmitted: { [key: string]: boolean };
    setFeedbackSubmitted: React.Dispatch<
      React.SetStateAction<{ [key: string]: boolean }>
    >;
  }) {
    const [showButtons, setShowButtons] = useState(false);
    const [localValue, setLocalValue] = useState(feedbackResponses[post.id] ?? "");

    // Parse content safely
    let parsed: any = {};
    try {
      parsed = JSON.parse(post.content);
    } catch (err) {
      console.error("Invalid feedback content JSON:", err);
    }

    const hasSubmitted = feedbackSubmitted[post.id] ?? false;

    // Keep localValue in sync when responses update externally
    useEffect(() => {
      if (feedbackResponses[post.id] !== undefined) {
        setLocalValue(feedbackResponses[post.id]);
      }
    }, [feedbackResponses, post.id]);

    const handleFeedbackSubmit = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId || !localValue.trim()) return;

        // Get the question text from parsed.fields
        const questionText =
          parsed.fields?.length > 0 ? parsed.fields[0].question : "Feedback";

        // Create a response object like:
        // { "What cafeteria meals do you eat?": "Drugs" }
        const formattedResponse = {
          [questionText]: localValue,
        };

        await supabase.from("form_responses").insert({
          post_id: post.id,
          user_id: userId,
          responses: formattedResponse,
          submitted_at: new Date().toISOString(),
        });

        // Award coins
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "award_user_coins_once",
          {
            p_user_id: userId,
            p_post_id: post.id,
            p_action: "feedback",
            p_points: 50,
          }
        );

        if (rpcError) console.error("Error awarding coins:", rpcError);
        else if ((rpcData ?? 0) > 0)
          toast.success(`🎉 You earned ${rpcData} coins for responding!`);

        // Persist locally
        setFeedbackResponses((prev) => ({ ...prev, [post.id]: localValue }));
        setFeedbackSubmitted((prev) => ({ ...prev, [post.id]: true }));
        setShowButtons(false);
      } catch (err) {
        console.error(err);
        toast.error("Failed to submit feedback. Try again.");
      }
    };

    const handleCancel = () => {
      setLocalValue("");
      setShowButtons(false);
    };

    return (
      <div className="mt-2">
        {/* Show the feedback topic */}
        <p className="font-medium text-gray-800">{parsed.description}</p>

        {/* Show the feedback question if available */}
        {parsed.fields?.length > 0 && (
          <p className="text-gray-600 text-sm mt-1 italic">
            {parsed.fields[0].question}
          </p>
        )}

        <textarea
          className="w-full mt-2 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-green-500 outline-none"
          rows={4}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => !hasSubmitted && setShowButtons(true)}
          disabled={hasSubmitted}
          placeholder={
            hasSubmitted
              ? "You have already responded."
              : "Write your feedback here..."
          }
        />

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
              className={`border rounded px-3 py-1 cursor-pointer transition-colors ${
                hasVoted
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

  return (
    <div className="p-3 max-w-2xl mx-auto overflow-hidden">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Search Bar */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search posts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
      </div>

      {filteredPosts.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">No posts found.</p>
      ) : (
        filteredPosts.map((post) => (
          <div key={post.id} className="bg-white shadow rounded-lg p-6 mb-4">
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
                <p className="text-sm text-gray-500">Posted on {formatDate(post.created_at)}</p>
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

                  <div className="flex flex-wrap gap-2 mt-4">
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
                        registered[post.id] ? "bg-gray-300 text-gray-700 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {registered[post.id] ? "Registered" : "Register"}
                    </button>

                    <button
                      onClick={() => handleEvaluateClick(post)}
                      disabled={evaluated[post.id]}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        evaluated[post.id] ? "bg-gray-300 text-gray-700 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {evaluated[post.id] ? "Evaluated" : "Evaluate"}
                    </button>
                    
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center ml-auto transition-colors ${
                        liked[post.id] ? "text-red-500" : "text-gray-500 hover:text-red-500"
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
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center transition-colors ${
                    liked[post.id] ? "text-red-500" : "text-gray-500 hover:text-red-500"
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
    </div>
  );
}
