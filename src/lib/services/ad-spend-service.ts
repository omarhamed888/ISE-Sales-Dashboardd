import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AdSpendEntry } from "@/lib/types";
import { stripUndefined } from "@/lib/utils/strip-undefined";

const COLLECTION = "ad_spend";

/** Build a deterministic doc id so each (date, ad, buyer) is unique. */
export function buildSpendDocId(date: string, adId: string, mediaBuyerId: string): string {
  return `${date}_${adId}_${mediaBuyerId}`;
}

export interface SpendEntryInput {
  date: string;                  // YYYY-MM-DD
  adId: string;
  adName: string;
  platform: AdSpendEntry["platform"];
  spend: number;
  leadsReported: number;
  reach?: number;
  impressions?: number;
  clicks?: number;
  notes?: string;
  mediaBuyerId: string;
  mediaBuyerName: string;
}

const clampInt = (x: unknown): number => Math.max(0, Math.floor(Number(x) || 0));
const clampNum = (x: unknown): number => Math.max(0, Number(x) || 0);

/** Save (create or update) a single day's ad spend entry. Idempotent — same key updates instead of duplicating. */
export async function saveAdSpendEntry(input: SpendEntryInput): Promise<string> {
  const id = buildSpendDocId(input.date, input.adId, input.mediaBuyerId);
  const ref = doc(db, COLLECTION, id);
  const existing = await getDoc(ref);

  const baseDoc = stripUndefined({
    date: input.date,
    adId: input.adId,
    adName: input.adName,
    platform: input.platform,
    spend: clampNum(input.spend),
    leadsReported: clampInt(input.leadsReported),
    reach: input.reach !== undefined ? clampInt(input.reach) : undefined,
    impressions: input.impressions !== undefined ? clampInt(input.impressions) : undefined,
    clicks: input.clicks !== undefined ? clampInt(input.clicks) : undefined,
    notes: input.notes && input.notes.trim() ? input.notes.trim() : undefined,
    mediaBuyerId: input.mediaBuyerId,
    mediaBuyerName: input.mediaBuyerName,
    source: "manual" as const,
  });

  if (existing.exists()) {
    await updateDoc(ref, { ...baseDoc, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, { ...baseDoc, createdAt: serverTimestamp() });
  }
  return id;
}

/** Save a batch of entries for a single day in one shot. */
export async function saveAdSpendBatch(inputs: SpendEntryInput[]): Promise<string[]> {
  const ids: string[] = [];
  for (const entry of inputs) {
    const id = await saveAdSpendEntry(entry);
    ids.push(id);
  }
  return ids;
}

export async function deleteAdSpendEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/** Get a single buyer's spend (kept for admin lookups by buyer id, when historical entries exist). */
export async function getMyAdSpend(mediaBuyerId: string, days = 30): Promise<AdSpendEntry[]> {
  const q = query(
    collection(db, COLLECTION),
    where("mediaBuyerId", "==", mediaBuyerId),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AdSpendEntry[];
  if (!days || days < 1) return all;
  // Slice client-side to last N days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return all.filter((e) => (e.date || "") >= cutoffStr);
}

/** Get all spend across all buyers (admin only). */
export async function getAllAdSpend(): Promise<AdSpendEntry[]> {
  const q = query(collection(db, COLLECTION), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AdSpendEntry[];
}

/** Real-time subscription (for live dashboards). */
export function subscribeToAllAdSpend(
  callback: (entries: AdSpendEntry[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy("date", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AdSpendEntry[];
      callback(entries);
    },
    (err) => onError?.(err as Error)
  );
}

/** Check if buyer entered any spend for a given date. */
export async function buyerHasSpendOnDate(mediaBuyerId: string, date: string): Promise<boolean> {
  const q = query(
    collection(db, COLLECTION),
    where("mediaBuyerId", "==", mediaBuyerId),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
