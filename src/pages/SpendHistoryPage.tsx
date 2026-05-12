import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import {
  getMyAdSpend,
  getAllAdSpend,
  deleteAdSpendEntry,
} from "@/lib/services/ad-spend-service";
import type { AdSpendEntry } from "@/lib/types";

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "فيسبوك",
  instagram: "إنستجرام",
  tiktok: "تيك توك",
  messenger: "ماسنجر",
  whatsapp: "واتساب",
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "bg-blue-50 text-blue-700 border-blue-200",
  instagram: "bg-pink-50 text-pink-700 border-pink-200",
  tiktok: "bg-black/5 text-black border-black/10",
  messenger: "bg-cyan-50 text-cyan-700 border-cyan-200",
  whatsapp: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysSince(dateStr: string): number {
  const d1 = new Date(dateStr);
  const d2 = new Date();
  return Math.floor((d2.getTime() - d1.getTime()) / 86400000);
}

export default function SpendHistoryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<AdSpendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterBuyer, setFilterBuyer] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    const fetcher = isAdmin ? getAllAdSpend() : getMyAdSpend(user.uid, 60);
    fetcher
      .then((data) => { if (!cancelled) setEntries(data); })
      .catch(() => { if (!cancelled) setEntries([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, isAdmin]);

  const allBuyers = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => { if (e.mediaBuyerName) set.add(e.mediaBuyerName); });
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterPlatform !== "all" && e.platform !== filterPlatform) return false;
      if (filterBuyer !== "all" && e.mediaBuyerName !== filterBuyer) return false;
      return true;
    });
  }, [entries, filterPlatform, filterBuyer]);

  const totals = useMemo(() => {
    let spend = 0, leads = 0;
    filtered.forEach((e) => { spend += e.spend || 0; leads += e.leadsReported || 0; });
    return { spend, leads, cpl: leads > 0 ? spend / leads : 0 };
  }, [filtered]);

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`حذف سجل "${label}" نهائياً؟`)) return;
    setDeletingId(id);
    try {
      await deleteAdSpendEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      showToast("success", "تم الحذف بنجاح");
    } catch (e: any) {
      showToast("error", e?.message || "تعذر الحذف. الـ Super Admin فقط يقدر يحذف.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-[1300px] mx-auto pb-20" dir="rtl">
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-[22px] md:text-[28px] font-black text-[#1E293B] mb-1">
            {isAdmin ? "سجل مصروفات الإعلانات (الكل)" : "سجل مصروفاتي"}
          </h1>
          <p className="text-[13px] font-bold text-[#64748B]">
            عرض كل السجلات. آخر 7 أيام قابلة للتعديل من شاشة الإدخال.
          </p>
        </div>
        <Link
          to="/spend-entry"
          className="bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-[13px] font-black hover:bg-[#1D4ED8] flex items-center gap-2 self-start"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          إدخال جديد
        </Link>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 border-r-4 border-r-[#10B981]">
          <p className="text-xs font-semibold text-[#64748B] uppercase">إجمالي المصروف</p>
          <p className="text-3xl font-black text-[#0F172A] mt-1">{totals.spend.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-[#94A3B8] mt-1">جنيه</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 border-r-4 border-r-[#2563EB]">
          <p className="text-xs font-semibold text-[#64748B] uppercase">إجمالي Leads</p>
          <p className="text-3xl font-black text-[#0F172A] mt-1">{totals.leads.toLocaleString('en-US')}</p>
          <p className="text-xs text-[#94A3B8] mt-1">من المنصات</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 border-r-4 border-r-[#F59E0B]">
          <p className="text-xs font-semibold text-[#64748B] uppercase">CPL متوسط</p>
          <p className="text-3xl font-black text-[#0F172A] mt-1">{totals.cpl > 0 ? totals.cpl.toFixed(2) : '—'}</p>
          <p className="text-xs text-[#94A3B8] mt-1">جنيه/lead</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
        >
          <option value="all">كل المنصات</option>
          {Object.entries(PLATFORM_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {isAdmin && allBuyers.length > 1 && (
          <select
            value={filterBuyer}
            onChange={(e) => setFilterBuyer(e.target.value)}
            className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
          >
            <option value="all">كل الميديا باير</option>
            {allBuyers.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#64748B] font-bold text-sm">جاري تحميل البيانات...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[40px] text-[#CBD5E1] block mb-3">history</span>
            <p className="text-base font-bold text-[#0F172A] mb-1">لا توجد سجلات بعد</p>
            <p className="text-sm text-[#64748B]">ابدأ بإدخال مصروف اليوم.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[13px]">
              <thead className="bg-[#F7F9FC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="p-3 font-bold text-[#64748B] text-xs">التاريخ</th>
                  <th className="p-3 font-bold text-[#64748B] text-xs">الإعلان</th>
                  <th className="p-3 font-bold text-[#64748B] text-xs">المنصة</th>
                  {isAdmin && <th className="p-3 font-bold text-[#64748B] text-xs">الميديا باير</th>}
                  <th className="p-3 font-bold text-[#64748B] text-xs text-center">المصروف</th>
                  <th className="p-3 font-bold text-[#64748B] text-xs text-center">Leads</th>
                  <th className="p-3 font-bold text-[#64748B] text-xs text-center">CPL</th>
                  <th className="p-3 font-bold text-[#64748B] text-xs">المصدر</th>
                  <th className="p-3 font-bold text-[#64748B] text-xs text-center w-16">حذف</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const cpl = e.leadsReported > 0 ? (e.spend / e.leadsReported).toFixed(2) : '—';
                  const editable = daysSince(e.date) <= 7;
                  return (
                    <tr key={e.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC]/50">
                      <td className="p-3 font-black text-[#1E293B]">
                        <div className="flex flex-col">
                          <span>{e.date}</span>
                          {editable && <span className="text-[9px] font-bold text-emerald-600">قابل للتعديل</span>}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-[#1E293B]">{e.adName}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${PLATFORM_COLORS[e.platform] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          {PLATFORM_LABELS[e.platform] || e.platform}
                        </span>
                      </td>
                      {isAdmin && <td className="p-3 text-[12px] text-[#64748B] font-bold">{e.mediaBuyerName}</td>}
                      <td className="p-3 text-center font-black text-[#1E293B]">{e.spend.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                      <td className="p-3 text-center font-bold text-[#1E293B]">{e.leadsReported}</td>
                      <td className="p-3 text-center font-bold text-amber-700">{cpl}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${e.source === "meta_api" ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700"}`}>
                          {e.source === "meta_api" ? "Meta API" : "يدوي"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {user.role === "superadmin" ? (
                          <button
                            onClick={() => handleDelete(e.id, `${e.adName} - ${e.date}`)}
                            disabled={deletingId === e.id}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg disabled:opacity-50"
                            title="حذف"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {deletingId === e.id ? "progress_activity" : "delete"}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#94A3B8]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
