import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { saveDeals } from "@/lib/services/deals-service";
import type { DealInput } from "@/lib/services/gemini-parser";
import { Link } from "react-router-dom";
import { ProductPicker } from "@/components/ProductPicker";
import { useCourses } from "@/lib/hooks/useCourses";
import { classifyDealCategory } from "@/lib/utils/normalize-course-names";
import { AdSelectDropdown } from "@/components/ads/AdSelectDropdown";

const emptyDeal = (): DealInput => ({
  customerName: "",
  adSource: "",
  programName: "",
  programCount: 1,
  dealValue: 0,
  firstContactDate: "",
  contactAttempts: 1,
  bookingType: "self_booking",
  closeDate: new Date().toISOString().split("T")[0],
  products: [],
  dealCategory: "core",
});

function formatNumber(n: number) {
  return n.toLocaleString('en-US');
}

export default function DealsPage() {
  const { user } = useAuth();
  const courses = useCourses();
  const [deals, setDeals] = useState<DealInput[]>([emptyDeal()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedDeals, setSavedDeals] = useState<DealInput[]>([]);

  const courseItems = useMemo(() => courses.reduce<Array<{ id: string; label: string }>>((acc, c) => {
    const key = c.name.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) return acc;
    if (acc.some((x) => x.label.trim().toLowerCase().replace(/\s+/g, " ") === key)) return acc;
    acc.push({ id: c.id, label: c.name });
    return acc;
  }, []), [courses]);
  const courseLabelMap = useMemo(() => new Map(courseItems.map((c) => [c.id, c.label])), [courseItems]);

  const totalRevenue = useMemo(() => deals.reduce((s, d) => s + (d.dealValue || 0), 0), [deals]);
  const avgDeal = useMemo(() => (deals.length > 0 ? Math.round(totalRevenue / deals.length) : 0), [deals.length, totalRevenue]);
  const avgCycle = useMemo(() => {
    const withDates = deals.filter(d => d.firstContactDate);
    if (!withDates.length) return 0;
    const sum = withDates.reduce((s, d) => {
      const closeDate = d.closeDate || new Date().toISOString().split("T")[0];
      const diff = Math.max(0, Math.round((new Date(closeDate).getTime() - new Date(d.firstContactDate).getTime()) / 86400000));
      return s + diff;
    }, 0);
    return Math.round(sum / withDates.length);
  }, [deals]);
  const avgAttempts = useMemo(() =>
    deals.length > 0
      ? (deals.reduce((s, d) => s + (Number(d.contactAttempts) || 0), 0) / deals.length).toFixed(1)
      : "0.0", [deals]);

  const updateDeal = useCallback((i: number, field: keyof DealInput, value: string | number | string[]) => {
    setDeals((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, [field]: value } : d))
    );
  }, []);

  const setDealProducts = useCallback((i: number, ids: string[]) => {
    setDeals((prev) =>
      prev.map((d, idx) => {
        if (idx !== i) return d;
        const next = { ...d, products: ids };
        if (ids.length > 0) {
          const labels = ids.map((id) => courseLabelMap.get(id)).filter((x): x is string => Boolean(x));
          next.programName = labels.join("، ");
          next.programCount = ids.length;
        } else {
          next.programName = "";
          next.programCount = 1;
        }
        next.dealCategory = classifyDealCategory(next);
        return next;
      })
    );
  }, [courseLabelMap]);

  const addDeal = useCallback(() => {
    setDeals(prev => [...prev, emptyDeal()]);
  }, []);

  const removeDeal = useCallback((i: number) => {
    setDeals(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  async function handleSave() {
    if (!user || deals.length === 0) return;
    const hasInvalidAttempts = deals.some(
      (d) => !Number.isFinite(Number(d.contactAttempts)) || Number(d.contactAttempts) < 1
    );
    if (hasInvalidAttempts) {
      alert("فضلاً أدخل عدد مرات التواصل لكل صفقة (رقم صحيح يبدأ من 1).");
      return;
    }
    setSaving(true);
    try {
      await saveDeals(deals, user.uid, user.name, user.teamName);
      setSavedDeals(deals);
      setSaved(true);
    } catch (e: any) {
      alert("فشل الحفظ: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 font-body" dir="rtl">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center space-y-6">
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-black text-[#1E293B]">تم حفظ {savedDeals.length} صفقات بنجاح!</h2>
          <div className="space-y-2 text-right">
            {savedDeals.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                <span className="font-bold text-[#1E293B]">{d.customerName}</span>
                <span className="text-[#64748B] text-sm">{d.adSource}</span>
                <span className="font-black text-[#2563EB]">{formatNumber(d.dealValue)} ج.م</span>
              </div>
            ))}
          </div>
          <div className="bg-[#EFF6FF] rounded-xl p-4">
            <p className="text-[#2563EB] font-black text-lg">إجمالي اليوم: {formatNumber(savedDeals.reduce((s, d) => s + d.dealValue, 0))} ج.م</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSaved(false); setDeals([emptyDeal()]); }}
              className="px-6 py-3 bg-[#2563EB] text-white font-bold rounded-xl hover:bg-[#1D4ED8] transition-colors"
            >
              إضافة صفقات أخرى
            </button>
            <Link
              to="/my-deals"
              className="px-6 py-3 bg-white border border-[#E2E8F0] text-[#1E293B] font-bold rounded-xl hover:bg-[#F8FAFC] transition-colors"
            >
              سجل صفقاتي
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 font-body" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#1E293B]">💰 الصفقات المغلقة</h1>
        <p className="text-[#64748B] text-sm mt-1">اختر تاريخ الإغلاق لكل صفقة بسهولة (الافتراضي: اليوم)</p>
      </div>

        <div className="space-y-4">
          {deals.map((deal, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-black shrink-0">
                    {i + 1}
                  </div>
                  <span className="font-bold text-[#0F172A] text-sm">صفقة {i + 1}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${classifyDealCategory(deal) === "side" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {classifyDealCategory(deal) === "side" ? "Side" : "Core"}
                  </span>
                </div>
                {deals.length > 1 && (
                  <button onClick={() => removeDeal(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-[#64748B] block mb-1">الاسم</label>
                  <input
                    value={deal.customerName}
                    onChange={e => updateDeal(i, "customerName", e.target.value)}
                    placeholder="اسم العميل"
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">المصدر</label>
                  <AdSelectDropdown
                    value={deal.adSource}
                    onChange={(name) => updateDeal(i, "adSource", name)}
                    placeholder="اختر إعلان أو اكتب المصدر..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-[#64748B] block mb-2">
                    المنتجات / الكورسات{" "}
                    <span className="text-[#94A3B8] font-normal">(اختياري — اختر من القائمة)</span>
                  </label>
                  <ProductPicker
                    selected={deal.products ?? []}
                    onChange={(ids) => setDealProducts(i, ids)}
                    items={courseItems}
                  />
                  {(!deal.products || deal.products.length === 0) && (
                    <p className="text-[11px] text-[#94A3B8] font-bold mt-2">
                      يمكنك ترك الاختيار فارغاً؛ سيُعرض «غير محدد» عند الحفظ.
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">المبلغ (ج.م)</label>
                  <input
                    type="number"
                    min={0}
                    value={deal.dealValue || ""}
                    onChange={e => updateDeal(i, "dealValue", parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">نوع الحجز</label>
                  <select
                    value={deal.bookingType ?? "self_booking"}
                    onChange={e => updateDeal(i, "bookingType", e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  >
                    <option value="self_booking">حجز ذاتي</option>
                    <option value="call_booking">حجز عبر مكالمة</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">
                    عدد مرات التواصل
                    <span className="text-[#94A3B8] font-normal mr-1">(إجباري)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={deal.contactAttempts || 1}
                    onChange={e => updateDeal(i, "contactAttempts", Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                  <p className="text-[11px] text-[#94A3B8] font-bold mt-1">
                    كل مكالمة أو متابعة واتساب/رسالة = محاولة واحدة.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">أول تواصل</label>
                  <input
                    type="date"
                    value={deal.firstContactDate}
                    onChange={e => updateDeal(i, "firstContactDate", e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">تاريخ الإغلاق</label>
                  <input
                    type="date"
                    value={deal.closeDate || new Date().toISOString().split("T")[0]}
                    onChange={e => updateDeal(i, "closeDate", e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addDeal}
            className="w-full py-3 border-2 border-dashed border-[#CBD5E1] text-[#64748B] font-bold rounded-xl hover:border-[#2563EB] hover:text-[#2563EB] transition-colors text-sm"
          >
            + إضافة صفقة
          </button>
        </div>

      {/* Summary */}
      {deals.length > 0 && (
        <div className="bg-gradient-to-r from-[#EFF6FF] to-[#F0FDF4] rounded-2xl border border-[#E2E8F0] p-5 space-y-2">
          <h3 className="font-black text-[#1E293B] text-sm mb-3">ملخص</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 text-center border border-[#E2E8F0]">
              <p className="text-xs text-[#64748B] font-bold">عدد الصفقات</p>
              <p className="text-xl font-black text-[#1E293B]">{deals.length}</p>
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
            <div className="bg-white rounded-lg p-3 text-center border border-[#E2E8F0] col-span-2">
              <p className="text-xs text-[#64748B] font-bold">متوسط مرات التواصل</p>
              <p className="text-xl font-black text-[#1E293B]">{avgAttempts}</p>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || deals.length === 0}
        className="w-full py-4 bg-[#2563EB] text-white font-black rounded-2xl hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-base flex items-center justify-center gap-3 shadow-lg shadow-[#2563EB]/20 hover:shadow-xl hover:shadow-[#2563EB]/30 hover:-translate-y-0.5"
      >
        {saving ? (
          <><span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block" /> جاري الحفظ...</>
        ) : (
          <>
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            حفظ الصفقات
          </>
        )}
      </button>
    </div>
  );
}
