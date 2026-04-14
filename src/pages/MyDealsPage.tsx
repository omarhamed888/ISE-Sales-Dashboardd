import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMyDeals, updateDeal } from "@/lib/services/deals-service";

type Range = "month" | "week" | "all";

const RANGE_LABELS: Record<Range, string> = {
  month: "هذا الشهر",
  week: "الأسبوع",
  all: "الكل",
};

function formatNumber(n: number) {
  return n.toLocaleString();
}

export default function MyDealsPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("month");
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: "",
    adSource: "",
    programName: "",
    programCount: 1,
    dealValue: 0,
    firstContactDate: "",
    closeDate: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    getMyDeals(user.uid, user.name)
      .then(setDeals)
      .catch((e: unknown) => {
        console.error("Failed to load my deals:", e);
        setDeals([]);
        setError("تعذر تحميل صفقاتك حالياً. تأكد من الصلاحيات أو حاول مرة أخرى.");
      })
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

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 font-body" dir="rtl">
        <div className="bg-white rounded-2xl border border-red-200 py-12 text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[40px] text-red-500">error</span>
          <p className="text-base font-bold text-[#0F172A]">{error}</p>
        </div>
      </div>
    );
  }

  const startEdit = (deal: any) => {
    setSaveMsg(null);
    setEditingDealId(deal.id);
    setEditForm({
      customerName: deal.customerName || "",
      adSource: deal.adSource || "",
      programName: deal.programName || "",
      programCount: Number(deal.programCount) || 1,
      dealValue: Number(deal.dealValue) || 0,
      firstContactDate: deal.firstContactDate || "",
      closeDate: deal.closeDate || deal.date || "",
    });
  };

  const cancelEdit = () => {
    setEditingDealId(null);
    setIsSavingEdit(false);
  };

  const saveEdit = async () => {
    if (!editingDealId) return;
    setIsSavingEdit(true);
    setSaveMsg(null);
    try {
      await updateDeal(editingDealId, editForm);
      setDeals((prev) =>
        prev.map((d) => {
          if (d.id !== editingDealId) return d;
          let cycle: number | null = null;
          if (editForm.firstContactDate?.trim() && editForm.closeDate?.trim()) {
            const first = new Date(editForm.firstContactDate.trim());
            const close = new Date(editForm.closeDate.trim());
            if (!isNaN(first.getTime()) && !isNaN(close.getTime())) {
              cycle = Math.max(
                0,
                Math.round((close.getTime() - first.getTime()) / (1000 * 60 * 60 * 24))
              );
            }
          }
          return {
            ...d,
            customerName: editForm.customerName.trim(),
            adSource: editForm.adSource.trim(),
            programName: editForm.programName.trim(),
            programCount: Math.max(1, Number(editForm.programCount) || 1),
            dealValue: Math.max(0, Number(editForm.dealValue) || 0),
            firstContactDate: editForm.firstContactDate?.trim() || null,
            closingCycleDays: cycle,
          };
        })
      );
      setEditingDealId(null);
      setSaveMsg("تم تحديث الصفقة في قاعدة البيانات بنجاح");
    } catch (e) {
      console.error("Update deal failed:", e);
      setSaveMsg("فشل تحديث الصفقة. تأكد من الصلاحيات ثم حاول مرة أخرى.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 font-body" dir="rtl">
      <h1 className="text-2xl font-black text-[#1E293B]">💰 صفقاتي</h1>
      {saveMsg && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#334155]">
          {saveMsg}
        </div>
      )}

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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#2563EB] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">الصفقات</p>
            <span className="material-symbols-outlined text-[20px] text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
          </div>
          <p className="text-3xl font-black text-[#0F172A]">{filtered.length}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#10B981] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">الإيرادات</p>
            <span className="material-symbols-outlined text-[20px] text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
          </div>
          <p className="text-2xl font-black text-[#10B981]">{formatNumber(totalRevenue)} <span className="text-base font-bold">ج.م</span></p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#8B5CF6] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">متوسط الصفقة</p>
            <span className="material-symbols-outlined text-[20px] text-[#8B5CF6]" style={{ fontVariationSettings: "'FILL' 1" }}>calculate</span>
          </div>
          <p className="text-2xl font-black text-[#0F172A]">{formatNumber(avgDeal)} <span className="text-base font-bold text-[#64748B]">ج.م</span></p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#F59E0B] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">زمن الإغلاق</p>
            <span className="material-symbols-outlined text-[20px] text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
          </div>
          <p className="text-2xl font-black text-[#0F172A]">{avgCycle} <span className="text-base font-bold text-[#64748B]">يوم</span></p>
        </div>
      </div>

      {/* Deals List */}
      <div>
        <h3 className="text-base font-bold text-[#0F172A] mb-3">الصفقات</h3>
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] py-14 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[40px] text-[#CBD5E1]" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
            <p className="text-base font-bold text-[#0F172A]">لا توجد صفقات</p>
            <p className="text-sm text-[#64748B]">لا توجد صفقات مسجلة في هذه الفترة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((deal: any, i: number) => (
              <div key={deal.id} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-black text-sm shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#0F172A] text-sm truncate">{deal.customerName}</p>
                      <p className="text-xs text-[#64748B] mt-0.5 truncate">{deal.adSource}</p>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-black text-[#2563EB] text-base">{formatNumber(deal.dealValue)} <span className="text-xs font-bold">ج.م</span></p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{deal.closeDate ? new Date(deal.closeDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => startEdit(deal)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[#2563EB]/20 text-[#2563EB] hover:bg-[#EFF6FF]"
                  >
                    تعديل
                  </button>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {deal.programName && (
                    <span className="inline-block bg-[#F1F5F9] text-[#64748B] text-xs px-2.5 py-1 rounded-full font-bold border border-[#E2E8F0]">{deal.programName}</span>
                  )}
                  {typeof deal.closingCycleDays === 'number' && (
                    <span className="inline-block bg-[#EFF6FF] text-[#2563EB] text-xs px-2.5 py-1 rounded-full font-bold border border-[#2563EB]/10">{deal.closingCycleDays} يوم إغلاق</span>
                  )}
                </div>

                {editingDealId === deal.id && (
                  <div className="mt-4 border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC] space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        value={editForm.customerName}
                        onChange={(e) => setEditForm((p) => ({ ...p, customerName: e.target.value }))}
                        placeholder="اسم العميل"
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                      <input
                        value={editForm.adSource}
                        onChange={(e) => setEditForm((p) => ({ ...p, adSource: e.target.value }))}
                        placeholder="مصدر الإعلان"
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                      <input
                        value={editForm.programName}
                        onChange={(e) => setEditForm((p) => ({ ...p, programName: e.target.value }))}
                        placeholder="اسم البرنامج"
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min={1}
                        value={editForm.programCount}
                        onChange={(e) => setEditForm((p) => ({ ...p, programCount: Number(e.target.value) || 1 }))}
                        placeholder="عدد البرامج"
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        value={editForm.dealValue}
                        onChange={(e) => setEditForm((p) => ({ ...p, dealValue: Number(e.target.value) || 0 }))}
                        placeholder="قيمة الصفقة"
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                      <input
                        type="date"
                        value={editForm.firstContactDate}
                        onChange={(e) => setEditForm((p) => ({ ...p, firstContactDate: e.target.value }))}
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={isSavingEdit}
                        className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-bold disabled:opacity-50"
                      >
                        {isSavingEdit ? "جاري الحفظ..." : "حفظ التعديل"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isSavingEdit}
                        className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] text-sm font-bold"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
