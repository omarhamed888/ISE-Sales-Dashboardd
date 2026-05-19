import { collection, doc, serverTimestamp, query, where, orderBy, getDocs, updateDoc, deleteDoc, limit, setDoc } from "firebase/firestore";
import { stripUndefined } from "@/lib/utils/strip-undefined";
import { db } from "@/lib/firebase";
import type { DealInput } from "./gemini-parser";
import { getOrCreateCustomerId } from "./customers-service";
import { classifyDealCategory, normalizeDealInput } from "@/lib/utils/normalize-course-names";
import type { Deal } from "@/lib/types";

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function loadCoursesCatalog(): Promise<{
  validIds: Set<string>;
  labelById: Map<string, string>;
  profitPctById: Map<string, number>;
}> {
  const snap = await getDocs(collection(db, "courses"));
  const validIds = new Set<string>();
  const labelById = new Map<string, string>();
  const profitPctById = new Map<string, number>();
  for (const d of snap.docs) {
    validIds.add(d.id);
    const data = d.data() as { name?: unknown; profitPercentage?: unknown };
    const name = String(data.name || "").trim();
    if (name) labelById.set(d.id, name);
    profitPctById.set(d.id, normalizeProfitPct(data.profitPercentage));
  }
  return { validIds, labelById, profitPctById };
}

/** Clamp a stored profit percentage to 0–100. Missing/invalid ⇒ 100 (company keeps all). */
export function normalizeProfitPct(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 100;
  return Math.min(100, Math.max(0, n));
}

/** Build the id→profit% map consumed by `netDealValue` from a courses list. */
export function buildProfitPctMap(
  courses: { id: string; profitPercentage?: number }[]
): Map<string, number> {
  return new Map(courses.map((c) => [c.id, normalizeProfitPct(c.profitPercentage)]));
}

/**
 * Net revenue for a deal after each course's own profit share. The deal's value is split
 * evenly across its courses; each share earns that course's `profitPercentage` independently.
 * Deals with no products (legacy) fall back to the full value (100%).
 */
export function netDealValue(
  deal: { dealValue?: unknown; products?: unknown },
  profitPctById?: Map<string, number>
): number {
  const gross = Number(deal.dealValue) || 0;
  if (!profitPctById || gross === 0) return gross;
  const ids = Array.isArray(deal.products)
    ? (deal.products as unknown[]).filter((x): x is string => typeof x === "string" && x.trim() !== "")
    : [];
  if (ids.length === 0) return gross;
  const share = gross / ids.length;
  return ids.reduce((sum, id) => sum + share * ((profitPctById.get(id) ?? 100) / 100), 0);
}

