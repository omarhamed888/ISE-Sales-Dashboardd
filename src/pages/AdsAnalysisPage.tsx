import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFilter } from "@/lib/filter-context";
import { filterReports } from "@/lib/utils/dashboard-filters";
import { getAdsDeepStats } from "@/components/ads/AdsAggregator";

import { AdsSummaryRow } from "@/components/ads/AdsSummaryRow";
import { AdMatrixChart } from "@/components/ads/AdMatrixChart";
import { AdCardsList } from "@/components/ads/AdCardsList";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdsAnalysisPage() {
  const [allReports, setAllReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { filter } = useFilter();

  const [localFilter, setLocalFilter] = useState("الكل");

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllReports(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const { stats, displayStats } = useMemo(() => {
     const currentReports = filterReports(allReports, filter);
     const processedStats = getAdsDeepStats(currentReports);


     const displayStats = processedStats.filter(ad => {
         if (localFilter === "الكل") return true;
         if (localFilter === "الأقوى أداءً") return ad.state === "قوي";
         if (localFilter === "الأضعف أداءً") return ad.state === "ضعيف";
         if (localFilter === "خلط بوظيفة") return ad.state === "خلط";
         return true;
     });

     return { stats: processedStats, displayStats };
  }, [allReports, filter, localFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#2563EB]"></div>
        <p className="text-[#64748B] font-bold text-sm tracking-widest animate-pulse">جاري سحب تحليلات الإعلانات العميقة...</p>
      </div>
    );
  }

  // Entirely empty database state
  if (allReports.length === 0) {
    return (
      <div className="max-w-[1500px] w-full mx-auto flex flex-col items-center justify-center min-h-[60vh] px-2">
        <EmptyState
          variant="getting-started"
          icon="campaign"
          title="لا توجد حملات حالياً"
          description="ابدأ بإضافة أول تقرير مبيعات ليستخرج النظام أسماء الحملات من بياناتك."
          to="/submit-report"
          actionLabel="إضافة تقرير أداء"
          className="max-w-lg border-0 shadow-none bg-transparent"
        />
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="max-w-[1500px] w-full mx-auto">
        <EmptyState variant="filtered-empty" />
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] w-full mx-auto space-y-8 animate-in fade-in duration-500 pb-20 font-body" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-[#E2E8F0]">
        <div>
           <div className="flex items-center gap-3 md:gap-4 mb-2">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-[14px] md:rounded-[16px] bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                 <span className="material-symbols-outlined text-[20px] md:text-[24px]">ads_click</span>
              </div>
              <h1 className="text-[20px] md:text-[28px] font-black tracking-tight text-[#1E293B] font-headline">الإعلانات</h1>
           </div>
           <p className="text-[13px] font-bold text-[#64748B]">
               تم استخراج <span className="text-[#2563EB] font-black">{stats.length}</span> حملة إعلانية مسجلة
           </p>
        </div>

        {/* Global Filter Applies warning */}
        <div className="flex items-center gap-2 bg-[#F7F9FC] border border-[#E2E8F0] px-4 py-2.5 rounded-xl text-[12px] font-bold text-[#64748B]">
           <span className="material-symbols-outlined text-[#2563EB] text-[18px]">filter_alt</span>
           هذه البيانات تخضع وتتغير بتغيير فلاتر الشريط العلوي
        </div>
      </div>

      {/* Internal Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar px-2 max-w-full">
         {[
             { id: "الكل", label: "الكل" },
             { id: "الأقوى أداءً", label: "الأقوى أداءً" },
             { id: "الأضعف أداءً", label: "الأضعف أداءً" },
             { id: "خلط بوظيفة", label: "خلط بوظيفة" }
         ].map(pill => (
             <button
                 key={pill.id}
                 onClick={() => setLocalFilter(pill.id)}
                 className={`px-5 py-2.5 rounded-xl text-[13px] font-black transition-all shrink-0 border ${
                     localFilter === pill.id 
                     ? 'bg-[#1E293B] text-white border-[#1E293B] shadow-sm' 
                     : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F7F9FC] hover:border-[#CBD5E1]'
                 }`}
             >
                 {pill.label}
             </button>
         ))}
      </div>

      {/* Dashboard Body Mapping */}
      {displayStats.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-[#E2E8F0] min-h-[300px] flex items-center justify-center">
              <p className="text-[#64748B] font-bold text-[15px]">لا يوجد إعلانات تتطابق مع القسم ({localFilter}) حالياً.</p>
          </div>
      ) : (
          <>
             {/* Section 1: Top 3 High-level Cards */}
             {localFilter === "الكل" && <AdsSummaryRow ads={stats} />}

             {/* Section 2: Interactive Ad Matrix Scatter Map */}
             {localFilter === "الكل" && <AdMatrixChart ads={stats} />}

             {/* Section 3: Deep Ad Tracking Lists */}
             <AdCardsList ads={displayStats} />
          </>
      )}

    </div>
  );
}
