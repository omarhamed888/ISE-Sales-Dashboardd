import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { stripUndefined } from "@/lib/utils/strip-undefined";

export interface ObjectionCategory {
  id: string;
  label: string;
  suggestedResponse?: string;
  isActive: boolean;
  order: number;
}

const COLLECTION = "objection_categories";

function sortByOrder(items: ObjectionCategory[]): ObjectionCategory[] {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function subscribeToObjectionCategories(
  callback: (items: ObjectionCategory[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ObjectionCategory[];
      callback(sortByOrder(rows));
    },
    (err) => {
      console.error("subscribeToObjectionCategories:", err);
      onError?.(err as Error);
    }
  );
}

export function subscribeToActiveObjectionCategories(
  callback: (items: ObjectionCategory[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return subscribeToObjectionCategories(
    (items) => callback(items.filter((x) => x.isActive)),
    onError
  );
}

export async function createObjectionCategory(input: {
  label: string;
  suggestedResponse?: string;
  isActive?: boolean;
  order?: number;
}): Promise<string> {
  const ref = await addDoc(
    collection(db, COLLECTION),
    stripUndefined({
      label: input.label.trim(),
      suggestedResponse: input.suggestedResponse?.trim() || undefined,
      isActive: input.isActive ?? true,
      order: input.order ?? 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  return ref.id;
}

export async function updateObjectionCategory(
  id: string,
  patch: Partial<{ label: string; suggestedResponse: string; isActive: boolean; order: number }>
): Promise<void> {
  await updateDoc(
    doc(db, COLLECTION, id),
    stripUndefined({
      label: patch.label?.trim(),
      suggestedResponse: patch.suggestedResponse?.trim() || undefined,
      isActive: patch.isActive,
      order: patch.order,
      updatedAt: serverTimestamp(),
    })
  );
}

export async function deleteObjectionCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function reorderObjectionCategories(
  orderedIds: string[]
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      updateDoc(doc(db, COLLECTION, id), {
        order: index,
        updatedAt: serverTimestamp(),
      })
    )
  );
}
