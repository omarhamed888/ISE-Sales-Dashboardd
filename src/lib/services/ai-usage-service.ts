import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type AIUsageType = "parse" | "insights";

export async function trackAIUsage(params: {
  type: AIUsageType;
  tokenEstimate: number;
  success: boolean;
}) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  try {
    await addDoc(collection(db, "ai_usage"), {
      userId,
      type: params.type,
      tokenEstimate: params.tokenEstimate,
      success: params.success,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Failed to track AI usage", error);
  }
}
