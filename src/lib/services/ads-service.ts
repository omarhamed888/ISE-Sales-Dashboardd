import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Ad } from "@/lib/types";

const ADS_COLLECTION = "ads";

export async function createAd(data: { name: string; postLink: string; status: Ad["status"] }): Promise<string> {
  const ref = await addDoc(collection(db, ADS_COLLECTION), {
    name: data.name.trim(),
    postLink: data.postLink.trim(),
    status: data.status,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAd(id: string, data: Partial<{ name: string; postLink: string; status: Ad["status"] }>): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.postLink !== undefined) payload.postLink = data.postLink.trim();
  if (data.status !== undefined) payload.status = data.status;
  await updateDoc(doc(db, ADS_COLLECTION, id), payload);
}

export async function deleteAd(id: string): Promise<void> {
  await deleteDoc(doc(db, ADS_COLLECTION, id));
}

export async function getAllAds(): Promise<Ad[]> {
  const snap = await getDocs(query(collection(db, ADS_COLLECTION), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Ad));
}

export async function bulkCreateAds(ads: { name: string; postLink: string }[]): Promise<void> {
  await Promise.all(
    ads.map(ad =>
      addDoc(collection(db, ADS_COLLECTION), {
        name: ad.name.trim(),
        postLink: ad.postLink.trim(),
        status: "active",
        createdAt: serverTimestamp(),
      })
    )
  );
}

export function subscribeToAllAds(
  callback: (ads: Ad[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, ADS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ad)));
    },
    err => {
      console.error("subscribeToAllAds:", err);
      onError?.(err as Error);
    }
  );
}

export function subscribeToActiveAds(
  callback: (ads: Ad[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, ADS_COLLECTION),
    where("status", "==", "active"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ad)));
    },
    err => {
      console.error("subscribeToActiveAds:", err);
      onError?.(err as Error);
    }
  );
}
