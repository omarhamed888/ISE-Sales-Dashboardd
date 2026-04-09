import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "./NotificationBell";

const routeTitles: Record<string, string> = {
  "/dashboard": "اليوم",
  "/team": "الفريق",
  "/ads": "الإعلانات",
  "/reports": "التقارير",
  "/settings": "الإعدادات",
  "/submit-report": "رفع تقرير",
  "/my-reports": "تقاريري",
  "/metrics": "المقاييس المتقدمة",
  "/insights": "الرؤى",
  "/access": "صلاحيات الوصول",
  "/deals": "الصفقات المغلقة",
  "/my-deals": "صفقاتي"
};

function getTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  for (const [route, title] of Object.entries(routeTitles)) {
    if (route !== "/" && pathname.startsWith(route)) return title;
  }
  return "لوحة القيادة";
}

export function TopNav({ onToggleSidebar, isSidebarCollapsed }: { onToggleSidebar?: () => void, isSidebarCollapsed?: boolean }) {
  const location = useLocation();
  const { user } = useAuth();
  const title = getTitle(location.pathname);

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className={`fixed top-0 left-0 h-[64px] transition-all duration-300 w-full ${isSidebarCollapsed ? "md:w-[calc(100%-88px)]" : "md:w-[calc(100%-256px)]"} bg-white/80 backdrop-blur border-b border-[#E2E8F0] z-40 flex justify-between items-center px-4 md:px-8`}>
      
      {/* Title & Date Section (Visually on the Right due to RTL) */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button 
            className="md:hidden flex items-center justify-center p-2 -mr-2 text-[#64748B] hover:bg-[#F7F9FC] rounded-lg transition-colors"
            onClick={onToggleSidebar}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        <div className="flex flex-col">
          <h2 className="text-[18px] md:text-[20px] font-bold text-[#1E293B] leading-tight hide-on-small">{title}</h2>
          <p className="text-[11px] md:text-[12px] text-[#64748B] font-medium mt-0.5 hidden sm:block">{currentDate}</p>
        </div>
      </div>

      {/* Actions / Filter Section (Visually on the Left due to RTL) */}
      <div className="flex items-center gap-6">

        {/* Notification & User Info */}
        <div className="flex items-center gap-4">
          <NotificationBell />
          
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[#1E293B]">
              {user?.name?.split(" ")[0] || "المستخدم"}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
}