export async function saveDeals(
  deals: DealInput[],
  salesRepId: string,
  salesRepName: string,
  teamName?: string
): Promise<void> {
  const coursesCatalog = await loadCoursesCatalog();
  for (const deal of deals) {
    const nd = normalizeDealInput(deal, true);
    const sanitizedProducts = (nd.products ?? []).filter((id) => coursesCatalog.validIds.has(id));
    const sanitizedProgramName =
      sanitizedProducts.length > 0
        ? sanitizedProducts.map((id) => coursesCatalog.labelById.get(id) || id).join("، ")
        : nd.programName;
    const sanitizedProgramCount =
      sanitizedProducts.length > 0 ? sanitizedProducts.length : Math.max(1, Number(nd.programCount) || 1);
    const sanitizedDealInput: DealInput = {
      ...nd,
      products: sanitizedProducts,
      programName: sanitizedProgramName,
      programCount: sanitizedProgramCount,
    };
    const contactAttempts = normalizeContactAttempts(nd.contactAttempts);
    if (contactAttempts < 1) {
      throw new Error("عدد مرات التواصل يجب أن يكون رقمًا صحيحًا أكبر من أو يساوي 1.");
    }
    const closeDateStr = (deal.closeDate && deal.closeDate.trim()) || getTodayString();
    let cycleDays: number | null = null;
    if (nd.firstContactDate && nd.firstContactDate.trim()) {
      const firstContact = new Date(nd.firstContactDate.trim());
      if (!isNaN(firstContact.getTime())) {
        const closeDate = new Date(closeDateStr);
        cycleDays = Math.max(
          0,
          Math.round(
            (closeDate.getTime() - firstContact.getTime()) / (1000 * 60 * 60 * 24)
          )
        );
      }
    }

    const customerId =
      nd.customerId?.trim() ||
      (await getOrCreateCustomerId(nd.customerName, salesRepId));

    const existingSnap = await getDocs(
      query(
        collection(db, "deals"),
        where("salesRepId", "==", salesRepId),
        where("customerId", "==", customerId),
        limit(1)
      )
    );
    const bookingType = sanitizedDealInput.bookingType
      ?? (sanitizedDealInput.closureType === "call" ? "call_booking" : "self_booking");
    const incomingCategory = sanitizedDealInput.dealCategory ?? classifyDealCategory(sanitizedDealInput);

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0];
      const data = existing.data() as Partial<Deal>;
      const existingProducts = Array.isArray(data.products) ? data.products : [];
      const incomingProducts = Array.isArray(sanitizedDealInput.products) ? sanitizedDealInput.products : [];
      const mergedProducts = Array.from(new Set([...existingProducts, ...incomingProducts]))
        .filter((id) => coursesCatalog.validIds.has(id));
      const mergedProgramCount = Math.max(1, mergedProducts.length);
      const mergedProgramName = mergedProducts.length > 0
        ? mergedProducts.map((id) => coursesCatalog.labelById.get(id) || id).join("، ")
        : (sanitizedDealInput.programName || data.programName || "غير محدد");
      const existingRevenue = Number(data.dealValue) || 0;
      const existingAttempts = normalizeContactAttempts(data.contactAttempts);
      const existingCategory = data.dealCategory === "side" ? "side" : "core";
      const mergedCategory = existingCategory === "core" || incomingCategory === "core" ? "core" : "side";

      await updateDoc(
        existing.ref,
        stripUndefined({
          salesRepName,
          teamName: teamName || data.teamName || null,
          customerName: sanitizedDealInput.customerName || data.customerName || "",
          adSource: sanitizedDealInput.adSource || data.adSource || "",
          products: mergedProducts,
          programName: mergedProgramName,
          programCount: mergedProgramCount,
          dealValue: existingRevenue + (Number(sanitizedDealInput.dealValue) || 0),
          contactAttempts: existingAttempts + contactAttempts,
          bookingType,
          dealCategory: mergedCategory,
          firstContactDate: data.firstContactDate || sanitizedDealInput.firstContactDate || null,
          closeDate: closeDateStr,
          date: closeDateStr,
          closingCycleDays: cycleDays,
          updatedAt: serverTimestamp(),
        })
      );
      continue;
    }

    const dealRef = doc(collection(db, "deals"));
    await setDoc(
      dealRef,
      stripUndefined({
        salesRepId,
        salesRepName,
        teamName: teamName || null,
        date: closeDateStr,
        customerId,
        customerName: sanitizedDealInput.customerName,
        adSource: sanitizedDealInput.adSource,
        programName: sanitizedDealInput.programName,
        programCount: sanitizedDealInput.programCount,
        dealValue: sanitizedDealInput.dealValue,
        firstContactDate: sanitizedDealInput.firstContactDate || null,
        contactAttempts,
        dealCategory: incomingCategory,
        closeDate: closeDateStr,
        closingCycleDays: cycleDays,
        products: sanitizedDealInput.products ?? [],
        bookingType,
        createdAt: serverTimestamp(),
      })
    );
  }
}

function toMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof value === "object" && value && "toDate" in (value as Record<string, unknown>)) {
    const dt = (value as { toDate: () => Date }).toDate();
    return dt.getTime();
  }
  return 0;
}

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return code === "permission-denied" || code === "PERMISSION_DENIED";
}

function normalizeContactAttempts(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

export async function getMyDeals(
  salesRepId: string,
  salesRepName?: string
): Promise<Deal[]> {
  const byIdSnap = await getDocs(
    query(collection(db, "deals"), where("salesRepId", "==", salesRepId))
  );
  const byId: Deal[] = byIdSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Deal));

  // Backward compatibility: older records may have salesRepName but missing salesRepId.
  if (byId.length === 0 && salesRepName?.trim()) {
    const byNameSnap = await getDocs(
      query(collection(db, "deals"), where("salesRepName", "==", salesRepName.trim()))
    );
    const byName: Deal[] = byNameSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Deal));
    return byName.sort((a, b) => {
      const aMs = toMs(a.createdAt) || toMs(a.closeDate) || toMs(a.date);
      const bMs = toMs(b.createdAt) || toMs(b.closeDate) || toMs(b.date);
      return bMs - aMs;
    });
  }

  return byId.sort((a, b) => {
    const aMs = toMs(a.createdAt) || toMs(a.closeDate) || toMs(a.date);
    const bMs = toMs(b.createdAt) || toMs(b.closeDate) || toMs(b.date);
    return bMs - aMs;
  });
}

