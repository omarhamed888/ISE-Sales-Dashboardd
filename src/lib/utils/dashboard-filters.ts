import { useMemo } from "react";
import { FilterState } from "@/lib/filter-context";

export function filterReports(reports: any[], filter: FilterState) {
  return reports.filter(r => {
    // Platform
    if (filter.platform !== "all") {
       // Convert internal platform to arabic to match DB string
       const platformMap: Record<string, string[]> = {
         "whatsapp": ["واتساب", "whatsapp", "WhatsApp"],
         "messenger": ["ماسنجر", "انستقرام", "إنستغرام", "messenger"] // group fb ecosystem
       };
       const match = platformMap[filter.platform]?.find(p => r.platform?.toLowerCase().includes(p.toLowerCase()));
       if (!match) return false;
    }
    
    // Sales Rep
    if (filter.salesRep !== "all" && r.salesRepId !== filter.salesRep) {
       return false;
    }

    // Ad Name filtering
    if (filter.adName !== "all" && r.parsedData?.funnel) {
      let hasAd = false;
      Object.values(r.parsedData.funnel).forEach((stages: any) => {
        if (Array.isArray(stages)) {
          if (stages.some((s: any) => s.adName === filter.adName)) hasAd = true;
        }
      });
      if (!hasAd) return false;
    }

    // Date Range Filtration
    const reportDateStr = r.createdAt ? new Date(r.createdAt) : new Date(r.date.split('/').reverse().join('-')); // try parse standard
    const rTime = reportDateStr.getTime();
    
    // Safety check just in case date parsing fails
    if (isNaN(rTime)) return true;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter.dateRange === "اليوم") {
       if (rTime < today.getTime()) return false;
    }
    if (filter.dateRange === "الأسبوع") {
       const weekAgo = today.getTime() - (7 * 24 * 60 * 60 * 1000);
       if (rTime < weekAgo) return false;
    }
    if (filter.dateRange === "الشهر") {
       const monthAgo = today.getTime() - (30 * 24 * 60 * 60 * 1000);
       if (rTime < monthAgo) return false;
    }

    return true;
  });
}
