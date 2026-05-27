import { useMemo } from "react";
import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";
import {
  buildCourseDealKeys,
  filterReports,
  getDashboardPreviousPeriodReports,
} from "@/lib/utils/dashboard-filters";
import { useFilter } from "@/lib/filter-context";

interface KPICardProps {
  label: string;
  value: string;
  icon: string;
  accentColor: string;
  bgTint: string;
  iconColor: string;
  valueColor?: string;
  delta?: number | null;
}

function KPICard({ label, value, icon, accentColor, bgTint, iconColor, valueColor, delta }: KPICardProps) {
  const deltaLabel = (() => {
    if (delta === null || delta === undefined || !Number.isFinite(delta)) return null;
    const arrow = delta >= 0 ? "↑" : "↓";
    const color = delta >= 0 ? "text-emerald-600" : "text-red-600";
    return (
      <p className={`text-[11px] font-black ${color}`}>
        {arrow} {Math.abs(delta).toFixed(1)}% عن الفترة السابقة
      </p>
    );
  })();

  return (
    <div
      className={`bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-r-4 ${accentColor}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">{label}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgTint}`}>
          <span className={`material-symbols-outlined text-[20px] ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
      </div>
      <p className={`text-4xl font-black leading-none ${valueColor ?? "text-[#0F172A]"}`}>{value}</p>
      {deltaLabel}
    </div>
  );
}

export function KPICards({ reports, allReports, deals, prevDeals }: { reports: any[]; allReports: any[]; deals?: any[]; prevDeals?: any[] }) {
  const { filter } = useFilter();

  const courseDealKeys = useMemo(() => {
    if (filter.courseId === "all") return undefined;
    return buildCourseDealKeys(deals ?? []);
  }, [deals, filter.courseId]);

  const globalFilter = useMemo(() => ({ ...filter, platform: "all" as const }), [filter]);

  const globalReports = useMemo(
    () => filterReports(allReports, globalFilter, courseDealKeys),
    [allReports, globalFilter, courseDealKeys]
  );

  const cur = calculateAggregates(reports, deals);
  const globalAgg = calculateAggregates(globalReports, deals);

  const prevGlobalReports = getDashboardPreviousPeriodReports(
    allReports,
    globalFilter,
    courseDealKeys
  );
  // Previous-period interactions must come from the previous-period deals, not
  // the current ones — otherwise the conversion delta compares apples to oranges.
  const prevGlobalAgg = calculateAggregates(prevGlobalReports, prevDeals);

  const pctDelta = (current: number, previous: number) => {
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
  };
  const prevReports = getDashboardPreviousPeriodReports(
    allReports,
    filter,
    courseDealKeys
  );
  const prevAgg = calculateAggregates(prevReports, prevDeals);

  const messagesDelta = pctDelta(cur.totalMessages, prevAgg.totalMessages);
  const dealsDelta = pctDelta((deals?.length ?? 0), (prevDeals?.length ?? 0));
  const prevResponded = prevAgg.totalMessages - prevAgg.funnel.greeting;
  const prevResponseRate =
    prevAgg.totalMessages > 0
      ? Math.min(100, parseFloat(((prevResponded / prevAgg.totalMessages) * 100).toFixed(1)))
      : 0;

  const responded = cur.totalMessages - cur.funnel.greeting;
  const responseRate =
    cur.totalMessages > 0
      ? Math.min(100, parseFloat(((responded / cur.totalMessages) * 100).toFixed(1)))
      : 0;
  const responseRateDelta = pctDelta(responseRate, prevResponseRate);
  const conversionDelta = pctDelta(globalAgg.conversionRate, prevGlobalAgg.conversionRate);

  const closingRate = globalAgg.conversionRate;
  const closeRateColor =
    closingRate >= 15
      ? "text-[#10B981]"
      : closingRate >= 5
        ? "text-[#F59E0B]"
        : "text-[#EF4444]";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full" dir="rtl">
      {/* Card 1: إجمالي الرسائل */}
      <KPICard
        label="إجمالي الرسائل"
        value={cur.totalMessages.toLocaleString('en-US')}
        icon="forum"
        accentColor="border-r-[#2563EB]"
        bgTint="bg-[#EFF6FF]"
        iconColor="text-[#2563EB]"
        delta={messagesDelta}
      />

      {/* Card 2: الصفقات المغلقة — count the actual filtered deals (matches
          DealCycleSection and DealsAnalyticsPage). cur.interactions also equals
          deals.length now, but using `deals` directly keeps the intent obvious. */}
      <KPICard
        label="الصفقات المغلقة"
        value={(deals?.length ?? 0).toLocaleString('en-US')}
        icon="handshake"
        accentColor="border-r-[#10B981]"
        bgTint="bg-[#ECFDF5]"
        iconColor="text-[#10B981]"
        delta={dealsDelta}
      />

      {/* Card 3: معدل الرد */}
      <KPICard
        label="معدل الرد"
        value={`${responseRate.toFixed(1)}%`}
        icon="reply"
        accentColor="border-r-[#8B5CF6]"
        bgTint="bg-[#F5F3FF]"
        iconColor="text-[#8B5CF6]"
        delta={responseRateDelta}
      />

      {/* Card 4: معدل الإغلاق = صفقات مغلقة / إجمالي رسائل */}
      <KPICard
        label="معدل الإغلاق"
        value={`${closingRate.toFixed(1)}%`}
        icon="percent"
        accentColor="border-r-[#F59E0B]"
        bgTint="bg-[#FFFBEB]"
        iconColor="text-[#F59E0B]"
        valueColor={closeRateColor}
        delta={conversionDelta}
      />
    </div>
  );
}