export async function getAllDeals(): Promise<Deal[]> {
  const q = query(collection(db, 'deals'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Deal));
}

export async function updateDeal(
  dealId: string,
  patch: {
    customerName: string;
    adSource: string;
    programName: string;
    programCount: number;
    dealValue: number;
    firstContactDate: string;
    contactAttempts: number;
    closeDate: string;
    products?: string[];
    bookingType?: "self_booking" | "call_booking";
    dealCategory?: "core" | "side";
  }
): Promise<void> {
  const coursesCatalog = await loadCoursesCatalog();
  let cycleDays: number | null = null;
  const nd = normalizeDealInput(
    {
      customerName: patch.customerName,
      adSource: patch.adSource,
      programName: patch.programName,
      programCount: patch.programCount,
      dealValue: patch.dealValue,
      firstContactDate: patch.firstContactDate,
      contactAttempts: patch.contactAttempts,
      products: patch.products ?? [],
      bookingType: patch.bookingType ?? "self_booking",
      dealCategory: patch.dealCategory ?? "core",
    },
    true
  );

  if (nd.firstContactDate?.trim()) {
    const first = new Date(nd.firstContactDate.trim());
    const close = new Date(patch.closeDate);
    if (!isNaN(first.getTime()) && !isNaN(close.getTime())) {
      cycleDays = Math.max(
        0,
        Math.round((close.getTime() - first.getTime()) / (1000 * 60 * 60 * 24))
      );
    }
  }

  const payload: Record<string, unknown> = {
    customerName: nd.customerName.trim(),
    adSource: nd.adSource.trim(),
    programName: nd.programName.trim(),
    programCount: Math.max(1, Number(nd.programCount) || 1),
    dealValue: Math.max(0, Number(nd.dealValue) || 0),
    firstContactDate: nd.firstContactDate?.trim() || null,
    contactAttempts: normalizeContactAttempts(nd.contactAttempts),
    closeDate: patch.closeDate?.trim() || null,
    date: patch.closeDate?.trim() || null,
    closingCycleDays: cycleDays,
    updatedAt: serverTimestamp(),
  };

  const sanitizedProducts = (nd.products ?? []).filter((id) => coursesCatalog.validIds.has(id));
  payload.products = sanitizedProducts;
  payload.programName =
    sanitizedProducts.length > 0
      ? sanitizedProducts.map((id) => coursesCatalog.labelById.get(id) || id).join("، ")
      : nd.programName.trim();
  payload.programCount =
    sanitizedProducts.length > 0 ? sanitizedProducts.length : Math.max(1, Number(nd.programCount) || 1);
  if ((payload.contactAttempts as number) < 1) {
    throw new Error("عدد مرات التواصل يجب أن يكون رقمًا صحيحًا أكبر من أو يساوي 1.");
  }
  if (patch.bookingType !== undefined) {
    payload.bookingType = patch.bookingType;
  }
  if (patch.dealCategory !== undefined) {
    payload.dealCategory = patch.dealCategory;
  } else {
    payload.dealCategory = nd.dealCategory ?? classifyDealCategory(nd);
  }

  try {
    await updateDoc(doc(db, "deals", dealId), stripUndefined(payload));
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      throw new Error("غير مسموح لك بتعديل هذه الصفقة.");
    }
    throw error;
  }
}

export async function deleteDeal(dealId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "deals", dealId));
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      throw new Error("غير مسموح لك بحذف هذه الصفقة.");
    }
    throw error;
  }
}

export interface DealCycleStats {
  label: string;       // "الشركة" أو اسم الفريق
  totalDeals: number;
  avgCycleDays: number;
  minCycleDays: number;
  maxCycleDays: number;
  totalRevenue: number;
}

