import { collection, doc, writeBatch, serverTimestamp, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DealInput } from "./gemini-parser";

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
  const today = getTodayString();
  const batch = writeBatch(db);

  deals.forEach(deal => {
    const dealRef = doc(collection(db, 'deals'));

    let cycleDays: number | null = null;
    if (deal.firstContactDate && deal.firstContactDate.trim()) {
      const firstContact = new Date(deal.firstContactDate.trim());
      if (!isNaN(firstContact.getTime())) {
        const closeDate = new Date(today);
        cycleDays = Math.max(0, Math.round((closeDate.getTime() - firstContact.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }

    batch.set(dealRef, {
      salesRepId,
      salesRepName,
      teamName: teamName || null,
      date: today,
      customerName: deal.customerName,
      adSource: deal.adSource,
      programName: deal.programName,
      programCount: deal.programCount,
      dealValue: deal.dealValue,
      firstContactDate: deal.firstContactDate || null,
      closeDate: today,
      closingCycleDays: cycleDays,
      createdAt: serverTimestamp(),
    });
  });

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
): Promise<any[]> {
  const byIdSnap = await getDocs(
    query(collection(db, "deals"), where("salesRepId", "==", salesRepId))
  );
  const byId: any[] = byIdSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Backward compatibility: older records may have salesRepName but missing salesRepId.
  if (byId.length === 0 && salesRepName?.trim()) {
    const byNameSnap = await getDocs(
      query(collection(db, "deals"), where("salesRepName", "==", salesRepName.trim()))
    );
    const byName: any[] = byNameSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

export async function getAllDeals(): Promise<any[]> {
  const q = query(collection(db, 'deals'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export interface DealCycleStats {
  label: string;       // "الشركة" أو اسم الفريق
  totalDeals: number;
  avgCycleDays: number;
  minCycleDays: number;
  maxCycleDays: number;
  totalRevenue: number;
}

export function computeDealCycleStats(deals: any[]): {
  company: DealCycleStats;
  byTeam: DealCycleStats[];
} {
  const teamMap = new Map<string, any[]>();

  for (const deal of deals) {
    const team = deal.teamName || 'غير محدد';
    if (!teamMap.has(team)) teamMap.set(team, []);
    teamMap.get(team)!.push(deal);
  }

  function statsFor(label: string, group: any[]): DealCycleStats {
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
