import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "react-router-dom";
import { useFilter } from "@/lib/filter-context";
import { filterReports } from "@/lib/utils/dashboard-filters";
import { SmartInsightsSection } from "@/components/dashboard/SmartInsightsSection";
import { RecommendationsSection } from "@/components/dashboard/RecommendationsSection";
import { KPICards } from "@/components/dashboard/KPICards";
import { ChartsGrid } from "@/components/dashboard/ChartsGrid";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TeamStatusSummary } from "@/components/dashboard/TeamStatusSummary";
import { RejectionAnalyticsSection } from "@/components/dashboard/RejectionAnalyticsSection";
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

  const currentReports = useMemo(() => filterReports(allReports, filter), [allReports, filter]);

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
              {/* SECTION 1: KPI Cards */}
              <KPICards reports={currentReports} />

              {/* SECTION 2: Charts */}
              <ChartsGrid reports={currentReports} />

              {/* SECTION 3: AI Insights + Recommendations */}
              <SmartInsightsSection reports={currentReports} />
              <RecommendationsSection reports={currentReports} />

              {/* SECTION 4: Rejection Analytics */}
              <>
                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-[#E2E8F0]"></div>
                  <span className="text-[12px] font-black text-[#64748B] uppercase tracking-widest px-3 py-1.5 bg-[#F7F9FC] border border-[#E2E8F0] rounded-full">تحليل أسباب الرفض</span>
                  <div className="flex-1 h-px bg-[#E2E8F0]"></div>
                </div>
                <RejectionAnalyticsSection reports={currentReports} />
              </>

              {/* SECTION 5: Team Status */}
              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-[#E2E8F0]"></div>
                <span className="text-[12px] font-black text-[#64748B] uppercase tracking-widest px-3 py-1.5 bg-[#F7F9FC] border border-[#E2E8F0] rounded-full">حالة الفريق</span>
                <div className="flex-1 h-px bg-[#E2E8F0]"></div>
              </div>
              <TeamStatusSummary allReports={allReports} />

              {/* SECTION 6: Recent Activity */}
              <RecentActivity reports={currentReports} />

              {/* Coming Soon: Marketing Dashboard */}
              <div className="mt-8 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="text-lg font-bold text-gray-600 mb-1">Marketing Dashboard</h3>
                <p className="text-gray-400 text-sm mb-3">تحليل الإنفاق الإعلاني • ROAS • CAC • LTV:CAC</p>
                <span className="inline-block bg-blue-100 text-blue-600 text-xs font-bold px-4 py-1.5 rounded-full">🚀 Coming Soon</span>
              </div>
           </>
        )}
     </div>
  );
}
