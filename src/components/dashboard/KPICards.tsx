import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";

const CARD =
  "bg-white border border-[#e1e8ed] rounded-[10px] p-[25px] text-center shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

export function KPICards({ reports }: { reports: any[] }) {
  const cur = calculateAggregates(reports);

  const convColor =
    cur.conversionRate > 8
      ? "text-[#27ae60]"
      : cur.conversionRate >= 4
        ? "text-[#f39c12]"
        : "text-[#e74c3c]";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full" dir="rtl">
      <div className={CARD}>
        <p className="text-[0.95em] text-[#7f8c8d] mb-2">إجمالي الرسائل</p>
        <p className="text-[2.8em] font-semibold leading-none text-[#3498db]">
          {cur.totalMessages.toLocaleString("ar-EG")}
        </p>
      </div>

      <div className={CARD}>
        <p className="text-[0.95em] text-[#7f8c8d] mb-2">إجمالي التفاعلات</p>
        <p className="text-[2.8em] font-semibold leading-none text-[#e74c3c]">
          {cur.interactions.toLocaleString("ar-EG")}
        </p>
      </div>

      <div className={CARD}>
        <p className="text-[0.95em] text-[#7f8c8d] mb-2">معدل التحويل</p>
        <p className={`text-[2.8em] font-semibold leading-none ${convColor}`}>
          {cur.conversionRate.toFixed(1)}%
        </p>
      </div>

      <div className={CARD}>
        <p className="text-[0.95em] text-[#7f8c8d] mb-2">
          التسرب عند {cur.biggestDrop}
        </p>
        <p className="text-[2.8em] font-semibold leading-none text-[#e74c3c]">
          {cur.biggestLeakPct}%
        </p>
      </div>
    </div>
  );
}
