import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const pathname = location.pathname;
  const role = user?.role || "sales";

  const adminLinks = [
    { href: "/dashboard", icon: "dashboard", label: "لوحة القيادة" },
    { href: "/team", icon: "groups", label: "الفريق" },
    { href: "/ads", icon: "ads_click", label: "الإعلانات" },
    { href: "/reports", icon: "assessment", label: "التقارير" },
    { href: "/insights", icon: "auto_awesome", label: "الرؤى" },
  ];

  const salesLinks = [
    { href: "/submit-report", icon: "post_add", label: "رفع تقرير" },
    { href: "/deals", icon: "payments", label: "الصفقات المغلقة" },
    { href: "/my-reports", icon: "history", label: "تقاريري" },
    { href: "/my-deals", icon: "emoji_events", label: "صفقاتي" },
  ];

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

  const activeClasses = "bg-[#EFF6FF] text-[#2563EB] border-r-[3px] border-[#2563EB]";
  const inactiveClasses = "text-[#64748B] hover:bg-[#F7F9FC] border-r-[3px] border-transparent";

  return (
    <aside className="fixed right-0 top-0 w-[256px] h-[100vh] bg-white border-l border-[#E2E8F0] z-50 flex flex-col shadow-sm" dir="rtl">
      {/* Top Section */}
      <div className="p-6 pt-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shrink-0 shadow-sm shadow-[#2563EB]/20">
            <span className="material-symbols-outlined text-[20px] font-bold">analytics</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#1E293B] tracking-tight uppercase">BDI</h1>
          </div>
        </div>
      </div>
      
      {/* Separator line */}
      <div className="h-[1px] bg-[#E2E8F0] w-full"></div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1">
        {(role === "admin" || role === "superadmin") && adminLinks.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center px-6 py-3 transition-colors ${active ? activeClasses : inactiveClasses}`}
            >
              <span
                className="material-symbols-outlined ml-3 transition-colors"
                style={active ? { fontVariationSettings: "'FILL' 1", color: "#2563EB" } : {}}
              >
                {item.icon}
              </span>
              <span className="text-[15px] font-bold">{item.label}</span>
            </Link>
          );
        })}

        {(role === "admin" || role === "superadmin") && (
          <div className="flex items-center px-6 py-3 text-[#CBD5E1] border-r-[3px] border-transparent cursor-not-allowed">
            <span className="material-symbols-outlined ml-3">campaign</span>
            <span className="text-[15px] font-bold">Marketing Dashboard</span>
            <span className="mr-auto text-[9px] font-black bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-full">Coming Soon</span>
          </div>
        )}

        {role === "superadmin" && (
          <Link
            to="/settings"
            className={`flex items-center px-6 py-3 transition-colors mt-2 ${isActive("/settings") ? activeClasses : inactiveClasses}`}
          >
            <span className="material-symbols-outlined ml-3 transition-colors" style={isActive("/settings") ? { fontVariationSettings: "'FILL' 1", color: "#2563EB" } : {}}>settings</span>
            <span className="text-[15px] font-bold">الإعدادات</span>
          </Link>
        )}

        {role === "sales" && salesLinks.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center px-6 py-3 transition-colors ${active ? activeClasses : inactiveClasses}`}
            >
              <span
                className="material-symbols-outlined ml-3 transition-colors"
                style={active ? { fontVariationSettings: "'FILL' 1", color: "#2563EB" } : {}}
              >
                {item.icon}
              </span>
              <span className="text-[15px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-6 border-t border-[#E2E8F0] bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] font-bold text-sm border border-[#2563EB]/10 shrink-0">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-[#1E293B] truncate">{user?.name || "المستخدم"}</p>
            <span className="inline-block px-2 py-0.5 mt-1 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold rounded-md uppercase">
              {role === "superadmin" ? "مدير النظام" : role === "admin" ? "مشرف" : "مبيعات"}
            </span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-bold text-[#DC2626] bg-white border border-[#DC2626]/20 rounded-xl hover:bg-[#DC2626]/5 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
