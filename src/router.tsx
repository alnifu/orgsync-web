import { createBrowserRouter, Navigate, RouterProvider, Link } from "react-router";

// Shared Components
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./context/AuthContext";
import { useUserRoles } from "./utils/roles";
import { useNotifications } from "./hooks/useNotifications";
import PostDetail from "./pages/PostDetail";

// Admin Routes
import AdminDashboard from "./admin/pages/Dashboard";
import AdminOrganizations from "./admin/pages/dashboard/Organizations";
import AdminNewOrganization from "./admin/pages/dashboard/NewOrganization";
import AdminOrganizationDetails from "./admin/pages/dashboard/OrganizationDetails";
import AdminOrgTable from "./admin/pages/dashboard/OrgTable";
import AdminDashboardHome from "./admin/pages/dashboard/AdminDashboardHome";
import AdminOfficers from "./admin/pages/dashboard/Officers";
import AdminMembers from "./admin/pages/dashboard/Members";
import AdminPosts from "./admin/pages/dashboard/Posts";
import AdminUserProfile from "./admin/pages/UserProfile";
import AdminReports from "./admin/pages/Reports";
import OfficerContestManager from "./admin/pages/OfficerContestManager";
import OfficerSubmissions from "./admin/pages/OfficerSubmissions";
import MLDashboard from "./admin/components/MLDashboard";
import OfficerLandingPage from "./admin/pages/dashboard/OfficerLandingPage";
import { FlappyConfigUploaderWrapper } from "./admin/pages/dashboard/GameWrapper";
import { CreateQuizWrapper } from "./admin/pages/dashboard/GameWrapper";

// User Routes
import UserDashboard from "./user/pages/Dashboard";
import UserNewsFeed from "./user/pages/dashboard/NewsFeed";
import UserEvents from "./user/pages/dashboard/Events";
import UserOrganizations from "./user/pages/dashboard/Organizations";
import UserProfile from "./user/pages/dashboard/Profile";
import UserGames from "./user/pages/dashboard/Games";
import UserDashboardHome from "./user/pages/dashboard/DashboardHome";
import CommunityGoalsPage from "./user/pages/dashboard/CommunityGoalsPage";
import MemberContests from "./user/pages/dashboard/MemberContests";
import QuizGame from "./user/pages/dashboard/QuizGame";
import RoomGame from "./user/pages/dashboard/RoomGame";
import QuizSelection from "./user/pages/dashboard/QuizSelection";
import LeaderboardPage from "./user/pages/dashboard/LeaderboardPage";
import NotificationInbox from "./user/components/NotificationInbox";
import FlappyChallengePicker from "./user/pages/dashboard/FlappyChallengePicker";
import FlappyGame from "./user/pages/dashboard/FlappyGame";

// Auth Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProfileSetup from "./pages/ProfileSetup";
import ResetPassword from "./pages/ResetPassword";