export function computeDealCycleStats(deals: Deal[], profitPctById?: Map<string, number>): {
  company: DealCycleStats;
  byTeam: DealCycleStats[];
} {
  const teamMap = new Map<string, Deal[]>();

  for (const deal of deals) {
    const team = deal.teamName || 'غير محدد';
    if (!teamMap.has(team)) teamMap.set(team, []);
    teamMap.get(team)!.push(deal);
  }

  function statsFor(label: string, group: Deal[]): DealCycleStats {
    const cycles = group
      .map(d => d.closingCycleDays)
      .filter((v): v is number => typeof v === 'number' && v !== null);
    const revenue = group.reduce((s, d) => s + netDealValue(d, profitPctById), 0);
    const avg = cycles.length > 0 ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0;
    return {
      label,
      totalDeals: group.length,
      avgCycleDays: avg,
      minCycleDays: cycles.length > 0 ? Math.min(...cycles) : 0,
      maxCycleDays: cycles.length > 0 ? Math.max(...cycles) : 0,
      totalRevenue: revenue,
    };
  }

  const company = statsFor('الشركة كلها', deals);
  const byTeam = Array.from(teamMap.entries())
    .map(([team, group]) => statsFor(team, group))
    .sort((a, b) => a.avgCycleDays - b.avgCycleDays);

  return { company, byTeam };
}

// ── Weekly closed deals by deal category ─────────────────────────────────────
export interface WeeklyDealBucket {
  weekLabel: string;       // "الأسبوع 1"
  weekIndex: number;       // 1..5
  dayRange: string;        // "1–7" — which days of the month this week covers
  core: number;
  side: number;
  total: number;
}

function parseDealDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const cleaned = raw.split('T')[0];
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Build a 4-5 week breakdown of closed deals split by dealCategory (core/side).
 * Weeks are calendar-based: 1–7, 8–14, 15–21, 22–28, 29–end-of-month.
 */
