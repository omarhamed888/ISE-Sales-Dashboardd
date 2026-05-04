import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useAppConfig } from "@/lib/hooks/useAppConfig";

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: { isOpen?: boolean; onClose?: () => void; isCollapsed?: boolean; onToggleCollapse?: () => void }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { config } = useAppConfig();
  const pathname = location.pathname;
  const role = user?.role || "sales";

  const adminLinks = [
    { href: "/dashboard",      icon: "dashboard",       label: "لوحة القيادة" },
    { href: "/team",           icon: "groups",          label: "الفريق" },
    { href: "/ads",            icon: "ads_click",       label: "الإعلانات" },
    { href: "/ads-management", icon: "manage_search",   label: "إدارة الإعلانات" },
    { href: "/reports",        icon: "assessment",      label: "التقارير" },
    { href: "/insights",       icon: "auto_awesome",    label: "الرؤى" },
    { href: "/deals-analytics",icon: "handshake",       label: "تحليل الصفقات" },
    { href: "/access",         icon: "manage_accounts", label: "صلاحيات الوصول" },
  ];

  const salesLinks = [
    { href: "/submit-report", icon: "post_add",      label: "رفع تقرير" },
    { href: "/deals",         icon: "payments",      label: "الصفقات المغلقة" },
    { href: "/my-reports",    icon: "history",       label: "تقاريري" },
    { href: "/my-deals",      icon: "emoji_events",  label: "صفقاتي" },
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  const roleLabel = role === "superadmin" ? "مدير النظام" : role === "admin" ? "مشرف" : "مبيعات";
  const roleColor = (role === "admin" || role === "superadmin")
    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
    : "bg-white/10 text-slate-300 border border-white/10";

  const NavItem = ({ href, icon, label }: { href: string; icon: string; label: string }) => {
    const active = isActive(href);
    return (
      <Link
        to={href}
        onClick={onClose}
        title={isCollapsed ? label : undefined}
        className={`flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer
          ${isCollapsed ? "justify-center mx-2 p-3" : "mx-3 px-3 py-2.5"}
          ${active
            ? "bg-[#1E40AF] text-white shadow-lg shadow-blue-900/40"
            : "text-slate-400 hover:bg-white/8 hover:text-white"
          }`}
      >
        <span
          className="material-symbols-outlined shrink-0 text-[20px]"
          style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          {icon}
        </span>
        {!isCollapsed && <span className="text-[13.5px] font-semibold truncate">{label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        dir="rtl"
        className={`fixed right-0 top-0 h-screen z-50 flex flex-col transform transition-all duration-300 md:translate-x-0
          bg-[#0F172A]
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          ${isCollapsed ? "w-[72px]" : "w-[240px]"}`}
      >
        {/* ── Brand header ─────────────────────────────────────── */}
        <div className={`flex items-center h-[64px] shrink-0 border-b border-white/8
          ${isCollapsed ? "justify-center px-2" : "px-4 gap-3"}`}>
          {/* Logo — white background so it's visible on dark sidebar */}
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
            <img
              src={config.companyLogo || "/logo.png"}
              alt="logo"
              className="h-7 w-7 object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-black text-white leading-tight truncate">{config.companyName}</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sales Intelligence</span>
            </div>
          )}
          {/* Collapse toggle — desktop only */}
          <button
            onClick={onToggleCollapse}
            className={`hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 ${isCollapsed ? "mt-0" : "mr-auto"}`}
            title={isCollapsed ? "توسيع" : "طي"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? "menu" : "menu_open"}
            </span>
          </button>
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-3 flex flex-col gap-0.5">
          {(role === "admin" || role === "superadmin") && (
            <>
              {!isCollapsed && (
                <span className="px-5 pt-1 pb-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">الإدارة</span>
              )}
              {adminLinks.map(item => <NavItem key={item.href} {...item} />)}

              {/* Divider */}
              <div className={`my-2 h-px bg-white/8 ${isCollapsed ? "mx-3" : "mx-4"}`} />

              {/* Coming soon */}
              <div
                title={isCollapsed ? "لوحة التسويق" : undefined}
                className={`flex items-center gap-3 rounded-xl cursor-not-allowed opacity-40
                  ${isCollapsed ? "justify-center mx-2 p-3" : "mx-3 px-3 py-2.5"} text-slate-500`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">campaign</span>
                {!isCollapsed && (
                  <>
                    <span className="text-[13.5px] font-semibold flex-1">لوحة التسويق</span>
                    <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">قريباً</span>
                  </>
                )}
              </div>

              {role === "superadmin" && (
                <NavItem href="/settings" icon="settings" label="الإعدادات" />
              )}
            </>
          )}

          {role === "sales" && (
            <>
              {!isCollapsed && (
                <span className="px-5 pt-1 pb-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">القائمة</span>
              )}
              {salesLinks.map(item => <NavItem key={item.href} {...item} />)}
            </>
          )}
        </nav>

        {/* ── User footer ──────────────────────────────────────── */}
        <div className={`border-t border-white/8 p-3 shrink-0`}>
          <div className={`flex items-center gap-2.5 mb-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[12px] font-black shrink-0">
              {user?.name?.charAt(0) || "U"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white truncate leading-tight">{user?.name || "المستخدم"}</p>
                <span className={`inline-block mt-0.5 px-1.5 py-px text-[9px] font-black rounded-full uppercase ${roleColor}`}>
                  {roleLabel}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            title={isCollapsed ? "تسجيل الخروج" : undefined}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-bold
              text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/30
              transition-all duration-200 ${isCollapsed ? "px-0" : "px-3"}`}
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            {!isCollapsed && "تسجيل الخروج"}
          </button>
        </div>
      </aside>
    </>
  );
}
