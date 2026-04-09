import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { FilterBar } from "./FilterBar";
import { FilterProvider } from "@/lib/filter-context";

export function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const adminRoutes = ["/dashboard", "/team", "/ads", "/reports", "/metrics"];
  const isAdminRoute = adminRoutes.includes(location.pathname);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const showFilterBar = isAdminRoute && isAdmin;

  return (
    <FilterProvider>
      <div className="min-h-screen bg-[#F7F9FC] text-[#1E293B] font-body" dir="rtl">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <TopNav onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarCollapsed={isSidebarCollapsed} />
        <FilterBar isSidebarCollapsed={isSidebarCollapsed} />
        
        {/* Content area dynamically adjusts margin depending on FilterBar existence */}
        <main className={`transition-all duration-300 ${isSidebarCollapsed ? "md:mr-[88px]" : "md:mr-[256px]"} p-4 md:p-8 max-w-full overflow-x-hidden ${showFilterBar ? "mt-[180px] md:mt-[128px]" : "mt-[64px]"}`}>
          {children}
        </main>
      </div>
    </FilterProvider>
  );
}
