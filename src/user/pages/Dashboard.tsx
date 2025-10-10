import { Outlet, useLocation } from "react-router";
import Sidebar from "../components/Sidebar";
import { Menu } from "lucide-react";
import { useState, useMemo } from "react";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Map pathnames to page titles
  const pageTitle = useMemo(() => {
    if (location.pathname.includes("newsfeed")) return "News Feed";
    if (location.pathname.includes("events")) return "Events";
    if (location.pathname.includes("organizations")) return "Organizations";
    if (location.pathname.includes("profile")) return "Profile";
    if (location.pathname.includes("games")) return "Games";
    return "Dashboard";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 
            md:static md:translate-x-0 
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <Sidebar onLinkClick={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          {/* Top nav with burger */}
          <header className="flex items-center bg-white shadow px-4 py-3 md:hidden">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-700 focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="ml-4 text-lg font-semibold">{pageTitle}</h1>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
          </main>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
