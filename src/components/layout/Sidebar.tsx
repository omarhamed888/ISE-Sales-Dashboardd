import { Link, useLocation } from "react-router-dom";

const navItems = [
  { href: "/", icon: "dashboard", label: "لوحة القيادة" },
  { href: "/reports", icon: "assessment", label: "التقارير" },
  { href: "/submit-report", icon: "post_add", label: "إرسال تقرير" },
  { href: "/ads", icon: "ads_click", label: "تحليل الإعلانات" },
  { href: "/metrics", icon: "query_stats", label: "مقاييس متقدمة" },
];

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed right-0 top-0 h-full w-64 z-40 bg-[#f0f3ff] font-headline text-right flex flex-col rtl">
      {/* Brand Header */}
      <div className="p-6">
        <div className="flex flex-row-reverse items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined text-[20px]">analytics</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#004ac6] leading-tight">نظام المبيعات</h1>
            <p className="text-[10px] text-on-surface-variant">الإدارة العليا</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-row-reverse items-center justify-start px-4 py-3 transition-all rounded-l-none ${
                  active
                    ? "bg-[#004ac6]/10 text-[#004ac6] border-r-4 border-[#004ac6] font-semibold"
                    : "text-slate-600 hover:bg-[#004ac6]/5 border-r-4 border-transparent"
                }`}
              >
                <span
                  className="material-symbols-outlined ml-3"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}

          <Link
            to="#"
            className="flex flex-row-reverse items-center justify-start text-slate-600 px-4 py-3 hover:bg-[#004ac6]/5 transition-colors border-r-4 border-transparent mt-2"
          >
            <span className="material-symbols-outlined ml-3">settings</span>
            <span className="text-sm">الإعدادات</span>
          </Link>
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="mt-auto p-6 bg-surface-container/50 border-t border-outline-variant/10">
        <div className="flex items-center gap-3 flex-row-reverse">
          <img
            alt="صورة الملف الشخصي"
            className="w-10 h-10 rounded-xl object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMzvW2gn5l0jjIyUxN0o4ozEXmQQdKDcW-3q-cpNdFtcbuiNq9NZ2aQrPEYi6OntnTYRQRseKTdhPoV7mPqqDTbx-FUrXHqcBvhoUyQudJR1_Uo4XY5eUYLIiFkoPhdRY2_mZY9A8RVEslFUA6cSxdwDx7oep5qvrkBGquoEgN-0hYbQ0FvpNdzYKb9fT3Vk2aKsgIVh9pdVeB8KtByjt8kBfP0fBVK_BPyrHwEibc3pKlbGeVoabA6QTCCEIjqhtoB9__44LlCLyg"
          />
          <div className="text-right">
            <p className="text-sm font-bold text-on-surface">أحمد الساير</p>
            <p className="text-xs text-on-surface-variant">المدير التنفيذي</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
