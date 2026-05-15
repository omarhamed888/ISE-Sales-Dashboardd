import { useEffect, useState, useMemo, Suspense, lazy } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFilter } from "@/lib/filter-context";
import { filterReports, filterDealsByDashboardDate } from "@/lib/utils/dashboard-filters";
import { KPICards } from "@/components/dashboard/KPICards";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TeamStatusSummary } from "@/components/dashboard/TeamStatusSummary";
import { MarketingKPICards } from "@/components/dashboard/MarketingKPICards";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonChart } from "@/components/ui/Skeleton";
import { getAllDeals } from "@/lib/services/deals-service";
const ChartsGrid = lazy(() => import("@/components/dashboard/ChartsGrid").then((m) => ({ default: m.ChartsGrid })));
const RejectionAnalyticsSection = lazy(() => import("@/components/dashboard/RejectionAnalyticsSection").then((m) => ({ default: m.RejectionAnalyticsSection })));
const DealCycleSection = lazy(() => import("@/components/dashboard/DealCycleSection").then((m) => ({ default: m.DealCycleSection })));

export default function DashboardPage() {
  const [allReports, setAllReports] = useState<any[]>([]);
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { filter } = useFilter();

  useEffect(() => {
    if (!user?.uid) {
      setAllReports([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllReports(docs);
        setLoading(false);
      },
      (err) => {
        console.error("dashboard reports listener:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setAllDeals([]);
      return;
    }
    let cancelled = false;
    getAllDeals()
      .then((d) => { if (!cancelled) setAllDeals(d as any[]); })
      .catch(() => { if (!cancelled) setAllDeals([]); });
    return () => { cancelled = true; };
  }, [user?.uid]);

  const currentReports = useMemo(() => filterReports(allReports, filter), [allReports, filter]);
  const filteredDeals = useMemo(() => filterDealsByDashboardDate(allDeals, filter), [allDeals, filter]);

  if (loading) {
    return (
      <div className="max-w-[1500px] w-full mx-auto space-y-6 pb-20 font-body" dir="rtl">
        <Skeleton className="h-[72px] w-full rounded-2xl border border-[#E2E8F0]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} className="h-[120px] rounded-2xl border border-[#E2E8F0]" />
          ))}
        </div>
        <SkeletonChart />
        <div className="grid md:grid-cols-2 gap-4">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  // Entirely empty database state (no reports ever)
  if (allReports.length === 0) {
    return (
      <div className="max-w-[1500px] w-full mx-auto flex flex-col items-center justify-center min-h-[60vh] px-2">
        <EmptyState
          variant="getting-started"
          icon="dashboard_customize"
          title="مرحباً بك في لوحة القيادة"
          description="لا توجد بيانات متاحة بعد. نظامنا مدعوم بالكامل من Gemini."
          to="/submit-report"
          actionLabel="إرسال تقرير المبيعات الأول"
          className="max-w-lg border-0 shadow-none bg-transparent"
        />
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

  const SectionDivider = ({ icon, label, filled = true }: { icon: string; label: string; filled?: boolean }) => (
    <div className="flex items-center gap-3 mt-2 mb-1">
      <div className="flex-1 h-px bg-[#E2E8F0]" />
      <div className="flex items-center gap-2 px-4 py-1.5 bg-white border border-[#E2E8F0] rounded-full shadow-sm">
        <span
          className="material-symbols-outlined text-[16px] text-[#64748B]"
          style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {icon}
        </span>
        <span className="text-[11px] font-black text-[#64748B] uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex-1 h-px bg-[#E2E8F0]" />
    </div>
  );

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
              {/* ───── 1. OVERVIEW: KPIs at a glance ───── */}
              <SectionDivider icon="analytics" label="نظرة عامة" />
              <KPICards reports={currentReports} allReports={allReports} deals={filteredDeals} />

              {/* ───── 2. TEAM TODAY: who submitted, where they stand ───── */}
              <SectionDivider icon="groups" label="حالة الفريق اليوم" />
              <TeamStatusSummary allReports={allReports} deals={allDeals} />

              {/* ───── 3. PERFORMANCE: funnel → platforms → daily trends → comparisons ───── */}
              <SectionDivider icon="insights" label="تحليل الأداء" />
              <Suspense fallback={<SkeletonChart />}>
                <ChartsGrid reports={currentReports} deals={filteredDeals} />
              </Suspense>

              {/* ───── 4. DEAL CYCLE: how fast we close ───── */}
              <SectionDivider icon="timer" label="دورة إغلاق الصفقات" />
              <Suspense fallback={<SkeletonChart />}>
                <DealCycleSection />
              </Suspense>

              {/* ───── 5. REJECTION ANALYTICS: why we lose ───── */}
              <SectionDivider icon="report" label="تحليل أسباب الرفض" filled={false} />
              <Suspense fallback={<SkeletonChart />}>
                <RejectionAnalyticsSection reports={currentReports} />
              </Suspense>

              {/* ───── 6. RECENT ACTIVITY: drill-down table ───── */}
              <SectionDivider icon="receipt_long" label="آخر التقارير" />
              <RecentActivity reports={currentReports} deals={filteredDeals} />

              {/* ───── 7. MARKETING SPEND (auto-hides when no spend data): kept at the bottom until real numbers are entered ───── */}
              <MarketingKPICards deals={allDeals} />

           </>
        )}
     </div>
  );
}
