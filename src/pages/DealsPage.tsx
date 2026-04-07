import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { parseDeals } from "@/lib/services/gemini-parser";
import { saveDeals } from "@/lib/services/deals-service";
import type { DealInput } from "@/lib/services/gemini-parser";
import { Link } from "react-router-dom";

type Tab = "text" | "manual";

const emptyDeal = (): DealInput => ({
  customerName: "",
  adSource: "",
  programName: "",
  programCount: 1,
  dealValue: 0,
  firstContactDate: "",
});

function formatNumber(n: number) {
  return n.toLocaleString("ar-EG");
}

export default function DealsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("text");
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [deals, setDeals] = useState<DealInput[]>([emptyDeal()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedDeals, setSavedDeals] = useState<DealInput[]>([]);

  const today = new Date().toISOString().split("T")[0];

  const totalRevenue = deals.reduce((s, d) => s + (d.dealValue || 0), 0);
  const avgDeal = deals.length > 0 ? Math.round(totalRevenue / deals.length) : 0;
  const avgCycle = (() => {
    const withDates = deals.filter(d => d.firstContactDate);
    if (!withDates.length) return 0;
    const sum = withDates.reduce((s, d) => {
      const diff = Math.max(0, Math.round((new Date(today).getTime() - new Date(d.firstContactDate).getTime()) / 86400000));
      return s + diff;
    }, 0);
    return Math.round(sum / withDates.length);
  })();

  async function handleParse() {
    if (!rawText.trim()) return;
    setParsing(true);
    setParseError("");
    try {
      const result = await parseDeals(rawText);
      if (result.deals.length > 0) {
        setDeals(result.deals);
        setTab("manual");
      } else {
        setParseError("لم يتم العثور على صفقات في النص.");
      }
    } catch (e: any) {
      setParseError("فشل التحليل: " + e.message);
    } finally {
      setParsing(false);
    }
  }

  function updateDeal(i: number, field: keyof DealInput, value: string | number) {
    setDeals(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  }

  function addDeal() {
    setDeals(prev => [...prev, emptyDeal()]);
  }

  function removeDeal(i: number) {
    setDeals(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!user || deals.length === 0) return;
    setSaving(true);
    try {
      await saveDeals(deals, user.uid, user.name);
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
              onClick={() => { setSaved(false); setDeals([emptyDeal()]); setRawText(""); setTab("text"); }}
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
        <p className="text-[#64748B] text-sm mt-1">تاريخ الإغلاق التلقائي: {today}</p>
      </div>

      {/* Tabs */}
      <div className="bg-[#F8FAFC] rounded-xl p-1 flex gap-1">
        <button
          onClick={() => setTab("text")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === "text" ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B] hover:text-[#1E293B]"}`}
        >
          نص حر
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === "manual" ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B] hover:text-[#1E293B]"}`}
        >
          إدخال يدوي
        </button>
      </div>

      {/* Tab: Free Text */}
      {tab === "text" && (
        <div className="space-y-4">
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={"الصق الصفقات هنا...\n\n💰 الصفقات المغلقة: 3\n\n1)\nالاسم: محمد علي\nالمصدر: اعلان فيديو...\n..."}
            className="w-full h-56 rounded-xl border border-[#E2E8F0] p-4 text-sm text-[#1E293B] resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
          />
          {parseError && <p className="text-red-500 text-sm">{parseError}</p>}
          <button
            onClick={handleParse}
            disabled={parsing || !rawText.trim()}
            className="w-full py-3 bg-[#2563EB] text-white font-bold rounded-xl hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {parsing ? (
              <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" /> جاري التحليل...</>
            ) : "استخراج الصفقات"}
          </button>
        </div>
      )}

      {/* Tab: Manual */}
      {tab === "manual" && (
        <div className="space-y-4">
          {deals.map((deal, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1E293B] text-sm">صفقة {i + 1}</span>
                {deals.length > 1 && (
                  <button onClick={() => removeDeal(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
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
                  <input
                    value={deal.adSource}
                    onChange={e => updateDeal(i, "adSource", e.target.value)}
                    placeholder="الإعلان / المصدر"
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">البرنامج</label>
                  <input
                    value={deal.programName}
                    onChange={e => updateDeal(i, "programName", e.target.value)}
                    placeholder="اسم البرنامج"
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] block mb-1">عدد البرامج</label>
                  <input
                    type="number"
                    min={1}
                    value={deal.programCount}
                    onChange={e => updateDeal(i, "programCount", parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
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
                  <label className="text-xs font-bold text-[#64748B] block mb-1">أول تواصل</label>
                  <input
                    type="date"
                    value={deal.firstContactDate}
                    onChange={e => updateDeal(i, "firstContactDate", e.target.value)}
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
      )}

      {/* Summary */}
      {(tab === "manual" || deals.some(d => d.dealValue > 0)) && (
        <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-5 space-y-2">
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
          </div>
        </div>
      )}

      {/* Save Button */}
      {tab === "manual" && (
        <button
          onClick={handleSave}
          disabled={saving || deals.length === 0}
          className="w-full py-4 bg-[#2563EB] text-white font-black rounded-xl hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base flex items-center justify-center gap-2"
        >
          {saving ? (
            <><span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block" /> جاري الحفظ...</>
          ) : "حفظ الصفقات"}
        </button>
      )}
    </div>
  );
}
