import { collection, doc, writeBatch, serverTimestamp, query, where, orderBy, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DealInput } from "./gemini-parser";
import { getOrCreateCustomerId } from "./customers-service";
import { normalizeDealInput } from "@/lib/utils/normalize-course-names";
import type { Deal } from "@/lib/types";

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function saveDeals(
  deals: DealInput[],
  salesRepId: string,
  salesRepName: string,
  teamName?: string
): Promise<void> {
  const batch = writeBatch(db);

  for (const deal of deals) {
    const nd = normalizeDealInput(deal, true);
    const dealRef = doc(collection(db, "deals"));

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
      (await getOrCreateCustomerId(nd.customerName));

    batch.set(dealRef, {
      salesRepId,
      salesRepName,
      teamName: teamName || null,
      date: closeDateStr,
      customerId,
      customerName: nd.customerName,
      adSource: nd.adSource,
      programName: nd.programName,
      programCount: nd.programCount,
      dealValue: nd.dealValue,
      firstContactDate: nd.firstContactDate || null,
      closeDate: closeDateStr,
      closingCycleDays: cycleDays,
      products: nd.products ?? [],
      closureType: nd.closureType ?? "call",
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
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
    closeDate: string;
    products?: string[];
    closureType?: "call" | "self";
  }
): Promise<void> {
  let cycleDays: number | null = null;
  const nd = normalizeDealInput(
    {
      customerName: patch.customerName,
      adSource: patch.adSource,
      programName: patch.programName,
      programCount: patch.programCount,
      dealValue: patch.dealValue,
      firstContactDate: patch.firstContactDate,
      products: patch.products ?? [],
      closureType: patch.closureType ?? "call",
    },
    patch.products !== undefined
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
    closingCycleDays: cycleDays,
    updatedAt: serverTimestamp(),
  };

  if (patch.products !== undefined) {
    payload.products = nd.products ?? [];
  }
  if (patch.closureType !== undefined) {
    payload.closureType = nd.closureType ?? "call";
  }

  await updateDoc(doc(db, "deals", dealId), payload);
}

export async function deleteDeal(dealId: string): Promise<void> {
  await deleteDoc(doc(db, "deals", dealId));
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
