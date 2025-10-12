import { createBrowserRouter, Navigate, RouterProvider, Link } from "react-router";

// Shared Components
import PrivateRoute from "./components/PrivateRoute";

// Admin Routes
import AdminDashboard from "./admin/pages/Dashboard";
import AdminOrganizations from "./admin/pages/dashboard/Organizations";
import AdminNewOrganization from "./admin/pages/dashboard/NewOrganization";
import AdminOrganizationDetails from "./admin/pages/dashboard/OrganizationDetails";
import AdminOrgTable from "./admin/pages/dashboard/OrgTable";
import AdminOfficers from "./admin/pages/dashboard/Officers";
import AdminMembers from "./admin/pages/dashboard/Members";
import AdminPosts from "./admin/pages/dashboard/Posts";
import PostDetail from "./admin/pages/PostDetail";

// User Routes
import UserDashboard from "./user/pages/Dashboard";
import UserNewsFeed from "./user/pages/dashboard/NewsFeed";
import UserEvents from "./user/pages/dashboard/Events";
import UserOrganizations from "./user/pages/dashboard/Organizations";
import UserProfile from "./user/pages/dashboard/Profile";
import UserGames from "./user/pages/dashboard/Games";
import UserDashboardHome from "./user/pages/dashboard/DashboardHome";
import UnityGame from "./user/pages/dashboard/UnityGame";

// Auth Pages
import Signin from "./pages/Signin";
import Signup from "./pages/Signup";

const DashboardRedirect = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full space-y-8 p-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Select Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/user/dashboard" 
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-green-500 flex flex-col items-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Student Portal</h3>
            <p className="text-gray-600 text-center">Access news feed, events, organizations, and games</p>
          </Link>
          <Link to="/admin/dashboard"
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-blue-500 flex flex-col items-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Portal</h3>
            <p className="text-gray-600 text-center">Manage organizations, officers, members, and posts</p>
          </Link>
        </div>
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
        path: "games",
        element: <UserGames />
      },
      {
        path: "games/unity",
        element: <UnityGame />
      },
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
