import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMyDeals } from "@/lib/services/deals-service";

type Range = "month" | "week" | "all";

const RANGE_LABELS: Record<Range, string> = {
  month: "هذا الشهر",
  week: "الأسبوع",
  all: "الكل",
};

function formatNumber(n: number) {
  return n.toLocaleString("ar-EG");
}

export default function MyDealsPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("month");

  useEffect(() => {
    if (!user) return;
    getMyDeals(user.uid)
      .then(setDeals)
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    if (range === "all") return deals;
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === "week") cutoff.setDate(cutoff.getDate() - 7);
    if (range === "month") cutoff.setDate(cutoff.getDate() - 30);
    return deals.filter(d => {
      const date = d.closeDate ? new Date(d.closeDate) : null;
      return date && date >= cutoff;
    });
  }, [deals, range]);

  const totalRevenue = filtered.reduce((s: number, d: any) => s + (d.dealValue || 0), 0);
  const avgDeal = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;
  const avgCycle = (() => {
    const withCycle = filtered.filter((d: any) => typeof d.closingCycleDays === 'number');
    if (!withCycle.length) return 0;
    return (withCycle.reduce((s: number, d: any) => s + d.closingCycleDays, 0) / withCycle.length).toFixed(1);
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" dir="rtl">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 font-body" dir="rtl">
      <h1 className="text-2xl font-black text-[#1E293B]">💰 صفقاتي</h1>

      {/* Range Tabs */}
      <div className="flex gap-2">
        {(["month", "week", "all"] as Range[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${range === r ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-5">
        <h3 className="font-black text-[#1E293B] text-sm mb-3">ملخص</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 text-center border border-[#E2E8F0]">
            <p className="text-xs text-[#64748B] font-bold">إجمالي الصفقات</p>
            <p className="text-2xl font-black text-[#1E293B]">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-[#E2E8F0]">
            <p className="text-xs text-[#64748B] font-bold">إجمالي الإيرادات</p>
            <p className="text-xl font-black text-[#2563EB]">{formatNumber(totalRevenue)} ج.م</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-[#E2E8F0]">
            <p className="text-xs text-[#64748B] font-bold">متوسط الصفقة</p>
            <p className="text-xl font-black text-[#1E293B]">{formatNumber(avgDeal)} ج.م</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-[#E2E8F0]">
            <p className="text-xs text-[#64748B] font-bold">متوسط زمن الإغلاق</p>
            <p className="text-xl font-black text-[#1E293B]">{avgCycle} يوم</p>
          </div>
        </div>
      </div>

      {/* Deals List */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9]">
          <h3 className="font-black text-[#1E293B] text-sm">الصفقات</h3>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[#94A3B8]">
            <span className="material-symbols-outlined text-4xl block mb-2">monetization_on</span>
            <p className="text-sm font-bold">لا توجد صفقات في هذه الفترة</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map((deal: any) => (
              <div key={deal.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[#1E293B] text-sm">{deal.customerName}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{deal.adSource}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#2563EB] text-sm">{formatNumber(deal.dealValue)} ج.م</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{deal.closeDate}</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <span className="inline-block bg-[#F1F5F9] text-[#64748B] text-xs px-2 py-0.5 rounded-md font-bold">{deal.programName}</span>
                  {typeof deal.closingCycleDays === 'number' && (
                    <span className="inline-block bg-[#EFF6FF] text-[#2563EB] text-xs px-2 py-0.5 rounded-md font-bold">{deal.closingCycleDays} يوم</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
