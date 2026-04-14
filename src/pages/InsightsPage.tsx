import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useInsightsReports } from "@/lib/hooks/useDataFetching";
import {
  generateAIInsights,
  type AIInsightsResult,
  type InsightPeriod,
} from "@/lib/services/ai-insights-service";
import {
  deleteInsight,
  getSavedInsights,
  saveInsightToFirestore,
  type SavedInsightReport,
} from "@/lib/services/insights-firestore";
import {
  getDateFromYmd,
  getPeriodLabel,
  getTodayYmd,
} from "@/lib/utils/insights-period";
import { InsightResultPanel } from "@/components/insights/InsightResultPanel";
import { SavedInsightsList } from "@/components/insights/SavedInsightsList";
import { format } from "date-fns";
import { arEG } from "date-fns/locale/ar-EG";

function formatArabicDate(d: Date): string {
  return format(d, "PPP", { locale: arEG });
}

function savedToResult(saved: SavedInsightReport): AIInsightsResult {
  return {
    period: saved.period,
    periodLabel: saved.periodLabel,
    dateFrom: saved.dateFrom,
    dateTo: saved.dateTo,
    criticalIssues: saved.criticalIssues,
    positivePoints: saved.positivePoints,
    recommendations: saved.recommendations,
    summary: saved.summary,
    generatedAt: saved.savedAt,
    dataSnapshot: saved.dataSnapshot,
  };
}

const PERIODS: { id: InsightPeriod; label: string }[] = [
  { id: "today", label: "اليوم" },
  { id: "week", label: "الأسبوع" },
  { id: "month", label: "الشهر" },
  { id: "all", label: "الإجمالي" },
];

