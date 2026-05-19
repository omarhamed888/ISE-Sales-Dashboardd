import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllAdSpend } from "@/lib/services/ad-spend-service";
import { netDealValue } from "@/lib/services/deals-service";
import type { AdSpendEntry } from "@/lib/types";
import { useFilter } from "@/lib/filter-context";
import { isReportDateInDashboardRange, isReportDateInMonth } from "@/lib/utils/report-dates";

interface Deal {
  salesRepId?: string;
  date?: string;
  dealValue?: number;
  adSource?: string;
  products?: string[];
}

/**
 * Spend / CPL / CPA / ROAS section for the admin dashboard.
 * Hidden if no spend data exists yet.
 */
export function MarketingKPICards({ deals, profitPctById }: { deals: Deal[]; profitPctById?: Map<string, number> }) {
  const [spend, setSpend] = useState<AdSpendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { filter } = useFilter();

  useEffect(() => {
    let cancelled = false;
    getAllAdSpend()
      .then((s) => { if (!cancelled) setSpend(s); })
      .catch(() => { if (!cancelled) setSpend([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Map FilterContext.dateRange ("اليوم"/"الأسبوع"/"الشهر"/"الإجمالي"/"مخصص") through the existing helper.
  const filteredSpend = useMemo(() => {
    return spend.filter((s) => {
      if (filter.dateRange === "مخصص") {
        const from = filter.customDateFrom?.toISOString().slice(0, 10) ?? "0000-00-00";
        const to = filter.customDateTo?.toISOString().slice(0, 10) ?? "9999-12-31";
        return s.date >= from && s.date <= to;
      }
      if (filter.dateRange === "شهر محدد") {
        return isReportDateInMonth(s.date, filter.selectedMonth);
      }
      if (filter.dateRange === "الإجمالي") return true;
      return isReportDateInDashboardRange(
        s.date,
        filter.dateRange as "اليوم" | "الأسبوع" | "الشهر" | "الإجمالي"
      );
    });
  }, [spend, filter]);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (filter.courseId && filter.courseId !== "all") {
        const products = Array.isArray(d.products) ? d.products : [];
        if (!products.includes(filter.courseId)) return false;
      }
      const date = (d.date || "").split("T")[0];
      if (!date) return false;
      if (filter.dateRange === "مخصص") {
        const from = filter.customDateFrom?.toISOString().slice(0, 10) ?? "0000-00-00";
        const to = filter.customDateTo?.toISOString().slice(0, 10) ?? "9999-12-31";
        return date >= from && date <= to;
      }
      if (filter.dateRange === "شهر محدد") {
        return isReportDateInMonth(date, filter.selectedMonth);
      }
      if (filter.dateRange === "الإجمالي") return true;
      return isReportDateInDashboardRange(
        date,
        filter.dateRange as "اليوم" | "الأسبوع" | "الشهر" | "الإجمالي"
      );
    });
  }, [deals, filter]);

  const totals = useMemo(() => {
    let totalSpend = 0;
    let totalLeads = 0;
    filteredSpend.forEach((s) => {
      totalSpend += Number(s.spend) || 0;
      totalLeads += Number(s.leadsReported) || 0;
    });

    let revenue = 0;
    let dealsCount = 0;
    filteredDeals.forEach((d) => {
      revenue += netDealValue(d, profitPctById);
      dealsCount += 1;
    });

    const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const cpa = dealsCount > 0 ? totalSpend / dealsCount : 0;
    const roas = totalSpend > 0 ? revenue / totalSpend : 0;
    return { totalSpend, totalLeads, dealsCount, revenue, cpl, cpa, roas };
  }, [filteredSpend, filteredDeals, profitPctById]);

  // Hide entire section if no spend data ever
  if (loading) return null;
  if (spend.length === 0) return null;

  const roasColor =
    totals.roas >= 3 ? "text-emerald-600" :
    totals.roas >= 1 ? "text-amber-600" :
    "text-red-600";

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-black text-[#1E293B] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
          تكلفة الإعلانات
        </h3>
        <Link
          to="/marketing-insights"
          className="text-[12px] font-bold text-[#2563EB] hover:underline flex items-center gap-1"
        >
          التفاصيل الكاملة
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          label="إجمالي المصروف"
          value={`${totals.totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })} ج`}
          icon="payments"
          color="text-[#2563EB]"
          bg="bg-[#EFF6FF]"
        />
        <KpiTile
          label="CPL متوسط"
          value={totals.cpl > 0 ? `${totals.cpl.toFixed(1)} ج` : '—'}
          icon="account_balance_wallet"
          color="text-[#F59E0B]"
          bg="bg-[#FFFBEB]"
        />
        <KpiTile
          label="CPA (تكلفة الصفقة)"
          value={totals.cpa > 0 ? `${totals.cpa.toFixed(0)} ج` : '—'}
          icon="handshake"
          color="text-[#8B5CF6]"
          bg="bg-[#F5F3FF]"
        />
        <KpiTile
          label="ROAS"
          value={totals.roas > 0 ? `${totals.roas.toFixed(2)}x` : '—'}
          icon="trending_up"
          color={roasColor}
          bg="bg-[#ECFDF5]"
        />
      </div>
    </div>
  );
}

function KpiTile({ label, value, icon, color, bg }: {
  label: string; value: string; icon: string; color: string; bg: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
          <span className={`material-symbols-outlined text-[16px] ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>
        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide truncate">{label}</p>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}
