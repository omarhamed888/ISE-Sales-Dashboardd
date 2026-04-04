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
  "/metrics": "مقاييس متقدمة"
};

function getTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  for (const [route, title] of Object.entries(routeTitles)) {
    if (route !== "/" && pathname.startsWith(route)) return title;
  }
  return "لوحة القيادة";
}

export function TopNav() {
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
    <header className="fixed top-0 left-0 h-[64px] w-[calc(100%-256px)] bg-white/80 backdrop-blur border-b border-[#E2E8F0] z-40 flex justify-between items-center px-8">
      
      {/* Title & Date Section (Visually on the Right due to RTL) */}
      <div className="flex flex-col">
        <h2 className="text-[20px] font-bold text-[#1E293B] leading-tight">{title}</h2>
        <p className="text-[12px] text-[#64748B] font-medium mt-0.5">{currentDate}</p>
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
