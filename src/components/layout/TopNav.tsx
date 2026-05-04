import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "./NotificationBell";
import { useAppConfig } from "@/lib/hooks/useAppConfig";

const routeTitles: Record<string, string> = {
  "/dashboard":       "لوحة القيادة",
  "/team":            "الفريق",
  "/ads":             "الإعلانات",
  "/ads-management":  "إدارة الإعلانات",
  "/reports":         "التقارير",
  "/settings":        "الإعدادات",
  "/submit-report":   "رفع تقرير",
  "/my-reports":      "تقاريري",
  "/metrics":         "المقاييس المتقدمة",
  "/insights":        "الرؤى",
  "/access":          "صلاحيات الوصول",
  "/deals":           "الصفقات المغلقة",
  "/deals-analytics": "تحليل الصفقات",
  "/my-deals":        "صفقاتي",
};

function getTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  for (const [route, title] of Object.entries(routeTitles)) {
    if (route !== "/" && pathname.startsWith(route)) return title;
  }
  return "لوحة القيادة";
}

export function TopNav({ onToggleSidebar, isSidebarCollapsed }: { onToggleSidebar?: () => void; isSidebarCollapsed?: boolean }) {
  const location = useLocation();
  const { user } = useAuth();
  const { config } = useAppConfig();
  const title = getTitle(location.pathname);

  const currentDate = useMemo(() => new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }), []);

  return (
    <header
      className={`
        fixed top-0 left-0 h-[64px] z-40 flex items-center justify-between
        px-4 md:px-6 transition-all duration-300
        w-full ${isSidebarCollapsed ? "md:w-[calc(100%-72px)]" : "md:w-[calc(100%-240px)]"}
        bg-white/90 backdrop-blur-xl border-b border-[#E2E8F0]
      `}
    >
      {/* Blue accent line at bottom */}
      <div className="absolute bottom-0 right-0 left-0 h-[2px] bg-gradient-to-l from-[#1E40AF] via-[#3B82F6] to-transparent opacity-60 pointer-events-none" />

      {/* Left section (RTL: start = right visually) */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        {onToggleSidebar && (
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 -mr-1 rounded-xl text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-colors cursor-pointer"
            onClick={onToggleSidebar}
            aria-label="فتح القائمة"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
        )}

        <div className="flex flex-col">
          <h2 className="text-[17px] font-black text-[#0F172A] leading-tight">{title}</h2>
          <p className="hidden sm:block text-[11px] text-[#94A3B8] font-medium mt-px">
            {config.companyName} · {currentDate}
          </p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        <NotificationBell />

        {/* User chip */}
        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-3 py-1.5 cursor-default">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] flex items-center justify-center text-white text-[10px] font-black shrink-0">
            {user?.name?.charAt(0) || "U"}
          </div>
          <span className="text-[13px] font-bold text-[#1E293B] hidden sm:inline">
            {user?.name?.split(" ")[0] || "المستخدم"}
          </span>
        </div>
      </div>
    </header>
  );
}
