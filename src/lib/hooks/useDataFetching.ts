import { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { normalizeReportDateKey, isReportDateInDashboardRange } from "@/lib/utils/report-dates";
import { DASHBOARD_DATA_QUALITY_FROM_DATE } from "@/lib/config";
import {
  DASHBOARD_IGNORED_AD_NAMES,
  calcInteractionsFromParsedData,
  calcConversionRate,
} from "@/lib/utils/dashboard-aggregations";
import type { InsightPeriod } from "@/lib/services/ai-insights-service";
import { mapInsightPeriodToDateRange } from "@/lib/utils/insights-period";

export interface ReportFilters {
  dateRange: string;
  platform: string;
  salesRep: string;
  adName: string;
  customDateFrom: Date | null;
  customDateTo: Date | null;
}

function mapHookDateRange(
  range: string
): "اليوم" | "الأسبوع" | "الشهر" | "الإجمالي" {
  switch (range) {
    case "today":
      return "اليوم";
    case "week":
      return "الأسبوع";
    case "month":
      return "الشهر";
    default:
      return "الإجمالي";
  }
}

function passesHookDateAndQuality(r: any, range: string): boolean {
  const key = normalizeReportDateKey(r);
  const dr = mapHookDateRange(range);

  if (dr === "الإجمالي") {
    if (!key) return false;
    return key >= DASHBOARD_DATA_QUALITY_FROM_DATE;
  }

  return isReportDateInDashboardRange(key, dr);
}

export function useReports(filters: ReportFilters) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    if (user.role === "sales") {
      q = query(
        collection(db, "reports"),
        where("salesRepId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        let data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

        if (filters.platform !== "all") {
          data = data.filter((r) => r.platform === filters.platform);
        }
        if (filters.salesRep !== "all") {
          data = data.filter((r) => r.salesRepId === filters.salesRep);
        }

        if (filters.dateRange !== "all") {
          data = data.filter((r) => passesHookDateAndQuality(r, filters.dateRange));
        } else {
          data = data.filter((r) => passesHookDateAndQuality(r, "الإجمالي"));
        }

        setReports(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, filters]);

  return { reports, loading, error };
}

export function useInsightsReports(period: InsightPeriod) {
  const filters = useMemo<ReportFilters>(
    () => ({
      dateRange: mapInsightPeriodToDateRange(period),
      platform: "all",
      salesRep: "all",
      adName: "all",
      customDateFrom: null,
      customDateTo: null,
    }),
    [period]
  );
  return useReports(filters);
}

export function useDashboardStats(filters: ReportFilters) {
  const { reports, loading } = useReports(filters);

  const stats = useMemo(() => {
    if (reports.length === 0) {
      return {
        totalMessages: 0,
        interactions: 0,
        conversionRate: 0,
        highestDropCount: 0,
        highestDropStage: "لا يوجد بيانات",
      };
    }

    let totalMessages = 0;
    let interactions = 0;

    let noRepGreeting = 0;
    let noRepDetails = 0;
    let noRepPrice = 0;

    reports.forEach((r) => {
      const p = r.parsedData;
      if (!p) return;
      const tm = p.totalMessages || 0;
      if (tm === 0) return;

      totalMessages += tm;
      interactions += calcInteractionsFromParsedData(p);

      if (p.funnel?.noReplyAfterGreeting) {
        noRepGreeting += p.funnel.noReplyAfterGreeting.reduce(
          (a: number, b: any) => a + (b.count || 0),
          0
        );
      }
      if (p.funnel?.noReplyAfterDetails) {
        noRepDetails += p.funnel.noReplyAfterDetails.reduce(
          (a: number, b: any) => a + (b.count || 0),
          0
        );
      }
      if (p.funnel?.noReplyAfterPrice) {
        noRepPrice += p.funnel.noReplyAfterPrice.reduce(
          (a: number, b: any) => a + (b.count || 0),
          0
        );
      }
    });

    const conversionRate = calcConversionRate(interactions, totalMessages);

    let highestDropCount = noRepPrice;
    let highestDropStage = "السعر";
    if (noRepDetails > highestDropCount) {
      highestDropCount = noRepDetails;
      highestDropStage = "التفاصيل";
    }
    if (noRepGreeting > highestDropCount) {
      highestDropCount = noRepGreeting;
      highestDropStage = "التحية";
    }

    return {
      totalMessages,
      interactions,
      conversionRate,
      highestDropCount,
      highestDropStage,
    };
  }, [reports]);

  return { stats, loading };
}

export function useTeamMembers() {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const usersList = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTeam(usersList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { team, loading };
}

export function useAdsAnalysis(filters: ReportFilters) {
  const { reports, loading } = useReports(filters);

  const adsAnalytics = useMemo(() => {
    const adsMap: Record<string, any> = {};

    reports.forEach((r) => {
      if (!r.parsedData?.funnel) return;
      const f = r.parsedData.funnel;

      const incrementAd = (arr: any[], stageIdx: number) => {
        if (!Array.isArray(arr)) return;
        arr.forEach((item) => {
          const name = (item.adName || "").trim();
          if (!name || DASHBOARD_IGNORED_AD_NAMES.has(name)) return;
          if (!adsMap[name]) {
            adsMap[name] = { adName: name, totalHits: 0, stageDrops: [0, 0, 0, 0], notes: [] };
          }
          adsMap[name].totalHits += item.count || 0;
          if (stageIdx < 4) adsMap[name].stageDrops[stageIdx] += item.count || 0;
          if (item.notes && item.notes.trim()) adsMap[name].notes.push(item.notes);
        });
      };

      incrementAd(f.noReplyAfterGreeting, 0);
      incrementAd(f.noReplyAfterDetails, 1);
      incrementAd(f.noReplyAfterPrice, 2);
      incrementAd(f.repliedAfterPrice, 3);
    });

    const resultArray = Object.values(adsMap).map((ad: any) => {
      const conversionVol = ad.stageDrops[3];
      const conversionRate =
        ad.totalHits > 0
          ? parseFloat(((conversionVol / ad.totalHits) * 100).toFixed(1))
          : 0;
      return { ...ad, conversionRate };
    });

    return resultArray.sort((a, b) => b.totalHits - a.totalHits);
  }, [reports]);

  return { adsAnalytics, loading };
}
