import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { parseReport } from "@/lib/services/gemini-parser";
import type { ParsedReportData, ReportFunnels } from "@/lib/services/gemini-parser";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

// Re-export types for any dependents
export type { FunnelStage, ReportFunnels, ParsedReportData } from "@/lib/services/gemini-parser";

// Full State Machine Types
type AppState = "input" | "processing" | "review" | "success";

const INITIAL_MOCK_DATA: ParsedReportData = {
  date: "2023-10-27",
  platform: "واتساب",
  summary: {
    totalMessages: 145,
    interactions: 85,
    conversionRate: 12.4,
  },
  funnels: {
    noReplyGreeting: [
      { id: "stage_g_1", adName: "إعلان دورة التسويق", count: 25 }
    ],
    noReplyDetails: [
      { id: "stage_d_1", adName: "إعلان باقة ريادة الأعمال", count: 18 }
    ],
    noReplyPrice: [
      { id: "stage_p_1", adName: "إعلان استشارات الأعمال", count: 12 }
    ],
    repliedAfterPrice: [
      { id: "stage_r_1", adName: "إعلان باقة ريادة الأعمال", count: 8 }
    ]
  },
  specialCases: "بعض العملاء اشتكوا من تأخر الرد بسبب الضغط على الواتساب."
};

