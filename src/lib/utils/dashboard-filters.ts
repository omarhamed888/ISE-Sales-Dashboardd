import { FilterState } from "@/lib/filter-context";
import { DASHBOARD_DATA_QUALITY_FROM_DATE } from "@/lib/config";
import {
  normalizeReportDateKey,
  isReportDateInDashboardRange,
  getPreviousPeriodYmdRange,
  isKeyInClosedRange,
  isReportDateInMonth,
} from "@/lib/utils/report-dates";

/** `${salesRepId}|${date}` keys for course-filtered deals (links reports to deals). */
export function buildCourseDealKeys(deals: any[]): Set<string> {
  const keys = new Set<string>();
  for (const d of deals || []) {
    const repId = d?.salesRepId;
    const rawDate = typeof d?.date === "string" ? d.date : "";
    const date = rawDate.split("T")[0];
    if (repId && date) keys.add(`${repId}|${date}`);
  }
  return keys;
}

function reportMatchesCourse(
  r: any,
  courseId: string,
  courseDealKeys?: Set<string>
): boolean {
  const repId = r?.salesRepId;
  const rawDate = typeof r?.date === "string" ? r.date : "";
  const date = rawDate.split("T")[0];
  if (repId && date && courseDealKeys?.has(`${repId}|${date}`)) return true;

  const closed = r.parsedData?.closedDeals;
  if (Array.isArray(closed)) {
    return closed.some(
      (d: any) => Array.isArray(d.products) && d.products.includes(courseId)
    );
  }
  return false;
}

function courseMatches(
  filter: FilterState,
  r: any,
  courseDealKeys?: Set<string>
): boolean {
  if (!filter.courseId || filter.courseId === "all") return true;
  return reportMatchesCourse(r, filter.courseId, courseDealKeys);
}

function platformMatches(filter: FilterState, r: any): boolean {
  if (filter.platform === "all") return true;
  const pf = (r.platform || "").toLowerCase();
  if (filter.platform === "whatsapp") {
    return pf.includes("whatsapp") || pf.includes("واتساب");
  }
  if (filter.platform === "messenger") {
    return (
      pf.includes("messenger") ||
      pf.includes("ماسنجر") ||
      pf.includes("انستقرام") ||
      pf.includes("إنستغرام")
    );
  }
  if (filter.platform === "tiktok") {
    return pf.includes("tiktok") || pf.includes("تيك توك");
  }
  return true;
}

function passesDateAndQuality(r: any, filter: FilterState): boolean {
  const key = normalizeReportDateKey(r);
  if (filter.dateRange === "مخصص") {
    if (!key || !filter.customDateFrom || !filter.customDateTo) return false;
    const from = filter.customDateFrom.toISOString().slice(0, 10);
    const to = filter.customDateTo.toISOString().slice(0, 10);
    return isKeyInClosedRange(key, from, to);
  }

  if (filter.dateRange === "شهر محدد") {
    return isReportDateInMonth(key, filter.selectedMonth);
  }

  if (filter.dateRange === "الإجمالي") {
    if (!key) return false;
    return key >= DASHBOARD_DATA_QUALITY_FROM_DATE;
  }

  return isReportDateInDashboardRange(
    key,
    filter.dateRange as "اليوم" | "الأسبوع" | "الشهر" | "الإجمالي"
  );
}

/** Reports matching dashboard filters (by business `date`, not submission time). */
export function filterReports(
  reports: any[],
  filter: FilterState,
  courseDealKeys?: Set<string>
) {
  return reports.filter((r) => {
    if (!platformMatches(filter, r)) return false;

    if (filter.salesRep !== "all" && r.salesRepId !== filter.salesRep) {
      return false;
    }

    if (!courseMatches(filter, r, courseDealKeys)) return false;

    if (filter.adName !== "all" && r.parsedData?.funnel) {
      let hasAd = false;
      Object.values(r.parsedData.funnel).forEach((stages: any) => {
        if (Array.isArray(stages)) {
          if (stages.some((s: any) => s.adName === filter.adName)) hasAd = true;
        }
      });
      if (!hasAd) return false;
    }

    return passesDateAndQuality(r, filter);
  });
}

