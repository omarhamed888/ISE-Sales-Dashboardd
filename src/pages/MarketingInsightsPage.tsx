import { useEffect, useMemo, useState } from "react";
import { getAllAdSpend } from "@/lib/services/ad-spend-service";
import { getAllDeals } from "@/lib/services/deals-service";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AdSpendEntry } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonChart } from "@/components/ui/Skeleton";

interface PerAd {
  adName: string;
  platform: string;
  spend: number;
  leadsReported: number;
  leadsActual: number;     // from sales reports
  deals: number;
  revenue: number;
  cpl: number;             // spend / leadsReported
  cpa: number;             // spend / deals
  roas: number;            // revenue / spend
  status: "good" | "warn" | "bad";
}

function statusFor(roas: number, cpa: number): PerAd["status"] {
  if (roas >= 3 && cpa < 800) return "good";
  if (roas >= 1) return "warn";
  return "bad";
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "فيسبوك",
  instagram: "إنستجرام",
  tiktok: "تيك توك",
  messenger: "ماسنجر",
  whatsapp: "واتساب",
};

export default function MarketingInsightsPage() {
  const [spend, setSpend] = useState<AdSpendEntry[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getAllAdSpend(),
      getAllDeals(),
      getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc"))).then((snap) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as any))
      ),
    ])
      .then(([s, d, r]) => {
        if (cancelled) return;
        setSpend(s);
        setDeals(d as any[]);
        setReports(r);
      })
      .catch(() => { if (!cancelled) { setSpend([]); setDeals([]); setReports([]); }})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Aggregate per ad
  const perAdRows: PerAd[] = useMemo(() => {
    const map = new Map<string, PerAd>();
    spend.forEach((s) => {
      const key = s.adName.trim() || "غير محدد";
      const existing = map.get(key) ?? {
        adName: key,
        platform: s.platform,
        spend: 0,
        leadsReported: 0,
        leadsActual: 0,
        deals: 0,
        revenue: 0,
        cpl: 0, cpa: 0, roas: 0,
        status: "warn" as const,
      };
      existing.spend += s.spend || 0;
      existing.leadsReported += s.leadsReported || 0;
      map.set(key, existing);
    });

    // Match deals by adSource (ad name)
    deals.forEach((d) => {
      const key = (d.adSource || "").trim();
      if (!key) return;
      const row = map.get(key);
      if (!row) return;
      row.deals += 1;
      row.revenue += Number(d.dealValue) || 0;
    });

    // Match actual leads from reports.parsedData.leadsByAd
    reports.forEach((r) => {
      const lba = r?.parsedData?.leadsByAd;
      if (!Array.isArray(lba)) return;
      lba.forEach((entry: any) => {
        const key = (entry?.adName || "").trim();
        if (!key) return;
        const row = map.get(key);
        if (!row) return;
        row.leadsActual += Number(entry?.leadCount) || 0;
      });
    });

    // Compute derived metrics
    return Array.from(map.values()).map((r) => {
      const cpl = r.leadsReported > 0 ? r.spend / r.leadsReported : 0;
      const cpa = r.deals > 0 ? r.spend / r.deals : 0;
      const roas = r.spend > 0 ? r.revenue / r.spend : 0;
      return { ...r, cpl, cpa, roas, status: statusFor(roas, cpa) };
    }).sort((a, b) => b.spend - a.spend);
  }, [spend, deals, reports]);

  const totals = useMemo(() => {
    const t = perAdRows.reduce(
      (acc, r) => ({
        spend: acc.spend + r.spend,
        leadsReported: acc.leadsReported + r.leadsReported,
        leadsActual: acc.leadsActual + r.leadsActual,
        deals: acc.deals + r.deals,
        revenue: acc.revenue + r.revenue,
      }),
      { spend: 0, leadsReported: 0, leadsActual: 0, deals: 0, revenue: 0 }
    );
    const cpl = t.leadsReported > 0 ? t.spend / t.leadsReported : 0;
    const cpa = t.deals > 0 ? t.spend / t.deals : 0;
    const roas = t.spend > 0 ? t.revenue / t.spend : 0;
    const discrepancyPct = t.leadsReported > 0
      ? ((t.leadsReported - t.leadsActual) / t.leadsReported) * 100
      : 0;
    return { ...t, cpl, cpa, roas, discrepancyPct };
  }, [perAdRows]);

  const topByRoas = useMemo(() =>
    [...perAdRows].filter((r) => r.spend > 0 && r.roas > 0).sort((a, b) => b.roas - a.roas).slice(0, 3),
  [perAdRows]);

  const worstByCpl = useMemo(() =>
    [...perAdRows].filter((r) => r.spend > 100 && (r.deals === 0 || r.cpl > 50)).sort((a, b) => b.cpl - a.cpl).slice(0, 3),
  [perAdRows]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto pb-20 space-y-6" dir="rtl">
        <Skeleton className="h-[72px] rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map((k) => <Skeleton key={k} className="h-[120px] rounded-2xl" />)}
        </div>
        <SkeletonChart />
      </div>
    );
  }

  if (perAdRows.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto py-16">
        <EmptyState
          variant="getting-started"
          icon="campaign"
          title="لا توجد بيانات تسويق بعد"
          description="بمجرد إدخال الميديا باير لمصاريف الإعلانات، ستظهر هنا تحليلات شاملة عن الـ ROI لكل إعلان."
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-20" dir="rtl">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-[22px] md:text-[28px] font-black text-[#1E293B] mb-1">تحليل التسويق</h1>
        <p className="text-[13px] font-bold text-[#64748B]">ربط مصاريف الإعلانات بالـ leads والصفقات الفعلية لحساب ROI دقيق.</p>
      </header>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="إجمالي المصروف" value={`${totals.spend.toLocaleString('en-US', { maximumFractionDigits: 0 })} ج`} color="blue" />
        <KpiCard label="Leads (المنصة)" value={totals.leadsReported.toLocaleString('en-US')} color="cyan" />
        <KpiCard label="Leads (سيلز)" value={totals.leadsActual.toLocaleString('en-US')} color="purple" />
        <KpiCard label="الصفقات" value={totals.deals.toLocaleString('en-US')} color="emerald" />
        <KpiCard label="CPL" value={`${totals.cpl.toFixed(1)} ج`} color="amber" />
        <KpiCard label="ROAS" value={`${totals.roas.toFixed(2)}x`} color={totals.roas >= 3 ? "emerald" : totals.roas >= 1 ? "amber" : "red"} />
      </div>

      {/* Discrepancy alert */}
      {Math.abs(totals.discrepancyPct) > 20 && (
        <div className={`mb-6 rounded-2xl p-4 border-2 ${
          totals.discrepancyPct > 0
            ? "bg-amber-50 border-amber-200"
            : "bg-blue-50 border-blue-200"
        }`}>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 text-[24px] mt-0.5">warning</span>
            <div className="flex-1">
              <h3 className="text-[14px] font-black text-[#1E293B] mb-1">تنبيه: فرق كبير بين leads المنصة والسيلز</h3>
              <p className="text-[12px] font-bold text-[#64748B]">
                المنصات قالت <strong>{totals.leadsReported}</strong> lead، لكن السيلز رفع <strong>{totals.leadsActual}</strong> فقط
                ({totals.discrepancyPct > 0 ? '+' : ''}{totals.discrepancyPct.toFixed(0)}% فرق).
                {totals.discrepancyPct > 0
                  ? " قد يكون هناك leads لم تصل للسيلز أو لم تُسجل."
                  : " السيلز ربما يحسب leads من مصادر إضافية."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Best & Worst */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {topByRoas.length > 0 && (
          <div className="bg-white border border-emerald-200 rounded-2xl p-5 border-r-4 border-r-emerald-500">
            <h3 className="text-[14px] font-black text-emerald-700 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">trophy</span>
              أعلى ROAS (الأفضل)
            </h3>
            <ul className="space-y-2">
              {topByRoas.map((r, i) => (
                <li key={r.adName} className="flex justify-between items-center text-[13px]">
                  <span className="font-bold text-[#1E293B]">{i + 1}. {r.adName}</span>
                  <span className="font-black text-emerald-700">{r.roas.toFixed(1)}x</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {worstByCpl.length > 0 && (
          <div className="bg-white border border-red-200 rounded-2xl p-5 border-r-4 border-r-red-500">
            <h3 className="text-[14px] font-black text-red-700 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              يحتاج مراجعة
            </h3>
            <ul className="space-y-2">
              {worstByCpl.map((r, i) => (
                <li key={r.adName} className="flex justify-between items-center text-[13px]">
                  <span className="font-bold text-[#1E293B]">{i + 1}. {r.adName}</span>
                  <span className="font-black text-red-700">
                    {r.deals === 0 ? "0 صفقات" : `CPL ${r.cpl.toFixed(0)}ج`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Per-ad table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 className="text-[14px] font-black text-[#1E293B]">جدول الأداء حسب الإعلان</h3>
          <span className="text-[11px] font-bold text-[#64748B]">{perAdRows.length} إعلان</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[12px]">
            <thead className="bg-[#F7F9FC] border-b border-[#E2E8F0]">
              <tr>
                <th className="p-3 font-bold text-[#64748B] text-xs">الإعلان</th>
                <th className="p-3 font-bold text-[#64748B] text-xs">المنصة</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">المصروف</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">Leads (FB)</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">Leads (سيلز)</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">صفقات</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">إيرادات</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">CPL</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">CPA</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">ROAS</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {perAdRows.map((r) => (
                <tr key={r.adName} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC]/50">
                  <td className="p-3 font-black text-[#1E293B]">{r.adName}</td>
                  <td className="p-3 text-[11px] text-[#64748B]">{PLATFORM_LABELS[r.platform] || r.platform}</td>
                  <td className="p-3 text-center font-bold text-[#1E293B]">{r.spend.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  <td className="p-3 text-center text-[#64748B]">{r.leadsReported}</td>
                  <td className="p-3 text-center text-[#64748B]">{r.leadsActual}</td>
                  <td className="p-3 text-center font-black text-emerald-600">{r.deals}</td>
                  <td className="p-3 text-center font-bold text-[#1E293B]">{r.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  <td className="p-3 text-center font-bold text-amber-700">{r.cpl > 0 ? r.cpl.toFixed(1) : '—'}</td>
                  <td className="p-3 text-center font-bold text-[#1E293B]">{r.cpa > 0 ? r.cpa.toFixed(0) : '—'}</td>
                  <td className={`p-3 text-center font-black ${r.roas >= 3 ? 'text-emerald-700' : r.roas >= 1 ? 'text-amber-700' : 'text-red-700'}`}>
                    {r.roas > 0 ? `${r.roas.toFixed(1)}x` : '—'}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                      r.status === 'good' ? 'bg-emerald-500' :
                      r.status === 'warn' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, { border: string; bg: string }> = {
    blue:    { border: "border-r-[#2563EB]", bg: "bg-[#EFF6FF]" },
    cyan:    { border: "border-r-[#06B6D4]", bg: "bg-cyan-50" },
    purple:  { border: "border-r-[#8B5CF6]", bg: "bg-[#F5F3FF]" },
    emerald: { border: "border-r-[#10B981]", bg: "bg-[#ECFDF5]" },
    amber:   { border: "border-r-[#F59E0B]", bg: "bg-[#FFFBEB]" },
    red:     { border: "border-r-[#EF4444]", bg: "bg-red-50" },
  };
  const c = colors[color] ?? colors.blue;
  return (
    <div className={`bg-white border border-[#E2E8F0] rounded-2xl p-4 border-r-4 ${c.border}`}>
      <p className="text-[10px] font-semibold text-[#64748B] uppercase truncate">{label}</p>
      <p className="text-2xl font-black text-[#0F172A] mt-1">{value}</p>
    </div>
  );
}
