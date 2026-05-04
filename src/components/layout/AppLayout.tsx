import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { FilterBar } from "./FilterBar";
import { FilterProvider } from "@/lib/filter-context";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const adminRoutes = ["/dashboard", "/team", "/ads", "/reports", "/metrics"];
  const isAdminRoute = adminRoutes.includes(location.pathname);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const showFilterBar = isAdminRoute && isAdmin;

  // Sidebar: 240px expanded, 72px collapsed
  // TopNav: 64px, FilterBar: 58px
  const sideOffset = isSidebarCollapsed ? "md:mr-[72px]" : "md:mr-[240px]";
  const topOffset   = showFilterBar ? "mt-[188px] md:mt-[122px]" : "mt-[64px]";

  return (
    <FilterProvider>
      <ToastProvider>
        <ErrorBoundary>
          <div className="min-h-screen bg-background text-on-surface" dir="rtl">
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(c => !c)}
            />
            <TopNav
              onToggleSidebar={() => setIsSidebarOpen(o => !o)}
              isSidebarCollapsed={isSidebarCollapsed}
            />
            {showFilterBar && <FilterBar isSidebarCollapsed={isSidebarCollapsed} />}

            <main className={`transition-all duration-300 ${sideOffset} ${topOffset} p-4 md:p-6 max-w-full overflow-x-hidden`}>
              {children}
            </main>
          </div>
        </ErrorBoundary>
      </ToastProvider>
    </FilterProvider>
  );
}
