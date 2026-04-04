import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useAttendance } from "@/lib/hooks/useAttendance";

interface Props {
  onClear: () => void;
  onSetForcedDate: (dateStr: string) => void;
}

export function AccountabilitySystem({ onClear, onSetForcedDate }: Props) {
  const { user } = useAuth();
  const { missingDays, loading } = useAttendance();
  const missingDay = missingDays.length > 0 ? missingDays[0] : null;
  
  // Modals state
  const [showExcuseForm, setShowExcuseForm] = useState(false);
  const [excuseText, setExcuseText] = useState("");
  const [submittingExcuse, setSubmittingExcuse] = useState(false);

  // Notify parent if cleared (so modal disappears if there are no missing days)
  if (!loading && !missingDay) {
      setTimeout(onClear, 0);
  }

  const submitExcuse = async () => {
      if (!excuseText.trim() || !user || !missingDay) return;
      setSubmittingExcuse(true);
      try {
          await addDoc(collection(db, "excuses"), {
             userId: user.uid,
             userName: user.name,
             date: missingDay.str,
             reason: excuseText.trim(),
             status: "pending",
             createdAt: serverTimestamp()
          });
          // Reload checks after submitting
          window.location.reload();
      } catch (err) {
          alert("حدث خطأ");
      }
      setSubmittingExcuse(false);
  };

  const forceSubmitReport = () => {
      if (!missingDay) return;
      onSetForcedDate(missingDay.str);
      onClear();
  };

  if (loading) return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-[40px] text-[#2563EB]">progress_activity</span>
      </div>
  );

  if (!missingDay) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E293B]/70 backdrop-blur-md px-4 font-body animate-in fade-in" dir="rtl">
      <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-error"></div>
          
          <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-error">
                  <span className="material-symbols-outlined text-[32px]">event_busy</span>
              </div>
              <div>
                  <h2 className="text-[24px] font-black font-headline text-[#1E293B] tracking-tight">لديك يوم غير مكتمل</h2>
                  <p className="text-[13px] font-bold text-[#64748B]">يجب إكمال تقرير أو تقديم عذر قبل المتابعة في النظام.</p>
              </div>
          </div>

          <div className="bg-[#F7F9FC] border border-[#E2E8F0] p-4 rounded-xl mb-6 flex items-center justify-between">
              <div>
                  <p className="text-[11px] font-bold text-[#64748B] mb-1">اليوم المفقود:</p>
                  <p className="font-black text-[#1E293B]">{missingDay.arText}</p>
              </div>
              <span className="material-symbols-outlined text-warning text-[24px]">warning</span>
          </div>

          {!showExcuseForm ? (
              <div className="flex flex-col gap-3">
                  <button onClick={forceSubmitReport} className="w-full bg-[#1E293B] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors">
                      <span className="material-symbols-outlined">add_chart</span>
                      رفع تقرير هذا اليوم
                  </button>
                  <button onClick={() => setShowExcuseForm(true)} className="w-full bg-white border border-[#E2E8F0] text-[#64748B] py-4 rounded-xl font-bold hover:bg-[#F7F9FC] transition-colors">
                      تقديم عذر بدلاً من التقرير
                  </button>
              </div>
          ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <div>
                      <label className="text-[13px] font-bold text-[#1E293B] mb-2 block">سبب غيابك / عدم رفع التقرير؟</label>
                      <textarea 
                         value={excuseText} onChange={e => setExcuseText(e.target.value)}
                         className="w-full bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-4 text-[13px] font-bold focus:border-[#2563EB] outline-none" 
                         rows={4} placeholder="اكتب سبب واضح للغياب وسيتم مراجعته من الإدارة..."
                         disabled={submittingExcuse}
                      ></textarea>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={submitExcuse} disabled={submittingExcuse || !excuseText.trim()} className="flex-1 bg-[#2563EB] text-white py-3.5 rounded-xl font-bold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors flex justify-center items-center">
                         {submittingExcuse ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : "إرسال العذر"}
                     </button>
                     <button onClick={() => setShowExcuseForm(false)} disabled={submittingExcuse} className="bg-[#F7F9FC] border border-[#E2E8F0] text-[#64748B] px-6 rounded-xl font-bold hover:bg-[#E2E8F0] transition-colors">
                         إلغاء
                     </button>
                  </div>
              </div>
          )}

      </div>
    </div>
  );
}
