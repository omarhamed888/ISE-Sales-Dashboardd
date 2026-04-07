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
  salesRepName: string
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
