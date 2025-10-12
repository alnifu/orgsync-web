import { Outlet } from "react-router";
import Sidebar from "../components/Sidebar";
import { useState } from "react";
import { Menu } from "lucide-react";

export default function Dashboard() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        
        {/* Mobile overlay backdrop */}
        {!isSidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={toggleSidebar}
          />
        )}
        
        <div className="flex-1 overflow-auto">
          {/* Mobile menu button */}
          <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
            <button
              onClick={toggleSidebar}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <Menu className="h-5 w-5" />
              <span className="text-sm font-medium">Menu</span>
            </button>
          </div>
          
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
