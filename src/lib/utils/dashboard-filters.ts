import { FilterState } from "@/lib/filter-context";
import { DASHBOARD_DATA_QUALITY_FROM_DATE } from "@/lib/config";
import {
  normalizeReportDateKey,
  isReportDateInDashboardRange,
  getPreviousPeriodYmdRange,
  isKeyInClosedRange,
} from "@/lib/utils/report-dates";

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
  return true;
}

function passesDateAndQuality(r: any, filter: FilterState): boolean {
  const key = normalizeReportDateKey(r);

  if (filter.dateRange === "الإجمالي") {
    if (!key) return true;
    return key >= DASHBOARD_DATA_QUALITY_FROM_DATE;
  }

  return isReportDateInDashboardRange(key, filter.dateRange);
}

/** Reports matching dashboard filters (by business `date`, not submission time). */
export function filterReports(reports: any[], filter: FilterState) {
  return reports.filter((r) => {
    if (!platformMatches(filter, r)) return false;

    if (filter.salesRep !== "all" && r.salesRepId !== filter.salesRep) {
      return false;
    }

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
  to: string
) {
  return reports.filter((r) => {
    if (!platformMatches(filter, r)) return false;
    if (filter.salesRep !== "all" && r.salesRepId !== filter.salesRep) return false;

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
  filter: FilterState
): any[] {
  const range = getPreviousPeriodYmdRange(filter.dateRange);
  if (!range) return [];
  return filterReportsByYmdRange(allReports, filter, range.from, range.to);
}
