import { createBrowserRouter, Navigate, RouterProvider, Link } from "react-router";

// Shared Components
import PrivateRoute from "./components/PrivateRoute";
import RoleRoute from "./components/RoleRoute";
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

  // Auto-redirect based on user role
  if (isAdmin()) {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (isOfficer() || isAdviser()) {
    // Officers and advisers get to choose their dashboard

    let adminPortalLabel = "";
    if (isOfficer()) {
      adminPortalLabel = "Officer Portal";
    } else if (isAdviser()) {
      adminPortalLabel = "Adviser Portal";
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-4xl w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Welcome to OrgSync</h2>
            <p className="text-lg text-gray-600">Choose your dashboard to get started</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link to="/user/dashboard"
              className="group p-8 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-green-200 hover:border-green-400 flex flex-col items-center transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Member Portal</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Access news feed, join events, participate in organizations, and enjoy games with your community
              </p>
            </Link>

            <Link to="/admin/dashboard"
              className="group p-8 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-blue-200 hover:border-blue-400 flex flex-col items-center transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">{adminPortalLabel}</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Manage organizations, oversee officers and members, moderate content, and access administrative tools
              </p>
            </Link>
          </div>

          {roles && (
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full">
                <span className="text-sm text-gray-600">Logged in as:</span>
                <span className="ml-2 font-medium text-gray-900 capitalize">{roles.role}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    // Regular members go directly to user dashboard
    return <Navigate to="/user/dashboard" replace />;
  }
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
    element: <PrivateRoute><RoleRoute allowedRoles={['admin', 'officer', 'adviser']}><AdminDashboard /></RoleRoute></PrivateRoute>,
    children: [
      {
        index: true,
        element: <AdminDashboardHome />
      },
      {
        path: "org-table",
        element: <RoleRoute allowedRoles={['admin']}><AdminOrgTable /></RoleRoute>
      },
      {
        path: "organizations",
        children: [
          { index: true, element: <AdminOrganizations /> },
          { path: "new", element: <AdminNewOrganization /> },
          { path: ":id", element: <AdminOrganizationDetails /> },
          { path: ":orgId/ml-dashboard", element: <RoleRoute allowedRoles={['officer', 'adviser']}><MLDashboard /></RoleRoute> }
        ]
      },
      { path: "officers", element: <RoleRoute allowedRoles={['admin']}><AdminOfficers /></RoleRoute> },
      { path: "members", element: <RoleRoute allowedRoles={['admin']}><AdminMembers /></RoleRoute> },
      { path: "posts", element: <RoleRoute allowedRoles={['admin']}><AdminPosts /></RoleRoute> },
      { path: "reports", element: <RoleRoute allowedRoles={['admin']}><AdminReports /></RoleRoute> },
      { path: "profile/:id", element: <AdminUserProfile /> },
      { path: "posts/:postId", element: <PostDetail /> },
      { path: "contests", element: <RoleRoute allowedRoles={['officer', 'adviser']}><OfficerContestManager /></RoleRoute> },
      { path: "submissions", element: <RoleRoute allowedRoles={['officer', 'adviser']}><OfficerSubmissions /></RoleRoute> },
      { path: "officer-tools", element: <RoleRoute allowedRoles={['officer', 'adviser']}><OfficerLandingPage /></RoleRoute> },
      { path: "flappy-config/:orgId", element: <RoleRoute allowedRoles={['officer', 'adviser']}><FlappyConfigUploaderWrapper /></RoleRoute> },
      { path: "contests/:orgId", element: <RoleRoute allowedRoles={['officer', 'adviser']}><OfficerContestManager /></RoleRoute> },
      { path: "create-quiz/:orgId", element: <RoleRoute allowedRoles={['officer', 'adviser']}><CreateQuizWrapper /></RoleRoute> }, 
    ]
  },
  // User Routes
  {
    path: "/user/dashboard",
    element: <PrivateRoute><RoleRoute allowedRoles={['officer', 'adviser', 'member']} redirectTo="/admin/dashboard"><UserDashboard /></RoleRoute></PrivateRoute>,
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
      { path: "flappy-game", element: <FlappyGame /> }
     
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
