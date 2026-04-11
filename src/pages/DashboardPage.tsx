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
import { DealCycleSection } from "@/components/dashboard/DealCycleSection";
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

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 17) return "مساء الخير";
    return "مساء النور";
  })();

  const todayFormatted = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
     <div className="max-w-[1500px] w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-20 font-body" dir="rtl">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-l from-[#EFF6FF] to-white rounded-2xl border border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-[#0F172A]">{greeting} 👋</h2>
            <p className="text-sm text-[#64748B] mt-0.5">{todayFormatted}</p>
          </div>
          <span className="material-symbols-outlined text-[32px] text-[#2563EB]/20" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
        </div>

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
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-[#E2E8F0]" />
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white border border-[#E2E8F0] rounded-full shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-[#64748B]">bar_chart</span>
                    <span className="text-[11px] font-black text-[#64748B] uppercase tracking-widest">تحليل أسباب الرفض</span>
                  </div>
                  <div className="flex-1 h-px bg-[#E2E8F0]" />
                </div>
                <RejectionAnalyticsSection reports={currentReports} />
              </>

              {/* SECTION 5: Deal Cycle Analytics */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-[#E2E8F0]" />
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white border border-[#E2E8F0] rounded-full shadow-sm">
                  <span className="material-symbols-outlined text-[16px] text-[#64748B]" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                  <span className="text-[11px] font-black text-[#64748B] uppercase tracking-widest">دورة إغلاق الصفقات</span>
                </div>
                <div className="flex-1 h-px bg-[#E2E8F0]" />
              </div>
              <DealCycleSection />

              {/* SECTION 6: Team Status */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-[#E2E8F0]" />
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white border border-[#E2E8F0] rounded-full shadow-sm">
                  <span className="material-symbols-outlined text-[16px] text-[#64748B]" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                  <span className="text-[11px] font-black text-[#64748B] uppercase tracking-widest">حالة الفريق</span>
                </div>
                <div className="flex-1 h-px bg-[#E2E8F0]" />
              </div>
              <TeamStatusSummary allReports={allReports} />

              {/* SECTION 6: Recent Activity */}
              <RecentActivity reports={currentReports} />

              {/* Coming Soon: Marketing Dashboard */}
              <div className="mt-4 border-2 border-dashed border-[#E2E8F0] rounded-2xl p-8 text-center bg-[#F8FAFC]">
                <span className="material-symbols-outlined text-[40px] text-[#CBD5E1] block mb-3">campaign</span>
                <h3 className="text-base font-bold text-[#64748B] mb-1">Marketing Dashboard</h3>
                <p className="text-[#94A3B8] text-sm mb-3">تحليل الإنفاق الإعلاني • ROAS • CAC • LTV:CAC</p>
                <span className="inline-block bg-[#EFF6FF] text-[#2563EB] text-xs font-bold px-4 py-1.5 rounded-full border border-[#2563EB]/10">Coming Soon</span>
              </div>
           </>
        )}
     </div>
  );
}
