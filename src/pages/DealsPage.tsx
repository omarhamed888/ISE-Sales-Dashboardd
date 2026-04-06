import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { parseDealsFromText, saveDeals, type DealInput } from "@/lib/services/deals-service";
import { Link } from "react-router-dom";

const emptyDeal = (): DealInput => ({
  customerName: "",
  adSource: "",
  programName: "",
  programCount: 1,
  dealValue: 0,
  firstContactDate: "",
});

type Tab = "text" | "manual";
type PageState = "form" | "success";

export default function DealsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("text");
  const [pageState, setPageState] = useState<PageState>("form");

  // Text tab
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  // Manual tab
  const [manualDeals, setManualDeals] = useState<DealInput[]>([emptyDeal()]);

  // Shared
  const [deals, setDeals] = useState<DealInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const totalRevenue = deals.reduce((s, d) => s + (d.dealValue || 0), 0);
  const avgDeal = deals.length > 0 ? Math.round(totalRevenue / deals.length) : 0;

  async function handleParseText() {
    if (!rawText.trim()) return;
    setParsing(true);
    setParseError("");
    try {
      const result = await parseDealsFromText(rawText);
      setDeals(result.deals || []);
    } catch (e: any) {
      setParseError("فشل التحليل: " + (e.message || "خطأ غير معروف"));
    } finally {
      setParsing(false);
    }
  }

  function updateManualDeal(index: number, field: keyof DealInput, value: string | number) {
    setManualDeals((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeManualDeal(index: number) {
    setManualDeals((prev) => prev.filter((_, i) => i !== index));
  }

  function addManualDeal() {
    setManualDeals((prev) => [...prev, emptyDeal()]);
  }

  function getActiveDeals(): DealInput[] {
    return tab === "text" ? deals : manualDeals.filter((d) => d.customerName.trim());
  }

  const activeDeals = getActiveDeals();
  const activeRevenue = activeDeals.reduce((s, d) => s + (d.dealValue || 0), 0);
  const activeAvg = activeDeals.length > 0 ? Math.round(activeRevenue / activeDeals.length) : 0;

  async function handleSave() {
    if (!user) return;
    const toSave = getActiveDeals();
    if (toSave.length === 0) return;
    setSaving(true);
    setSaveError("");
    try {
      await saveDeals(toSave, user.uid, user.name || "");
      setDeals(toSave);
      setPageState("success");
    } catch (e: any) {
      setSaveError("فشل الحفظ: " + (e.message || "خطأ غير معروف"));
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setPageState("form");
    setRawText("");
    setDeals([]);
    setManualDeals([emptyDeal()]);
    setParseError("");
    setSaveError("");
    setTab("text");
  }

  if (pageState === "success") {
    return (
      <div className="max-w-xl mx-auto mt-12 p-8 bg-white rounded-2xl shadow-sm border border-[#E2E8F0] text-right" dir="rtl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-xl font-extrabold text-[#1E293B]">تم حفظ {deals.length} صفقات بنجاح!</h2>
        </div>
        <div className="space-y-3 mb-6">
          {deals.map((d, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B]">{d.adSource}</span>
              <span className="font-bold text-[#1E293B]">{d.customerName}</span>
              <span className="text-[#2563EB] font-bold">{d.dealValue.toLocaleString()} ج.م</span>
            </div>
          ))}
        </div>
        <div className="text-center font-bold text-[#2563EB] text-lg mb-6">
          إجمالي اليوم: {deals.reduce((s, d) => s + d.dealValue, 0).toLocaleString()} ج.م
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-[#1D4ED8] transition-colors"
          >
            إضافة صفقات جديدة
          </button>
          <Link
            to="/my-deals"
            className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[#64748B] font-bold text-sm text-center hover:bg-[#F8FAFC] transition-colors"
          >
            عرض كل صفقاتي
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 font-body" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#1E293B]">💰 الصفقات المغلقة</h1>
        <p className="text-sm text-[#64748B] mt-1">الإضافة التلقائية للتاريخ: اليوم</p>
      </div>

      {/* Tab Switch */}
      <div className="flex gap-1 p-1 bg-[#F1F5F9] rounded-xl w-fit">
        <button
          onClick={() => setTab("text")}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "text" ? "bg-white shadow-sm text-[#1E293B]" : "text-[#64748B]"}`}
        >
          📋 نص حر
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "manual" ? "bg-white shadow-sm text-[#1E293B]" : "text-[#64748B]"}`}
        >
          📝 إدخال يدوي
        </button>
      </div>

      {/* Text Tab */}
      {tab === "text" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={"الصق الصفقات هنا...\n\n💰 الصفقات المغلقة: 3\n\n1)\nالاسم: محمد علي\nالمصدر: اعلان فيديو...\n..."}
            rows={10}
            className="w-full p-4 border border-[#E2E8F0] rounded-xl text-sm text-[#1E293B] resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 placeholder:text-[#CBD5E1]"
          />
          {parseError && <p className="text-red-500 text-sm font-bold">{parseError}</p>}
          <button
            onClick={handleParseText}
            disabled={parsing || !rawText.trim()}
            className="w-full py-3 bg-[#2563EB] text-white font-bold rounded-xl text-sm hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {parsing ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                جاري التحليل...
              </>
            ) : "تحليل الصفقات"}
          </button>

          {deals.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-[#64748B]">الصفقات المستخرجة ({deals.length})</p>
              {deals.map((d, i) => (
                <div key={i} className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-sm">
                  <div className="flex justify-between font-bold text-[#1E293B]">
                    <span>{d.customerName}</span>
                    <span className="text-[#2563EB]">{d.dealValue.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-[#64748B] text-xs mt-1">
                    <span>{d.programName} ({d.programCount})</span>
                    <span>{d.adSource}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Tab */}
      {tab === "manual" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
          {manualDeals.map((deal, i) => (
            <div key={i} className="p-4 border border-[#E2E8F0] rounded-xl space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#64748B]">صفقة {i + 1}</span>
                {manualDeals.length > 1 && (
                  <button
                    onClick={() => removeManualDeal(i)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#64748B] font-bold mb-1">الاسم</label>
                  <input
                    value={deal.customerName}
                    onChange={(e) => updateManualDeal(i, "customerName", e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                    placeholder="محمد علي"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#64748B] font-bold mb-1">المصدر</label>
                  <input
                    value={deal.adSource}
                    onChange={(e) => updateManualDeal(i, "adSource", e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                    placeholder="اعلان فيديو AI"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#64748B] font-bold mb-1">البرنامج</label>
                  <input
                    value={deal.programName}
                    onChange={(e) => updateManualDeal(i, "programName", e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                    placeholder="AI Diploma"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#64748B] font-bold mb-1">عدد البرامج</label>
                  <input
                    type="number"
                    min={1}
                    value={deal.programCount}
                    onChange={(e) => updateManualDeal(i, "programCount", parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#64748B] font-bold mb-1">المبلغ (ج.م)</label>
                  <input
                    type="number"
                    min={0}
                    value={deal.dealValue || ""}
                    onChange={(e) => updateManualDeal(i, "dealValue", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                    placeholder="8000"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#64748B] font-bold mb-1">أول تواصل</label>
                  <input
                    type="date"
                    value={deal.firstContactDate}
                    onChange={(e) => updateManualDeal(i, "firstContactDate", e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addManualDeal}
            className="w-full py-2.5 border-2 border-dashed border-[#E2E8F0] rounded-xl text-sm font-bold text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
          >
            + إضافة صفقة
          </button>
        </div>
      )}

      {/* Summary */}
      {activeDeals.length > 0 && (
        <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-5">
          <h3 className="font-bold text-[#1E293B] mb-3">ملخص</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-extrabold text-[#2563EB]">{activeDeals.length}</p>
              <p className="text-xs text-[#64748B] font-bold mt-1">عدد الصفقات</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#2563EB]">{activeRevenue.toLocaleString()}</p>
              <p className="text-xs text-[#64748B] font-bold mt-1">إجمالي الإيرادات ج.م</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#2563EB]">{activeAvg.toLocaleString()}</p>
              <p className="text-xs text-[#64748B] font-bold mt-1">متوسط الصفقة ج.م</p>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      {saveError && <p className="text-red-500 text-sm font-bold text-center">{saveError}</p>}
      <button
        onClick={handleSave}
        disabled={saving || activeDeals.length === 0}
        className="w-full py-3.5 bg-[#2563EB] text-white font-extrabold rounded-xl hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
      >
        {saving ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            جاري الحفظ...
          </>
        ) : (
          <>✅ تأكيد وحفظ الصفقات</>
        )}
      </button>
    </div>
  );
}
