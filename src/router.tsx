import { createBrowserRouter, Navigate, RouterProvider, Link } from "react-router";

// Shared Components
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./context/AuthContext";
import { useUserRoles } from "./utils/roles";

// Admin Routes
import AdminDashboard from "./admin/pages/Dashboard";
import AdminOrganizations from "./admin/pages/dashboard/Organizations";
import AdminNewOrganization from "./admin/pages/dashboard/NewOrganization";
import AdminOrganizationDetails from "./admin/pages/dashboard/OrganizationDetails";
import AdminOrgTable from "./admin/pages/dashboard/OrgTable";
import AdminOfficers from "./admin/pages/dashboard/Officers";
import AdminMembers from "./admin/pages/dashboard/Members";
import AdminPosts from "./admin/pages/dashboard/Posts";
import AdminUserProfile from "./admin/pages/UserProfile";
import AdminReports from "./admin/pages/Reports";
import PostDetail from "./admin/pages/PostDetail";

// User Routes
import UserDashboard from "./user/pages/Dashboard";
import UserNewsFeed from "./user/pages/dashboard/NewsFeed";
import UserEvents from "./user/pages/dashboard/Events";
import UserOrganizations from "./user/pages/dashboard/Organizations";
import UserProfile from "./user/pages/dashboard/Profile";
import UserGames from "./user/pages/dashboard/Games";
import UserDashboardHome from "./user/pages/dashboard/DashboardHome";
import QuizGame from "./user/pages/dashboard/QuizGame";
import RoomGame from "./user/pages/dashboard/RoomGame";
import QuizSelection from "./user/pages/dashboard/QuizSelection";
import LeaderboardPage from "./user/pages/dashboard/LeaderboardPage";

// Auth Pages
import Signin from "./pages/Signin";
import Signup from "./pages/Signup";

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full space-y-8 p-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Select Dashboard</h2>
        <div className={`grid grid-cols-1 ${showAdminPortal && showUserPortal ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-md mx-auto'} gap-6`}>
          {showUserPortal && (
            <Link to="/user/dashboard"
              className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-green-500 flex flex-col items-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">User Portal</h3>
              <p className="text-gray-600 text-center">Access news feed, events, organizations, and games</p>
            </Link>
          )}
          {showAdminPortal && (
            <Link to="/admin/dashboard"
              className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-blue-500 flex flex-col items-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Portal</h3>
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
    path: "/signin",
    element: <Signin />
  },
  {
    path: "/signup",
    element: <Signup />
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
        path: "org-table",
        element: <AdminOrgTable />
      },
      {
        path: "organizations",
        children: [
          { index: true, element: <AdminOrganizations /> },
          { path: "new", element: <AdminNewOrganization /> },
          { path: ":id", element: <AdminOrganizationDetails /> }
        ]
      },
      { path: "officers", element: <AdminOfficers /> },
      { path: "members", element: <AdminMembers /> },
      { path: "posts", element: <AdminPosts /> },
      { path: "reports", element: <AdminReports /> },
      { path: "profile/:id", element: <AdminUserProfile /> },
      { path: "posts/:postId", element: <PostDetail /> }
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
       { path: "quiz-games", element: <QuizGame /> },
      { path: "room-game", element: <RoomGame /> },
      { path: "quiz-selection", element: <QuizSelection /> },
      { path: "leaderboard", element: <LeaderboardPage /> },
      {
        path: "posts/:postId",
        element: <PostDetail />
      }
     
    ]
  }
]);

export default function Root() {
  return <RouterProvider router={router} />;
}
