import { NavLink } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useUserRoles } from "../../utils/roles";
import {
  Building2,
  Table,
  Users,
  User,
  FileText,
  LogOut,
  LayoutDashboard,
  BarChart3,
  Trophy,
  Image,
  Brain
} from "lucide-react";

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { signOut, user } = useAuth();
  const { isAdmin, isOfficer, isAdviser, orgManagers } = useUserRoles(user?.id);

  // Define links based on user role
  const getLinks = () => {
    const baseLinks = [
      { to: `profile/${user?.id}`, label: "My Profile", icon: User },
      { to: "/dashboard", label: "Return to Portal", icon: LayoutDashboard }
    ];

    // Only admins see additional admin links
    if (isAdmin()) {
      return [
        ...baseLinks.slice(0, 1), // My Profile
        { to: "organizations", label: "Organizations", icon: Building2 },
        { to: "org-table", label: "Org Table", icon: Table },
        { to: "officers", label: "Officers", icon: Users },
        { to: "members", label: "Members", icon: User },
        { to: "posts", label: "Posts", icon: FileText },
        { to: "reports", label: "Reports", icon: BarChart3 },
        ...baseLinks.slice(1) // Return to Portal
      ];
    }

    // Officers and advisers see contest management links + officer tools
    if (isOfficer() || isAdviser()) {
      const links = [
        ...baseLinks.slice(0, 1), // My Profile
      ];

      // Add organization link if they have assigned organizations
      if (orgManagers && orgManagers.length > 0) {
        links.push(
          { to: `organizations/${orgManagers[0].org_id}`, label: "My Organization", icon: Building2 },
          { to: `organizations/${orgManagers[0].org_id}/ml-dashboard`, label: "ML Analytics", icon: Brain }
        );
      }

      // Officer Tools landing page
      links.push({
        to: "/admin/dashboard/officer-tools",
        label: "Game Creators",
        icon: LayoutDashboard
      });

      links.push(
        { to: "submissions", label: "Submissions", icon: Image },
        ...baseLinks.slice(1) // Return to Portal
      );

      return links;
    }

    // Regular users only see basic links
    return baseLinks;
  };

  const links = getLinks();

  const handleSignOut = async () => {
    const confirmLogout = window.confirm("Are you sure you want to sign out?");
    if (!confirmLogout) return;

    await signOut();
    onClose(); // close sidebar after signout
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 flex h-full w-50 flex-col bg-green-700 border-r border-green-600 transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="flex h-16 items-center justify-between border-b border-green-600 px-4">
        <h2 className="text-2xl font-bold text-white">DLSL OrgSync</h2>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.startsWith("organizations/")}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-green-600 text-white"
                    : "text-green-100 hover:bg-green-600/50 hover:text-white"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-green-600 p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
