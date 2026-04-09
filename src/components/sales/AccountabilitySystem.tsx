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

  // Notify parent if cleared (so modal disappears if there are no missing days)
  if (!loading && !missingDay) {
      setTimeout(onClear, 0);
  }

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
                  <p className="text-[13px] font-bold text-[#64748B]">يجب رفع تقرير هذا اليوم قبل المتابعة في النظام.</p>
              </div>
          </div>

          <div className="bg-[#F7F9FC] border border-[#E2E8F0] p-4 rounded-xl mb-6 flex items-center justify-between">
              <div>
                  <p className="text-[11px] font-bold text-[#64748B] mb-1">اليوم المفقود:</p>
                  <p className="font-black text-[#1E293B]">{missingDay.arText}</p>
              </div>
              <span className="material-symbols-outlined text-warning text-[24px]">warning</span>
          </div>

          <button onClick={forceSubmitReport} className="w-full bg-[#1E293B] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors">
              <span className="material-symbols-outlined">add_chart</span>
              رفع تقرير هذا اليوم
          </button>

      </div>
    </div>
  );
}
