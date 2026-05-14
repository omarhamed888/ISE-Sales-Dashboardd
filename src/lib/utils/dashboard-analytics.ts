import {
  calculateAggregates,
  calcInteractionsFromParsedData,
  calcConversionRate,
  buildDealsCountByReportKey,
  getDealCountForReport,
} from "@/lib/utils/dashboard-aggregations";
import type { PlatformStats, DailyBucket, SalesRepBucket } from "@/lib/types";
export type { DailyBucket, SalesRepBucket, PlatformStats };
import {
  normalizeReportDateKey,
  formatReportDateArabicShort,
  parseYmdToDate,
} from "@/lib/utils/report-dates";

/** Extract YYYY-MM-DD key from a deal's closeDate (preferred) or fallback date. */
function dealDateKey(d: any): string | null {
  const raw =
    typeof d?.closeDate === "string" && d.closeDate.trim()
      ? d.closeDate.trim()
      : typeof d?.date === "string"
        ? d.date.trim()
        : "";
  if (!raw) return null;
  const key = raw.split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/** e.g. "30 مارس" for chart ticks */
export function formatReportDateArabicDayMonth(ymd: string): string {
  const d = parseYmdToDate(ymd);
  if (!d) return ymd;
  const month = AR_MONTHS[d.getMonth()] ?? String(d.getMonth() + 1);
  return `${d.getDate()} ${month}`;
}

export type PlatformKey = "whatsapp" | "messenger" | "tiktok";

export function classifyPlatform(platformRaw: string | undefined): PlatformKey {
  const p = (platformRaw || "").toLowerCase();
  if (p.includes("واتساب") || p.includes("whatsapp")) return "whatsapp";
  if (p.includes("تيك توك") || p.includes("tiktok")) return "tiktok";
  return "messenger";
}

/**
 * Per-platform totals. Messages come from reports (authoritative per platform). Interactions
 * here are the *report-matched* deal counts — `Deal` does not carry a platform field, so deals
 * with no matching report on the same `salesRepId|date` are not attributed to any platform.
 * The KPI/chart totals use the unified deal-based path, so a small mismatch here is expected.
 */
export function getPlatformStats(reports: any[], deals?: any[]): PlatformStats {
  const dealsByKey = deals ? buildDealsCountByReportKey(deals) : undefined;
  const out: PlatformStats = {
    whatsapp: { messages: 0, interactions: 0 },
    messenger: { messages: 0, interactions: 0 },
    tiktok: { messages: 0, interactions: 0 },
  };
  reports.forEach((r) => {
    const pd = r.parsedData;
    if (!pd) return;
    const msgs =
      // We intentionally trust parsed totalMessages so Messenger greeting-stage leakage stays included in KPI totals.
      (typeof pd.totalMessages === "number" ? pd.totalMessages : null) ??
      pd.summary?.totalMessages ??
      0;
    const dealCount = dealsByKey ? getDealCountForReport(r, dealsByKey) : undefined;
    const intr = calcInteractionsFromParsedData(pd, dealCount);
    if (msgs === 0) return;
    const key = classifyPlatform(r.platform);
    out[key].messages += msgs;
    out[key].interactions += intr;
  });
  return out;
}

const FUNNEL_BLUES = ["#3498db", "#5dade2", "#85c1e9", "#aed6f1", "#d6eaf8"] as const;
const FUNNEL_RED = "#e74c3c";

export interface FunnelBarRow {
  name: string;
  count: number;
  pct: number;
  fill: string;
  label: string;
}

/** Remaining audience at each stage; final bar = actual deals (الصفقات). */
export function buildConversionFunnelBars(cur: ReturnType<typeof calculateAggregates>): FunnelBarRow[] {
  const tm = cur.totalMessages;
  const base = Math.max(tm, 1);
  const g = cur.funnel.greeting;
  const d = cur.funnel.details;
  const p = cur.funnel.price;
  const deals = cur.interactions;

  const afterGreeting = g > 0 ? Math.max(0, tm - g) : tm;
  const afterDetails = Math.max(0, afterGreeting - d);
  const afterPrice = Math.max(0, afterDetails - p);

  const rows: { name: string; count: number }[] = [
    { name: "إجمالي الرسائل", count: tm },
  ];
  if (g > 0) {
    rows.push({ name: "بعد التحية", count: afterGreeting });
  }
  rows.push(
    { name: "بعد التفاصيل", count: afterDetails },
    { name: "بعد السعر", count: afterPrice },
    { name: "الصفقات", count: deals },
  );

  const drops: number[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    drops.push(Math.max(0, rows[i].count - rows[i + 1].count));
  }
  let maxDropIdx = 0;
  let maxDrop = drops[0] ?? 0;
  drops.forEach((drop, i) => {
    if (drop > maxDrop) {
      maxDrop = drop;
      maxDropIdx = i;
    }
  });
  // Bar index with biggest drop is maxDropIdx + 1 (the lower row of the step) — highlight the *step* end bar
  const redBarIndex = maxDrop > 0 ? maxDropIdx + 1 : -1;

  return rows.map((row, i) => {
    const pct = Math.min(100, parseFloat(((row.count / base) * 100).toFixed(1)));
    const fill = i === redBarIndex ? FUNNEL_RED : FUNNEL_BLUES[i] ?? FUNNEL_BLUES[FUNNEL_BLUES.length - 1];
    return {
      name: row.name,
      count: row.count,
      pct,
      fill,
      label: `${row.count} (${pct}%)`,
    };
  });
}

/**
 * Daily buckets combining two independent sources:
 *  - `msgs` are summed from reports keyed by their business date.
 *  - `interactions` are summed directly from closed deals keyed by `closeDate` (fallback `date`).
 * This matches the KPI aggregate (which counts deals directly) — deals without a matching report
 * on the same `salesRepId|date` still contribute to the daily interactions total.
 */
export function buildDailyBuckets(reports: any[], deals?: any[]): DailyBucket[] {
  const map = new Map<string, DailyBucket>();

  const ensure = (k: string): DailyBucket => {
    let e = map.get(k);
    if (!e) {
      e = {
        dateKey: k,
        label: formatReportDateArabicShort(k),
        labelDayMonth: formatReportDateArabicDayMonth(k),
        msgs: 0,
        interactions: 0,
        conversionRate: 0,
      };
      map.set(k, e);
    }
    return e;
  };

  reports.forEach((r) => {
    const k = normalizeReportDateKey(r);
    if (!k) return;
    const pd = r.parsedData;
    if (!pd) return;
    const msgs = pd.totalMessages ?? pd.summary?.totalMessages ?? 0;
    ensure(k).msgs += msgs;
  });

  (deals ?? []).forEach((d) => {
    const k = dealDateKey(d);
    if (!k) return;
    ensure(k).interactions += 1;
  });

  const list = Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  list.forEach((e) => {
    e.conversionRate = calcConversionRate(e.interactions, e.msgs);
  });
  return list;
}

function shortRepName(name: string): string {
  const t = (name || "").trim();
  if (!t) return "غير مسجل";
  if (t.length <= 12) return t;
  const first = t.split(/\s+/)[0] ?? t;
  return first.length > 12 ? `${first.slice(0, 10)}…` : first;
}

/**
 * Per-rep buckets. Messages come from reports; interactions are summed from closed deals
 * directly so the per-rep numbers match the dashboard KPI and /deals-analytics.
 */
export function buildSalesRepBuckets(reports: any[], deals?: any[]): SalesRepBucket[] {
  const map = new Map<string, { messages: number; interactions: number }>();
  const ensure = (key: string) => {
    let e = map.get(key);
    if (!e) {
      e = { messages: 0, interactions: 0 };
      map.set(key, e);
    }
    return e;
  };

  reports.forEach((r) => {
    const pd = r.parsedData;
    if (!pd) return;
    const msgs = pd.totalMessages ?? pd.summary?.totalMessages ?? 0;
    if (msgs === 0) return;
    const key = (r.salesRepName as string)?.trim() || "غير مسجل";
    ensure(key).messages += msgs;
  });

  (deals ?? []).forEach((d) => {
    const key = (d.salesRepName as string)?.trim() || "غير مسجل";
    ensure(key).interactions += 1;
  });

  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      displayName: shortRepName(name),
      messages: v.messages,
      interactions: v.interactions,
      conversionRate: calcConversionRate(v.interactions, v.messages),
    }))
    .sort((a, b) => b.messages - a.messages);
}

