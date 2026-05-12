import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllAdSpend } from "@/lib/services/ad-spend-service";
import type { AdSpendEntry } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

interface PerBuyer {
  id: string;
  name: string;
  email: string;
  spentToday: boolean;
  spentYesterday: boolean;
  weekSpend: number;
  weekLeads: number;
  monthSpend: number;
  weekCpl: number;
  lastEntryDate?: string;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MediaBuyersTab({ users }: { users: User[] }) {
  const [spend, setSpend] = useState<AdSpendEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllAdSpend()
      .then((s) => { if (!cancelled) setSpend(s); })
      .catch(() => { if (!cancelled) setSpend([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const buyers = useMemo(() => users.filter((u) => u.role === "media_buyer"), [users]);

  const today = todayStr();
  const yesterday = yesterdayStr();
  const weekAgo = daysAgoStr(7);
  const monthAgo = daysAgoStr(30);

  const perBuyerStats: PerBuyer[] = useMemo(() => {
    return buyers.map((b) => {
      const mine = spend.filter((s) => s.mediaBuyerId === b.id);
      const todayEntries = mine.filter((e) => e.date === today);
      const yesterdayEntries = mine.filter((e) => e.date === yesterday);
      const weekEntries = mine.filter((e) => e.date >= weekAgo);
      const monthEntries = mine.filter((e) => e.date >= monthAgo);

      const weekSpend = weekEntries.reduce((s, e) => s + (Number(e.spend) || 0), 0);
      const weekLeads = weekEntries.reduce((s, e) => s + (Number(e.leadsReported) || 0), 0);
      const monthSpend = monthEntries.reduce((s, e) => s + (Number(e.spend) || 0), 0);
      const weekCpl = weekLeads > 0 ? weekSpend / weekLeads : 0;
      const lastEntry = mine.reduce<string | undefined>((latest, e) => {
        if (!latest || e.date > latest) return e.date;
        return latest;
      }, undefined);

      return {
        id: b.id,
        name: b.name || "بدون اسم",
        email: b.email || "",
        spentToday: todayEntries.length > 0,
        spentYesterday: yesterdayEntries.length > 0,
        weekSpend,
        weekLeads,
        monthSpend,
        weekCpl,
        lastEntryDate: lastEntry,
      };
    });
  }, [buyers, spend, today, yesterday, weekAgo, monthAgo]);

  if (loading) {
    return <Skeleton className="h-[400px] rounded-2xl" />;
  }

  if (buyers.length === 0) {
    return (
      <EmptyState
        variant="getting-started"
        icon="campaign"
        title="لا يوجد ميديا باير في الفريق بعد"
        description="ابدأ بإضافة media buyer من شاشة 'إضافة موظف' أعلى الصفحة، اختر الدور 'ميديا باير'."
      />
    );
  }

  // Aggregates across all buyers
  const totalWeekSpend = perBuyerStats.reduce((s, b) => s + b.weekSpend, 0);
  const totalWeekLeads = perBuyerStats.reduce((s, b) => s + b.weekLeads, 0);
  const submittedToday = perBuyerStats.filter((b) => b.spentToday).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <SummaryCard label="عدد الميديا باير" value={String(buyers.length)} icon="group" color="text-[#2563EB]" bg="bg-[#EFF6FF]" />
        <SummaryCard label="رفعوا اليوم" value={`${submittedToday}/${buyers.length}`} icon="check_circle" color="text-emerald-600" bg="bg-emerald-50" />
        <SummaryCard label="مصروف الأسبوع" value={`${totalWeekSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })} ج`} icon="payments" color="text-[#F59E0B]" bg="bg-[#FFFBEB]" />
        <SummaryCard label="Leads الأسبوع" value={String(totalWeekLeads)} icon="trending_up" color="text-[#8B5CF6]" bg="bg-[#F5F3FF]" />
      </div>

      {/* Per-buyer table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0]">
          <h3 className="text-[14px] font-black text-[#1E293B] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#F59E0B]">campaign</span>
            تفاصيل الميديا باير
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[13px]">
            <thead className="bg-[#F7F9FC] border-b border-[#E2E8F0]">
              <tr>
                <th className="p-3 font-bold text-[#64748B] text-xs">الاسم</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">اليوم</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">الأمس</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">CPL أسبوع</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">مصروف أسبوع</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">مصروف شهر</th>
                <th className="p-3 font-bold text-[#64748B] text-xs text-center">آخر إدخال</th>
                <th className="p-3 font-bold text-[#64748B] text-xs"></th>
              </tr>
            </thead>
            <tbody>
              {perBuyerStats.map((b) => (
                <tr key={b.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC]/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">
                        {b.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-[#1E293B]">{b.name}</span>
                        {b.email && <span className="text-[10px] font-bold text-[#94A3B8]">{b.email}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {b.spentToday ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full border border-emerald-200">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        دخل
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[10px] font-black px-2 py-1 rounded-full border border-red-200">
                        <span className="material-symbols-outlined text-[12px]">cancel</span>
                        لا
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {b.spentYesterday ? (
                      <span className="text-emerald-600 font-black">✓</span>
                    ) : (
                      <span className="text-red-500 font-black">✗</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-black text-amber-700">
                    {b.weekCpl > 0 ? `${b.weekCpl.toFixed(1)} ج` : '—'}
                  </td>
                  <td className="p-3 text-center font-bold text-[#1E293B]">
                    {b.weekSpend > 0 ? `${b.weekSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })} ج` : '—'}
                  </td>
                  <td className="p-3 text-center font-bold text-[#1E293B]">
                    {b.monthSpend > 0 ? `${b.monthSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })} ج` : '—'}
                  </td>
                  <td className="p-3 text-center text-[11px] text-[#64748B]">
                    {b.lastEntryDate || '—'}
                  </td>
                  <td className="p-3 text-center">
                    <Link
                      to="/spend-history"
                      className="text-[#2563EB] hover:underline text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      عرض
                      <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[11px] text-[#94A3B8] text-center">
        لرؤية تحليل ROI كامل، افتح <Link to="/marketing-insights" className="text-[#2563EB] hover:underline font-bold">صفحة تحليل التسويق</Link>.
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color, bg }: { label: string; value: string; icon: string; color: string; bg: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
          <span className={`material-symbols-outlined text-[16px] ${color}`}>{icon}</span>
        </div>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}