export function computeWeeklyDealsByCategory(
  deals: Deal[],
  year: number,
  month: number // 0-indexed (Jan = 0)
): WeeklyDealBucket[] {
  const buckets: WeeklyDealBucket[] = [
    { weekLabel: 'الأسبوع 1', weekIndex: 1, dayRange: '', core: 0, side: 0, total: 0 },
    { weekLabel: 'الأسبوع 2', weekIndex: 2, dayRange: '', core: 0, side: 0, total: 0 },
    { weekLabel: 'الأسبوع 3', weekIndex: 3, dayRange: '', core: 0, side: 0, total: 0 },
    { weekLabel: 'الأسبوع 4', weekIndex: 4, dayRange: '', core: 0, side: 0, total: 0 },
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  if (daysInMonth > 28) {
    buckets.push({ weekLabel: 'الأسبوع 5', weekIndex: 5, dayRange: '', core: 0, side: 0, total: 0 });
  }

  // Day-of-month span each calendar week covers (last bucket runs to month end).
  const lastIdx = buckets.length - 1;
  buckets.forEach((b, i) => {
    const start = i * 7 + 1;
    const end = i === lastIdx ? daysInMonth : (i + 1) * 7;
    b.dayRange = start === end ? `${start}` : `${start}–${end}`;
  });

  for (const deal of deals) {
    const closeDate = parseDealDate(deal.closeDate) || parseDealDate(deal.date);
    if (!closeDate) continue;
    if (closeDate.getFullYear() !== year || closeDate.getMonth() !== month) continue;

    const day = closeDate.getDate();
    const weekIdx = Math.min(Math.ceil(day / 7), buckets.length) - 1;
    const bucket = buckets[weekIdx];
    if (!bucket) continue;

    const category: 'core' | 'side' = deal.dealCategory === 'side' ? 'side' : 'core';
    bucket[category] += 1;
    bucket.total += 1;
  }

  return buckets;
}

// ── Days-to-close distribution ───────────────────────────────────────────────
export interface DaysToCloseBucket {
  rangeLabel: string;     // "0–3 أيام"
  segment: string;        // "Fast Close"
  segmentAr: string;      // "إغلاق سريع"
  count: number;
  pct: number;
  fill: string;
}

/**
 * Group closed deals by their closingCycleDays into 6 named buckets.
 * - 0–3 days    → Fast Close
 * - 4–7 days    → Short Cycle
 * - 8–14 days   → Medium
 * - 15–30 days  → Up to 1 month (لحد شهر)
 * - 31–60 days  → Up to 2 months (لحد شهرين)
 * - 60+ days    → Over 2 months
 */
export function computeDaysToCloseDistribution(deals: Deal[]): DaysToCloseBucket[] {
  const buckets: Omit<DaysToCloseBucket, 'pct'>[] = [
    { rangeLabel: '0–3 أيام', segment: 'Fast Close', segmentAr: 'إغلاق سريع', count: 0, fill: '#10B981' },
    { rangeLabel: '4–7 أيام', segment: 'Short Cycle', segmentAr: 'دورة قصيرة', count: 0, fill: '#84CC16' },
    { rangeLabel: '8–14 يوم', segment: 'Medium', segmentAr: 'متوسط', count: 0, fill: '#F59E0B' },
    { rangeLabel: '15–30 يوم (لحد شهر)', segment: 'Up to 1 month', segmentAr: 'لحد شهر', count: 0, fill: '#F97316' },
    { rangeLabel: '31–60 يوم (لحد شهرين)', segment: 'Up to 2 months', segmentAr: 'لحد شهرين', count: 0, fill: '#EF4444' },
    { rangeLabel: '+60 يوم', segment: 'Over 2 months', segmentAr: 'أكثر من شهرين', count: 0, fill: '#B91C1C' },
  ];

  let total = 0;
  for (const deal of deals) {
    const cycle = deal.closingCycleDays;
    if (typeof cycle !== 'number' || !Number.isFinite(cycle) || cycle < 0) continue;
    let idx: number;
    if (cycle <= 3) idx = 0;
    else if (cycle <= 7) idx = 1;
    else if (cycle <= 14) idx = 2;
    else if (cycle <= 30) idx = 3;
    else if (cycle <= 60) idx = 4;
    else idx = 5;
    buckets[idx].count += 1;
    total += 1;
  }

  return buckets.map((b) => ({
    ...b,
    pct: total > 0 ? parseFloat(((b.count / total) * 100).toFixed(1)) : 0,
  }));
}

// ── Monthly deal-cycle trend ─────────────────────────────────────────────────
export interface MonthlyDealCycleBucket {
  /** YYYY-MM key derived from closeDate. */
  monthKey: string;
  /** Arabic label e.g. "أبريل 2026". */
  label: string;
  /** Closed deals counted in this month. */
  deals: number;
  /** Avg closingCycleDays for deals in this month (0 when none have a valid cycle). */
  avgCycleDays: number;
  /** Sum of dealValue for deals in this month. */
  totalRevenue: number;
}

/**
 * Bucket closed deals by their close-month and compute, per month:
 *   - how many deals closed
 *   - what was the average cycle length
 *
 * Useful as a trendline to see whether the team is getting faster over time.
 * Deals without a parseable `closeDate` are skipped. Returned list is sorted
 * ascending by `monthKey` so a line chart reads left-to-right as time moves
 * forward.
 */
export function computeMonthlyDealCycleTrend(deals: Deal[], profitPctById?: Map<string, number>): MonthlyDealCycleBucket[] {
  type Acc = { count: number; cycleSum: number; cycleN: number; revenue: number };
  const map = new Map<string, Acc>();

  for (const deal of deals) {
    const closeDate = parseDealDate(deal.closeDate) || parseDealDate(deal.date);
    if (!closeDate) continue;
    const monthKey = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, '0')}`;
    let entry = map.get(monthKey);
    if (!entry) {
      entry = { count: 0, cycleSum: 0, cycleN: 0, revenue: 0 };
      map.set(monthKey, entry);
    }
    entry.count += 1;
    entry.revenue += netDealValue(deal, profitPctById);
    const cycle = deal.closingCycleDays;
    if (typeof cycle === 'number' && Number.isFinite(cycle) && cycle >= 0) {
      entry.cycleSum += cycle;
      entry.cycleN += 1;
    }
  }

  const AR_MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, e]) => {
      const [y, m] = monthKey.split('-').map(Number);
      const label = `${AR_MONTHS[m - 1] ?? m} ${y}`;
      return {
        monthKey,
        label,
        deals: e.count,
        avgCycleDays: e.cycleN > 0 ? Math.round(e.cycleSum / e.cycleN) : 0,
        totalRevenue: e.revenue,
      };
    });
}
