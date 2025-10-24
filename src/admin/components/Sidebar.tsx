import { NavLink } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useUserRoles } from "../../utils/roles";
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  Table,
  Users,
  User,
  FileText,
  LogOut,
  LayoutDashboard,
  BarChart3,
  Trophy,
  Image
} from "lucide-react";

export default function Sidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const { signOut, user } = useAuth();
  const { isAdmin, isOfficer, isAdviser } = useUserRoles(user?.id);

  // Define links based on user role
  const getLinks = () => {
    const baseLinks = [
      { to: `profile/${user?.id}`, label: "My Profile", icon: User },
      { to: "organizations", label: "Organizations", icon: Building2 },
      { to: "/dashboard", label: "Return to Portal", icon: LayoutDashboard }
    ];

    // Only admins see additional admin links
    if (isAdmin()) {
      return [
        ...baseLinks.slice(0, 2), // My Profile and Organizations
        { to: "org-table", label: "Org Table", icon: Table },
        { to: "officers", label: "Officers", icon: Users },
        { to: "members", label: "Members", icon: User },
        { to: "posts", label: "Posts", icon: FileText },
        { to: "contests", label: "Contests", icon: Trophy },
        { to: "submissions", label: "Submissions", icon: Image },
        { to: "reports", label: "Reports", icon: BarChart3 },
        ...baseLinks.slice(2) // Return to Portal
      ];
    }

    // Officers and advisers see contest management links
    if (isOfficer() || isAdviser()) {
      return [
        ...baseLinks.slice(0, 2), // My Profile and Organizations
        { to: "contests", label: "Contests", icon: Trophy },
        { to: "submissions", label: "Submissions", icon: Image },
        ...baseLinks.slice(2) // Return to Portal
      ];
    }

    // Regular users only see basic links
    return baseLinks;
  };

  const links = getLinks();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className={`flex h-full flex-col bg-green-700 border-r border-green-600 transition-all duration-300 ${
      isCollapsed 
        ? 'hidden md:flex md:w-16' 
        : 'flex w-50 fixed md:relative z-50 md:z-auto inset-y-0 left-0 md:left-auto'
    }`}>
      <div className="flex h-16 items-center justify-between border-b border-green-600 px-4">
        {!isCollapsed && <h2 className="text-2xl font-bold text-white">OrgSync</h2>}
        <button
          onClick={onToggle}
          className="rounded-lg p-2 text-white hover:bg-green-600 transition-colors"
        >
          {isCollapsed ? <ArrowRight /> : <ArrowLeft />}
        </button>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-green-600 text-white"
                    : "text-green-100 hover:bg-green-600/50 hover:text-white"
                }`
              }
              title={isCollapsed ? label : undefined}
            >
              <Icon className="h-5 w-5" />
              {!isCollapsed && label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-green-600 p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </div>
  );
}
