import { Outlet, useLocation } from "react-router";
import Sidebar from "../components/Sidebar";
import { Menu } from "lucide-react";
import { useState, useMemo } from "react";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isGamePage = useMemo(() => {
    return location.pathname.includes("quiz-selection") || location.pathname.includes("room-game") || location.pathname.includes("quiz-games") || location.pathname.includes("flappy-game");
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        {!isGamePage && (
          <div
            className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 
              md:static md:translate-x-0 
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <Sidebar onLinkClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <div className={`flex-1 overflow-auto ${isGamePage ? "md:ml-0" : ""}`}>
          {!isGamePage && (
            <header className="sticky top-0 z-40 flex items-center bg-white shadow px-4 py-3 md:hidden">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-700 focus:outline-none"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="ml-4 text-lg font-semibold">DLSL OrgSync</h1>
            </header>
          )}

          <main className={`mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 ${isGamePage ? "h-full" : ""}`}>
            <Outlet />
          </main>
        </div>
      </div>

      {/* Overlay */}
      {!isGamePage && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

