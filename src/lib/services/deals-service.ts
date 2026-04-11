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

    let cycleDays = 0;
    if (deal.firstContactDate) {
      const firstContact = new Date(deal.firstContactDate);
      const closeDate = new Date(today);
      cycleDays = Math.max(0, Math.round((closeDate.getTime() - firstContact.getTime()) / (1000 * 60 * 60 * 24)));
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
      firstContactDate: deal.firstContactDate,
      closeDate: today,
      closingCycleDays: cycleDays,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function getMyDeals(salesRepId: string): Promise<any[]> {
  const q = query(
    collection(db, 'deals'),
    where('salesRepId', '==', salesRepId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
    const cycles = group.map(d => typeof d.closingCycleDays === 'number' ? d.closingCycleDays : 0);
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
