import { Outlet } from "react-router";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          
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
