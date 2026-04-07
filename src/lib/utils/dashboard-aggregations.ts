/** Placeholder / known-bad ad labels from legacy Gemini parses — excluded from ad-level charts. */
export const DASHBOARD_IGNORED_AD_NAMES = new Set(["عام", "طموح"]);

/** Real interactions = sum of counts in repliedAfterPrice only (never noReplyAfterPrice). */
export function calcInteractionsFromParsedData(pd: any): number {
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

export function calcConversionRate(interactions: number, totalMessages: number): number {
  if (totalMessages <= 0) return 0;
  return Math.min(100, parseFloat(((interactions / totalMessages) * 100).toFixed(1)));
}

function shouldIncludeAdRow(adName: string | undefined): boolean {
  const n = (adName || "").trim();
  if (!n) return false;
  return !DASHBOARD_IGNORED_AD_NAMES.has(n);
}

export function calculateAggregates(reports: any[]) {
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
    const intr = calcInteractionsFromParsedData(pd);

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
