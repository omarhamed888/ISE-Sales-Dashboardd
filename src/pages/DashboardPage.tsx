import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "react-router-dom";
import { useFilter } from "@/lib/filter-context";
import { filterReports } from "@/lib/utils/dashboard-filters";
import { InsightsSection } from "@/components/dashboard/InsightsSection";
import { KPICards } from "@/components/dashboard/KPICards";
import { ChartsGrid } from "@/components/dashboard/ChartsGrid";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const [allReports, setAllReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { filter } = useFilter();

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllReports(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const { currentReports, prevReports } = useMemo(() => {
     const current = filterReports(allReports, filter);
     
     // Calculate precise previous period for trend arrows
     const prev = allReports.filter(r => {
         // Platform Filter
         if (filter.platform !== "all") {
             const m = ["واتساب", "whatsapp"].includes(filter.platform.toLowerCase());
             const pf = r.platform?.toLowerCase() || '';
             const match = m ? (pf.includes("whatsapp") || pf.includes("واتساب")) : (pf.includes("messenger") || pf.includes("ماسنجر") || pf.includes("انستقرام"));
             if (!match) return false;
         }
         
         // Rep Filter
         if (filter.salesRep !== "all" && r.salesRepId !== filter.salesRep) return false;
         
         // Date offset logic
         const reportDateStr = r.createdAt ? new Date(r.createdAt) : new Date((r.date || "").split('/').reverse().join('-'));
         const rTime = reportDateStr.getTime();
         if (isNaN(rTime)) return false;

         const now = new Date();
         const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
         const msPerDay = 24 * 60 * 60 * 1000;

         if (filter.dateRange === "اليوم") {
             return rTime >= today - msPerDay && rTime < today; // Yesterday
         }
         if (filter.dateRange === "الأسبوع") {
             return rTime >= today - (14 * msPerDay) && rTime < today - (7 * msPerDay);
         }
         if (filter.dateRange === "الشهر") {
             return rTime >= today - (60 * msPerDay) && rTime < today - (30 * msPerDay);
         }
         
         return false; // 'all' has no precise previous period
     });

     return { currentReports: current, prevReports: prev };
  }, [allReports, filter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#2563EB]"></div>
        <p className="text-[#64748B] font-bold text-sm tracking-widest animate-pulse">جاري تجميع البيانات الاستراتيجية...</p>
      </div>
    );
  }

  // Entirely empty database state (no reports ever)
  if (allReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in zoom-in-95">
        <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center text-outline/30">
          <span className="material-symbols-outlined text-6xl">dashboard_customize</span>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-on-surface">مرحباً بك في لوحة القيادة</h2>
          <p className="text-on-surface-variant italic">لا توجد بيانات متاحة بعد. نظامنا مدعوم بالكامل من Gemini.</p>
        </div>
        <Link to="/submit-report">
          <Button variant="gradient" className="px-10 py-4 shadow-xl shadow-primary/20 hover:scale-105 transition-transform">إرسال تقرير المبيعات الأول</Button>
        </Link>
      </div>
    );
  }

  return (
     <div className="max-w-[1500px] w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-20 font-body">
        
        {/* Only show sections if we have data for the filtered period */}
        {currentReports.length === 0 ? (
           <EmptyState />
        ) : (
           <>
              {/* SECTION 1: AI Insights */}
              <InsightsSection currentPeriod={currentReports} prevPeriod={prevReports} />
              
              {/* SECTION 2: KPI Cards */}
              <KPICards reports={currentReports} prevReports={prevReports} />
              
              {/* SECTION 3: Charts */}
              <ChartsGrid reports={currentReports} prevReports={prevReports} />
              
              {/* SECTION 4: Recent Activity Table */}
              <RecentActivity reports={currentReports} />
           </>
        )}
     </div>
  );
}
