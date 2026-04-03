import { useLocation } from "react-router-dom";

const routeTitles: Record<string, string> = {
  "/": "لوحة القيادة",
  "/reports": "التقارير",
  "/submit-report": "إرسال تقرير",
  "/ads": "تحليل الإعلانات",
  "/metrics": "المقاييس المتقدمة",
};

function getTitle(pathname: string): string {
  // Exact match first
  if (routeTitles[pathname]) return routeTitles[pathname];
  // Prefix match
  for (const [route, title] of Object.entries(routeTitles)) {
    if (route !== "/" && pathname.startsWith(route)) return title;
  }
  return "نظام التقارير";
}

export function TopNav() {
  const location = useLocation();
  const title = getTitle(location.pathname);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/70 backdrop-blur-xl flex flex-row-reverse justify-between items-center px-8 h-16 pr-72 shadow-sm font-headline text-right">
      {/* Search */}
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant/20">
          <span className="material-symbols-outlined text-outline ml-2 text-sm">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-64 text-right outline-none"
            placeholder="البحث في التقارير..."
            type="text"
          />
        </div>
      </div>

      {/* Right section: title + notifications */}
      <div className="flex items-center gap-4 flex-row-reverse">
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-outline hover:text-primary transition-all relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border border-white" />
          </button>
        </div>
        <div className="h-8 w-[1px] bg-outline-variant/30 hidden md:block" />
        <h2 className="text-xl font-black text-slate-900 hidden sm:block">{title}</h2>
      </div>
    </header>
  );
}
