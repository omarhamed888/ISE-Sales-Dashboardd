import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  AIInsightItem,
  AIRecommendation,
  InsightPeriod,
} from "@/lib/services/ai-insights-service";

export interface SavedInsightReport {
  id: string;
  name: string;
  period: InsightPeriod;
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
  summary: string;
  criticalIssues: AIInsightItem[];
  positivePoints: AIInsightItem[];
  recommendations: AIRecommendation[];
  dataSnapshot: {
    totalMessages: number;
    totalInteractions: number;
    conversionRate: number;
    reportsCount: number;
    salesRepsCount: number;
  };
  savedBy: string;
  savedByName: string;
  savedAt: Date;
}

export type SaveInsightPayload = Omit<SavedInsightReport, "id" | "savedAt">;

export async function saveInsightToFirestore(
  data: SaveInsightPayload
): Promise<string> {
  const ref = await addDoc(collection(db, "insights"), {
    ...data,
    savedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getSavedInsights(
  limitCount = 20
): Promise<SavedInsightReport[]> {
  const q = query(
    collection(db, "insights"),
    orderBy("savedAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const raw = d.data();
    return {
      id: d.id,
      name: raw.name,
      period: raw.period,
      periodLabel: raw.periodLabel,
      dateFrom: raw.dateFrom,
      dateTo: raw.dateTo,
      summary: raw.summary,
      criticalIssues: raw.criticalIssues ?? [],
      positivePoints: raw.positivePoints ?? [],
      recommendations: raw.recommendations ?? [],
      dataSnapshot: raw.dataSnapshot,
      savedBy: raw.savedBy,
      savedByName: raw.savedByName,
      savedAt: raw.savedAt?.toDate?.() ?? new Date(),
    } as SavedInsightReport;
  });
}

export async function deleteInsight(id: string): Promise<void> {
  await deleteDoc(doc(db, "insights", id));
}
