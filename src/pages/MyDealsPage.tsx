import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMyDeals } from "@/lib/services/deals-service";

type Filter = "month" | "week" | "all";

function getTodayMs() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export default function MyDealsPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("month");

  useEffect(() => {
    if (!user) return;
    getMyDeals(user.uid)
      .then(setDeals)
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    const today = getTodayMs();
    const msDay = 24 * 60 * 60 * 1000;
    return deals.filter((d) => {
      if (filter === "all") return true;
      const dTime = d.closeDate ? new Date(d.closeDate).getTime() : 0;
      if (filter === "week") return dTime >= today - 7 * msDay;
      if (filter === "month") return dTime >= today - 30 * msDay;
      return true;
    });
  }, [deals, filter]);

  const totalRevenue = filtered.reduce((s: number, d: any) => s + (d.dealValue || 0), 0);
  const avgDeal = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;
  const avgCycle =
    filtered.length > 0
      ? (filtered.reduce((s: number, d: any) => s + (d.closingCycleDays || 0), 0) / filtered.length).toFixed(1)
      : "0";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 font-body" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[#1E293B]">💰 صفقاتي</h1>
        <div className="flex gap-1 p-1 bg-[#F1F5F9] rounded-xl">
          {(["month", "week", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? "bg-white shadow-sm text-[#1E293B]" : "text-[#64748B]"}`}
            >
              {f === "month" ? "هذا الشهر" : f === "week" ? "الأسبوع" : "الكل"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <h3 className="font-bold text-[#1E293B] mb-4">ملخص</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-[#F8FAFC] rounded-xl">
            <p className="text-2xl font-extrabold text-[#2563EB]">{filtered.length}</p>
            <p className="text-xs text-[#64748B] font-bold mt-1">إجمالي الصفقات</p>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-xl">
            <p className="text-2xl font-extrabold text-[#2563EB]">{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-[#64748B] font-bold mt-1">إجمالي الإيرادات ج.م</p>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-xl">
            <p className="text-2xl font-extrabold text-[#2563EB]">{avgDeal.toLocaleString()}</p>
            <p className="text-xs text-[#64748B] font-bold mt-1">متوسط الصفقة ج.م</p>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-xl">
            <p className="text-2xl font-extrabold text-[#2563EB]">{avgCycle}</p>
            <p className="text-xs text-[#64748B] font-bold mt-1">متوسط دورة الإغلاق (يوم)</p>
          </div>
        </div>
      </div>

      {/* Deals List */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0]">
          <h3 className="font-bold text-[#1E293B]">قائمة الصفقات</h3>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[#94A3B8]">
            <span className="material-symbols-outlined text-5xl">sentiment_neutral</span>
            <p className="mt-3 font-bold text-sm">لا توجد صفقات في هذه الفترة</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map((d: any) => (
              <div key={d.id} className="p-4 hover:bg-[#F8FAFC] transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#1E293B] text-sm">{d.customerName}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{d.adSource}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold text-[#2563EB]">{(d.dealValue || 0).toLocaleString()} ج.م</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{d.closeDate} • {d.closingCycleDays || 0} يوم</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="inline-block px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-xs font-bold rounded-md">{d.programName}</span>
                  {d.programCount > 1 && (
                    <span className="inline-block px-2 py-0.5 bg-[#F1F5F9] text-[#64748B] text-xs font-bold rounded-md">{d.programCount} برامج</span>
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
