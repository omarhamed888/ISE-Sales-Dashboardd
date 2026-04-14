import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useFilter, DateRange, Platform } from "@/lib/filter-context";
import { useAuth } from "@/lib/auth-context";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function FilterBar({ isSidebarCollapsed }: { isSidebarCollapsed?: boolean }) {
  const location = useLocation();
  const { user } = useAuth();
  const { filter, updateFilter, resetFilter } = useFilter();
  
  // Only show on admin pages
  const adminRoutes = ["/dashboard", "/team", "/ads", "/reports", "/metrics"];
  const isAdminRoute = adminRoutes.includes(location.pathname);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  if (!isAdminRoute || !isAdmin) return null;

  const ranges: DateRange[] = ["اليوم", "الأسبوع", "الشهر", "الإجمالي"];
  const rangeLabels: Record<DateRange, string> = { "اليوم": "أمس", "الأسبوع": "الأسبوع", "الشهر": "الشهر", "الإجمالي": "الإجمالي" };
  const [salesReps, setSalesReps] = useState<{uid: string, name: string}[]>([]);
  const [uniqueAds, setUniqueAds] = useState<string[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(true);

  useEffect(() => {
    async function loadDynamicFilters() {
      setIsLoadingProps(true);
      try {
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "sales")));
        const reps = usersSnap.docs.map(doc => ({ uid: doc.id, name: doc.data().name || "مستخدم" }));
        setSalesReps(reps);

        // Fetch recent reports to dynamically aggregate unique Ad Names
        const reportsSnap = await getDocs(collection(db, "reports"));
        const adsSet = new Set<string>();
        reportsSnap.docs.forEach(doc => {
          const data = doc.data().parsedData;
          if (data && data.funnel) {
            Object.values(data.funnel).forEach((stageArr: any) => {
              if (Array.isArray(stageArr)) {
                stageArr.forEach(item => {
                  if (item.adName && typeof item.adName === 'string') adsSet.add(item.adName);
                });
              }
            });
          }
        });
        setUniqueAds(Array.from(adsSet));
      } catch (err) {
        console.error("Failed to load filter lookups:", err);
      } finally {
        setIsLoadingProps(false);
      }
    }
    loadDynamicFilters();
  }, []);

  return (
    <div className={`fixed top-[64px] left-0 w-full transition-all duration-300 ${isSidebarCollapsed ? "md:w-[calc(100%-88px)]" : "md:w-[calc(100%-256px)]"} h-auto md:h-[64px] bg-white border-b border-[#E2E8F0] z-30 px-4 md:px-8 py-3 md:py-0 flex flex-col md:flex-row-reverse items-start md:items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-4`} dir="rtl">
      
      {/* Visual Right (Start): Date Range Pills */}
      <div className="flex bg-[#F7F9FC] p-1 rounded-xl border border-[#E2E8F0] w-full md:w-auto overflow-x-auto pb-1 md:pb-1 no-scrollbar shrink-0">
        {ranges.map((range) => (
          <button
            key={range}
            onClick={() => updateFilter({ dateRange: range })}
            className={`px-4 md:px-5 py-1.5 text-[12px] md:text-[13px] font-bold rounded-lg transition-all duration-200 whitespace-nowrap ${
              filter.dateRange === range
                ? "bg-white text-[#2563EB] shadow-sm transform scale-100"
                : "text-[#64748B] hover:text-[#1E293B] hover:bg-black/5 scale-95"
            }`}
          >
            {rangeLabels[range]}
          </button>
        ))}
      </div>

      {/* Visual Left (End): Selectors and Reset */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
        
        {/* Platform Dropdown */}
        <select
          value={filter.platform}
          onChange={(e) => updateFilter({ platform: e.target.value as Platform })}
          className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-[12px] md:text-[13px] font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]/50 appearance-none cursor-pointer hover:bg-surface-container transition-colors disabled:opacity-50"
          disabled={isLoadingProps}
        >
          <option value="all">جميع المنصات</option>
          <option value="whatsapp">واتساب</option>
          <option value="messenger">ماسنجر</option>
          <option value="tiktok">تيك توك</option>
        </select>

        {/* Sales Rep Dropdown */}
        <select
          value={filter.salesRep}
          onChange={(e) => updateFilter({ salesRep: e.target.value })}
          className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-[12px] md:text-[13px] font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]/50 appearance-none cursor-pointer hover:bg-surface-container transition-colors disabled:opacity-50 max-w-[140px] truncate"
          disabled={isLoadingProps}
        >
          <option value="all">جميع المندوبين</option>
          {salesReps.map(rep => (
            <option key={rep.uid} value={rep.uid}>{rep.name}</option>
          ))}
        </select>

        {/* Ad Name Dropdown */}
        <select
          value={filter.adName}
          onChange={(e) => updateFilter({ adName: e.target.value })}
          className="max-w-[140px] md:max-w-[200px] truncate bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-[12px] md:text-[13px] font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]/50 appearance-none cursor-pointer hover:bg-surface-container transition-colors disabled:opacity-50"
          disabled={isLoadingProps}
        >
          <option value="all">جميع الإعلانات</option>
          {uniqueAds.map(ad => (
            <option key={ad} value={ad}>{ad}</option>
          ))}
        </select>

        {/* Separator */}
        <div className="hidden md:block h-6 w-[1px] bg-[#E2E8F0] mx-1" />

        {/* Reset Button */}
        <button 
          onClick={resetFilter}
          className="h-8 md:h-9 w-8 md:w-9 rounded-xl border border-outline-variant/50 text-[#64748B] hover:text-[#DC2626] hover:bg-[#DC2626]/10 hover:border-[#DC2626]/30 flex items-center justify-center transition-all group shrink-0"
          title="إعادة تعيين الفلاتر"
        >
          <span className="material-symbols-outlined text-[16px] md:text-[18px] group-active:-rotate-90 transition-transform">filter_alt_off</span>
        </button>
      </div>

    </div>
  );
}
