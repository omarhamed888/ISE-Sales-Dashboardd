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
  
  const adminRoutes = ["/dashboard", "/team", "/ads", "/reports", "/metrics"];
  const isAdminRoute = adminRoutes.includes(location.pathname);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const showFilterBar = isAdminRoute && isAdmin;

  return (
    <FilterProvider>
      <div className="min-h-screen bg-[#F7F9FC] text-[#1E293B] font-body" dir="rtl">
        <Sidebar />
        <TopNav />
        <FilterBar />
        
        {/* Content area dynamically adjusts margin depending on FilterBar existence */}
        <main className={`mr-[256px] p-8 max-w-full overflow-x-hidden transition-all duration-300 ${showFilterBar ? "mt-[128px]" : "mt-[64px]"}`}>
          {children}
        </main>
      </div>
    </FilterProvider>
  );
}
