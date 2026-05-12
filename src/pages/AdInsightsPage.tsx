import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Ad, SalesReport, AdSpendEntry } from "@/lib/types";
import { getAdsDeepStats } from "@/components/ads/AdsAggregator";
import { Skeleton, SkeletonCard, SkeletonChart, SkeletonText } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAllDeals } from "@/lib/services/deals-service";

const STATE_CONFIG: Record<string, { label: string; classes: string; icon: string }> = {
  قوي:   { label: "قوي",   classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "trending_up" },
  متوسط: { label: "متوسط", classes: "bg-amber-50 text-amber-700 border-amber-200",    icon: "trending_flat" },
  ضعيف:  { label: "ضعيف",  classes: "bg-red-50 text-red-700 border-red-200",           icon: "trending_down" },
  خلط:   { label: "خلط وظيفي", classes: "bg-purple-50 text-purple-700 border-purple-200", icon: "warning" },
};

export default function AdInsightsPage() {
  const { id } = useParams<{ id: string }>();
  const [ad, setAd] = useState<Ad | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof getAdsDeepStats>[number] | null>(null);
  const [adSpend, setAdSpend] = useState<AdSpendEntry[]>([]);
  const [adDeals, setAdDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [adSnap, reportsSnap, allDeals] = await Promise.all([
          getDoc(doc(db, "ads", id)),
          getDocs(collection(db, "reports")),
          getAllDeals(),
        ]);

        if (cancelled) return;
        if (!adSnap.exists()) { setError("الإعلان غير موجود"); setLoading(false); return; }

        const adData = { id: adSnap.id, ...adSnap.data() } as Ad;
        setAd(adData);

        const reports = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as SalesReport[];
        const allStats = getAdsDeepStats(reports);
        const adStats = allStats.find(s => s.name === adData.name) ?? null;
        setStats(adStats);

        // Load spend entries for THIS ad only (by adId)
        const spendSnap = await getDocs(query(collection(db, "ad_spend"), where("adId", "==", id)));
        if (cancelled) return;
        const spendList = spendSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any)) as AdSpendEntry[];
        setAdSpend(spendList);

        // Filter deals to those whose adSource matches this ad's name
        const dealsForAd = (allDeals as any[]).filter((d) => (d.adSource || "").trim() === adData.name);
        setAdDeals(dealsForAd);
      } catch {
        if (!cancelled) setError("حدث خطأ في تحميل البيانات");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  // Compute spend economics for this ad
  const economics = useMemo(() => {
    const totalSpend = adSpend.reduce((s, e) => s + (Number(e.spend) || 0), 0);
    const totalLeadsReported = adSpend.reduce((s, e) => s + (Number(e.leadsReported) || 0), 0);
    const totalRevenue = adDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
    const dealsCount = adDeals.length;
    const cpl = totalLeadsReported > 0 ? totalSpend / totalLeadsReported : 0;
    const cpa = dealsCount > 0 ? totalSpend / dealsCount : 0;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    return { totalSpend, totalLeadsReported, totalRevenue, dealsCount, cpl, cpa, roas };
  }, [adSpend, adDeals]);

  // Last 30 days of spend (sorted desc)
  const recentSpend = useMemo(() => {
    return [...adSpend].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  }, [adSpend]);

  if (loading) return (
    <div className="max-w-3xl mx-auto font-body pb-16 space-y-5 animate-in fade-in duration-300" dir="rtl">
      <Skeleton className="h-4 w-36 rounded-md" />
      <SkeletonCard>
        <div className="flex items-start gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4 max-w-md rounded-md" />
            <Skeleton className="h-3 w-full max-w-sm rounded-md" />
          </div>
        </div>
        <SkeletonText lines={2} />
      </SkeletonCard>
      <SkeletonChart />
    </div>
  );

  if (error || !ad) return (
    <div className="max-w-xl mx-auto py-20 text-center" dir="rtl">
      <p className="text-[14px] font-bold text-[#64748B]">{error ?? "الإعلان غير موجود"}</p>
      <Link to="/ads-management" className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-[#2563EB] hover:underline">
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        العودة لإدارة الإعلانات
      </Link>
    </div>
  );

  const stateInfo = stats ? (STATE_CONFIG[stats.state] ?? STATE_CONFIG["متوسط"]) : null;
  const STATUS_LABELS: Record<Ad["status"], string> = { active: "نشط", paused: "موقوف", archived: "مؤرشف" };

  return (
    <div className="max-w-3xl mx-auto font-body pb-16" dir="rtl">
      {/* Back */}
      <Link to="/ads-management" className="inline-flex items-center gap-1 text-[12px] font-bold text-[#64748B] hover:text-[#2563EB] mb-5 transition-colors">
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        إدارة الإعلانات
      </Link>

      {/* Ad header card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[20px] text-[#2563EB]">campaign</span>
              <h1 className="text-[18px] font-black text-[#1E293B] truncate">{ad.name}</h1>
            </div>
            {ad.postLink && (
              <a href={ad.postLink} target="_blank" rel="noopener noreferrer"
                className="text-[12px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                {ad.postLink.replace(/^https?:\/\//, "").slice(0, 60)}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {stateInfo && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-black border ${stateInfo.classes}`}>
                <span className="material-symbols-outlined text-[14px]">{stateInfo.icon}</span>
                {stateInfo.label}
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black border ${
              ad.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              ad.status === "paused" ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-slate-100 text-slate-500 border-slate-200"
            }`}>
              {STATUS_LABELS[ad.status]}
            </span>
          </div>
        </div>
      </div>

      {!stats ? (
        <EmptyState
          variant="no-data"
          icon="bar_chart"
          title="لا توجد بيانات تقارير لهذا الإعلان بعد"
          description="سيظهر الإعلان في الإحصائيات عندما يذكره السيلز في التقارير."
          compact
          className="shadow-sm"
        />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "إجمالي الليدز", value: stats.total, icon: "people", color: "text-[#2563EB]" },
              { label: "وصلوا للتفاصيل", value: stats.interactions, icon: "chat", color: "text-[#8B5CF6]" },
              { label: "نسبة التحويل", value: `${stats.conv.toFixed(1)}%`, icon: "percent", color: "text-[#10B981]" },
              { label: "أكبر تسرب", value: stats.biggestDrop, icon: "leak_remove", color: "text-[#F59E0B]" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
                <span className={`material-symbols-outlined text-[22px] ${kpi.color}`}>{kpi.icon}</span>
                <p className="text-[18px] font-black text-[#1E293B] mt-1">{kpi.value}</p>
                <p className="text-[10px] font-bold text-[#94A3B8]">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Funnel breakdown */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-5 shadow-sm">
            <h3 className="text-[14px] font-black text-[#1E293B] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#8B5CF6]">filter_alt</span>
              تفاصيل القمع
            </h3>
            <div className="space-y-3">
              {[
                { label: "مردش بعد التحية", value: stats.funnel.greeting, color: "bg-amber-400" },
                { label: "مردش بعد التفاصيل", value: stats.funnel.details, color: "bg-red-400" },
                { label: "مردش بعد السعر", value: stats.funnel.price, color: "bg-red-600" },
                { label: "رد بعد السعر", value: stats.funnel.success, color: "bg-emerald-500" },
              ].map(item => {
                const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[12px] font-bold text-[#475569]">{item.label}</span>
                      <span className="text-[13px] font-black text-[#1E293B]">{item.value} <span className="text-[11px] font-bold text-[#94A3B8]">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {stats.notes.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
              <h3 className="text-[14px] font-black text-[#1E293B] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#F59E0B]">sticky_note_2</span>
                ملاحظات من التقارير
              </h3>
              <ul className="space-y-2">
                {stats.notes.map((note, i) => (
                  <li key={i} className="text-[12px] font-bold text-[#475569] bg-[#F7F9FC] rounded-lg px-3 py-2 border border-[#E2E8F0]">
                    {String(note)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ── Ad Economics (cost data from media buyers) ─────────── */}
      {adSpend.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mt-5 shadow-sm">
          <h3 className="text-[14px] font-black text-[#1E293B] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#F59E0B]">payments</span>
            اقتصاديات الإعلان
          </h3>

          {/* Top KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <EconKpi label="إجمالي المصروف" value={`${economics.totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })} ج`} color="text-[#2563EB]" />
            <EconKpi label="CPL" value={economics.cpl > 0 ? `${economics.cpl.toFixed(1)} ج` : '—'} color="text-[#F59E0B]" />
            <EconKpi label="CPA" value={economics.cpa > 0 ? `${economics.cpa.toFixed(0)} ج` : '—'} color="text-[#8B5CF6]" />
            <EconKpi
              label="ROAS"
              value={economics.roas > 0 ? `${economics.roas.toFixed(2)}x` : '—'}
              color={economics.roas >= 3 ? "text-emerald-600" : economics.roas >= 1 ? "text-amber-600" : "text-red-600"}
            />
          </div>

          {/* Compare reported vs actual deals */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
              <p className="text-[10px] font-bold text-[#64748B] uppercase">Leads (المنصة)</p>
              <p className="text-2xl font-black text-[#1E293B] mt-1">{economics.totalLeadsReported}</p>
            </div>
            <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
              <p className="text-[10px] font-bold text-[#64748B] uppercase">صفقات / إيراد</p>
              <p className="text-2xl font-black text-[#1E293B] mt-1">
                {economics.dealsCount} <span className="text-[12px] text-emerald-600">({economics.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })} ج)</span>
              </p>
            </div>
          </div>

          {/* Spend history table */}
          {recentSpend.length > 0 && (
            <div>
              <h4 className="text-[12px] font-black text-[#64748B] mb-2 uppercase">سجل المصروف (آخر 30 يوم)</h4>
              <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-right text-[12px]">
                  <thead className="bg-[#F7F9FC] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="p-2.5 font-bold text-[#64748B] text-xs">التاريخ</th>
                      <th className="p-2.5 font-bold text-[#64748B] text-xs">المنصة</th>
                      <th className="p-2.5 font-bold text-[#64748B] text-xs text-center">المصروف</th>
                      <th className="p-2.5 font-bold text-[#64748B] text-xs text-center">Leads</th>
                      <th className="p-2.5 font-bold text-[#64748B] text-xs text-center">CPL</th>
                      <th className="p-2.5 font-bold text-[#64748B] text-xs">الميديا باير</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSpend.map((s) => {
                      const cpl = s.leadsReported > 0 ? (s.spend / s.leadsReported).toFixed(1) : '—';
                      return (
                        <tr key={s.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC]/50">
                          <td className="p-2.5 font-bold text-[#1E293B]">{s.date}</td>
                          <td className="p-2.5 text-[11px] text-[#64748B]">{s.platform}</td>
                          <td className="p-2.5 text-center font-bold text-[#1E293B]">{s.spend.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                          <td className="p-2.5 text-center text-[#64748B]">{s.leadsReported}</td>
                          <td className="p-2.5 text-center font-bold text-amber-700">{cpl}</td>
                          <td className="p-2.5 text-[11px] text-[#64748B]">{s.mediaBuyerName}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EconKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
      <p className="text-[10px] font-bold text-[#64748B] uppercase truncate">{label}</p>
      <p className={`text-xl font-black mt-1 ${color}`}>{value}</p>
    </div>
  );
}
