import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useFilter, DateRange, Platform } from "@/lib/filter-context";
import { useAuth } from "@/lib/auth-context";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const selectCls = `
  bg-white border border-[#E2E8F0] rounded-xl px-3 py-2
  text-[12px] font-bold text-[#1E293B]
  focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]/50
  hover:border-[#CBD5E1] appearance-none cursor-pointer transition-colors
  disabled:opacity-40 disabled:cursor-not-allowed
`.replace(/\s+/g, ' ').trim();

export function FilterBar({ isSidebarCollapsed }: { isSidebarCollapsed?: boolean }) {
  const location = useLocation();
  const { user } = useAuth();
  const { filter, updateFilter, resetFilter } = useFilter();

  const adminRoutes = ["/dashboard", "/team", "/ads", "/reports", "/metrics"];
  const isAdminRoute = adminRoutes.includes(location.pathname);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  if (!isAdminRoute || !isAdmin) return null;

  const ranges: DateRange[] = ["اليوم", "الأسبوع", "الشهر", "الإجمالي", "مخصص"];
  const [salesReps, setSalesReps] = useState<{ uid: string; name: string }[]>([]);
  const [uniqueAds, setUniqueAds] = useState<string[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(true);

  useEffect(() => {
    async function loadDynamicFilters() {
      setIsLoadingProps(true);
      try {
        const [usersRes, adMetaRes] = await Promise.allSettled([
          getDocs(query(collection(db, "users"), where("role", "==", "sales"))),
          getDoc(doc(db, "metadata", "adNames")),
        ]);
        if (usersRes.status === "fulfilled") {
          setSalesReps(usersRes.value.docs.map(d => ({ uid: d.id, name: d.data().name || "مستخدم" })));
        } else {
          setSalesReps([]);
        }
        if (adMetaRes.status === "fulfilled" && adMetaRes.value.exists() && Array.isArray(adMetaRes.value.data().names)) {
          setUniqueAds(adMetaRes.value.data().names as string[]);
        } else {
          setUniqueAds([]);
        }
      } catch {
        setSalesReps([]);
        setUniqueAds([]);
      } finally {
        setIsLoadingProps(false);
      }
    }
    loadDynamicFilters();
  }, []);

  return (
    <div
      dir="rtl"
      className={`
        fixed top-[64px] left-0 z-30 transition-all duration-300
        w-full ${isSidebarCollapsed ? "md:w-[calc(100%-72px)]" : "md:w-[calc(100%-240px)]"}
        bg-white border-b border-[#E2E8F0] shadow-sm
        px-4 md:px-6 py-3 md:py-0 md:h-[58px]
        flex flex-col md:flex-row-reverse items-start md:items-center gap-3
      `}
    >
      {/* Date range pills */}
      <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-1 gap-0.5 shrink-0 overflow-x-auto no-scrollbar">
        {ranges.map((range) => (
          <button
            key={range}
            onClick={() => updateFilter({ dateRange: range })}
            className={`px-3.5 py-1.5 text-[12px] font-bold rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer
              ${filter.dateRange === range
                ? "bg-[#1E40AF] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#1E293B] hover:bg-white"
              }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {filter.dateRange === "مخصص" && (
        <div className="flex items-center gap-2 shrink-0" dir="ltr">
          <input
            type="date"
            value={filter.customDateFrom ? filter.customDateFrom.toISOString().slice(0, 10) : ""}
            onChange={(e) => updateFilter({ customDateFrom: e.target.value ? new Date(e.target.value) : null })}
            className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[12px] font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]/50 transition-colors"
          />
          <span className="text-[12px] font-bold text-[#94A3B8]">–</span>
          <input
            type="date"
            value={filter.customDateTo ? filter.customDateTo.toISOString().slice(0, 10) : ""}
            onChange={(e) => updateFilter({ customDateTo: e.target.value ? new Date(e.target.value) : null })}
            className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[12px] font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]/50 transition-colors"
          />
        </div>
      )}

      {/* Selectors + reset */}
      <div className="flex flex-wrap items-center gap-2 flex-1 justify-start md:justify-end">
        <select value={filter.platform} onChange={(e) => updateFilter({ platform: e.target.value as Platform })} className={selectCls} disabled={isLoadingProps}>
          <option value="all">جميع المنصات</option>
          <option value="whatsapp">واتساب</option>
          <option value="messenger">ماسنجر</option>
          <option value="tiktok">تيك توك</option>
        </select>

        <select value={filter.salesRep} onChange={(e) => updateFilter({ salesRep: e.target.value })} className={`${selectCls} max-w-[150px]`} disabled={isLoadingProps}>
          <option value="all">جميع المندوبين</option>
          {salesReps.map(rep => <option key={rep.uid} value={rep.uid}>{rep.name}</option>)}
        </select>

        <select value={filter.adName} onChange={(e) => updateFilter({ adName: e.target.value })} className={`${selectCls} max-w-[160px]`} disabled={isLoadingProps}>
          <option value="all">جميع الإعلانات</option>
          {uniqueAds.map(ad => <option key={ad} value={ad}>{ad}</option>)}
        </select>

        <select value={filter.bookingType} onChange={(e) => updateFilter({ bookingType: e.target.value as "all" | "self_booking" | "call_booking" })} className={selectCls} disabled={isLoadingProps}>
          <option value="all">كل أنواع الحجز</option>
          <option value="self_booking">حجز ذاتي</option>
          <option value="call_booking">حجز بمكالمة</option>
        </select>

        <select value={filter.dealCategory} onChange={(e) => updateFilter({ dealCategory: e.target.value as "all" | "core" | "side" })} className={selectCls} disabled={isLoadingProps}>
          <option value="all">كل فئات الصفقات</option>
          <option value="core">Core</option>
          <option value="side">Side</option>
        </select>

        <div className="hidden md:block h-5 w-px bg-[#E2E8F0] mx-0.5" />

        <button
          onClick={resetFilter}
          title="إعادة تعيين الفلاتر"
          className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[17px]">filter_alt_off</span>
        </button>
      </div>
    </div>
  );
}
