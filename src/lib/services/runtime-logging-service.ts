import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type RuntimeLogInput = {
  source: string;
  message: string;
  stack?: string;
  extra?: Record<string, unknown>;
};

export async function logRuntimeError(input: RuntimeLogInput): Promise<void> {
  try {
    await addDoc(collection(db, "runtime_logs"), {
      source: input.source,
      message: input.message,
      stack: input.stack || null,
      extra: input.extra || {},
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      createdAt: serverTimestamp(),
    });
  } catch {
    // ignore logging failures to avoid blocking UI
  }
}
