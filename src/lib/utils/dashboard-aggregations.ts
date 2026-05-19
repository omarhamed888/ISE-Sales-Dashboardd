/** Placeholder / known-bad ad labels from legacy Gemini parses — excluded from ad-level charts. */
export const DASHBOARD_IGNORED_AD_NAMES = new Set(["عام", "طموح"]);

/**
 * Real interactions for dashboard charts and KPIs are now sourced directly from the
 * `deals` collection (see buildDailyBuckets / buildSalesRepBuckets / calculateAggregates).
 * This helper is retained for:
 *   - Single-report displays where deal data is not loaded.
 *   - Legacy aggregate paths (e.g. getPlatformStats) that still pre-compute per-report counts.
 * - When `dealCount` is provided → return it (the authoritative source).
 * - Otherwise → fallback to `repliedAfterPrice` from the report's funnel.
 */
export function calcInteractionsFromParsedData(pd: any, dealCount?: number): number {
  if (typeof dealCount === "number") return dealCount;
  if (!pd) return 0;
  const f = pd.funnel ?? pd.funnels;
  if (f && Array.isArray(f.repliedAfterPrice)) {
    return f.repliedAfterPrice.reduce(
      (sum: number, e: { count?: number }) => sum + (Number(e?.count) || 0),
      0
    );
  }
  return (
    (typeof pd.interactions === "number" ? pd.interactions : null) ??
    pd.summary?.interactions ??
    0
  );
}

/** Build map of deal counts keyed by `${salesRepId}|${date}`. */
export function buildDealsCountByReportKey(deals: any[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of deals || []) {
    const repId = d?.salesRepId;
    const rawDate = typeof d?.date === "string" ? d.date : "";
    const date = rawDate.split("T")[0];
    if (!repId || !date) continue;
    const key = `${repId}|${date}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

/** Look up deal count for a single report from a pre-built map. */
export function getDealCountForReport(report: any, dealsByKey?: Map<string, number>): number {
  if (!dealsByKey) return 0;
  const repId = report?.salesRepId;
  const rawDate = typeof report?.date === "string" ? report.date : "";
  const date = rawDate.split("T")[0];
  if (!repId || !date) return 0;
  return dealsByKey.get(`${repId}|${date}`) || 0;
}

export function calcConversionRate(interactions: number, totalMessages: number): number {
  if (totalMessages <= 0) return 0;
  return Math.min(100, parseFloat(((interactions / totalMessages) * 100).toFixed(1)));
}

function shouldIncludeAdRow(adName: string | undefined): boolean {
  const n = (adName || "").trim();
  if (!n) return false;
  return !DASHBOARD_IGNORED_AD_NAMES.has(n);
}

export function calculateAggregates(reports: any[], deals?: any[]) {
  const dealsByKey = deals ? buildDealsCountByReportKey(deals) : undefined;
  let totalMessages = 0;
  let interactions = 0;
  const funnel = { greeting: 0, details: 0, price: 0, success: 0 };
  let jobConfusionCount = 0;
  const adsData: Record<string, any> = {};

  reports.forEach((r) => {
    const pd = r.parsedData;
    if (!pd) return;

    const tm =
      (typeof pd.totalMessages === "number" ? pd.totalMessages : null) ??
      pd.summary?.totalMessages ??
      0;
    const dealCount = dealsByKey ? getDealCountForReport(r, dealsByKey) : undefined;
    const intr = calcInteractionsFromParsedData(pd, dealCount);

    if (tm === 0) return;

    totalMessages += tm;
    interactions += intr;
    jobConfusionCount += pd.jobConfusionCount || 0;

    const f = pd.funnel || pd.funnels;
    if (!f) return;

    const processStage = (arr: any[], stageName: string) => {
      if (!Array.isArray(arr)) return 0;
      let sum = 0;
      arr.forEach((item) => {
        const count = item.count || 0;
        sum += count;
        const rawName = item.adName;
        if (!shouldIncludeAdRow(rawName)) return;
        const ad = String(rawName).trim();
        if (!adsData[ad]) {
          adsData[ad] = {
            greeting: 0,
            details: 0,
            price: 0,
            success: 0,
            confusion: 0,
          };
        }
        adsData[ad][stageName] += count;
      });
      return sum;
    };

    funnel.greeting += processStage(f.noReplyAfterGreeting || f.noReplyGreeting, "greeting");
    funnel.details += processStage(f.noReplyAfterDetails || f.noReplyDetails, "details");
    funnel.price += processStage(f.noReplyAfterPrice || f.noReplyPrice, "price");
    funnel.success += processStage(f.repliedAfterPrice, "success");
  });

  const conversionRate = calcConversionRate(interactions, totalMessages);

  type LeakStage = "بعد التحية" | "بعد التفاصيل" | "بعد السعر";
  const stageCounts: { stage: LeakStage; count: number }[] = [
    { stage: "بعد التحية", count: funnel.greeting },
    { stage: "بعد التفاصيل", count: funnel.details },
    { stage: "بعد السعر", count: funnel.price },
  ];

  let biggestDrop: LeakStage = "بعد السعر";
  let dropVal = 0;
  let biggestLeakPct = 0;

  if (totalMessages > 0) {
    stageCounts.forEach(({ stage, count }) => {
      const pct = Math.min(100, (count / totalMessages) * 100);
      if (count > dropVal) {
        dropVal = count;
        biggestDrop = stage;
        biggestLeakPct = parseFloat(pct.toFixed(1));
      }
    });
  }

  const globalConfusionPct =
    totalMessages > 0
      ? Math.min(100, parseFloat(((jobConfusionCount / totalMessages) * 100).toFixed(1)))
      : 0;

  return {
    totalMessages,
    interactions,
    funnel,
    conversionRate,
    biggestDrop,
    biggestLeakPct,
    dropVal,
    adsData,
    jobConfusionCount,
    globalConfusionPct,
  };
}
