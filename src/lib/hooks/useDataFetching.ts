import { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export interface ReportFilters {
  dateRange: string;
  platform: string;
  salesRep: string;
  adName: string;
  customDateFrom: Date | null;
  customDateTo: Date | null;
}

// 1. useReports Filter Hook
export function useReports(filters: ReportFilters) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    // Default fetch all reports, we will filter client side since Firestore 
    // lacks robust multi-field dynamic filtering natively without complex index setups
    let q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    if (user.role === 'sales') {
        q = query(collection(db, "reports"), where("salesRepId", "==", user.uid), orderBy("createdAt", "desc"));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Memory Filtering
      if (filters.platform !== 'all') {
          data = data.filter(r => r.platform === filters.platform);
      }
      if (filters.salesRep !== 'all') {
          data = data.filter(r => r.salesRepId === filters.salesRep);
      }
      
      // Date Filtering
      if (filters.dateRange !== 'all') {
          const now = new Date();
          let startDate = new Date();
          if (filters.dateRange === 'today') {
              startDate.setHours(0,0,0,0);
          } else if (filters.dateRange === 'week') {
              startDate.setDate(now.getDate() - 7);
          } else if (filters.dateRange === 'month') {
              startDate.setDate(now.getDate() - 30);
          }
          
          data = data.filter(r => {
             if (r.createdAt?.toDate) {
                 return r.createdAt.toDate().getTime() >= startDate.getTime();
             }
             // fallback to raw date str 'YYYY-MM-DD'
             if (r.date) {
                 return new Date(r.date + "T00:00:00").getTime() >= startDate.getTime();
             }
             return true;
          });
      }

      setReports(data);
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, filters]);

  return { reports, loading, error };
}

// 2. useDashboardStats Aggregation Hook
export function useDashboardStats(filters: ReportFilters) {
   const { reports, loading } = useReports(filters);

   const stats = useMemo(() => {
       if (reports.length === 0) return { totalMessages: 0, interactions: 0, conversionRate: 0, highestDropCount: 0, highestDropStage: "لا يوجد بيانات" };
       
       let totalMessages = 0;
       let interactions = 0;
       let repSum = 0;

       let noRepGreeting = 0;
       let noRepDetails = 0;
       let noRepPrice = 0;

       reports.forEach(r => {
           const p = r.parsedData;
           if (!p) return;
           totalMessages += p.totalMessages || 0;
           interactions += p.interactions || 0;
           
           if (p.funnel?.repliedAfterPrice) repSum += p.funnel.repliedAfterPrice.reduce((a:any,b:any) => a+(b.count||0), 0);
           if (p.funnel?.noReplyAfterGreeting) noRepGreeting += p.funnel.noReplyAfterGreeting.reduce((a:any,b:any) => a+(b.count||0), 0);
           if (p.funnel?.noReplyAfterDetails) noRepDetails += p.funnel.noReplyAfterDetails.reduce((a:any,b:any) => a+(b.count||0), 0);
           if (p.funnel?.noReplyAfterPrice) noRepPrice += p.funnel.noReplyAfterPrice.reduce((a:any,b:any) => a+(b.count||0), 0);
       });

       const conversionRate = totalMessages > 0 ? parseFloat(((interactions / totalMessages)*100).toFixed(1)) : 0;
       
       let highestDropCount = noRepPrice;
       let highestDropStage = "السعر";
       if (noRepDetails > highestDropCount) { highestDropCount = noRepDetails; highestDropStage = "التفاصيل"; }
       if (noRepGreeting > highestDropCount) { highestDropCount = noRepGreeting; highestDropStage = "التحية"; }

       return { totalMessages, interactions, conversionRate, highestDropCount, highestDropStage };
   }, [reports]);

   return { stats, loading };
}

// 3. useTeamMembers Hook
export function useTeamMembers() {
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, snap => {
            const usersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTeam(usersList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return { team, loading };
}

// 4. useAdsAnalysis
export function useAdsAnalysis(filters: ReportFilters) {
    const { reports, loading } = useReports(filters);

    const adsAnalytics = useMemo(() => {
        const adsMap: Record<string, any> = {};

        reports.forEach(r => {
            if (!r.parsedData?.funnel) return;
            const f = r.parsedData.funnel;

            const incrementAd = (arr: any[], stageIdx: number) => {
                if (!Array.isArray(arr)) return;
                arr.forEach(item => {
                    const name = item.adName || "عام";
                    if (!adsMap[name]) adsMap[name] = { adName: name, totalHits: 0, stageDrops: [0,0,0,0], notes: [] };
                    adsMap[name].totalHits += item.count || 0;
                    if (stageIdx < 4) adsMap[name].stageDrops[stageIdx] += item.count || 0;
                    if (item.notes && item.notes.trim()) adsMap[name].notes.push(item.notes);
                });
            };

            incrementAd(f.noReplyAfterGreeting, 0); // stage 0 drop
            incrementAd(f.noReplyAfterDetails, 1);  // stage 1 drop
            incrementAd(f.noReplyAfterPrice, 2);    // stage 2 drop
            incrementAd(f.repliedAfterPrice, 3);    // converted/negotiating
        });

        const resultArray = Object.values(adsMap).map(ad => {
             // Let's assume stage 3 are successful conversions
             const conversionVol = ad.stageDrops[3];
             const conversionRate = ad.totalHits > 0 ? parseFloat(((conversionVol / ad.totalHits) * 100).toFixed(1)) : 0;
             return { ...ad, conversionRate };
        });

        // Sorted by volume descending
        return resultArray.sort((a,b) => b.totalHits - a.totalHits);
    }, [reports]);

    return { adsAnalytics, loading };
}
