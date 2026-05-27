import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useFilter, DateRange, Platform, FilterState } from "@/lib/filter-context";
import { useAuth } from "@/lib/auth-context";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAvailableMonths } from "@/lib/hooks/useAvailableMonths";
import { useCourses } from "@/lib/hooks/useCourses";
import { FILTERED_ROUTES, DATE_ONLY_FILTER_ROUTES } from "@/lib/config/filtered-routes";
import { FilterSheet, SheetField } from "./FilterSheet";
import { DateRangePicker } from "@/components/filters/DateRangePicker";
import { useToast } from "@/components/ui/Toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const selectCls = `
  bg-white border border-[#E2E8F0] rounded-xl px-3 py-2
  text-[12px] font-bold text-[#1E293B]
  focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]/50
  hover:border-[#CBD5E1] appearance-none cursor-pointer transition-colors
  disabled:opacity-40 disabled:cursor-not-allowed
`.replace(/\s+/g, ' ').trim();

// Applied on top of selectCls when a selector holds a non-default value, so an
// active filter reads at a glance on desktop (mirrors DealsAnalyticsPage style).
const selectActiveCls = "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]";

type Option = { value: string; label: string };
type StoredPreset = {
  id: string;
  name: string;
  filter: Omit<FilterState, "customDateFrom" | "customDateTo"> & {
    customDateFrom: string | null;
    customDateTo: string | null;
  };
};

export function FilterBar({ isSidebarCollapsed }: { isSidebarCollapsed?: boolean }) {
  const location = useLocation();
  const { user } = useAuth();
  const { filter, updateFilter, resetFilter } = useFilter();
  const { showToast } = useToast();
  const { months: availableMonths, loading: monthsLoading } = useAvailableMonths();
  const courses = useCourses(true);

  const isAdminRoute = FILTERED_ROUTES.includes(location.pathname);
  const isDateOnly = DATE_ONLY_FILTER_ROUTES.includes(location.pathname);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // "مخصص" is reached via the DateRangePicker chip, not as a pill.
  const ranges: DateRange[] = ["اليوم", "الأسبوع", "الشهر", "شهر محدد", "الإجمالي"];
  const [salesReps, setSalesReps] = useState<{ uid: string; name: string }[]>([]);
  const [uniqueAds, setUniqueAds] = useState<string[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [presets, setPresets] = useState<StoredPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");

  const presetStorageKey = useMemo(
    () => `ise-filter-presets:${user?.uid ?? "guest"}`,
    [user?.uid]
  );

  const serializeFilter = useCallback(
    (value: FilterState): StoredPreset["filter"] => ({
      ...value,
      customDateFrom: value.customDateFrom ? value.customDateFrom.toISOString() : null,
      customDateTo: value.customDateTo ? value.customDateTo.toISOString() : null,
    }),
    []
  );

  const deserializeFilter = useCallback(
    (value: StoredPreset["filter"]): FilterState => ({
      ...value,
      customDateFrom: value.customDateFrom ? new Date(value.customDateFrom) : null,
      customDateTo: value.customDateTo ? new Date(value.customDateTo) : null,
    }),
    []
  );

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(presetStorageKey);
      if (!raw) {
        setPresets([]);
        setSelectedPresetId("");
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setPresets([]);
        setSelectedPresetId("");
        return;
      }
      const valid = parsed.filter(
        (p: unknown): p is StoredPreset =>
          !!p &&
          typeof p === "object" &&
          typeof (p as StoredPreset).id === "string" &&
          typeof (p as StoredPreset).name === "string" &&
          !!(p as StoredPreset).filter
      );
      setPresets(valid);
      setSelectedPresetId("");
    } catch {
      setPresets([]);
      setSelectedPresetId("");
    }
  }, [presetStorageKey]);

  const persistPresets = useCallback(
    (next: StoredPreset[]) => {
      setPresets(next);
      try {
        localStorage.setItem(presetStorageKey, JSON.stringify(next));
      } catch {
        showToast("error", "تعذّر حفظ الفلاتر المفضلة على هذا الجهاز.");
      }
    },
    [presetStorageKey, showToast]
  );

  const handleApplyPreset = useCallback(
    (presetId: string) => {
      setSelectedPresetId(presetId);
      if (!presetId) return;
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) return;
      updateFilter(deserializeFilter(preset.filter));
      showToast("success", `تم تطبيق فلتر "${preset.name}".`);
    },
    [deserializeFilter, presets, showToast, updateFilter]
  );

  const handleSavePreset = useCallback(() => {
    const name = (window.prompt("اسم الفلتر المفضل؟") || "").trim();
    if (!name) return;
    const nextPreset: StoredPreset = {
      id: `preset-${Date.now()}`,
      name,
      filter: serializeFilter(filter),
    };
    const deduped = presets.filter((p) => p.name !== name);
    const next = [nextPreset, ...deduped].slice(0, 10);
    persistPresets(next);
    setSelectedPresetId(nextPreset.id);
    showToast("success", `تم حفظ الفلتر "${name}".`);
  }, [filter, persistPresets, presets, serializeFilter, showToast]);

  const handleDeletePreset = useCallback(() => {
    if (!selectedPresetId) return;
    const current = presets.find((p) => p.id === selectedPresetId);
    if (!current) return;
    const ok = window.confirm(`حذف الفلتر "${current.name}"؟`);
    if (!ok) return;
    const next = presets.filter((p) => p.id !== selectedPresetId);
    persistPresets(next);
    setSelectedPresetId("");
    showToast("success", "تم حذف الفلتر المفضل.");
  }, [persistPresets, presets, selectedPresetId, showToast]);

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

  // ── Selector definitions (shared by desktop bar + mobile sheet) ──────────
  const selectors = useMemo(() => {
    const platformOptions: Option[] = [
      { value: "all", label: "جميع المنصات" },
      { value: "whatsapp", label: "واتساب" },
      { value: "messenger", label: "ماسنجر" },
      { value: "tiktok", label: "تيك توك" },
    ];
    const repOptions: Option[] = [
      { value: "all", label: "جميع المندوبين" },
      ...salesReps.map((r) => ({ value: r.uid, label: r.name })),
    ];
    const adOptions: Option[] = [
      { value: "all", label: "جميع الإعلانات" },
      ...uniqueAds.map((a) => ({ value: a, label: a })),
    ];
    const bookingOptions: Option[] = [
      { value: "all", label: "كل أنواع الحجز" },
      { value: "self_booking", label: "حجز ذاتي" },
      { value: "call_booking", label: "حجز بمكالمة" },
    ];
    const categoryOptions: Option[] = [
      { value: "all", label: "كل فئات الصفقات" },
      { value: "core", label: "Core" },
      { value: "side", label: "Side" },
    ];
    const courseOptions: Option[] = [
      { value: "all", label: "كل الكورسات" },
      ...courses.map((c) => ({ value: c.id, label: c.name })),
    ];

    return [
      { key: "platform", label: "المنصة", icon: "chat", value: filter.platform as string, options: platformOptions,
        apply: (v: string) => updateFilter({ platform: v as Platform }) },
      { key: "salesRep", label: "المندوب", icon: "person", value: filter.salesRep, options: repOptions,
        apply: (v: string) => updateFilter({ salesRep: v }) },
      { key: "adName", label: "الإعلان", icon: "ads_click", value: filter.adName, options: adOptions,
        apply: (v: string) => updateFilter({ adName: v }) },
      { key: "bookingType", label: "نوع الحجز", icon: "event_available", value: filter.bookingType as string, options: bookingOptions,
        apply: (v: string) => updateFilter({ bookingType: v as FilterState["bookingType"] }) },
      { key: "dealCategory", label: "فئة الصفقة", icon: "category", value: filter.dealCategory as string, options: categoryOptions,
        apply: (v: string) => updateFilter({ dealCategory: v as FilterState["dealCategory"] }) },
      { key: "courseId", label: "الكورس", icon: "school", value: filter.courseId, options: courseOptions,
        apply: (v: string) => updateFilter({ courseId: v }) },
    ];
  }, [filter.platform, filter.salesRep, filter.adName, filter.bookingType, filter.dealCategory, filter.courseId, salesReps, uniqueAds, courses, updateFilter]);

  // Count of active (non-default) dimension filters → drives the mobile badge
  // and the reset-button enabled state. Date range is shown separately as pills,
  // so it isn't counted here.
  const activeCount = useMemo(
    () => selectors.filter((s) => s.value && s.value !== "all").length,
    [selectors]
  );

  // Hooks must run unconditionally; gate rendering only after they're declared.
  if (!isAdminRoute || !isAdmin) return null;

  const renderDatePills = (size: "bar" | "sheet") => {
    if (size === "sheet") {
      // 2-cols grid in the sheet — bigger tap targets + neat alignment.
      return (
        <div className="grid grid-cols-2 gap-2">
          {ranges.map((range) => {
            const active = filter.dateRange === range;
            return (
              <button
                key={range}
                onClick={() => updateFilter({ dateRange: range })}
                className={`h-11 px-3 text-[13px] font-bold rounded-xl border transition-all duration-200 cursor-pointer
                  ${active
                    ? "bg-[#1E40AF] text-white border-[#1E40AF] shadow-sm"
                    : "text-[#475569] bg-[#F8FAFC] border-[#E2E8F0] active:bg-[#EFF6FF]"
                  }`}
              >
                {range}
              </button>
            );
          })}
        </div>
      );
    }
    return (
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
    );
  };

  const renderMonthPicker = () =>
    filter.dateRange === "شهر محدد" && (
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
    );

  // Custom range chip + popover + prev/next arrows. Picking a range switches
  // the active dateRange to "مخصص" automatically.
  const renderDateRangePicker = () => (
    <DateRangePicker
      from={filter.dateRange === "مخصص" ? filter.customDateFrom : null}
      to={filter.dateRange === "مخصص" ? filter.customDateTo : null}
      onChange={({ from, to }) =>
        updateFilter({
          dateRange: from && to ? "مخصص" : filter.dateRange,
          customDateFrom: from,
          customDateTo: to,
        })
      }
    />
  );

  const currentRangeLabel = (() => {
    if (filter.dateRange === "شهر محدد" && filter.selectedMonth) {
      return availableMonths.find((m) => m.value === filter.selectedMonth)?.label ?? "شهر محدد";
    }
    if (filter.dateRange === "مخصص" && filter.customDateFrom && filter.customDateTo) {
      const f = format(filter.customDateFrom, "d MMM", { locale: ar });
      const t = format(filter.customDateTo, "d MMM", { locale: ar });
      return f === t ? f : `${f} ← ${t}`;
    }
    return filter.dateRange;
  })();

  // Active filter chips shown on the mobile trigger (gives the admin a peek at
  // what's filtering without opening the sheet).
  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    for (const s of selectors) {
      if (s.value && s.value !== "all") {
        const opt = s.options.find((o) => o.value === s.value);
        if (opt) chips.push({ label: opt.label, clear: () => s.apply("all") });
      }
    }
    return chips;
  }, [selectors]);

  return (
    <>
      <div
        dir="rtl"
        className={`
          fixed top-[64px] left-0 z-30 transition-all duration-300
          w-full ${isSidebarCollapsed ? "md:w-[calc(100%-72px)]" : "md:w-[calc(100%-240px)]"}
          bg-white border-b border-[#E2E8F0] shadow-sm
        `}
      >
        {/* ── Desktop / tablet: single-row inline bar (selects scroll if overflow) ── */}
        <div className="hidden md:flex items-center gap-2 px-4 h-[58px]">
          {/* Date controls group (pills + custom range chip + nav arrows) */}
          <div className="flex items-center gap-2 shrink-0">
            {renderDatePills("bar")}
            {renderMonthPicker()}
            {renderDateRangePicker()}
          </div>

          {!isDateOnly && (
            <>
              {/* Visual divider between date controls and dimension filters */}
              <div className="h-6 w-px bg-[#E2E8F0] shrink-0" />

              {/* Scrollable selects row — never wraps, scrolls horizontally on narrow widths */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar">
                {selectors.map((s) => {
                  const active = s.value && s.value !== "all";
                  const widthCap = s.key === "salesRep" || s.key === "courseId" ? "max-w-[140px]"
                    : s.key === "adName" ? "max-w-[150px]" : "";
                  return (
                    <select
                      key={s.key}
                      value={s.value}
                      onChange={(e) => s.apply(e.target.value)}
                      className={`${selectCls} ${widthCap} shrink-0 ${active ? selectActiveCls : ""}`}
                      disabled={isLoadingProps}
                    >
                      {s.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  );
                })}
              </div>

              {/* Filter presets: save and quickly re-apply frequent admin combos. */}
              <div className="h-6 w-px bg-[#E2E8F0] shrink-0" />
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={selectedPresetId}
                  onChange={(e) => handleApplyPreset(e.target.value)}
                  className={`${selectCls} min-w-[150px] max-w-[180px]`}
                >
                  <option value="">الفلاتر المفضلة</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSavePreset}
                  className="h-9 px-2.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] text-[11px] font-black transition-colors"
                  title="حفظ الفلاتر الحالية"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={handleDeletePreset}
                  disabled={!selectedPresetId}
                  className="h-9 px-2.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] text-[11px] font-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="حذف الفلتر المختار"
                >
                  حذف
                </button>
              </div>
            </>
          )}

          {/* Reset — always pinned at the end */}
          <button
            onClick={resetFilter}
            title="إعادة تعيين الفلاتر"
            disabled={activeCount === 0 && filter.dateRange === "اليوم"}
            className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#94A3B8] disabled:hover:border-[#E2E8F0]"
          >
            <span className="material-symbols-outlined text-[17px]">filter_alt_off</span>
          </button>
        </div>

        {/* ── Mobile: trigger row + active chips strip ───────────────────── */}
        <div className="md:hidden flex flex-col">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full flex items-center justify-between gap-2 px-4 min-h-[56px] text-right active:bg-[#F8FAFC] transition-colors"
            aria-label={`فلاتر — ${currentRangeLabel}`}
          >
            <span className="flex items-center gap-2 text-[13px] font-black text-[#1E293B] min-w-0">
              <span className="material-symbols-outlined text-[22px] text-[#1E40AF] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                tune
              </span>
              <span className="shrink-0">فلاتر</span>
            </span>
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] text-[#1E40AF] border border-[#1E40AF]/15 whitespace-nowrap max-w-[180px] truncate">
                <span className="material-symbols-outlined text-[14px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                  date_range
                </span>
                <span className="truncate">{currentRangeLabel}</span>
              </span>
              {!isDateOnly && activeCount > 0 && (
                <span className="text-[11px] font-black px-2 py-1 rounded-full bg-[#1E40AF] text-white min-w-[22px] text-center shrink-0">
                  {activeCount}
                </span>
              )}
              <span className="material-symbols-outlined text-[22px] text-[#94A3B8] shrink-0">expand_more</span>
            </span>
          </button>

          {/* Active filter chips — give the admin a quick scan of what's filtering. */}
          {!isDateOnly && activeChips.length > 0 && (
            <div className="px-4 pb-3 -mt-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {activeChips.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={c.clear}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#1E40AF]/20 hover:bg-[#DBEAFE] whitespace-nowrap transition-colors shrink-0"
                >
                  <span className="truncate max-w-[120px]">{c.label}</span>
                  <span className="material-symbols-outlined text-[14px] opacity-70">close</span>
                </button>
              ))}
              <button
                type="button"
                onClick={resetFilter}
                className="text-[10px] font-black text-[#94A3B8] hover:text-[#DC2626] px-2 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors"
              >
                مسح الكل
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile filter sheet ──────────────────────────────────────────── */}
      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onReset={() => { resetFilter(); }}
        activeCount={activeCount}
      >
        <SheetField label="الفترة الزمنية" icon="calendar_month">
          {renderDatePills("sheet")}
        </SheetField>
        {filter.dateRange === "شهر محدد" && (
          <SheetField label="الشهر" icon="event">
            <select
              value={filter.selectedMonth ?? ""}
              onChange={(e) => updateFilter({ selectedMonth: e.target.value || null })}
              className={`${selectCls} w-full h-12 text-[13px]`}
              disabled={availableMonths.length === 0}
            >
              {availableMonths.length === 0 && (
                <option value="">{monthsLoading ? "...جاري التحميل" : "لا توجد بيانات"}</option>
              )}
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </SheetField>
        )}
        <SheetField label="نطاق مخصص" icon="date_range">{renderDateRangePicker()}</SheetField>
        {!isDateOnly && selectors.map((s) => (
          <SheetField key={s.key} label={s.label} icon={s.icon}>
            <select
              value={s.value}
              onChange={(e) => s.apply(e.target.value)}
              className={`${selectCls} w-full h-12 text-[13px] ${s.value && s.value !== "all" ? selectActiveCls : ""}`}
              disabled={isLoadingProps}
            >
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </SheetField>
        ))}
        {!isDateOnly && (
          <SheetField label="فلاتر مفضلة" icon="bookmark">
            <div className="space-y-2">
              <select
                value={selectedPresetId}
                onChange={(e) => handleApplyPreset(e.target.value)}
                className={`${selectCls} w-full h-12 text-[13px]`}
              >
                <option value="">اختَر فلترًا محفوظًا</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSavePreset}
                  className="h-11 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8] text-[12px] font-black"
                >
                  حفظ الحالي
                </button>
                <button
                  type="button"
                  onClick={handleDeletePreset}
                  disabled={!selectedPresetId}
                  className="h-11 rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] text-[12px] font-black disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  حذف المحدد
                </button>
              </div>
            </div>
          </SheetField>
        )}
      </FilterSheet>
    </>
  );
}