export interface DealLeadMonthBucket {
  key: "sameMonth" | "previousMonth" | "older" | "unknown";
  name: string;
  count: number;
  pct: number;
  fill: string;
  avgCycleDays: number | null;
}

/** YYYY-MM from a YYYY-MM-DD date key, or null if invalid. */
function monthKey(ymd: string | null): string | null {
  if (!ymd) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd.slice(0, 7) : null;
}

/** Diff in whole calendar months between two YYYY-MM keys (older → later returns >= 0). */
function monthDiff(earlier: string, later: string): number {
  const [ey, em] = earlier.split("-").map(Number);
  const [ly, lm] = later.split("-").map(Number);
  return (ly - ey) * 12 + (lm - em);
}

/**
 * Classifies closed deals by how far back their first-contact month is from their close month:
 *   - sameMonth     → first contact in the same calendar month as the close
 *   - previousMonth → first contact in the immediately preceding month
 *   - older         → first contact more than one month before close (long sales cycle)
 *   - unknown       → no firstContactDate recorded
 */
export function buildDealLeadMonthBuckets(deals: any[]): DealLeadMonthBucket[] {
  const acc = {
    sameMonth: { count: 0, cycleSum: 0, cycleN: 0 },
    previousMonth: { count: 0, cycleSum: 0, cycleN: 0 },
    older: { count: 0, cycleSum: 0, cycleN: 0 },
    unknown: { count: 0, cycleSum: 0, cycleN: 0 },
  };

  for (const d of deals || []) {
    const closeMonth = monthKey(dealDateKey(d));
    const contactMonth = monthKey(
      typeof d?.firstContactDate === "string" && d.firstContactDate.trim()
        ? d.firstContactDate.trim().split("T")[0]
        : null
    );

    let bucket: keyof typeof acc;
    if (!contactMonth || !closeMonth) {
      bucket = "unknown";
    } else {
      const diff = monthDiff(contactMonth, closeMonth);
      if (diff <= 0) bucket = "sameMonth";
      else if (diff === 1) bucket = "previousMonth";
      else bucket = "older";
    }

    acc[bucket].count += 1;
    const cycle = Number(d?.closingCycleDays);
    if (Number.isFinite(cycle) && cycle >= 0) {
      acc[bucket].cycleSum += cycle;
      acc[bucket].cycleN += 1;
    }
  }

  const total = acc.sameMonth.count + acc.previousMonth.count + acc.older.count + acc.unknown.count;
  const pct = (n: number) =>
    total > 0 ? parseFloat(((n / total) * 100).toFixed(1)) : 0;
  const avg = (s: number, n: number) => (n > 0 ? Math.round(s / n) : null);

  return [
    {
      key: "sameMonth",
      name: "عملاء الشهر الحالي",
      count: acc.sameMonth.count,
      pct: pct(acc.sameMonth.count),
      fill: "#10B981",
      avgCycleDays: avg(acc.sameMonth.cycleSum, acc.sameMonth.cycleN),
    },
    {
      key: "previousMonth",
      name: "عملاء الشهر السابق",
      count: acc.previousMonth.count,
      pct: pct(acc.previousMonth.count),
      fill: "#3B82F6",
      avgCycleDays: avg(acc.previousMonth.cycleSum, acc.previousMonth.cycleN),
    },
    {
      key: "older",
      name: "عملاء من أشهر أقدم",
      count: acc.older.count,
      pct: pct(acc.older.count),
      fill: "#F59E0B",
      avgCycleDays: avg(acc.older.cycleSum, acc.older.cycleN),
    },
    {
      key: "unknown",
      name: "بلا تاريخ تواصل",
      count: acc.unknown.count,
      pct: pct(acc.unknown.count),
      fill: "#94A3B8",
      avgCycleDays: avg(acc.unknown.cycleSum, acc.unknown.cycleN),
    },
  ];
}

export interface BestAdInfo {
  adName: string;
  rate: number;
  total: number;
}

export function findBestAdByConversion(
  adsData: Record<string, { greeting: number; details: number; price: number; success: number }>,
  minTotal = 5
): BestAdInfo | null {
  let best: BestAdInfo | null = null;
  Object.entries(adsData).forEach(([name, data]) => {
    const total = data.greeting + data.details + data.price + data.success;
    if (total < minTotal) return;
    const rate = (data.success / total) * 100;
    if (!best || rate > best.rate) {
      best = { adName: name, rate: parseFloat(rate.toFixed(1)), total };
    }
  });
  return best;
}
