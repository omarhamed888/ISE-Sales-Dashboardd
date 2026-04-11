import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: { isOpen?: boolean; onClose?: () => void; isCollapsed?: boolean; onToggleCollapse?: () => void }) {
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
    { href: "/deals-analytics", icon: "handshake", label: "تحليل الصفقات" },
    { href: "/access", icon: "manage_accounts", label: "صلاحيات الوصول" },
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

  const activeClasses = "bg-[#EFF6FF] text-[#2563EB] border-r-4 border-[#2563EB] font-bold";
  const inactiveClasses = "text-[#64748B] hover:bg-[#F7F9FC] border-r-4 border-transparent hover:translate-x-[-2px] transition-transform";

  const rolePillColor = (role === "admin" || role === "superadmin")
    ? "bg-[#EFF6FF] text-[#2563EB]"
    : "bg-[#F1F5F9] text-[#64748B]";

  const roleLabel = role === "superadmin" ? "مدير النظام" : role === "admin" ? "مشرف" : "مبيعات";

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed right-0 top-0 h-[100vh] bg-white border-l border-[#E2E8F0] z-50 flex flex-col shadow-sm transform transition-all duration-300 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } ${isCollapsed ? "w-[88px]" : "w-[256px]"}`}
        dir="rtl"
      >
        {/* Top Section */}
        <div className={`p-5 flex flex-col items-center relative transition-all duration-300 ${isCollapsed ? "px-2" : "px-5"}`}>
          <div className={`flex items-center ${isCollapsed ? "justify-center flex-col gap-4" : "justify-between w-full"}`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
              <img src="/logo.png" alt="BDI Logo" className="h-[40px] w-auto object-contain cursor-pointer transition-transform hover:scale-105" />
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-[#0F172A] tracking-wide leading-tight">BDI</span>
                  <span className="text-[9px] font-semibold text-[#94A3B8] tracking-wider leading-tight uppercase">Sales Intelligence</span>
                </div>
              )}
            </div>
            <button onClick={onToggleCollapse} className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-[#F7F9FC] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#1E293B] transition-colors border border-[#E2E8F0]">
              <span className="material-symbols-outlined text-[18px]">
                {isCollapsed ? "menu" : "menu_open"}
              </span>
            </button>
          </div>
        </div>

        {/* Separator line */}
        <div className="h-[1px] bg-[#E2E8F0] w-full" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-0.5">
          {(role === "admin" || role === "superadmin") && adminLinks.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 ${isCollapsed ? "justify-center px-0 mx-4 rounded-xl py-3" : "px-5 py-3"} transition-all ${active ? activeClasses : inactiveClasses}`}
                title={isCollapsed ? item.label : undefined}
              >
                <span
                  className="material-symbols-outlined transition-colors text-[22px]"
                  style={active ? { fontVariationSettings: "'FILL' 1", color: "#2563EB" } : {}}
                >
                  {item.icon}
                </span>
                {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
              </Link>
            );
          })}

          {/* Separator before coming-soon item */}
          {(role === "admin" || role === "superadmin") && (
            <div className={`${isCollapsed ? "mx-4" : "mx-5"} h-px bg-[#E2E8F0] my-2`} />
          )}

          {(role === "admin" || role === "superadmin") && (
            <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center px-0 mx-4 rounded-xl py-3" : "px-5 py-3"} text-[#CBD5E1] border-r-4 border-transparent cursor-not-allowed`} title={isCollapsed ? "Marketing Dashboard" : undefined}>
              <span className="material-symbols-outlined text-[22px]">campaign</span>
              {!isCollapsed && (
                <>
                  <span className="text-[14px] font-semibold flex-1">Marketing Dashboard</span>
                  <span className="text-[8px] font-black bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.5 rounded-full whitespace-nowrap">Coming Soon</span>
                </>
              )}
            </div>
          )}

          {role === "superadmin" && (
            <Link
              to="/settings"
              className={`flex items-center gap-3 ${isCollapsed ? "justify-center px-0 mx-4 rounded-xl py-3" : "px-5 py-3"} transition-all mt-1 ${isActive("/settings") ? activeClasses : inactiveClasses}`}
              title={isCollapsed ? "الإعدادات" : undefined}
            >
              <span className="material-symbols-outlined text-[22px] transition-colors" style={isActive("/settings") ? { fontVariationSettings: "'FILL' 1", color: "#2563EB" } : {}}>settings</span>
              {!isCollapsed && <span className="text-[14px]">الإعدادات</span>}
            </Link>
          )}

          {role === "sales" && salesLinks.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 ${isCollapsed ? "justify-center px-0 mx-4 rounded-xl py-3" : "px-5 py-3"} transition-all ${active ? activeClasses : inactiveClasses}`}
                title={isCollapsed ? item.label : undefined}
              >
                <span
                  className="material-symbols-outlined transition-colors text-[22px]"
                  style={active ? { fontVariationSettings: "'FILL' 1", color: "#2563EB" } : {}}
                >
                  {item.icon}
                </span>
                {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className={`p-4 border-t border-[#E2E8F0] bg-white ${isCollapsed ? "px-2" : ""}`}>
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] font-bold text-sm border border-[#2563EB]/10 shrink-0">
              {user?.name?.charAt(0) || "U"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#1E293B] truncate">{user?.name || "المستخدم"}</p>
                <span className={`inline-block px-2 py-0.5 mt-1 text-[10px] font-bold rounded-full uppercase ${rolePillColor}`}>
                  {roleLabel}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-bold text-[#DC2626] bg-white border border-[#DC2626]/20 rounded-xl hover:bg-[#DC2626]/5 active:scale-95 transition-all ${isCollapsed ? "px-0 mx-auto w-10 h-10" : "px-4"}`}
            title={isCollapsed ? "تسجيل الخروج" : undefined}
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {!isCollapsed && "تسجيل الخروج"}
          </button>
        </div>
      </aside>
    </>
  );
}
