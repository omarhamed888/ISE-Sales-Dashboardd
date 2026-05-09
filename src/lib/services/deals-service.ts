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
}> {
  const snap = await getDocs(collection(db, "courses"));
  const validIds = new Set<string>();
  const labelById = new Map<string, string>();
  for (const d of snap.docs) {
    validIds.add(d.id);
    const name = String((d.data() as { name?: unknown }).name || "").trim();
    if (name) labelById.set(d.id, name);
  }
  return { validIds, labelById };
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

export function computeDealCycleStats(deals: Deal[]): {
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
    const revenue = group.reduce((s, d) => s + (d.dealValue || 0), 0);
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
