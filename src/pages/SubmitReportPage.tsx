import { useState, useEffect } from "react";
import { parseReport } from "@/lib/services/gemini-parser";
import { useCourses } from "@/lib/hooks/useCourses";
import type { ParsedReportData, ReportFunnel, FunnelStage } from "@/lib/services/gemini-parser";
import { collection, addDoc, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Link, useSearchParams } from "react-router-dom";
import { mergeParsedReportFillEmpty } from "@/lib/utils/merge-parsed-report";

function normalizeReportDate(d: unknown): string {
  if (typeof d !== "string") return "";
  const s = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, dd, mm, yyyy] = slash;
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  return s;
}

type AppState = "input" | "processing" | "review" | "success";
type InputMode = "form" | "template";

interface FormStage {
  greeting: number;
  details: number;
  price: number;
  closed: number;
  greetingNotes: string;
  detailsNotes: string;
  priceNotes: string;
  closedNotes: string;
}

const emptyFormStage = (): FormStage => ({
  greeting: 0,
  details: 0,
  price: 0,
  closed: 0,
  greetingNotes: "",
  detailsNotes: "",
  priceNotes: "",
  closedNotes: "",
});

// ── Reusable funnel table (used in review step) ────────────────────────────
function TableSection({ title, defaultExpanded, data, onChange }: {
  title: string;
  defaultExpanded: boolean;
  data: FunnelStage[];
  onChange: (data: FunnelStage[]) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || data.length > 0);

  const updateRow = (id: string, field: keyof FunnelStage, val: any) =>
    onChange(data.map(r => r.id === id ? { ...r, [field]: val } : r));
  const addRow = () =>
    onChange([...data, { id: 'new-' + Date.now(), adName: "إعلان جديد", count: 0 }]);
  const removeRow = (id: string) => onChange(data.filter(r => r.id !== id));
  const totalCount = data.reduce((a, b) => a + (b.count || 0), 0);

  return (
    <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden mb-4 transition-all">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full bg-[#F7F9FC] p-4 flex justify-between items-center hover:bg-[#E2E8F0]/50 transition-colors">
        <div className="flex items-center gap-3">
          <h4 className="font-bold text-[14px] text-[#1E293B]">{title}</h4>
          <span className="bg-white border border-[#E2E8F0] text-[#64748B] text-[11px] font-black px-2 py-0.5 rounded-full">{totalCount}</span>
        </div>
        <span className="material-symbols-outlined text-[#64748B] transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>expand_more</span>
      </button>
      {expanded && (
        <div className="p-4 bg-white border-t border-[#E2E8F0]">
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden mb-3">
            <div className="grid grid-cols-[1fr_80px_40px] bg-[#F7F9FC] px-4 py-2 border-b border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B]">الإعلان</span>
              <span className="text-[11px] font-bold text-[#64748B] text-center">العدد</span>
              <span />
            </div>
            {data.map(row => (
              <div key={row.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC]/50">
                <div className="grid grid-cols-[1fr_80px_40px] items-center p-2">
                  <input value={row.adName} onChange={e => updateRow(row.id, 'adName', e.target.value)}
                    className="w-full bg-transparent border-none text-[13px] font-bold text-[#1E293B] focus:ring-0" placeholder="اسم الإعلان" />
                  <input type="number" value={row.count} onChange={e => updateRow(row.id, 'count', parseInt(e.target.value) || 0)}
                    className="w-full bg-transparent border-none text-[13px] font-bold text-[#1E293B] focus:ring-0 text-center" />
                  <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600 flex justify-center">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
                {row.notes && String(row.notes).trim() && (
                  <div className="px-5 pb-2 text-[11px] text-[#64748B] leading-relaxed bg-[#FAFBFC] border-t border-[#F1F5F9]">
                    {row.notes}
                  </div>
                )}
              </div>
            ))}
            {data.length === 0 && <div className="p-3 text-center text-[#64748B] text-[11px] font-bold">لا يوجد بيانات.</div>}
          </div>
          <button onClick={addRow} className="text-[#2563EB] text-[12px] font-bold flex items-center gap-1 hover:underline">
            <span className="material-symbols-outlined text-[16px]">add</span> إضافة صف
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function SubmitReportPage() {
  const { user } = useAuth();
  const courses = useCourses();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [editLoading, setEditLoading] = useState(!!editId);
  const [lastActionWasUpdate, setLastActionWasUpdate] = useState(false);

  const [forcedDate, setForcedDate] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>("input");
  const [inputMode, setInputMode] = useState<InputMode>("form"); // form is default
  const [wasDirectEntry, setWasDirectEntry] = useState(false);
  const [reportText, setReportText] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");

  // date / platform (shared)
  const [formDate, setFormDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [formPlatform, setFormPlatform] = useState("واتساب");

  // parsed data (review step)
  const [parsedData, setParsedData] = useState<ParsedReportData | null>(null);

  // ── Direct form state ─────────────────────────────────────────────────
  const [formStages, setFormStages] = useState<FormStage>(emptyFormStage());

  // cycling messages during Gemini processing
  const cycleMsgs = ["جاري قراءة التقرير...", "يقوم Gemini باستخراج البيانات...", "جاري بناء الجداول وتحليل السياق..."];
  const [cycleIdx, setCycleIdx] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (appState === 'processing') {
      interval = setInterval(() => setCycleIdx(i => (i + 1) % cycleMsgs.length), 1500);
    }
    return () => clearInterval(interval);
  }, [appState]);

  useEffect(() => { if (forcedDate) setFormDate(forcedDate); }, [forcedDate]);

  useEffect(() => {
    if (!editId || !user) {
      setEditLoading(false);
      return;
    }
    let cancelled = false;
    setEditLoading(true);
    setParseError(null);
    (async () => {
      try {
        const snap = await getDoc(doc(db, "reports", editId));
        if (cancelled) return;
        if (!snap.exists()) {
          setParseError("التقرير غير موجود.");
          setSearchParams({}, { replace: true });
          setEditLoading(false);
          return;
        }
        const data = snap.data();
        if (data.salesRepId !== user.uid) {
          setParseError("لا يمكن تعديل هذا التقرير.");
          setSearchParams({}, { replace: true });
          setEditLoading(false);
          return;
        }
        const pd = data.parsedData as ParsedReportData | undefined;
        if (!pd) {
          setParseError("بيانات التقرير غير صالحة.");
          setEditLoading(false);
          return;
        }
        const normDate = normalizeReportDate(data.date);
        if (normDate) setFormDate(normDate);
        setParsedData(pd);
        setFormPlatform(typeof data.platform === "string" ? data.platform : "واتساب");
        setWasDirectEntry(data.entryMode === "form");
        setInputMode(data.entryMode === "form" ? "form" : "template");
        setReportText(typeof data.rawText === "string" ? data.rawText : "");
        setIsConfirmed(false);
        setAppState("review");
      } catch (e: any) {
        if (!cancelled) {
          setParseError(e?.message || "تعذر تحميل التقرير.");
          setSearchParams({}, { replace: true });
        }
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId, user]);

  const updateStageField = (field: keyof FormStage, val: string | number) =>
    setFormStages((prev) => ({ ...prev, [field]: val }));

  // ── Build ParsedReportData from form ─────────────────────────────────
  const buildParsedDataFromForm = (): ParsedReportData => {
    const toStage = (
      stageName: string,
      count: number,
      notes: string
    ): FunnelStage[] => [{
      id: `${stageName}-${Date.now()}`,
      adName: stageName,
      count,
      notes: notes.trim(),
      leadNotes: [],
    }];

    const closedCount = formStages.closed;
    const totalMessages = formStages.greeting > 0
      ? formStages.greeting
      : formStages.greeting + formStages.details + formStages.price + formStages.closed;

    return {
      totalMessages,
      messagesCount: totalMessages,
      commentsCount: 0,
      interactions: closedCount,
      conversionRate:
        totalMessages > 0
          ? parseFloat(((closedCount / totalMessages) * 100).toFixed(1))
          : 0,
      jobConfusionCount: 0,
      funnel: {
        noReplyAfterGreeting: toStage("لم يرد بعد التحية", formStages.greeting, formStages.greetingNotes),
        noReplyAfterDetails: toStage("لم يرد بعد التفاصيل", formStages.details, formStages.detailsNotes),
        noReplyAfterPrice: toStage("لم يرد بعد السعر", formStages.price, formStages.priceNotes),
        repliedAfterPrice: toStage("رد بعد السعر", formStages.closed, formStages.closedNotes),
      },
      commentsFunnel: {
        noReplyAfterGreeting: [],
        noReplyAfterDetails: [],
        noReplyAfterPrice: [],
        repliedAfterPrice: [],
      },
      closedDeals: [],
      specialCases: [],
      rejectionReasons: [],
      detectedJobs: [],
      leadsByAd: [],
      salesNotes: "",
      programTrack: "",
      sourceType: formPlatform,
    };
  };

  // ── Direct form submit ────────────────────────────────────────────────
  const handleDirectSubmit = () => {
    const hasAnyData =
      formStages.greeting > 0 ||
      formStages.details > 0 ||
      formStages.price > 0 ||
      formStages.closed > 0 ||
      formStages.greetingNotes.trim() ||
      formStages.detailsNotes.trim() ||
      formStages.priceNotes.trim() ||
      formStages.closedNotes.trim();
    if (!hasAnyData) {
      setParseError("أدخل بيانات في واحدة على الأقل من مراحل القمع");
      return;
    }
    setParseError(null);
    setWasDirectEntry(true);
    setParsedData(buildParsedDataFromForm());
    setAppState("review");
  };

  // ── Gemini template analyze ───────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!reportText.trim() || reportText.length < 30) return;
    setAppState('processing');
    setParseError(null);
    try {
      const result = await parseReport(reportText, formPlatform, courses.map(c => c.name));
      const merged = mergeParsedReportFillEmpty(buildParsedDataFromForm(), result.parsedData);
      setParsedData(merged);
      setWasDirectEntry(false);
      setAppState('review');
    } catch (error: any) {
      setParseError(error.message || 'فشل تحليل التقرير.');
      setAppState('input');
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!parsedData || !isConfirmed || !user) return;
    setIsSaving(true);
    setParseError(null);
    const reportIdToUpdate = searchParams.get("edit");
    try {
      const reportPayload: ParsedReportData = {
        ...parsedData,
        closedDeals: [],
      };
      if (reportIdToUpdate) {
        await updateDoc(doc(db, "reports", reportIdToUpdate), {
          date: formDate,
          platform: formPlatform,
          rawText: wasDirectEntry ? null : reportText,
          entryMode: wasDirectEntry ? "form" : "template",
          parsedData: reportPayload,
          confirmed: true,
          updatedAt: serverTimestamp(),
        });
        setLastActionWasUpdate(true);
        setSearchParams({}, { replace: true });
      } else {
        await addDoc(collection(db, "reports"), {
          date: formDate,
          platform: formPlatform,
          salesRepId: user.uid,
          salesRepName: user.name,
          rawText: wasDirectEntry ? null : reportText,
          entryMode: wasDirectEntry ? "form" : "template",
          parsedData: reportPayload,
          confirmed: true,
          createdAt: serverTimestamp(),
        });
        setLastActionWasUpdate(false);
      }
      setAppState("success");
      setIsConfirmed(false);
      setForcedDate(null);
    } catch (error: any) {
      setParseError(error.message || "فشل الحفظ.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetToInput = () => {
    setAppState("input");
    if (!searchParams.get("edit")) {
      setParsedData(null);
      setWasDirectEntry(false);
    }
    setIsConfirmed(false);
    setParseError(null);
  };

  const calculateBiggestDrop = () => {
    if (!parsedData) return "";
    const f = parsedData.funnel;
    const sf = (arr: FunnelStage[]) => arr.reduce((a, b) => a + (b.count || 0), 0);
    const vals = [
      { name: "السعر", v: sf(f.noReplyAfterPrice) },
      { name: "التفاصيل", v: sf(f.noReplyAfterDetails) },
      { name: "التحية", v: sf(f.noReplyAfterGreeting) },
    ];
    const best = vals.reduce((a, b) => b.v > a.v ? b : a);
    return best.v === 0 ? "لا يوجد" : best.name;
  };

  const addSpecialNote = () => {
    if (!newNote.trim() || !parsedData) return;
    setParsedData({ ...parsedData, specialCases: [...parsedData.specialCases, newNote.trim()] });
    setNewNote("");
  };
  const removeNote = (i: number) => {
    if (!parsedData) return;
    const arr = [...parsedData.specialCases];
    arr.splice(i, 1);
    setParsedData({ ...parsedData, specialCases: arr });
  };

  const steps = [
    { id: "input", label: "الإدخال", icon: "edit_note" },
    { id: "review", label: "المراجعة", icon: "fact_check" },
    { id: "success", label: "التأكيد", icon: "check_circle" },
  ];
  const stepIndex = appState === "input" || appState === "processing" ? 0 : appState === "review" ? 1 : 2;

  // ── Render ─────────────────────────────────────────────────────────────
  if (editId && editLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[50vh] gap-4" dir="rtl">
        <span className="material-symbols-outlined animate-spin text-[40px] text-[#2563EB]">progress_activity</span>
        <p className="text-[13px] font-bold text-[#64748B]">جاري تحميل التقرير...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto font-body pb-32" dir="rtl">

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-0 mb-8 mt-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 ${i < stepIndex ? "opacity-60" : ""}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${i === stepIndex ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/30" : i < stepIndex ? "bg-[#10B981] text-white" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                {i < stepIndex
                  ? <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  : <span className="material-symbols-outlined text-[18px]">{step.icon}</span>}
              </div>
              <span className={`text-[10px] font-bold hidden sm:block ${i === stepIndex ? "text-[#2563EB]" : i < stepIndex ? "text-[#10B981]" : "text-[#94A3B8]"}`}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-1 mb-4 ${i < stepIndex ? "bg-[#10B981]" : "bg-[#E2E8F0]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* ─── STEP 1: INPUT ─────────────────────────────────────────────── */}
      {appState === "input" && (
        <div className="animate-in slide-in-from-bottom-4 space-y-4">

          {/* Header card: date + platform (shared by both modes) */}
          <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-black text-[18px]">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div>
                <h2 className="text-[16px] font-black font-headline text-[#1E293B]">مرحباً، {user?.name}</h2>
                <p className="text-[12px] font-bold text-[#64748B]">توثيق نتائج اليوم</p>
              </div>
            </div>

            {/* Date warning */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
              <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
              <p className="text-[12px] font-bold text-amber-700 leading-relaxed">
                تأكد أن تاريخ التقرير صحيح — الداشبورد يعرض بيانات <span className="underline">أمس</span> بشكل افتراضي.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-3">
                <span className="text-[10px] font-bold text-[#64748B] mb-1 block">تاريخ التقرير:</span>
                <input type="date" value={formDate}
                  onChange={e => { if (!forcedDate) setFormDate(e.target.value); }}
                  disabled={!!forcedDate}
                  className={`bg-transparent border-none p-0 text-[13px] font-black focus:ring-0 outline-none w-full ${forcedDate ? 'text-red-500 cursor-not-allowed' : 'text-[#1E293B]'}`}
                  dir="ltr" />
                {forcedDate && <span className="text-[10px] text-red-500 font-bold">(متأخر)</span>}
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#64748B] mb-1 block">المنصة:</span>
                <div className="flex bg-[#F7F9FC] p-1 rounded-xl border border-[#E2E8F0] gap-1">
                  {["واتساب", "ماسنجر", "تيك توك"].map(p => (
                    <button key={p} onClick={() => setFormPlatform(p)}
                      className={`flex-1 text-[12px] font-black py-2 rounded-lg transition-colors ${formPlatform === p
                        ? p === 'واتساب' ? 'bg-[#25D366]/10 text-[#128C7E] shadow-sm'
                          : p === 'ماسنجر' ? 'bg-[#0084FF]/10 text-[#0084FF] shadow-sm'
                            : 'bg-black/10 text-black shadow-sm'
                        : 'text-[#64748B]'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
            <button onClick={() => setInputMode("form")}
              className={`flex-1 py-2.5 text-[13px] font-black rounded-lg transition-all flex items-center justify-center gap-2 ${inputMode === "form" ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B]"}`}>
              <span className="material-symbols-outlined text-[16px]">grid_view</span> إدخال بالحقول
            </button>
            <button onClick={() => setInputMode("template")}
              className={`flex-1 py-2.5 text-[13px] font-black rounded-lg transition-all flex items-center justify-center gap-2 ${inputMode === "template" ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B]"}`}>
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span> قالب + Gemini
            </button>
          </div>

          {/* ── FORM MODE ─────────────────────────────────────────────── */}
          {inputMode === "form" && (
            <div className="space-y-4">

              {/* Main stages */}
              <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] p-6">
                <h3 className="font-black text-[#1E293B] text-[15px] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8B5CF6]">tune</span>
                  المراحل الرئيسية
                </h3>
                <p className="text-[11px] font-bold text-[#64748B] mb-4">
                  كل حقل رئيسي = مرحلة من القمع، وتحته ملاحظاتك (الإعلانات، الوظائف، تفاصيل السجل).
                </p>
                <div className="space-y-3">
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[12px] font-black text-[#F59E0B]">لم يرد بعد التحية</span>
                      <input type="number" min={0} value={formStages.greeting || ""}
                        onChange={e => updateStageField("greeting", parseInt(e.target.value, 10) || 0)}
                        className="w-20 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-center text-[14px] font-black" />
                    </div>
                    <textarea value={formStages.greetingNotes}
                      onChange={e => updateStageField("greetingNotes", e.target.value)}
                      placeholder="اكتب الإعلانات والوظائف والملاحظات..."
                      rows={3}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-2 text-[11px] font-bold text-[#475569] resize-y min-h-[64px] focus:border-[#2563EB] outline-none" />
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[12px] font-black text-[#EF4444]/80">لم يرد بعد التفاصيل</span>
                      <input type="number" min={0} value={formStages.details || ""}
                        onChange={e => updateStageField("details", parseInt(e.target.value, 10) || 0)}
                        className="w-20 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-center text-[14px] font-black" />
                    </div>
                    <textarea value={formStages.detailsNotes}
                      onChange={e => updateStageField("detailsNotes", e.target.value)}
                      placeholder="اكتب الإعلانات والوظائف والملاحظات..."
                      rows={3}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-2 text-[11px] font-bold text-[#475569] resize-y min-h-[64px] focus:border-[#2563EB] outline-none" />
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[12px] font-black text-[#EF4444]">لم يرد بعد السعر</span>
                      <input type="number" min={0} value={formStages.price || ""}
                        onChange={e => updateStageField("price", parseInt(e.target.value, 10) || 0)}
                        className="w-20 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-center text-[14px] font-black" />
                    </div>
                    <textarea value={formStages.priceNotes}
                      onChange={e => updateStageField("priceNotes", e.target.value)}
                      placeholder="اكتب الإعلانات والوظائف والملاحظات..."
                      rows={3}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-2 text-[11px] font-bold text-[#475569] resize-y min-h-[64px] focus:border-[#2563EB] outline-none" />
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[12px] font-black text-[#10B981]">رد بعد السعر</span>
                      <input type="number" min={0} value={formStages.closed || ""}
                        onChange={e => updateStageField("closed", parseInt(e.target.value, 10) || 0)}
                        className="w-20 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-center text-[14px] font-black" />
                    </div>
                    <textarea value={formStages.closedNotes}
                      onChange={e => updateStageField("closedNotes", e.target.value)}
                      placeholder="اكتب الإعلانات والوظائف والملاحظات..."
                      rows={3}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-2 text-[11px] font-bold text-[#475569] resize-y min-h-[64px] focus:border-[#2563EB] outline-none" />
                  </div>
                </div>
              </div>

              {/* Submit button */}
              {parseError && (
                <div className="bg-red-50 text-red-600 text-[12px] font-bold p-3 rounded-xl border border-red-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span> {parseError}
                </div>
              )}
              <button onClick={handleDirectSubmit}
                className="w-full bg-[#2563EB] text-white py-4 rounded-2xl font-black text-[15px] hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#2563EB]/20">
                <span className="material-symbols-outlined text-[20px]">fact_check</span>
                متابعة للمراجعة
              </button>
            </div>
          )}

          {/* ── TEMPLATE MODE ─────────────────────────────────────────── */}
          {inputMode === "template" && (
            <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] p-6">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[14px] font-black text-[#1E293B]">الصق تقرير اليوم هنا</label>
                <button onClick={() => {
                  const samples: Record<string, string> = {
                    "واتساب": `(45) ليد\n\nتوزيع الإعلانات:\n\n1. مردش بعد التفاصيل (20):\naعلان BDI 1: (الوظائف: مدرس، محاسب)\naعلان BDI 2: (الوظائف: مهندس، خريج)\n\n2. مردش بعد السعر (15):\naعلان BDI 1: (الوظائف: محاسب، موظف)\n\n3. رد بعد السعر (10):\naعلان BDI 1: (الوظائف: مدرس | الحالة: هيفكر ويرد)\n\nأسباب الرفض: (سعر عالي: 8 - فاكرها وظيفة: 4)\nملاحظات: (إعلان BDI 2 بيجيب ناس مش مؤهلين)`,
                    "ماسنجر": `(38 رسالة - 60 كومنت)\n\n━━━ رسائل (38) ━━━\n\nمردش بعد أهلاً (10): (اعلان BDI 1: 6 | اعلان BDI 2: 4)\n\nمردش بعد التفاصيل (14):\n(اعلان BDI 1 / مدرس)\n(اعلان BDI 2 / مهندس)\n\nرد بعد السعر (5):\n(اعلان BDI 1 / مدرس / هيفكر ويرد)`,
                    "تيك توك": `(30) ليد\n\nتوزيع الإعلانات:\n\n1. مردش بعد التفاصيل (12):\naعلان BDI 1: (الوظائف: طالب، موظف)\n\n2. رد بعد السعر (8):\naعلان BDI 1: (الوظائف: فريلانسر | الحالة: هيحضر أونلاين)`,
                  };
                  setReportText(samples[formPlatform] || samples["واتساب"]);
                }} className="text-[11px] font-bold text-[#2563EB] hover:underline bg-[#EFF6FF] px-2 py-1 rounded-md">
                  نموذج تجريبي
                </button>
              </div>

              <textarea value={reportText} onChange={e => setReportText(e.target.value)}
                placeholder="ابدأ بكتابة أو لصق تقرير المبيعات..."
                className="w-full bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-4 text-[14px] font-medium leading-relaxed outline-none focus:border-[#2563EB] transition-colors min-h-[300px] resize-none" />

              <div className="w-full flex justify-between items-center mt-4">
                <span className={`text-[11px] font-black ${reportText.length < 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {reportText.length} حرف {reportText.length < 50 && "(غير كافٍ)"}
                </span>
                <button onClick={handleAnalyze} disabled={reportText.length < 50}
                  className="bg-[#2563EB] text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:bg-[#94A3B8]">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                  تحليل بـ Gemini
                </button>
              </div>

              {parseError && (
                <div className="w-full bg-red-50 text-red-600 text-[12px] font-bold p-3 rounded-xl border border-red-200 mt-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span> {parseError}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 2: PROCESSING ────────────────────────────────────────── */}
      {appState === "processing" && (
        <div className="bg-white rounded-[32px] shadow-sm border border-[#E2E8F0] p-16 mt-10 text-center animate-in zoom-in-95 duration-500 flex flex-col items-center">
          <div className="w-24 h-24 bg-[#EFF6FF] text-[#2563EB] rounded-[24px] flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 border-[4px] border-[#2563EB] rounded-[24px] border-t-transparent animate-spin" />
            <span className="material-symbols-outlined text-[40px] animate-pulse">psychology</span>
          </div>
          <p className="font-black text-[#1E293B] text-[20px] mb-2">{cycleMsgs[cycleIdx]}</p>
          <p className="text-[13px] font-bold text-[#64748B]">رجاءً لا تقم بإغلاق أو تحديث هذه الصفحة.</p>
        </div>
      )}

      {/* ─── STEP 3: REVIEW ────────────────────────────────────────────── */}
      {appState === "review" && parsedData && (
        <div className="animate-in slide-in-from-bottom-8 mt-6 pb-20 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 flex items-center justify-center rounded-xl">
                <span className="material-symbols-outlined text-[24px]">task_alt</span>
              </div>
              <div>
                <h2 className="text-[15px] font-black text-[#1E293B]">
                  {wasDirectEntry ? "تم إدخال البيانات مباشرة" : "تم تحليل التقرير بنجاح"}
                </h2>
                <p className="text-[11px] font-bold text-[#64748B] mt-0.5">
                  {wasDirectEntry
                    ? "راجع البيانات قبل الحفظ النهائي"
                    : <span>تم الاستخراج بواسطة <span className="bg-[#2563EB]/10 text-[#2563EB] px-1.5 py-0.5 rounded text-[9px] font-black">Gemini</span></span>}
                </p>
              </div>
            </div>
            <button onClick={resetToInput}
              className="text-[#2563EB] font-bold text-[12px] bg-[#EFF6FF] px-4 py-2 rounded-xl hover:bg-[#E2E8F0]">
              تعديل
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-[#64748B] mb-1">إجمالي الرسائل</p>
              <input type="number" className="p-0 border-none bg-transparent font-black text-[22px] text-[#1E293B] focus:ring-0 w-full"
                value={parsedData.totalMessages}
                onChange={e => setParsedData({ ...parsedData, totalMessages: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-[#64748B] mb-1">إجمالي التفاعل</p>
              <input type="number" className="p-0 border-none bg-transparent font-black text-[22px] text-[#1E293B] focus:ring-0 w-full"
                value={parsedData.interactions}
                onChange={e => setParsedData({ ...parsedData, interactions: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-[#2563EB] mb-1">معدل الإغلاق</p>
              <div className="flex items-center">
                <input type="number" className="p-0 border-none bg-transparent font-black text-[22px] text-[#2563EB] focus:ring-0 w-16"
                  value={parsedData.conversionRate}
                  onChange={e => setParsedData({ ...parsedData, conversionRate: parseFloat(e.target.value) || 0 })} />
                <span className="text-[22px] font-black text-[#2563EB]">%</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-amber-700 mb-1">أكبر تسرب</p>
              <p className="font-black text-[22px] text-amber-900">{calculateBiggestDrop()}</p>
            </div>
          </div>

          {parsedData.salesNotes?.trim() && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 shadow-sm">
              <h3 className="font-black text-amber-900 text-[13px] mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">sticky_note_2</span>
                ملاحظات الإعلانات (خلط وظيفي وغيره)
              </h3>
              <p className="text-[12px] font-bold text-amber-950 whitespace-pre-wrap leading-relaxed">
                {parsedData.salesNotes}
              </p>
            </div>
          )}

          {/* Funnels */}
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-[24px] shadow-sm">
            <h3 className="font-black text-[#1E293B] text-[16px] mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2563EB]">filter_list</span> مراحل قمع التحويل
            </h3>
            <div className="border-r-4 border-[#F59E0B] rounded-l-2xl overflow-hidden mb-1">
              <TableSection title="لم يرد بعد التحية" defaultExpanded={false}
                data={parsedData.funnel.noReplyAfterGreeting}
                onChange={d => setParsedData({ ...parsedData, funnel: { ...parsedData.funnel, noReplyAfterGreeting: d } })} />
            </div>
            <div className="border-r-4 border-[#EF4444]/60 rounded-l-2xl overflow-hidden mb-1">
              <TableSection title="لم يرد بعد التفاصيل" defaultExpanded={false}
                data={parsedData.funnel.noReplyAfterDetails}
                onChange={d => setParsedData({ ...parsedData, funnel: { ...parsedData.funnel, noReplyAfterDetails: d } })} />
            </div>
            <div className="border-r-4 border-[#EF4444] rounded-l-2xl overflow-hidden mb-1">
              <TableSection title="لم يرد بعد السعر" defaultExpanded={false}
                data={parsedData.funnel.noReplyAfterPrice}
                onChange={d => setParsedData({ ...parsedData, funnel: { ...parsedData.funnel, noReplyAfterPrice: d } })} />
            </div>
            <div className="border-r-4 border-[#10B981] rounded-l-2xl overflow-hidden mb-1">
              <TableSection title="رد بعد السعر" defaultExpanded={true}
                data={parsedData.funnel.repliedAfterPrice}
                onChange={d => setParsedData({ ...parsedData, funnel: { ...parsedData.funnel, repliedAfterPrice: d } })} />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-[24px] shadow-sm">
            <h3 className="font-black text-[#1E293B] text-[15px] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">lightbulb</span> ملاحظات وردود الفعل
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {parsedData.specialCases.map((note, i) => (
                <div key={i} className="bg-[#F7F9FC] border border-[#E2E8F0] text-[#1E293B] text-[12px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                  {note}
                  <button onClick={() => removeNote(i)} className="text-[#64748B] hover:text-red-500 bg-white rounded-md w-4 h-4 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              ))}
              {parsedData.specialCases.length === 0 && <span className="text-[#64748B] text-[11px] font-bold">لا توجد ملاحظات.</span>}
            </div>
            <div className="flex gap-2">
              <input value={newNote} onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSpecialNote()}
                placeholder="إضافة ملاحظة..." className="flex-1 min-w-0 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-2 text-[12px] font-bold focus:border-[#2563EB] outline-none" />
              <button onClick={addSpecialNote} className="shrink-0 bg-[#1E293B] text-white px-4 py-2 text-[12px] font-bold rounded-xl hover:bg-black">إضافة</button>
            </div>
          </div>

          {/* Original text (template mode only) */}
          {!wasDirectEntry && reportText && (
            <details className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm">
              <summary className="p-5 flex justify-between items-center text-[#1E293B] font-black text-[14px] cursor-pointer list-none select-none">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#64748B]">receipt_long</span> النص الأصلي للتقرير
                </span>
                <span className="material-symbols-outlined text-[#64748B]">expand_more</span>
              </summary>
              <div className="px-5 pb-5 pt-0 border-t border-[#E2E8F0] mt-3 bg-[#F7F9FC]">
                <p className="mt-3 text-[12px] leading-loose whitespace-pre-wrap text-[#475569] font-medium p-4 bg-white rounded-xl border border-[#E2E8F0]/50 max-h-60 overflow-y-auto">{reportText}</p>
              </div>
            </details>
          )}
        </div>
      )}

      {/* ─── CONFIRMATION BAR ──────────────────────────────────────────── */}
      {appState === "review" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-[#E2E8F0] p-4 lg:p-6 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="max-w-[720px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isConfirmed} onChange={e => setIsConfirmed(e.target.checked)}
                className="w-5 h-5 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-0" />
              <span className="font-bold text-[#1E293B] text-[13px]">البيانات مراجعة ومطابقة لما أنجزته اليوم.</span>
            </label>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button onClick={resetToInput}
                className="flex-1 bg-[#F7F9FC] text-[#64748B] border border-[#E2E8F0] px-6 py-3.5 rounded-xl text-[13px] font-black hover:bg-[#E2E8F0] transition-colors">
                تعديل
              </button>
              <button onClick={handleSave} disabled={!isConfirmed || isSaving}
                className="flex-1 bg-[#2563EB] text-white px-4 sm:px-8 py-3.5 rounded-xl text-[13px] font-black transition-colors disabled:opacity-50 disabled:bg-[#94A3B8] hover:bg-[#1D4ED8] flex justify-center items-center gap-2">
                {isSaving ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : "تأكيد وحفظ"}
              </button>
            </div>
            {parseError && <div className="absolute -top-12 right-0 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-[11px] font-bold border border-red-200">{parseError}</div>}
          </div>
        </div>
      )}

      {/* ─── STEP 4: SUCCESS ───────────────────────────────────────────── */}
      {appState === "success" && (
        <div className="bg-white rounded-[32px] shadow-sm border border-[#E2E8F0] p-12 mt-10 text-center animate-in zoom-in-95 duration-500 flex flex-col items-center">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 border-[8px] border-emerald-50/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-400/20 animate-ping" />
            <span className="material-symbols-outlined text-[48px]">check_circle</span>
          </div>
          <h3 className="font-black text-[#1E293B] text-[24px] mb-2">
            {lastActionWasUpdate ? "تم تحديث التقرير بنجاح" : "تم حفظ التقرير بنجاح"}
          </h3>
          <p className="text-[13px] font-bold text-[#64748B] mb-8">شكراً على مجهودك اليوم.</p>
          <div className="bg-[#F7F9FC] border border-[#E2E8F0] w-full p-4 rounded-xl flex justify-between items-center mb-8">
            <div>
              <p className="text-[11px] font-bold text-[#64748B]">تاريخ التقرير</p>
              <p className="text-[13px] font-black text-[#1E293B] mt-0.5">{formDate}</p>
            </div>
            <div className="text-left">
              <p className="text-[11px] font-bold text-[#64748B]">المنصة</p>
              <p className="text-[13px] font-black text-[#1E293B] mt-0.5">{formPlatform}</p>
            </div>
          </div>
          <div className="flex gap-3 w-full">
            <Link to="/my-reports" className="flex-1 bg-[#F7F9FC] text-[#1E293B] border border-[#E2E8F0] py-3.5 rounded-xl font-black text-[13px] hover:bg-[#E2E8F0] transition-colors text-center">عرض تقاريري</Link>
            <button onClick={() => {
              setLastActionWasUpdate(false);
              setSearchParams({}, { replace: true });
              setAppState("input"); setReportText(""); setParsedData(null);
              setFormStages(emptyFormStage());
            }}
              className="flex-1 bg-[#2563EB] text-white py-3.5 rounded-xl font-black text-[13px] hover:bg-[#1D4ED8] shadow-lg shadow-[#2563EB]/20 transition-all hover:scale-105">
              رفع تقرير جديد
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
