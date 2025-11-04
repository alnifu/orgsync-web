import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { 
  LayoutDashboard,
  Newspaper,
  CalendarDays,
  Users,
  User,
  Gamepad2,
  Trophy,
  Target,
  Palette,
  Bell,
  LogOut
} from "lucide-react";

export default function Sidebar({ 
  onLinkClick 
}: { 
  onLinkClick?: () => void 
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
  const links = [
    { to: ".", label: "Dashboard", icon: LayoutDashboard },
    { to: "newsfeed", label: "News Feed", icon: Newspaper },
    { to: "notifications", label: "Notifications", icon: Bell },
    { to: "events", label: "Events", icon: CalendarDays },
    { to: "organizations", label: "Organizations", icon: Users },
    { to: "profile", label: "Profile", icon: User },
    { to: "games", label: "Games", icon: Gamepad2 },
    { to: "leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "community-goals", label: "Community Goals", icon: Target },
    { to: "member-contests", label: "Room Design Contests", icon: Palette },
    { to: "/dashboard", label: "Return to Portal", icon: LayoutDashboard },
  ];

  const handleSignOut = async () => {
    const confirmLogout = window.confirm("Are you sure you want to sign out?");
    if (!confirmLogout) return;

    await signOut();
    navigate("/login");
    if (onLinkClick) onLinkClick(); // close sidebar after signout
  };

  return (
    <div className="flex h-full w-64 flex-col bg-green-700 border-r border-green-600">
      <div className="flex h-16 items-center justify-between border-b border-green-600 px-4">
        <h2 className="text-2xl font-bold text-white">DLSL OrgSync</h2>
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        <nav className="space-y-1 px-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "."}
              onClick={onLinkClick} 
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
