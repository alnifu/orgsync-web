import { Outlet } from "react-router";
import Sidebar from "../components/Sidebar";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useUserRoles } from "../../utils/roles";

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user } = useAuth();
  const { isAdmin, isOfficer } = useUserRoles(user?.id);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  // Dynamically set header title based on role
  let headerTitle = "OrgSync";
  if (isAdmin()) headerTitle = "OrgSync Admin";
  else if (isOfficer()) headerTitle = "OrgSync Officer";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with menu button */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
              title={isSidebarOpen ? "Close menu" : "Open menu"}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="text-xl font-semibold text-gray-900">{headerTitle}</h1>
          </div>
        </div>
      </header>

      {/* Floating Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={toggleSidebar} />

      {/* Overlay backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