export default function InsightsPage() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<InsightPeriod>("week");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AIInsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportName, setReportName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedInsightReport[]>([]);
  const [saveBanner, setSaveBanner] = useState<"ok" | "err" | null>(null);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);

  const { reports, loading: reportsLoading } = useInsightsReports(selectedPeriod);
  const periodLabel = getPeriodLabel(selectedPeriod);
  const dateFrom = getDateFromYmd(selectedPeriod);
  const dateTo = getTodayYmd();

  const loadSavedInsights = useCallback(async () => {
    try {
      const list = await getSavedInsights(20);
      setSavedReports(list);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    void loadSavedInsights();
  }, [loadSavedInsights]);

  useEffect(() => {
    setResult(null);
    setError(null);
    setSelectedSavedId(null);
  }, [selectedPeriod]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSelectedSavedId(null);
    setSaveBanner(null);

    const res = await generateAIInsights({
      period: selectedPeriod,
      periodLabel,
      dateFrom,
      dateTo,
      reports,
    });

    if (res.ok) {
      setResult(res.data);
      setReportName(`تقرير ${res.data.periodLabel} - ${formatArabicDate(new Date())}`);
    } else {
      const messages: Record<typeof res.code, string> = {
        no_reports: "لا توجد تقارير في هذه الفترة",
        low_data: "البيانات غير كافية للتحليل (أقل من 10 رسائل إجمالاً)",
        rate_limited: "يرجى الانتظار دقيقة بين كل تحليل بالذكاء الاصطناعي",
        no_api_key: "مفتاح Gemini غير مضبوط (VITE_GEMINI_API_KEY)",
        gemini_failed: "تعذر الاتصال بخدمة التحليل. حاول مرة أخرى.",
        bad_json: "تعذر قراءة نتيجة التحليل. حاول مرة أخرى.",
      };
      setError(messages[res.code]);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!result || !reportName.trim() || !user) return;
    setIsSaving(true);
    setSaveBanner(null);
    try {
      await saveInsightToFirestore({
        name: reportName.trim(),
        period: result.period,
        periodLabel: result.periodLabel,
        dateFrom: result.dateFrom,
        dateTo: result.dateTo,
        summary: result.summary,
        criticalIssues: result.criticalIssues,
        positivePoints: result.positivePoints,
        recommendations: result.recommendations,
        dataSnapshot: result.dataSnapshot,
        savedBy: user.uid,
        savedByName: user.name,
      });
      await loadSavedInsights();
      setSaveBanner("ok");
    } catch {
      setSaveBanner("err");
    }
    setIsSaving(false);
  };

  const openSavedInsight = (report: SavedInsightReport) => {
    setResult(savedToResult(report));
    setReportName(report.name);
    setSelectedSavedId(report.id);
    setError(null);
    setSaveBanner(null);
  };

  const handleDeleteSaved = async (id: string) => {
    if (!window.confirm("حذف هذا التقرير المحفوظ؟")) return;
    try {
      await deleteInsight(id);
      if (selectedSavedId === id) {
        setResult(null);
        setSelectedSavedId(null);
      }
      await loadSavedInsights();
    } catch (e) {
      console.error(e);
    }
  };

  const showEmptyPeriod = !reportsLoading && reports.length === 0;

  return (
    <div className="max-w-[1500px] w-full mx-auto pb-20 px-2" dir="rtl">
      <div
        className="mb-6 flex flex-wrap gap-2 p-1 bg-[#F1F5F9] rounded-xl w-fit"
        role="tablist"
        aria-label="الفترة"
      >
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={selectedPeriod === p.id}
            onClick={() => setSelectedPeriod(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              selectedPeriod === p.id
                ? "bg-white text-[#2563EB] shadow-sm"
                : "text-[#64748B] hover:text-[#1E293B]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 mb-8 shadow-sm">
        <p className="text-[#64748B] text-sm mb-4 text-right">
          {reportsLoading
            ? "جاري تحميل التقارير..."
            : `${reports.length} تقرير متاح في فترة ${periodLabel}`}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading || reportsLoading || reports.length === 0}
          className="w-full sm:w-auto bg-[#2563EB] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto sm:mx-0"
        >
          {isLoading ? "⏳ جاري التحليل..." : "🤖 تحليل البيانات بالذكاء الاصطناعي"}
        </button>
        <p className="text-xs text-[#94A3B8] mt-2 text-right">
          بناءً على {reports.length} تقرير من {periodLabel} ({dateFrom} → {dateTo})
        </p>
      </div>

      <div aria-live="polite" className="sr-only">
        {saveBanner === "ok" && "تم حفظ التقرير"}
        {saveBanner === "err" && "فشل الحفظ"}
      </div>
      {saveBanner === "ok" && (
        <p className="text-emerald-600 text-sm font-bold mb-4 text-right">تم حفظ التقرير بنجاح</p>
      )}
      {saveBanner === "err" && (
        <p className="text-red-600 text-sm font-bold mb-4 text-right">تعذر حفظ التقرير</p>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center animate-pulse">
            <span className="text-3xl">🤖</span>
          </div>
          <p className="text-[#475569] font-medium">جاري تحليل البيانات...</p>
          <p className="text-[#94A3B8] text-sm">
            Gemini يدرس {reports.length} تقرير من {periodLabel}
          </p>
          <div className="flex gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-[#3B82F6] rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && error && (
        error === "مفتاح Gemini غير مضبوط (VITE_GEMINI_API_KEY)" ? (
          /* ── no_api_key: admin setup card ── */
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-8 max-w-xl mx-auto text-right" dir="rtl">
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-[#FFF7ED] rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px] text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
              </div>
              <h3 className="text-[18px] font-black text-[#1E293B] text-center">تحليل الذكاء الاصطناعي غير متاح حالياً</h3>
              <p className="text-[13px] text-[#64748B] font-bold text-center">مفتاح Gemini API غير مضبوط في البيئة</p>
            </div>
            <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-5 space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-[11px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <p className="text-[13px] font-bold text-[#334155]">
                  احصل على مفتاح API من{" "}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] underline">Google AI Studio</a>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-[11px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-[#334155] mb-2">أضف المتغير في ملف <code className="bg-[#E2E8F0] px-1.5 py-0.5 rounded text-[11px]">.env.local</code></p>
                  <div className="flex items-center gap-2 bg-[#1E293B] rounded-lg px-3 py-2">
                    <code className="text-[11px] text-emerald-400 flex-1 font-mono" dir="ltr">VITE_GEMINI_API_KEY_1=your_key_here</code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText("VITE_GEMINI_API_KEY_1=your_key_here")}
                      className="text-[#94A3B8] hover:text-white transition-colors flex-shrink-0"
                      title="نسخ"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-[11px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <p className="text-[13px] font-bold text-[#334155]">أعد تشغيل الخادم ثم انشر التطبيق من جديد</p>
              </div>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-bold text-center">في هذه الأثناء يمكنك الاطلاع على لوحة القيادة، تحليل الصفقات، والتقارير</p>
          </div>
        ) : (
          /* ── other errors: generic with retry ── */
          <div className="text-center py-12">
            <span className="text-4xl">⚠️</span>
            <p className="text-[#334155] font-medium mt-3">{error}</p>
            <button
              type="button"
              onClick={handleGenerate}
              className="mt-4 bg-[#2563EB] text-white px-6 py-2 rounded-lg font-bold text-sm"
            >
              حاول مرة أخرى
            </button>
          </div>
        )
      )}

      {!isLoading && !error && showEmptyPeriod && (
        <div className="text-center py-12 text-[#94A3B8]">
          <span className="text-4xl">📭</span>
          <p className="mt-3 font-medium">لا توجد تقارير في فترة {periodLabel}</p>
          <p className="text-sm mt-1">اطلب من الفريق رفع التقارير أولاً</p>
        </div>
      )}

      {!isLoading && result && (
        <InsightResultPanel
          result={result}
          reportName={reportName}
          onReportNameChange={setReportName}
          onSave={handleSave}
          isSaving={isSaving}
          showSave={selectedSavedId === null}
        />
      )}

      <div className="mt-12 border-t border-[#E2E8F0] pt-8">
        <h2 className="text-lg font-black text-[#1E293B] mb-4 text-right">
          التقارير المحفوظة السابقة
        </h2>
        <SavedInsightsList
          reports={savedReports}
          onOpen={openSavedInsight}
          onDelete={handleDeleteSaved}
        />
      </div>
    </div>
  );
}