/** Same non-date filters as `filterReports`, but restricted to a YYYY-MM-DD inclusive range (for previous-period KPIs). */
export function filterReportsByYmdRange(
  reports: any[],
  filter: FilterState,
  from: string,
  to: string,
  courseDealKeys?: Set<string>
) {
  return reports.filter((r) => {
    if (!platformMatches(filter, r)) return false;
    if (filter.salesRep !== "all" && r.salesRepId !== filter.salesRep) return false;
    if (!courseMatches(filter, r, courseDealKeys)) return false;

    if (filter.adName !== "all" && r.parsedData?.funnel) {
      let hasAd = false;
      Object.values(r.parsedData.funnel).forEach((stages: any) => {
        if (Array.isArray(stages)) {
          if (stages.some((s: any) => s.adName === filter.adName)) hasAd = true;
        }
      });
      if (!hasAd) return false;
    }

    const key = normalizeReportDateKey(r);
    if (!key) return false;
    if (key < DASHBOARD_DATA_QUALITY_FROM_DATE) return false;
    return isKeyInClosedRange(key, from, to);
  });
}

export function getDashboardPreviousPeriodReports(
  allReports: any[],
  filter: FilterState,
  courseDealKeys?: Set<string>
): any[] {
  // Previous-period comparison is only meaningful for fixed buckets.
  if (filter.dateRange === "مخصص" || filter.dateRange === "شهر محدد") return [];
  const range = getPreviousPeriodYmdRange(
    filter.dateRange as "اليوم" | "الأسبوع" | "الشهر" | "الإجمالي"
  );
  if (!range) return [];
  return filterReportsByYmdRange(allReports, filter, range.from, range.to, courseDealKeys);
}

/** Non-date filters shared by current- and previous-period deal filtering. */
export function dealMatchesNonDateFilters(d: any, filter: FilterState): boolean {
  if (filter.salesRep !== "all" && d.salesRepId !== filter.salesRep) return false;
  if (filter.bookingType && filter.bookingType !== "all") {
    const bt = d.bookingType || (d.closureType === "call" ? "call_booking" : "self_booking");
    if (bt !== filter.bookingType) return false;
  }
  if (filter.dealCategory && filter.dealCategory !== "all") {
    const category = d.dealCategory === "side" ? "side" : "core";
    if (category !== filter.dealCategory) return false;
  }
  if (filter.courseId && filter.courseId !== "all") {
    const products = Array.isArray(d.products) ? d.products : [];
    if (!products.includes(filter.courseId)) return false;
  }
  return true;
}

/** Closed deals whose closeDate falls in the same dashboard window as reports (اليوم / الأسبوع / الشهر / الإجمالي). */
export function filterDealsByDashboardDate(deals: any[], filter: FilterState): any[] {
  return deals.filter((d) => {
    if (!dealMatchesNonDateFilters(d, filter)) return false;
    // Source `closeDate` only — matches `getDealsByDateRange`'s server query
    // (which only indexes closeDate). Falling back to `d.date` would let
    // legacy rows leak into client-side counts on /deals-analytics that the
    // dashboard's Firestore query can never see, breaking parity.
    const raw =
      typeof d.closeDate === "string" && d.closeDate.trim() ? d.closeDate.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
    if (filter.dateRange === "مخصص") {
      if (!filter.customDateFrom || !filter.customDateTo) return false;
      const from = filter.customDateFrom.toISOString().slice(0, 10);
      const to = filter.customDateTo.toISOString().slice(0, 10);
      return isKeyInClosedRange(raw, from, to);
    }
    if (filter.dateRange === "شهر محدد") {
      return isReportDateInMonth(raw, filter.selectedMonth);
    }
    return isReportDateInDashboardRange(
      raw,
      filter.dateRange as "اليوم" | "الأسبوع" | "الشهر" | "الإجمالي"
    );
  });
}
