import { DASHBOARD_DATA_QUALITY_FROM_DATE } from "@/lib/config";
import {
  addDaysYmd,
  formatYmdLocal,
  startOfMonthYmd,
} from "@/lib/utils/report-dates";
import type { InsightPeriod } from "@/lib/services/ai-insights-service";

const PERIOD_LABEL: Record<InsightPeriod, string> = {
  today: "اليوم",
  week: "الأسبوع",
  month: "الشهر",
  all: "الإجمالي",
};

export function getPeriodLabel(period: InsightPeriod): string {
  return PERIOD_LABEL[period];
}

export function getTodayYmd(today: Date = new Date()): string {
  return formatYmdLocal(today);
}

/** Inclusive start date for the insights period (YYYY-MM-DD). */
export function getDateFromYmd(
  period: InsightPeriod,
  today: Date = new Date()
): string {
  const todayKey = formatYmdLocal(today);
  switch (period) {
    case "today":
      return todayKey;
    case "week":
      return addDaysYmd(todayKey, -6);
    case "month":
      return startOfMonthYmd(todayKey);
    case "all":
    default:
      return DASHBOARD_DATA_QUALITY_FROM_DATE;
  }
}

export function mapInsightPeriodToDateRange(period: InsightPeriod): string {
  switch (period) {
    case "today":
      return "today";
    case "week":
      return "week";
    case "month":
      return "month";
    case "all":
    default:
      return "all";
  }
}
