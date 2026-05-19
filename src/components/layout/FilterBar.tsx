import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useFilter, DateRange, Platform } from "@/lib/filter-context";
import { useAuth } from "@/lib/auth-context";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAvailableMonths } from "@/lib/hooks/useAvailableMonths";
import { useCourses } from "@/lib/hooks/useCourses";

const selectCls = `
  bg-white border border-[#E2E8F0] rounded-xl px-3 py-2
  text-[12px] font-bold text-[#1E293B]
  focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]/50
  hover:border-[#CBD5E1] appearance-none cursor-pointer transition-colors
  disabled:opacity-40 disabled:cursor-not-allowed
`.replace(/\s+/g, ' ').trim();

const dateInputCls = `
  bg-white border border-[#E2E8F0] rounded-xl px-3 py-2
  text-[12px] font-bold text-[#1E293B]
  focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]/50
  transition-colors
`.replace(/\s+/g, ' ').trim();

export function FilterBar({ isSidebarCollapsed }: { isSidebarCollapsed?: boolean }) {
  const location = useLocation();
  const { user } = useAuth();
  const { filter, updateFilter, resetFilter } = useFilter();
  const { months: availableMonths, loading: monthsLoading } = useAvailableMonths();
  const courses = useCourses(true);

  const adminRoutes = ["/dashboard", "/team", "/ads", "/reports", "/metrics"];
  const isAdminRoute = adminRoutes.includes(location.pathname);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  if (!isAdminRoute || !isAdmin) return null;

  const ranges: DateRange[] = ["اليوم", "الأسبوع", "الشهر", "شهر محدد", "الإجمالي", "مخصص"];
  const [salesReps, setSalesReps] = useState<{ uid: string; name: string }[]>([]);
  const [uniqueAds, setUniqueAds] = useState<string[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(true);

  const loadDynamicFilters = useCallback(async () => {
    setIsLoadingProps(true);
    try {
      const [usersRes, adMetaRes] = await Promise.allSettled([
        getDocs(query(collection(db, "users"), where("role", "==", "sales"))),
        getDoc(doc(db, "metadata", "adNames")),
      ]);
      if (usersRes.status === "fulfilled") {
        setSalesReps(usersRes.value.docs.map((d) => ({ uid: d.id, name: d.data().name || "مستخدم" })));
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
  }, []);

  useEffect(() => {
    void loadDynamicFilters();
  }, [loadDynamicFilters]);

  useEffect(() => {
    const onAdNamesUpdated = () => {
      void loadDynamicFilters();
    };
    window.addEventListener("ise-metadata-adnames-updated", onAdNamesUpdated);
    return () => window.removeEventListener("ise-metadata-adnames-updated", onAdNamesUpdated);
  }, [loadDynamicFilters]);

  // Default the month dropdown to the most recent month with data the first time the user picks "شهر محدد".
  useEffect(() => {
    if (
      filter.dateRange === "شهر محدد" &&
      !filter.selectedMonth &&
      availableMonths.length > 0
    ) {
      updateFilter({ selectedMonth: availableMonths[0].value });
    }
  }, [filter.dateRange, filter.selectedMonth, availableMonths, updateFilter]);

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

      {/* Specific-month dropdown (only months that actually have data) */}
      {filter.dateRange === "شهر محدد" && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-black text-[#64748B] uppercase tracking-wider">الشهر</span>
          {availableMonths.length === 0 ? (
            <span className="text-[12px] font-bold text-[#94A3B8] bg-[#F8FAFC] border border-dashed border-[#E2E8F0] rounded-xl px-3 py-2">
              {monthsLoading ? "...جاري التحميل" : "لا توجد بيانات شهور"}
            </span>
          ) : (
            <select
              value={filter.selectedMonth ?? ""}
              onChange={(e) => updateFilter({ selectedMonth: e.target.value || null })}
              className={`${selectCls} min-w-[150px]`}
            >
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Custom date range */}
      {filter.dateRange === "مخصص" && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black text-[#64748B] uppercase tracking-wider">من</span>
            <input
              type="date"
              value={filter.customDateFrom ? filter.customDateFrom.toISOString().slice(0, 10) : ""}
              max={filter.customDateTo ? filter.customDateTo.toISOString().slice(0, 10) : undefined}
              onChange={(e) => updateFilter({ customDateFrom: e.target.value ? new Date(e.target.value) : null })}
              className={dateInputCls}
              dir="ltr"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black text-[#64748B] uppercase tracking-wider">إلى</span>
            <input
              type="date"
              value={filter.customDateTo ? filter.customDateTo.toISOString().slice(0, 10) : ""}
              min={filter.customDateFrom ? filter.customDateFrom.toISOString().slice(0, 10) : undefined}
              onChange={(e) => updateFilter({ customDateTo: e.target.value ? new Date(e.target.value) : null })}
              className={dateInputCls}
              dir="ltr"
            />
          </div>
          {filter.customDateFrom && filter.customDateTo &&
            filter.customDateFrom > filter.customDateTo && (
            <span className="text-[11px] font-black text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-2 py-1">
              تاريخ البداية بعد النهاية
            </span>
          )}
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

        <select value={filter.courseId} onChange={(e) => updateFilter({ courseId: e.target.value })} className={`${selectCls} max-w-[160px]`} disabled={isLoadingProps}>
          <option value="all">كل الكورسات</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
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
