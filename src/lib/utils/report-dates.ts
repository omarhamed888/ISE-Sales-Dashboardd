import { DASHBOARD_DATA_QUALITY_FROM_DATE } from "@/lib/config";

export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Primary business date for a report: `date` field, else local calendar day of createdAt. */
export function normalizeReportDateKey(r: any): string | null {
  if (r?.date && typeof r.date === "string") {
    const t = r.date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
  }
  const ts = r?.createdAt;
  if (ts?.toDate) {
    return formatYmdLocal(ts.toDate());
  }
  if (ts instanceof Date && !isNaN(ts.getTime())) {
    return formatYmdLocal(ts);
  }
  return null;
}

export function parseYmdToDate(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

export function addDaysYmd(ymd: string, deltaDays: number): string {
  const d = parseYmdToDate(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + deltaDays);
  return formatYmdLocal(d);
}

export function startOfMonthYmd(todayYmd: string): string {
  const d = parseYmdToDate(todayYmd);
  if (!d) return todayYmd.slice(0, 7) + "-01";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function isReportDateInDashboardRange(
  key: string | null,
  dateRange: "اليوم" | "الأسبوع" | "الشهر" | "الإجمالي",
  today: Date = new Date()
): boolean {
  if (!key) return false;
  const todayKey = formatYmdLocal(today);

  if (dateRange === "الإجمالي") {
    return key >= DASHBOARD_DATA_QUALITY_FROM_DATE;
  }

  if (dateRange === "اليوم") {
    return key === todayKey && key >= DASHBOARD_DATA_QUALITY_FROM_DATE;
  }

  if (dateRange === "الأسبوع") {
    const start = addDaysYmd(todayKey, -6);
    return key >= start && key <= todayKey && key >= DASHBOARD_DATA_QUALITY_FROM_DATE;
  }

  if (dateRange === "الشهر") {
    const monthStart = startOfMonthYmd(todayKey);
    return key >= monthStart && key <= todayKey && key >= DASHBOARD_DATA_QUALITY_FROM_DATE;
  }

  return false;
}

/** Previous comparison window for KPI trends (same length as logical “previous period”). */
export function getPreviousPeriodYmdRange(
  dateRange: "اليوم" | "الأسبوع" | "الشهر" | "الإجمالي",
  today: Date = new Date()
): { from: string; to: string } | null {
  const todayKey = formatYmdLocal(today);

  if (dateRange === "الإجمالي") return null;

  if (dateRange === "اليوم") {
    return { from: addDaysYmd(todayKey, -1), to: addDaysYmd(todayKey, -1) };
  }

  if (dateRange === "الأسبوع") {
    return { from: addDaysYmd(todayKey, -13), to: addDaysYmd(todayKey, -7) };
  }

  if (dateRange === "الشهر") {
    const d = parseYmdToDate(todayKey);
    if (!d) return null;
    const lastDayPrev = new Date(d.getFullYear(), d.getMonth(), 0);
    const firstDayPrev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return { from: formatYmdLocal(firstDayPrev), to: formatYmdLocal(lastDayPrev) };
  }

  return null;
}

export function isKeyInClosedRange(key: string | null, from: string, to: string): boolean {
  if (!key) return false;
  return key >= from && key <= to;
}

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/** e.g. السبت، 4 أبريل 2026 */
export function formatReportDateArabicLong(ymd: string, locale = "ar-EG"): string {
  const d = parseYmdToDate(ymd);
  if (!d) return ymd;
  const weekday = d.toLocaleDateString(locale, { weekday: "long" });
  const day = d.getDate();
  const month = AR_MONTHS[d.getMonth()] ?? d.toLocaleDateString(locale, { month: "long" });
  const year = d.getFullYear();
  return `${weekday}، ${day} ${month} ${year}`;
}

/** Short tick label e.g. السبت 4/4 */
export function formatReportDateArabicShort(ymd: string, locale = "ar-EG"): string {
  const d = parseYmdToDate(ymd);
  if (!d) return ymd;
  const weekday = d.toLocaleDateString(locale, { weekday: "long" });
  return `${weekday} ${d.getDate()}/${d.getMonth() + 1}`;
}