const DashboardRedirect = () => {
  const { user } = useAuth();
  const { roles, loading, isAdmin, isOfficer, isAdviser } = useUserRoles(user?.id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Verifying Access</h3>
          <p className="text-gray-600">Checking your permissions...</p>
        </div>
      </div>
    );
  }

  const showAdminPortal = isAdmin() || isOfficer() || isAdviser();
  const showUserPortal = !isAdmin() || true; // Always show user portal, or show it for non-admins

  let adminPortalLabel = "";
  if (isAdmin()) {
    adminPortalLabel = "Admin Portal";
  } else if (isOfficer()) {
    adminPortalLabel = "Officer Portal";
  } else if (isAdviser()) {
    adminPortalLabel = "Adviser Portal";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full space-y-8 p-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Select Dashboard</h2>
        <div className={`grid grid-cols-1 ${showAdminPortal && showUserPortal ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-md mx-auto'} gap-6`}>
          {showUserPortal && (
            <Link to="/user/dashboard"
              className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-green-500 flex flex-col items-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Member Portal</h3>
              <p className="text-gray-600 text-center">Access news feed, events, organizations, and games</p>
            </Link>
          )}
          {showAdminPortal && (
            <Link to="/admin/dashboard"
              className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-blue-500 flex flex-col items-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{adminPortalLabel}</h3>
              <p className="text-gray-600 text-center">Manage organizations, officers, members, and posts</p>
            </Link>
          )}
        </div>
        {roles && (
          <div className="text-center text-sm text-gray-500">
            Logged in as: <span className="font-medium capitalize">{roles.role}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <PrivateRoute><Navigate to="/dashboard" replace /></PrivateRoute>
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/signup",
    element: <Signup />
  },
  {
    path: "/reset-password",
    element: <ResetPassword />  // <-- add this
  },
  {
    path: "/profile-setup",
    element: <ProfileSetup />
  },
  {
    path: "/dashboard",
    element: <PrivateRoute><DashboardRedirect /></PrivateRoute>
  },
  // Admin Routes
  {
    path: "/admin/dashboard",
    element: <PrivateRoute><AdminDashboard /></PrivateRoute>,
    children: [
      {
        index: true,
        element: <AdminDashboardHome />
      },
      {
        path: "org-table",
        element: <AdminOrgTable />
      },
      {
        path: "organizations",
        children: [
          { index: true, element: <AdminOrganizations /> },
          { path: "new", element: <AdminNewOrganization /> },
          { path: ":id", element: <AdminOrganizationDetails /> },
          { path: ":orgId/ml-dashboard", element: <MLDashboard /> }
        ]
      },
      { path: "officers", element: <AdminOfficers /> },
      { path: "members", element: <AdminMembers /> },
      { path: "posts", element: <AdminPosts /> },
      { path: "reports", element: <AdminReports /> },
      { path: "profile/:id", element: <AdminUserProfile /> },
      { path: "posts/:postId", element: <PostDetail /> },
      { path: "contests", element: <OfficerContestManager /> },
      { path: "submissions", element: <OfficerSubmissions /> },
      { path: "officer-tools", element: <OfficerLandingPage /> },
      { path: "flappy-config/:orgId", element: <FlappyConfigUploaderWrapper /> },
      { path: "contests/:orgId", element: <OfficerContestManager /> },
      { path: "create-quiz/:orgId", element: <CreateQuizWrapper /> }, 
    ]
  },
  // User Routes
  {
    path: "/user/dashboard",
    element: <PrivateRoute><UserDashboard /></PrivateRoute>,
    children: [
      {
        path: "",
        element: <UserDashboardHome />
      },
      {
        path: "newsfeed",
        element: <UserNewsFeed />
      },
      {
        path: "events",
        element: <UserEvents />
      },
      {
        path: "organizations",
        element: <UserOrganizations />
      },
      {
        path: "profile",
        element: <UserProfile />
      },
      {
        path: "profile/:id",
        element: <UserProfile />
      },
      {
        path: "games",
        element: <UserGames />
      },
            { path: "community-goals", element: <CommunityGoalsPage /> },

      {
        path: "member-contests",
        element: <MemberContests />
      },
      { path: "posts/:postId", element: <PostDetail /> },
      { path: "quiz-games", element: <QuizGame /> },
      { path: "room-game", element: <RoomGame /> },
      { path: "quiz-selection", element: <QuizSelection /> },
      { path: "leaderboard", element: <LeaderboardPage /> },
      { path: "notifications", element: <NotificationInbox /> },
      { path: "flappy-challenges", element: <FlappyChallengePicker /> },
      { path: "flappy-game", element: <FlappyGame /> },
      {
        path: "posts/:postId",
        element: <PostDetail />
      }
     
    ]
  },
  // 404 Catch-all route
  {
    path: "*",
    element: (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">404</h1>
            <h2 className="text-xl font-semibold text-gray-700">Page Not Found</h2>
            <p className="text-gray-600">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }
]);

export default function Root() {
  useNotifications(); // Enable global notifications
  return <RouterProvider router={router} />;
}
