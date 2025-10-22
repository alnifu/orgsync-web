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
  LogOut,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

export default function Sidebar({ 
  isCollapsed, 
  onToggle, 
  onLinkClick 
}: { 
  isCollapsed: boolean; 
  onToggle: () => void;
  onLinkClick?: () => void 
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
  const links = [
    { to: ".", label: "Dashboard", icon: LayoutDashboard },
    { to: "newsfeed", label: "News Feed", icon: Newspaper },
    { to: "events", label: "Events", icon: CalendarDays },
    { to: "organizations", label: "Organizations", icon: Users },
    { to: "profile", label: "Profile", icon: User },
    { to: "games", label: "Games", icon: Gamepad2 },
    { to: "leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/dashboard", label: "Return to Portal", icon: LayoutDashboard },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin");
    if (onLinkClick) onLinkClick(); // close sidebar after signout
  };

  return (
    <div className={`flex h-full flex-col bg-green-700 border-r border-green-600 transition-all duration-300 ${
      isCollapsed 
        ? 'hidden md:flex md:w-16' 
        : 'flex w-64 fixed md:relative z-50 md:z-auto inset-y-0 left-0 md:left-auto'
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
              end={to === "."}
              onClick={onLinkClick} 
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
