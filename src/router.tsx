import {
  createBrowserRouter,
  RouterProvider,
  Navigate
} from "react-router";
import PrivateRoute from "./components/PrivateRoute";
import Dashboard from "./pages/Dashboard";
import Organizations from "./pages/dashboard/Organizations";
import NewOrganization from "./pages/dashboard/NewOrganization";
import OrganizationDetails from "./pages/dashboard/OrganizationDetails";
import OrgTable from "./pages/dashboard/OrgTable";
import Officers from "./pages/dashboard/Officers";
import Members from "./pages/dashboard/Members";
import Posts from "./pages/dashboard/Posts";
import Signup from "./pages/Signup";
import Signin from "./pages/Signin";
import App from "./App";

const router = createBrowserRouter([
  { 
    path: "/",
    element: <Navigate to="/signin" replace />
  },
  { path: "/signin", element: <Signin /> },
  { path: "/signup", element: <Signup /> },
  {
    path: "/dashboard",
    element: (
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    ),
    children: [
      { 
        path: "organizations", 
        children: [
          { index: true, element: <Organizations /> },
          { path: "new", element: <NewOrganization /> },
          { path: ":id", element: <OrganizationDetails /> }
        ] 
      },
      { path: "org-table", element: <OrgTable /> },
      { path: "officers", element: <Officers /> },
      { path: "members", element: <Members /> },
      { path: "posts", element: <Posts /> },
    ],
  },
]);

export default function Root() {
  return <RouterProvider router={router} />;
}
