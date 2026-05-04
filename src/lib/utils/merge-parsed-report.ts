import type {
  DealInput,
  FunnelStage,
  ParsedReportData,
  ReportFunnel,
} from "@/lib/services/gemini-parser";

/** Arabic-Indic digits → Latin digits (for pasted or mixed numerals). */
export function normalizeArabicDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function normAdName(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function isEmptyCount(n: number): boolean {
  return n === 0 || !Number.isFinite(n);
}

function isEmptyString(s: string | undefined): boolean {
  return !s || !String(s).trim();
}

function newStageId(): string {
  return `mg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function mergeFunnelStages(base: FunnelStage[], parsed: FunnelStage[]): FunnelStage[] {
  const parsedByKey = new Map<string, FunnelStage>();
  for (const p of parsed) {
    const k = normAdName(p.adName);
    if (k) parsedByKey.set(k, { ...p });
  }
  const baseKeys = new Set(
    base.map((b) => normAdName(b.adName)).filter(Boolean)
  );
  const merged: FunnelStage[] = base.map((b) => {
    const k = normAdName(b.adName);
    if (!k) return b;
    const p = parsedByKey.get(k);
    if (!p) return b;
    return {
      ...b,
      count: !isEmptyCount(b.count)
        ? b.count
        : typeof p.count === "number" && !isNaN(p.count)
          ? p.count
          : 0,
      notes: !isEmptyString(b.notes) ? b.notes! : (p.notes || ""),
      leadNotes:
        b.leadNotes && b.leadNotes.length > 0
          ? b.leadNotes
          : Array.isArray(p.leadNotes)
            ? p.leadNotes.filter(Boolean)
            : [],
    };
  });
  for (const p of parsed) {
    const k = normAdName(p.adName);
    if (!k) continue;
    if (!baseKeys.has(k)) {
      merged.push({
        ...p,
        id: p.id || newStageId(),
      });
    }
  }
  return merged;
}

function mergeReportFunnel(base: ReportFunnel, parsed: ReportFunnel): ReportFunnel {
  return {
    noReplyAfterGreeting: mergeFunnelStages(base.noReplyAfterGreeting, parsed.noReplyAfterGreeting),
    noReplyAfterDetails: mergeFunnelStages(base.noReplyAfterDetails, parsed.noReplyAfterDetails),
    noReplyAfterPrice: mergeFunnelStages(base.noReplyAfterPrice, parsed.noReplyAfterPrice),
    repliedAfterPrice: mergeFunnelStages(base.repliedAfterPrice, parsed.repliedAfterPrice),
  };
}

function mergeLeadsByAd(
  base: Array<{ adName: string; leadCount: number }>,
  parsed: Array<{ adName: string; leadCount: number }>
): Array<{ adName: string; leadCount: number }> {
  const map = new Map<string, { adName: string; leadCount: number }>();
  for (const b of base) {
    const k = normAdName(b.adName);
    if (!k) continue;
    map.set(k, { adName: b.adName.trim() || b.adName, leadCount: b.leadCount || 0 });
  }
  for (const p of parsed) {
    const k = normAdName(p.adName);
    if (!k) continue;
    const existing = map.get(k);
    if (existing) {
      map.set(k, {
        adName: existing.adName,
        leadCount: existing.leadCount > 0 ? existing.leadCount : (p.leadCount || 0),
      });
    } else {
      map.set(k, { adName: p.adName, leadCount: p.leadCount || 0 });
    }
  }
  return Array.from(map.values());
}

function normDealKey(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function dealMatchKey(d: DealInput): string {
  return `${normDealKey(d.customerName)}|${normDealKey(d.adSource)}`;
}

function mergeDealPair(base: DealInput, parsed: DealInput): DealInput {
  const hasProducts = base.products && base.products.length > 0;
  const programName =
    hasProducts
      ? (!isEmptyString(base.programName) && base.programName !== "غير محدد"
          ? base.programName
          : base.products!.join("، "))
      : !isEmptyString(base.programName) && base.programName !== "غير محدد"
        ? base.programName
        : parsed.programName;
  const programCount =
    hasProducts
      ? base.products!.length
      : base.programCount > 0 && base.programCount !== 1
        ? base.programCount
        : parsed.programCount > 0
          ? parsed.programCount
          : 1;

  return {
    customerName: !isEmptyString(base.customerName)
      ? base.customerName.trim()
      : parsed.customerName,
    adSource: !isEmptyString(base.adSource) ? base.adSource.trim() : parsed.adSource,
    programName,
    programCount,
    dealValue: base.dealValue > 0 ? base.dealValue : parsed.dealValue,
    firstContactDate: !isEmptyString(base.firstContactDate)
      ? base.firstContactDate
      : parsed.firstContactDate,
    contactAttempts:
      typeof base.contactAttempts === "number" && base.contactAttempts >= 1
        ? Math.round(base.contactAttempts)
        : typeof parsed.contactAttempts === "number" && parsed.contactAttempts >= 1
          ? Math.round(parsed.contactAttempts)
          : 1,
    products: hasProducts ? base.products! : (parsed.products?.length ? parsed.products : []),
    dealCategory: base.dealCategory ?? parsed.dealCategory ?? "core",
    bookingType:
      base.bookingType
      ?? parsed.bookingType
      ?? (base.closureType === "call" || parsed.closureType === "call" ? "call_booking" : "self_booking"),
  };
}

export function mergeClosedDeals(base: DealInput[], parsed: DealInput[]): DealInput[] {
  if (base.length === 0) return parsed.map((p) => ({ ...p }));
  const parsedUsed = new Set<number>();
  const merged: DealInput[] = base.map((b) => {
    let bestIdx = parsed.findIndex(
      (p, i) => !parsedUsed.has(i) && dealMatchKey(p) === dealMatchKey(b)
    );
    if (bestIdx < 0) {
      bestIdx = parsed.findIndex(
        (p, i) =>
          !parsedUsed.has(i) && normDealKey(p.customerName) === normDealKey(b.customerName)
      );
    }
    if (bestIdx < 0) {
      bestIdx = parsed.findIndex((_, i) => !parsedUsed.has(i));
    }
    if (bestIdx < 0) return { ...b };
    parsedUsed.add(bestIdx);
    return mergeDealPair(b, parsed[bestIdx]);
  });
  for (let i = 0; i < parsed.length; i++) {
    if (!parsedUsed.has(i)) merged.push({ ...parsed[i] });
  }
  return merged;
}

function recalcConversionRate(data: ParsedReportData): number {
  if (data.totalMessages > 0 && data.interactions > 0) {
    return parseFloat(((data.interactions / data.totalMessages) * 100).toFixed(1));
  }
  return 0;
}

/**
 * Merge Gemini output into a manual form snapshot: only fill fields that are
 * still "empty" in `base` (0 counts, empty strings, empty arrays).
 */
export function mergeParsedReportFillEmpty(
  base: ParsedReportData,
  parsed: ParsedReportData
): ParsedReportData {
  const out: ParsedReportData = {
    totalMessages: base.totalMessages > 0 ? base.totalMessages : parsed.totalMessages,
    messagesCount: base.messagesCount > 0 ? base.messagesCount : parsed.messagesCount,
    commentsCount: base.commentsCount > 0 ? base.commentsCount : parsed.commentsCount,
    interactions: base.interactions > 0 ? base.interactions : parsed.interactions,
    conversionRate: 0,
    funnel: mergeReportFunnel(base.funnel, parsed.funnel),
    commentsFunnel: mergeReportFunnel(base.commentsFunnel, parsed.commentsFunnel),
    specialCases: base.specialCases.length ? base.specialCases : parsed.specialCases,
    jobConfusionCount: base.jobConfusionCount > 0 ? base.jobConfusionCount : parsed.jobConfusionCount,
    rejectionReasons: base.rejectionReasons.length ? base.rejectionReasons : parsed.rejectionReasons,
    detectedJobs: base.detectedJobs.length ? base.detectedJobs : parsed.detectedJobs,
    leadsByAd: mergeLeadsByAd(base.leadsByAd, parsed.leadsByAd),
    salesNotes: !isEmptyString(base.salesNotes) ? base.salesNotes : parsed.salesNotes,
    programTrack: !isEmptyString(base.programTrack) ? base.programTrack : parsed.programTrack,
    sourceType: !isEmptyString(base.sourceType) ? base.sourceType : parsed.sourceType,
    closedDeals: mergeClosedDeals(base.closedDeals, parsed.closedDeals),
    objections: base.objections && base.objections.length > 0 ? base.objections : (parsed.objections ?? []),
  };
  out.conversionRate = recalcConversionRate(out);
  return out;
}
