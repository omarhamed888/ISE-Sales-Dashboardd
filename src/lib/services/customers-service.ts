import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Normalize for matching the same person across deals (trim, spaces, lowercase). */
export function normalizeCustomerName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * One Firestore doc per normalized name: reuse id when the same customer name appears again.
 */
export async function getOrCreateCustomerId(customerName: string): Promise<string> {
  const key = normalizeCustomerName(customerName);
  if (!key) throw new Error("اسم العميل مطلوب لربط الصفقة");

  const q = query(
    collection(db, "customers"),
    where("normalizedKey", "==", key),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  const ref = await addDoc(collection(db, "customers"), {
    normalizedKey: key,
    displayName: customerName.trim(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
