import { useFilter } from "@/lib/filter-context";

export function EmptyState() {
  const { resetFilter } = useFilter();

  return (
    <div className="w-full h-80 flex flex-col items-center justify-center bg-white rounded-[24px] border border-[#E2E8F0] shadow-sm animate-in fade-in zoom-in-95 font-body">
      <div className="w-24 h-24 mb-6 relative grayscale opacity-60">
        <span className="material-symbols-outlined text-[80px] text-[#94A3B8] font-extralight">folder_off</span>
      </div>
      
      <h3 className="text-xl font-bold text-[#1E293B] mb-2 font-headline tracking-tight">لا توجد بيانات للفترة المحددة</h3>
      <p className="text-[#64748B] text-sm mb-8 max-w-sm text-center leading-relaxed">
        جرب تغيير الفلتر أو اختر فترة أوسع لعرض الإحصائيات الخاصة بالمبيعات
      </p>
      
      <button 
        onClick={resetFilter}
        className="px-6 py-3 bg-[#F7F9FC] text-[#2563EB] text-sm font-bold rounded-xl border border-[#E2E8F0] hover:bg-[#EFF6FF] hover:border-[#2563EB]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
      >
        <span className="material-symbols-outlined text-[20px]">restart_alt</span>
        إعادة تعيين الفلاتر
      </button>
    </div>
  );
}
