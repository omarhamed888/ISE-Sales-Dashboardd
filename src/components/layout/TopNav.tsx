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
        bg-white border-b border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.04)]
      `}
    >
      {/* Right side — Branding (RTL start) */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        {onToggleSidebar && (
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-colors cursor-pointer"
            onClick={onToggleSidebar}
            aria-label="فتح القائمة"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
        )}

        {/* Logo */}
        <img
          src={config.companyLogo || "/logo.png"}
          alt="logo"
          className="h-9 w-9 object-contain rounded-xl shrink-0"
        />

        {/* Company name + page title */}
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-black text-[#0F172A]">{config.companyName}</span>
          <span className="text-[11px] text-[#94A3B8] font-medium hidden sm:block">{title}</span>
        </div>

        {/* Divider + page title on larger screens */}
        <div className="hidden md:flex items-center gap-2.5 mr-1">
          <div className="h-5 w-px bg-[#E2E8F0]" />
          <span className="text-[13px] font-bold text-[#475569]">{title}</span>
        </div>
      </div>

      {/* Left side — Actions (RTL end) */}
      <div className="flex items-center gap-2.5">
        {/* Date — desktop only */}
        <span className="hidden lg:block text-[11px] font-medium text-[#94A3B8] ml-1">{currentDate}</span>

        <NotificationBell />

        {/* User chip */}
        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-3 py-1.5 cursor-default select-none">
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
