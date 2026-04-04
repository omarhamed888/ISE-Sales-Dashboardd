import { useState, useEffect } from "react";
import { parseReport } from "@/lib/services/gemini-parser";
import type { ParsedReportData, ReportFunnel, FunnelStage } from "@/lib/services/gemini-parser";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Link } from "react-router-dom";
import { AccountabilitySystem } from "@/components/sales/AccountabilitySystem";

type AppState = "input" | "processing" | "review" | "success";

function TableSection({ title, defaultExpanded, data, onChange }: { title: string, defaultExpanded: boolean, data: FunnelStage[], onChange: (data: FunnelStage[]) => void }) {
    const [expanded, setExpanded] = useState(defaultExpanded || data.length > 0);

    const updateRow = (id: string, field: keyof FunnelStage, val: any) => {
        onChange(data.map(r => r.id === id ? { ...r, [field]: val } : r));
    };

    const addRow = () => {
        onChange([...data, { id: 'new-' + Date.now(), adName: "إعلان جديد", count: 0 }]);
    };

    const removeRow = (id: string) => {
        onChange(data.filter(r => r.id !== id));
    };

    const totalCount = data.reduce((a, b) => a + (b.count || 0), 0);

    return (
        <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden mb-4 transition-all">
            <button 
                onClick={() => setExpanded(!expanded)} 
                className="w-full bg-[#F7F9FC] p-4 flex justify-between items-center hover:bg-[#E2E8F0]/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                   <h4 className="font-bold text-[14px] text-[#1E293B]">{title}</h4>
                   <span className="bg-white border border-[#E2E8F0] text-[#64748B] text-[11px] font-black px-2 py-0.5 rounded-full">{totalCount}</span>
                </div>
                <span className="material-symbols-outlined text-[#64748B] transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>expand_more</span>
            </button>
            {expanded && (
                <div className="p-4 bg-white border-t border-[#E2E8F0]">
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden mb-3">
                       <div className="grid grid-cols-[1fr_80px_40px] bg-[#F7F9FC] px-4 py-2 border-b border-[#E2E8F0]">
                           <span className="text-[11px] font-bold text-[#64748B]">الإعلان</span>
                           <span className="text-[11px] font-bold text-[#64748B] text-center">العدد</span>
                           <span></span>
                       </div>
                       {data.map(row => (
                           <div key={row.id} className="grid grid-cols-[1fr_80px_40px] items-center p-2 border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC]/50">
                               <input value={row.adName} onChange={e => updateRow(row.id, 'adName', e.target.value)} className="w-full bg-transparent border-none text-[13px] font-bold text-[#1E293B] focus:ring-0" placeholder="اسم الإعلان" />
                               <input type="number" value={row.count} onChange={e => updateRow(row.id, 'count', parseInt(e.target.value) || 0)} className="w-full bg-transparent border-none text-[13px] font-bold text-[#1E293B] focus:ring-0 text-center" />
                               <button onClick={() => removeRow(row.id)} className="text-error/50 hover:text-error flex justify-center"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                           </div>
                       ))}
                       {data.length === 0 && <div className="p-3 text-center text-[#64748B] text-[11px] font-bold">لا يوجد بيانات مسجلة في هذا القسم.</div>}
                    </div>
                    <button onClick={addRow} className="text-[#2563EB] text-[12px] font-bold flex items-center gap-1 hover:underline">
                        <span className="material-symbols-outlined text-[16px]">add</span> إضافة صف
                    </button>
                </div>
            )}
        </div>
    );
}

export default function SubmitReportPage() {
  const { user } = useAuth();
  
  // Accountability
  const [checkingAccountability, setCheckingAccountability] = useState(true);
  const [forcedDate, setForcedDate] = useState<string | null>(null);

  // States
  const [appState, setAppState] = useState<AppState>("input");
  const [reportText, setReportText] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Inputs
  const [formDate, setFormDate] = useState(() => {
     const today = new Date();
     return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [formPlatform, setFormPlatform] = useState("واتساب");
  
  // Data
  const [parsedData, setParsedData] = useState<ParsedReportData | null>(null);
  
  // Special notes tracker
  const [newNote, setNewNote] = useState("");
  
  // Cycle texts
  const cycleMsgs = ["جاري قراءة التقرير...", "يقوم Gemini باستخراج البيانات...", "جاري بناء الجداول وتحليل السياق..."];
  const [cycleIdx, setCycleIdx] = useState(0);

  useEffect(() => {
      let interval: any;
      if (appState === 'processing') {
          interval = setInterval(() => {
              setCycleIdx(i => (i + 1) % cycleMsgs.length);
          }, 1500);
      }
      return () => clearInterval(interval);
  }, [appState]);

  useEffect(() => {
      if (forcedDate) setFormDate(forcedDate);
  }, [forcedDate]);

  const handleAnalyze = async () => {
    if (!reportText.trim() || reportText.length < 30) return;
    setAppState('processing');
    setParseError(null);
    
    try {
      const result = await parseReport(reportText, formPlatform);
      setParsedData(result.parsedData);
      setAppState('review');
    } catch (error: any) {
      setParseError(error.message || 'فشل تحليل التقرير.');
      setAppState('input');
    }
  };

  const handleSave = async () => {
    if (!parsedData || !isConfirmed || !user) return;
    setIsSaving(true);
    setParseError(null);

    try {
      await addDoc(collection(db, "reports"), {
        date: formDate,
        platform: formPlatform,
        salesRepId: user.uid,
        salesRepName: user.name,
        rawText: reportText,
        parsedData: parsedData,
        confirmed: true,
        createdAt: serverTimestamp(),
      });
      setAppState("success");
      setIsConfirmed(false);
      setForcedDate(null); // Clear block if we saved!
    } catch (error: any) {
      setParseError(error.message || "فشل الحفظ.");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateBiggestDrop = () => {
      if (!parsedData) return "";
      const f = parsedData.funnel;
      let max = 0; let name = "التفاصيل";
      const sf = (arr: any[]) => arr.reduce((a, b) => a + (b.count || 0), 0);
      const pr = sf(f.noReplyAfterPrice);
      const de = sf(f.noReplyAfterDetails);
      const gr = sf(f.noReplyAfterGreeting);
      if (pr > max) { max = pr; name = "السعر"; }
      if (de > max) { max = de; name = "التفاصيل"; }
      if (gr > max) { max = gr; name = "التحية"; }
      if (max === 0) return "لا يوجد";
      return name;
  };

  const addSpecialNote = () => {
      if (!newNote.trim() || !parsedData) return;
      setParsedData({ ...parsedData, specialCases: [...parsedData.specialCases, newNote.trim()] });
      setNewNote("");
  };

  const removeNote = (idx: number) => {
      if (!parsedData) return;
      const arr = [...parsedData.specialCases];
      arr.splice(idx, 1);
      setParsedData({ ...parsedData, specialCases: arr });
  };

  return (
    <div className="max-w-[720px] mx-auto font-body pb-32" dir="rtl">
        {checkingAccountability && (
            <AccountabilitySystem 
               onClear={() => setCheckingAccountability(false)}
               onSetForcedDate={(d) => { setForcedDate(d); setCheckingAccountability(false); }}
            />
        )}

      {/* STEP 1: INPUT */}
      {appState === "input" && (
        <div className="animate-in slide-in-from-bottom-4">
            
            <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] p-6 mb-8 mt-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-black text-[18px]">
                        {user?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                        <h2 className="text-[16px] font-black font-headline text-[#1E293B]">مرحباً، {user?.name}</h2>
                        <p className="text-[12px] font-bold text-[#64748B]">تقديم وتوثيق البيانات التراكمية</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-[#64748B] mb-1">تاريخ التحليل:</span>
                        <span className={`text-[13px] font-black ${forcedDate ? 'text-error' : 'text-[#1E293B]'}`}>
                            {new Date(formDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'})}
                            {forcedDate && " (متأخر)"}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-[#64748B] mb-1 block">منصة العمل اليوم:</span>
                        <div className="flex bg-[#F7F9FC] p-1 rounded-xl border border-[#E2E8F0]">
                            <button onClick={() => setFormPlatform("واتساب")} className={`flex-1 text-[12px] font-black py-2 rounded-lg transition-colors ${formPlatform === 'واتساب' ? 'bg-[#25D366]/10 text-[#128C7E] shadow-sm' : 'text-[#64748B]'}`}>واتساب</button>
                            <button onClick={() => setFormPlatform("ماسنجر")} className={`flex-1 text-[12px] font-black py-2 rounded-lg transition-colors ${formPlatform === 'ماسنجر' ? 'bg-[#0084FF]/10 text-[#0084FF] shadow-sm' : 'text-[#64748B]'}`}>ماسنجر</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] p-6 flex flex-col items-start relative">
                <div className="flex justify-between w-full items-center mb-4">
                    <label className="text-[14px] font-black text-[#1E293B]">الصق تقرير اليوم هنا</label>
                    <button onClick={() => setReportText("تقرير يوم أداء\nتم استلام 120 طلب. \n10 مبيعات.\nتسرب:\n15 لم يرد بعد التحية (طموح)\n20 لم يرد بعد تفاصيل\n")} className="text-[11px] font-bold text-[#2563EB] hover:underline bg-[#EFF6FF] px-2 py-1 rounded-md">إدراج نموذج تجريبي</button>
                </div>
                
                <textarea 
                   value={reportText} onChange={e => setReportText(e.target.value)}
                   placeholder="ابدأ بكتابة أو لصق تقرير المبيعات والملاحظات التي حدثت اليوم..."
                   className="w-full bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-4 text-[14px] font-medium leading-relaxed outline-none focus:border-[#2563EB] transition-colors min-h-[300px] resize-none"
                />

                <div className="w-full flex justify-between items-center mt-4">
                    <span className={`text-[11px] font-black ${reportText.length < 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {reportText.length} حرف {reportText.length < 50 && "(غير كافٍ)"}
                    </span>
                    <button 
                       onClick={handleAnalyze} 
                       disabled={reportText.length < 50}
                       className="bg-[#2563EB] text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:bg-[#94A3B8]"
                    >
                        <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                        تحليل التقرير
                    </button>
                </div>

                {parseError && (
                    <div className="w-full bg-red-50 text-error text-[12px] font-bold p-3 rounded-xl border border-red-200 mt-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">error</span> {parseError}
                    </div>
                )}
            </div>

        </div>
      )}

      {/* STEP 2: PROCESSING */}
      {appState === "processing" && (
         <div className="bg-white rounded-[32px] shadow-sm border border-[#E2E8F0] p-16 mt-10 text-center animate-in zoom-in-95 duration-500 flex flex-col items-center">
             <div className="w-24 h-24 bg-[#EFF6FF] text-[#2563EB] rounded-[24px] flex items-center justify-center mb-8 relative">
                 <div className="absolute inset-0 border-[4px] border-[#2563EB] rounded-[24px] border-t-transparent animate-spin"></div>
                 <span className="material-symbols-outlined text-[40px] animate-pulse">psychology</span>
             </div>
             <p className="font-black text-[#1E293B] text-[20px] mb-2">{cycleMsgs[cycleIdx]}</p>
             <p className="text-[13px] font-bold text-[#64748B]">رجاءً لا تقم بإغلاق أو تحديث هذه الصفحة.</p>
         </div>
      )}

      {/* STEP 3: REVIEW */}
      {appState === "review" && parsedData && (
          <div className="animate-in slide-in-from-bottom-8 mt-6 pb-20">
              
              {/* Header Info */}
              <div className="flex items-center justify-between bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-4 mb-6">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-500 flex items-center justify-center rounded-xl">
                          <span className="material-symbols-outlined text-[24px]">task_alt</span>
                      </div>
                      <div>
                          <h2 className="text-[15px] font-black text-[#1E293B]">تم تحليل التقرير بنجاح</h2>
                          <p className="text-[11px] font-bold text-[#64748B] flex items-center gap-1 mt-0.5">مُستخرج بواسطة <span className="bg-[#2563EB]/10 text-[#2563EB] px-1.5 py-0.5 rounded-[4px] text-[9px] font-black">Gemini AI</span></p>
                      </div>
                  </div>
                  <button onClick={() => { setAppState("input"); setParsedData(null); }} className="text-[#2563EB] font-bold text-[12px] bg-[#EFF6FF] px-4 py-2 rounded-xl transition-colors hover:bg-[#E2E8F0]">
                      تحليل من جديد
                  </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-[#64748B] mb-1">إجمالي الرسائل</p>
                      <input type="number" className="p-0 border-none bg-transparent font-black text-[22px] text-[#1E293B] focus:ring-0 w-full" value={parsedData.totalMessages} onChange={e => setParsedData({...parsedData, totalMessages: parseInt(e.target.value)||0 })} />
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-[#64748B] mb-1">إجمالي التفاعل</p>
                      <input type="number" className="p-0 border-none bg-transparent font-black text-[22px] text-[#1E293B] focus:ring-0 w-full" value={parsedData.interactions} onChange={e => setParsedData({...parsedData, interactions: parseInt(e.target.value)||0 })} />
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-[#2563EB] mb-1">معدل التحويل</p>
                      <div className="flex bg-transparent border-none p-0 text-[22px] font-black text-[#2563EB] focus:ring-0 w-full items-center">
                          <input type="number" className="p-0 border-none bg-transparent font-black text-[22px] focus:ring-0 w-16" value={parsedData.conversionRate} onChange={e => setParsedData({...parsedData, conversionRate: parseFloat(e.target.value)||0 })} />
                          %
                      </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-amber-700 mb-1">أكبر تسرب</p>
                      <p className="font-black text-[22px] text-amber-900">{calculateBiggestDrop()}</p>
                  </div>
              </div>

              {/* FUNNELS */}
              <div className="bg-white border border-[#E2E8F0] p-6 rounded-[24px] mb-8 shadow-sm">
                  <h3 className="font-black text-[#1E293B] text-[16px] mb-6 flex items-center gap-2">
                       <span className="material-symbols-outlined text-[#2563EB]">filter_list</span> تسلسل النزيف التسويقي
                  </h3>
                  
                  <TableSection title="لم يرد بعد التحية" defaultExpanded={false} data={parsedData.funnel.noReplyAfterGreeting} onChange={(d) => setParsedData({...parsedData, funnel: {...parsedData.funnel, noReplyAfterGreeting: d}})} />
                  <TableSection title="لم يرد بعد التفاصيل" defaultExpanded={false} data={parsedData.funnel.noReplyAfterDetails} onChange={(d) => setParsedData({...parsedData, funnel: {...parsedData.funnel, noReplyAfterDetails: d}})} />
                  <TableSection title="لم يرد بعد السعر" defaultExpanded={false} data={parsedData.funnel.noReplyAfterPrice} onChange={(d) => setParsedData({...parsedData, funnel: {...parsedData.funnel, noReplyAfterPrice: d}})} />
                  <TableSection title="رد بعد السعر (قيد الإغلاق)" defaultExpanded={true} data={parsedData.funnel.repliedAfterPrice} onChange={(d) => setParsedData({...parsedData, funnel: {...parsedData.funnel, repliedAfterPrice: d}})} />
              </div>

              {/* Special Cases Tracker */}
              <div className="bg-white border border-[#E2E8F0] p-6 rounded-[24px] mb-8 shadow-sm">
                  <h3 className="font-black text-[#1E293B] text-[15px] mb-4 flex items-center gap-2">
                       <span className="material-symbols-outlined text-amber-500">lightbulb</span> الملاحظات الخاصة والاعتراضات
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                      {parsedData.specialCases.map((note, i) => (
                          <div key={i} className="bg-[#F7F9FC] border border-[#E2E8F0] text-[#1E293B] text-[12px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                              {note}
                              <button onClick={() => removeNote(i)} className="text-[#64748B] hover:text-error bg-white rounded-md w-4 h-4 flex items-center justify-center"><span className="material-symbols-outlined text-[12px]">close</span></button>
                          </div>
                      ))}
                      {parsedData.specialCases.length === 0 && <span className="text-[#64748B] text-[11px] font-bold">لا يوجد ملاحظات مرفقة للذكاء الاصطناعي...</span>}
                  </div>
                  <div className="flex gap-2">
                      <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSpecialNote()} placeholder="إضافة ملاحظة جديدة..." className="flex-1 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-2 text-[12px] font-bold focus:border-[#2563EB] outline-none" />
                      <button onClick={addSpecialNote} className="bg-[#1E293B] text-white px-4 py-2 text-[12px] font-bold rounded-xl hover:bg-black">إضافة</button>
                  </div>
              </div>

              {/* Original Text */}
              <details className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm mb-12">
                  <summary className="p-5 flex justify-between items-center text-[#1E293B] font-black text-[14px] cursor-pointer list-none select-none">
                     <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#64748B]">receipt_long</span> النص الأصلي للتقرير
                     </span>
                     <span className="material-symbols-outlined text-[#64748B]">expand_more</span>
                  </summary>
                  <div className="px-5 pb-5 pt-0 border-t border-[#E2E8F0] mt-3 bg-[#F7F9FC]">
                     <p className="mt-3 text-[12px] leading-loose whitespace-pre-wrap text-[#475569] font-medium p-4 bg-white rounded-xl border border-[#E2E8F0]/50 h-max max-h-60 overflow-y-auto">{reportText}</p>
                  </div>
              </details>
          </div>
      )}

      {/* CONFIRMATION / ACTION BAR */}
      {appState === "review" && (
         <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-[#E2E8F0] p-4 lg:p-6 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
             <div className="max-w-[720px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                 
                 <label className="flex items-center gap-3 cursor-pointer">
                     <input type="checkbox" checked={isConfirmed} onChange={e => setIsConfirmed(e.target.checked)} className="w-5 h-5 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-0" />
                     <span className="font-bold text-[#1E293B] text-[13px]">راجعت البيانات وهي مطابقة لعملي.</span>
                 </label>

                 <div className="flex items-center gap-3 w-full md:w-auto">
                     <button 
                        onClick={() => { setAppState("input"); setParsedData(null); }}
                        className="flex-1 bg-[#F7F9FC] text-[#64748B] border border-[#E2E8F0] px-6 py-3.5 rounded-xl text-[13px] font-black hover:bg-[#E2E8F0] transition-colors"
                     >
                         تعديل التقرير
                     </button>
                     <button 
                        onClick={handleSave}
                        disabled={!isConfirmed || isSaving}
                        className="flex-1 bg-[#2563EB] text-white px-8 py-3.5 rounded-xl text-[13px] font-black transition-colors disabled:opacity-50 disabled:bg-[#94A3B8] hover:bg-[#1D4ED8] flex justify-center items-center gap-2 w-[160px]"
                     >
                         {isSaving ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : "تأكيد وحفظ"}
                     </button>
                 </div>
                 
                 {parseError && <div className="absolute -top-12 right-0 bg-red-50 text-error px-4 py-2 rounded-lg text-[11px] font-bold border border-red-200">{parseError}</div>}
             </div>
         </div>
      )}

      {/* STEP 4: SUCCESS */}
      {appState === "success" && (
          <div className="bg-white rounded-[32px] shadow-sm border border-[#E2E8F0] p-12 mt-10 text-center animate-in zoom-in-95 duration-500 flex flex-col items-center">
             <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 border-[8px] border-emerald-50/50 relative overflow-hidden">
                 <div className="absolute inset-0 bg-emerald-400/20 animate-ping"></div>
                 <span className="material-symbols-outlined text-[48px]">check_circle</span>
             </div>
             <h3 className="font-black text-[#1E293B] text-[24px] mb-2 font-headline">تم حفظ التقرير بنجاح</h3>
             <p className="text-[13px] font-bold text-[#64748B] mb-8">تم تدوين التقرير في سجلك بشكل موثق. شكراً لمجهودك اليوم.</p>

             <div className="bg-[#F7F9FC] border border-[#E2E8F0] w-full p-4 rounded-xl flex justify-between items-center mb-8">
                 <div className="text-right">
                     <p className="text-[11px] font-bold text-[#64748B]">تاريخ التقرير</p>
                     <p className="text-[13px] font-black text-[#1E293B] mt-0.5">{formDate}</p>
                 </div>
                 <div className="text-left">
                     <p className="text-[11px] font-bold text-[#64748B]">المنصة</p>
                     <p className="text-[13px] font-black text-[#1E293B] mt-0.5">{formPlatform}</p>
                 </div>
             </div>

             <div className="flex gap-3 w-full">
                 <Link to="/my-reports" className="flex-1 bg-[#F7F9FC] text-[#1E293B] border border-[#E2E8F0] py-3.5 rounded-xl font-black text-[13px] hover:bg-[#E2E8F0] transition-colors">عرض تقاريري</Link>
                 <button onClick={() => { setAppState("input"); setReportText(""); }} className="flex-1 bg-[#2563EB] text-white py-3.5 rounded-xl font-black text-[13px] hover:bg-[#1D4ED8] shadow-lg shadow-[#2563EB]/20 transition-all hover:scale-105">رفع تقرير جديد</button>
             </div>
          </div>
      )}

    </div>
  );
}
