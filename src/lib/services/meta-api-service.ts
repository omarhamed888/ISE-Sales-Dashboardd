import { httpsCallable } from "firebase/functions";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { functions, db } from "@/lib/firebase";

const META_CONFIG_PATH = ["app_config", "meta_integration"] as const;

export interface MetaConnectionConfig {
  accessToken: string;
  adAccountId: string;
  autoSyncEnabled?: boolean;
  connectedAt?: any;
  lastSyncAt?: any;
  lastSyncStatus?: "success" | "error";
  lastSyncError?: string;
  lastSyncCount?: number;
}

export interface TestConnectionResult {
  success: boolean;
  accountName?: string;
  currency?: string;
  accountStatus?: number;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  written: number;
  daysBack: number;
}

export async function testMetaConnection(
  accessToken: string,
  adAccountId: string
): Promise<TestConnectionResult> {
  const fn = httpsCallable<{ accessToken: string; adAccountId: string }, TestConnectionResult>(
    functions,
    "testMetaConnection"
  );
  const res = await fn({ accessToken: accessToken.trim(), adAccountId: adAccountId.trim() });
  return res.data;
}

export async function syncMetaAds(daysBack = 7): Promise<SyncResult> {
  const fn = httpsCallable<{ daysBack: number }, SyncResult>(functions, "syncMetaAds");
  const res = await fn({ daysBack });
  return res.data;
}

export async function saveMetaConfig(config: {
  accessToken: string;
  adAccountId: string;
  autoSyncEnabled?: boolean;
}): Promise<void> {
  await setDoc(
    doc(db, META_CONFIG_PATH[0], META_CONFIG_PATH[1]),
    {
      accessToken: config.accessToken.trim(),
      adAccountId: config.adAccountId.trim(),
      autoSyncEnabled: config.autoSyncEnabled !== false,
      connectedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateAutoSync(enabled: boolean): Promise<void> {
  await setDoc(
    doc(db, META_CONFIG_PATH[0], META_CONFIG_PATH[1]),
    { autoSyncEnabled: enabled },
    { merge: true }
  );
}

export async function getMetaConfig(): Promise<MetaConnectionConfig | null> {
  const snap = await getDoc(doc(db, META_CONFIG_PATH[0], META_CONFIG_PATH[1]));
  if (!snap.exists()) return null;
  return snap.data() as MetaConnectionConfig;
}

export function subscribeToMetaConfig(
  onUpdate: (config: MetaConnectionConfig | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, META_CONFIG_PATH[0], META_CONFIG_PATH[1]),
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as MetaConnectionConfig) : null);
    },
    (err) => onError?.(err as Error)
  );
}
