import { NavLink } from "react-router";
import { useAuth } from "../context/AuthContext";
import { 
  Building2, 
  Table, 
  Users, 
  User, 
  FileText,
  LogOut 
} from "lucide-react";

export default function Sidebar() {
  const { signOut } = useAuth();
  
  const links = [
    { to: "organizations", label: "Organizations", icon: Building2 },
    { to: "org-table", label: "Org Table", icon: Table },
    { to: "officers", label: "Officers", icon: Users },
    { to: "members", label: "Members", icon: User },
    { to: "posts", label: "Posts", icon: FileText },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-full flex-col bg-green-700 w-50 border-r border-green-600">
      <div className="flex h-16 items-center justify-center border-b border-green-600">
        <h2 className="text-2xl font-bold text-white">OrgSync</h2>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
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