export default function SubmitReportPage() {
  const [appState, setAppState] = useState<AppState>("input");
  const [reportText, setReportText] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingText, setLoadingText] = useState("جاري التحليل بالذكاء الاصطناعي...");
  const [parseError, setParseError] = useState<string | null>(null);

  // Centralized structured parsed-report object
  const [parsedData, setParsedData] = useState<ParsedReportData | null>(null);

  const handleAnalyze = async () => {
    if (!reportText.trim()) return;
    setAppState('processing');
    setParseError(null);
    setLoadingText('يقوم Gemini باستخراج وتسلسل البيانات...');
    
    try {
      const result = await parseReport(reportText, parsedData?.platform || 'واتساب');
      console.log('🔎 Parsed report result:', result);
      setParsedData(result);
      setAppState('review');
    } catch (error: any) {
      console.error('Report parsing failed:', error);
      setParseError(error.message || 'فشل تحليل التقرير تماماً. يرجى تجربة إدخال البيانات يدوياً.');
      setAppState('input');
    }
  };

  const { user } = useAuth();

  const handleSave = async () => {
    if (!parsedData || !isConfirmed || !user) {
      if (!user) setParseError("يجب تسجيل الدخول لحفظ التقرير.");
      return;
    }

    setIsSaving(true);
    setParseError(null);

    try {
      await addDoc(collection(db, "reports"), {
        date: parsedData.date,
        platform: parsedData.platform,
        salesRepId: user.uid,
        salesRepName: user.name,
        rawText: reportText,
        parsedData: parsedData,
        confirmed: true,
        createdAt: serverTimestamp(),
      });

      setAppState("success");

      // Return completely back to blank input state
      setTimeout(() => {
        setAppState("input");
        setReportText("");
        setIsConfirmed(false);
        setParsedData(null);
      }, 3500);
    } catch (error: any) {
      console.error("Error saving report to Firestore:", error);
      setParseError(error.message || "فشل حفظ التقرير في قاعدة البيانات. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to safely update stage values
  const updateStageCount = (
    funnelKey: keyof ReportFunnels,
    stageId: string,
    newCount: number
  ) => {
    setParsedData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        funnels: {
          ...prev.funnels,
          [funnelKey]: prev.funnels[funnelKey].map(stage =>
            stage.id === stageId ? { ...stage, count: newCount } : stage
          )
        }
      };
    });
  };

  const updateStageAdName = (
    funnelKey: keyof ReportFunnels,
    stageId: string,
    newName: string
  ) => {
    setParsedData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        funnels: {
          ...prev.funnels,
          [funnelKey]: prev.funnels[funnelKey].map(stage =>
            stage.id === stageId ? { ...stage, adName: newName } : stage
          )
        }
      };
    });
  };

  return (
    <div className="max-w-5xl mx-auto font-body">
      {/* Dynamic Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface mb-2 font-headline">
            {appState === "input" && "إرسال تقرير المبيعات اليومي"}
            {appState === "processing" && "المعالجة بالذكاء الاصطناعي"}
            {appState === "review" && "مراجعة واعتماد التقرير"}
            {appState === "success" && "تم حفظ التقرير بنجاح"}
          </h2>
          <p className="text-on-surface-variant font-body">
            {appState === "input" && "وفر وقتك. قم بلصق التقرير النصي وسيقوم النظام باستخراج البيانات وهيكلتها تلقائياً."}
            {appState === "review" && "يرجى مراجعة وتأكيد البيانات المستخرجة في الأقسام المحددة."}
          </p>
        </div>
      </header>

      <div className="relative">

        {/* --- STATE 1: INPUT --- */}
        {appState === "input" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Meta Configuration Elements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-container-lowest p-6 rounded-3xl border-none shadow-sm flex flex-col gap-3">
                <label className="text-label text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">calendar_today</span>
                  تاريخ التقرير
                </label>
                <input
                  className="bg-surface-container-low border-none rounded-2xl p-4 font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  type="date"
                  defaultValue={INITIAL_MOCK_DATA.date}
                />
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-3xl border-none shadow-sm flex flex-col gap-3">
                <label className="text-label text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">apps</span>
                  المنصة المستخدمة
                </label>
                <select
                  className="bg-surface-container-low border-none rounded-2xl p-4 font-bold text-on-surface focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer"
                  defaultValue={INITIAL_MOCK_DATA.platform}
                >
                  <option>واتساب</option>
                  <option>إنستغرام</option>
                  <option>ماسنجر فيسبوك</option>
                  <option>LinkedIn</option>
                </select>
              </div>
            </div>

            {/* Smart Text Area */}
            <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/10 overflow-hidden flex flex-col">
              <div className="bg-surface-container-low/50 p-4 border-b border-outline-variant/10 flex justify-between items-center">
                <div className="font-bold text-sm text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
                  النص الخام للتقرير (Paste Report Here)
                </div>
                <button
                  onClick={() => setReportText("تقرير يوم الثلاثاء:\nتم استلام 145 رسالة عبر واتساب.\nالإغلاقات: 18 بيعة بقيمة إجمالية 18400 ريال (12 عبر باقة ريادة الأعمال، والباقي دورة التسويق).\n\nنقاط التسرب:\n- 25 شخص لم يردوا بعد التحية (من حملة العودة للمدارس)\n- 18 شخص توقفوا بعد إرسال التفاصيل (باقة ريادة الأعمال)\n- 12 لم يردوا بعد إرسال السعر\n- 8 أشخاص في مرحلة التفاوض حالياً بعد السعر\n\nملاحظات: بعض العملاء اشتكوا من تأخر الرد بسبب الضغط على الواتساب.")}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">text_snippet</span>
                  إدراج نموذج تجريبي (Insert Sample)
                </button>
              </div>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="الصق تقرير المبيعات اليومي بأي صيغة هنا..."
                className="w-full h-80 p-8 bg-transparent border-none focus:ring-0 text-on-surface text-lg leading-relaxed resize-none placeholder-outline-variant/50 font-body transition-all"
              ></textarea>
            </div>

            {/* Parsing Errors Banner */}
            {parseError && (
              <div className="bg-error/10 border border-error/20 p-4 rounded-xl flex items-center gap-3 text-error animate-in fade-in">
                <span className="material-symbols-outlined">error</span>
                <p className="text-sm font-bold">{parseError}</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                variant="gradient"
                className="px-10 py-4 text-lg w-full md:w-auto shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-95"
                icon="auto_awesome"
                iconPosition="right"
                onClick={handleAnalyze}
                disabled={!reportText.trim()}
              >
                تحليل التقرير (Analyze Report)
              </Button>
            </div>
          </div>
        )}

        {/* --- STATE 2: PROCESSING --- */}
        {appState === "processing" && (
          <div className="h-96 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-surface-container-high rounded-full w-full h-full"></div>
              <div className="absolute inset-0 border-4 border-primary rounded-full w-full h-full border-t-transparent animate-spin"></div>
              <span className="material-symbols-outlined text-primary text-3xl animate-pulse">psychology</span>
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-headline font-bold text-2xl text-on-surface transition-all">
                {loadingText}
              </h3>
            </div>
          </div>
        )}

        {/* --- STATE 3: REVIEW --- */}
        {appState === "review" && parsedData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-32">

            {/* Toggle Original Text */}
            <details className="group bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 cursor-pointer overflow-hidden">
              <summary className="p-5 flex items-center gap-3 font-bold text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors list-none">
                <span className="material-symbols-outlined text-outline">history_edu</span>
                عرض النص الأصلي (Show Original Pasted Text)
                <span className="material-symbols-outlined mr-auto group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div className="p-6 pt-2 bg-surface-container-low/30 border-t border-outline-variant/10 text-on-surface-variant text-sm leading-relaxed whitespace-pre-wrap cursor-text">
                {reportText}
              </div>
            </details>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 group hover:ring-2 hover:ring-primary/20 relative">
                <span className="material-symbols-outlined absolute top-4 left-4 text-outline/40 group-hover:text-primary text-sm opacity-0 group-hover:opacity-100 transition-all pointer-events-none">edit</span>
                <p className="text-sm font-bold text-on-surface-variant mb-2">إجمالي الرسائل (Total Messages)</p>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    className="bg-transparent border-none p-0 text-3xl font-headline font-black text-on-surface focus:ring-0 w-full border-b border-dashed border-transparent focus:border-primary placeholder-outline"
                    value={parsedData.summary.totalMessages}
                    onChange={(e) => setParsedData({
                      ...parsedData,
                      summary: { ...parsedData.summary, totalMessages: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 group hover:ring-2 hover:ring-primary/20 relative">
                <span className="material-symbols-outlined absolute top-4 left-4 text-outline/40 group-hover:text-primary text-sm opacity-0 group-hover:opacity-100 transition-all pointer-events-none">edit</span>
                <p className="text-sm font-bold text-on-surface-variant mb-2">التفاعلات (Interactions)</p>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    className="bg-transparent border-none p-0 text-3xl font-headline font-black text-on-surface focus:ring-0 w-full border-b border-dashed border-transparent focus:border-primary placeholder-outline"
                    value={parsedData.summary.interactions}
                    onChange={(e) => setParsedData({
                      ...parsedData,
                      summary: { ...parsedData.summary, interactions: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>
              <div className="bg-primary/5 p-6 rounded-2xl shadow-sm border border-primary/20 group hover:ring-2 hover:ring-primary/40 relative">
                <span className="material-symbols-outlined absolute top-4 left-4 text-outline/40 group-hover:text-primary text-sm opacity-0 group-hover:opacity-100 transition-all pointer-events-none">edit</span>
                <p className="text-sm font-bold text-primary mb-2">نسبة التحويل (Conversion Rate)</p>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    step="0.1"
                    className="bg-transparent border-none p-0 text-3xl font-headline font-black text-primary border-b border-dashed border-transparent focus:border-primary focus:ring-0 w-24 placeholder-outline"
                    value={parsedData.summary.conversionRate}
                    onChange={(e) => setParsedData({
                      ...parsedData,
                      summary: { ...parsedData.summary, conversionRate: parseFloat(e.target.value) || 0 }
                    })}
                  />
                  <span className="text-lg font-bold text-primary">%</span>
                </div>
              </div>
            </div>

            {/* Funnel Sections */}
            <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-on-surface flex items-center gap-2 font-headline mb-8">
                <span className="material-symbols-outlined text-primary">filter_alt</span>
                مسار المبيعات (Sales Funnel)
              </h3>

              <div className="space-y-6">

                {/* Section 1: Greeting */}
                <div>
                  <h4 className="font-bold text-sm text-on-surface-variant mb-3">1. لم يتم الرد بعد التحية (No reply after greeting)</h4>
                  <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 bg-surface-container-low px-4 py-2 text-xs font-bold text-on-surface-variant">
                      <div className="col-span-10">اسم الإعلان (Ad Name)</div>
                      <div className="col-span-2 text-center">العدد (Count)</div>
                    </div>
                    {parsedData.funnels.noReplyGreeting.map((row) => (
                      <div key={row.id} className="grid grid-cols-12 items-center p-2 border-t border-outline-variant/10 hover:bg-surface-container-low/50">
                        <div className="col-span-10">
                          <input
                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-on-surface"
                            value={row.adName}
                            onChange={(e) => updateStageAdName("noReplyGreeting", row.id, e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            className="w-full bg-transparent border-none focus:ring-0 text-center text-sm font-bold text-on-surface"
                            value={row.count}
                            onChange={(e) => updateStageCount("noReplyGreeting", row.id, parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Details */}
                <div>
                  <h4 className="font-bold text-sm text-on-surface-variant mb-3">2. لم يتم الرد بعد التفاصيل (No reply after details)</h4>
                  <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 bg-surface-container-low px-4 py-2 text-xs font-bold text-on-surface-variant">
                      <div className="col-span-10">اسم الإعلان (Ad Name)</div>
                      <div className="col-span-2 text-center">العدد (Count)</div>
                    </div>
                    {parsedData.funnels.noReplyDetails.map((row) => (
                      <div key={row.id} className="grid grid-cols-12 items-center p-2 border-t border-outline-variant/10 hover:bg-surface-container-low/50">
                        <div className="col-span-10">
                          <input
                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-on-surface"
                            value={row.adName}
                            onChange={(e) => updateStageAdName("noReplyDetails", row.id, e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            className="w-full bg-transparent border-none focus:ring-0 text-center text-sm font-bold text-on-surface"
                            value={row.count}
                            onChange={(e) => updateStageCount("noReplyDetails", row.id, parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Price */}
                <div>
                  <h4 className="font-bold text-sm text-on-surface-variant mb-3">3. لم يتم الرد بعد السعر (No reply after price)</h4>
                  <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 bg-surface-container-low px-4 py-2 text-xs font-bold text-on-surface-variant">
                      <div className="col-span-10">اسم الإعلان (Ad Name)</div>
                      <div className="col-span-2 text-center">العدد (Count)</div>
                    </div>
                    {parsedData.funnels.noReplyPrice.map((row) => (
                      <div key={row.id} className="grid grid-cols-12 items-center p-2 border-t border-outline-variant/10 hover:bg-surface-container-low/50">
                        <div className="col-span-10">
                          <input
                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-on-surface"
                            value={row.adName}
                            onChange={(e) => updateStageAdName("noReplyPrice", row.id, e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            className="w-full bg-transparent border-none focus:ring-0 text-center text-sm font-bold text-on-surface"
                            value={row.count}
                            onChange={(e) => updateStageCount("noReplyPrice", row.id, parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 4: Negotiation */}
                <div>
                  <h4 className="font-bold text-sm text-on-surface-variant mb-3">4. تم الرد بعد السعر - قيد التفاوض (Replied after price)</h4>
                  <div className="border border-outline-variant/20 rounded-xl overflow-hidden ring-1 ring-primary/20">
                    <div className="grid grid-cols-12 bg-primary/5 px-4 py-2 text-xs font-bold text-primary">
                      <div className="col-span-10">اسم الإعلان (Ad Name)</div>
                      <div className="col-span-2 text-center">العدد (Count)</div>
                    </div>
                    {parsedData.funnels.repliedAfterPrice.map((row) => (
                      <div key={row.id} className="grid grid-cols-12 items-center p-2 border-t border-outline-variant/10 hover:bg-surface-container-low/50">
                        <div className="col-span-10">
                          <input
                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-on-surface"
                            value={row.adName}
                            onChange={(e) => updateStageAdName("repliedAfterPrice", row.id, e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            className="w-full bg-transparent border-none focus:ring-0 text-center text-sm font-bold text-on-surface"
                            value={row.count}
                            onChange={(e) => updateStageCount("repliedAfterPrice", row.id, parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Special Cases / Notes */}
            <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 font-headline mb-4">
                <span className="material-symbols-outlined text-amber-500">speaker_notes</span>
                ملاحظات وحالات خاصة (Special Cases)
              </h3>
              <textarea
                className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 text-sm leading-relaxed"
                rows={3}
                value={parsedData.specialCases}
                onChange={(e) => setParsedData({ ...parsedData, specialCases: e.target.value })}
              ></textarea>
            </div>

            {/* Confirmation Section (Fixed Action Bar) */}
            <div className="fixed bottom-0 left-0 right-0 lg:right-64 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-outline-variant/20 p-4 lg:p-6 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.05)]">
              <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">

                <label className="flex items-center gap-3 cursor-pointer group px-2 md:px-0">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary shadow-sm"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                  />
                  <span className="font-bold text-on-surface group-hover:text-primary transition-colors">
                    أؤكد أن هذه البيانات صحيحة (I confirm this data is correct)
                  </span>
                </label>

                <div className="flex w-full md:w-auto gap-3 flex-wrap md:flex-nowrap items-center">
                  <Button
                    variant="ghost"
                    className="flex-1 md:flex-none"
                    onClick={() => {
                      setAppState("input");
                      setParsedData(null);
                    }}
                    disabled={isSaving}
                  >
                    إعادة التحليل (Re-analyze)
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 md:flex-none"
                    disabled={isSaving}
                  >
                    تعديل يدوي (Edit manually)
                  </Button>
                  <Button
                    variant={isConfirmed ? "gradient" : "outline"}
                    className={`flex-1 md:flex-none w-full md:w-auto transition-all ${(!isConfirmed || isSaving) ? "opacity-50 cursor-not-allowed" : "shadow-xl shadow-primary/20"}`}
                    onClick={handleSave}
                    disabled={!isConfirmed || isSaving}
                    icon={isSaving ? "hourglass_empty" : "task_alt"}
                    iconPosition="right"
                  >
                    {isSaving ? "جاري الحفظ..." : "تأكيد وحفظ (Confirm and Save)"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- STATE 4: SUCCESS --- */}
        {appState === "success" && (
          <div className="bg-surface-container-lowest p-12 rounded-3xl shadow-sm border border-outline-variant/10 text-center space-y-6 max-w-xl mx-auto mt-20 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-6">
              <span className="material-symbols-outlined text-5xl">task_alt</span>
            </div>
            <h3 className="font-headline text-2xl font-bold text-on-surface tracking-tight">تم توثيق التقرير بنجاح</h3>
            <p className="text-on-surface-variant text-sm font-body leading-relaxed">
              تم تضمين التقرير وحفظه في قواعد البيانات.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
