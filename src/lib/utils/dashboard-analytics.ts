import {
  calculateAggregates,
  calcInteractionsFromParsedData,
  calcConversionRate,
} from "@/lib/utils/dashboard-aggregations";
import {
  normalizeReportDateKey,
  formatReportDateArabicShort,
  parseYmdToDate,
} from "@/lib/utils/report-dates";

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

export type PlatformKey = "whatsapp" | "messenger";

export function classifyPlatform(platformRaw: string | undefined): PlatformKey {
  const p = (platformRaw || "").toLowerCase();
  if (p.includes("واتساب") || p.includes("whatsapp")) return "whatsapp";
  return "messenger";
}

export interface PlatformStats {
  whatsapp: { messages: number; interactions: number };
  messenger: { messages: number; interactions: number };
}

export function getPlatformStats(reports: any[]): PlatformStats {
  const out: PlatformStats = {
    whatsapp: { messages: 0, interactions: 0 },
    messenger: { messages: 0, interactions: 0 },
  };
  reports.forEach((r) => {
    const pd = r.parsedData;
    if (!pd) return;
    const msgs =
      (typeof pd.totalMessages === "number" ? pd.totalMessages : null) ??
      pd.summary?.totalMessages ??
      0;
    const intr = calcInteractionsFromParsedData(pd);
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

/** Remaining audience at each stage; «بعد السعر» uses real interactions (رد بعد السعر) only. */
export function buildConversionFunnelBars(cur: ReturnType<typeof calculateAggregates>): FunnelBarRow[] {
  const tm = cur.totalMessages;
  const base = Math.max(tm, 1);
  const g = cur.funnel.greeting;
  const d = cur.funnel.details;
  const intr = cur.interactions;

  const afterGreeting = g > 0 ? Math.max(0, tm - g) : tm;
  const afterDetails = Math.max(0, afterGreeting - d);
  const afterPrice = intr;

  const rows: { name: string; count: number }[] = [
    { name: "إجمالي الرسائل", count: tm },
  ];
  if (g > 0) {
    rows.push({ name: "بعد التحية", count: afterGreeting });
  }
  rows.push(
    { name: "بعد التفاصيل", count: afterDetails },
    { name: "بعد السعر (باقيين)", count: afterPrice },
    { name: "تفاعل فعلي", count: intr }
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

export interface DailyBucket {
  dateKey: string;
  label: string;
  labelDayMonth: string;
  msgs: number;
  interactions: number;
  conversionRate: number;
}

export function buildDailyBuckets(reports: any[]): DailyBucket[] {
  const map = new Map<string, DailyBucket>();
  reports.forEach((r) => {
    const k = normalizeReportDateKey(r);
    if (!k) return;
    const pd = r.parsedData;
    if (!pd) return;
    const msgs = pd.totalMessages ?? pd.summary?.totalMessages ?? 0;
    const intr = calcInteractionsFromParsedData(pd);
    if (!map.has(k)) {
      map.set(k, {
        dateKey: k,
        label: formatReportDateArabicShort(k),
        labelDayMonth: formatReportDateArabicDayMonth(k),
        msgs: 0,
        interactions: 0,
        conversionRate: 0,
      });
    }
    const e = map.get(k)!;
    e.msgs += msgs;
    e.interactions += intr;
  });
  const list = Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  list.forEach((e) => {
    e.conversionRate = calcConversionRate(e.interactions, e.msgs);
  });
  return list;
}

export interface SalesRepBucket {
  name: string;
  displayName: string;
  messages: number;
  interactions: number;
  conversionRate: number;
}

function shortRepName(name: string): string {
  const t = (name || "").trim();
  if (!t) return "غير مسجل";
  if (t.length <= 12) return t;
  const first = t.split(/\s+/)[0] ?? t;
  return first.length > 12 ? `${first.slice(0, 10)}…` : first;
}

export function buildSalesRepBuckets(reports: any[]): SalesRepBucket[] {
  const map = new Map<string, { messages: number; interactions: number }>();
  reports.forEach((r) => {
    const pd = r.parsedData;
    if (!pd) return;
    const msgs = pd.totalMessages ?? pd.summary?.totalMessages ?? 0;
    const intr = calcInteractionsFromParsedData(pd);
    if (msgs === 0) return;
    const key = (r.salesRepName as string)?.trim() || "غير مسجل";
    if (!map.has(key)) map.set(key, { messages: 0, interactions: 0 });
    const e = map.get(key)!;
    e.messages += msgs;
    e.interactions += intr;
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

export interface LeakPieSlice {
  name: string;
  value: number;
  pct: number;
  fill: string;
}

/** Percentages are share of sum of included slice values (interactions uses KPI aggregate for consistency). */
export function buildLeakCausesPieData(cur: ReturnType<typeof calculateAggregates>): LeakPieSlice[] {
  const g = cur.funnel.greeting;
  const d = cur.funnel.details;
  const p = cur.funnel.price;
  const intr = cur.interactions;

  const slices: { name: string; value: number; fill: string }[] = [];
  if (g > 0) {
    slices.push({ name: "تسرب بعد التحية", value: g, fill: "#f8b4b4" });
  }
  slices.push({ name: "تسرب بعد التفاصيل", value: d, fill: "#f9d99d" });
  slices.push({ name: "تسرب بعد السعر", value: p, fill: "#a3daf7" });
  slices.push({ name: "تفاعل فعلي", value: intr, fill: "#27ae60" });

  const sum = slices.reduce((a, s) => a + s.value, 0);
  if (sum <= 0) return [];

  return slices.map((s) => ({
    name: s.name,
    value: s.value,
    pct: parseFloat(((s.value / sum) * 100).toFixed(1)),
    fill: s.fill,
  }));
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
