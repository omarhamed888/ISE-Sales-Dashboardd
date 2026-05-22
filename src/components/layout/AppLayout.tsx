import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { FilterBar } from "./FilterBar";
import { FilterProvider } from "@/lib/filter-context";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useScheduledNotifications } from "@/lib/hooks/useScheduledNotifications";
import { useAppConfig } from "@/lib/hooks/useAppConfig";
import { FILTERED_ROUTES } from "@/lib/config/filtered-routes";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { config } = useAppConfig();
  useScheduledNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Dynamic page title — follows the admin-configured company name. Falls back
  // to a sensible default before the config subscription resolves.
  useEffect(() => {
    const name = config.companyName?.trim() || "ISE Sales Dashboard";
    document.title = `${name} — لوحة المبيعات`;
  }, [config.companyName]);

  // Dynamic favicon — swap the <link id="app-icon"> href whenever the admin
  // uploads a new company logo. Browsers cache aggressively, so the URL is
  // already cache-busted by uploadCompanyLogo (`?v=<timestamp>`).
  useEffect(() => {
    const url = config.companyLogo?.trim();
    if (!url) return;
    const link = document.getElementById("app-icon") as HTMLLinkElement | null;
    if (link) link.href = url;
  }, [config.companyLogo]);

  const isAdminRoute = FILTERED_ROUTES.includes(location.pathname);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const showFilterBar = isAdminRoute && isAdmin;

  // Sidebar: 240px expanded, 72px collapsed.
  // TopNav: 64px. FilterBar: 56px (mobile single-row trigger) / 58px (desktop row).
  const sideOffset = isSidebarCollapsed ? "md:mr-[72px]" : "md:mr-[240px]";
  const topOffset   = showFilterBar ? "mt-[120px] md:mt-[122px]" : "mt-[64px]";

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
