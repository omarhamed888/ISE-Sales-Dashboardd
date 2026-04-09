import { Link } from "react-router-dom";
import { formatReportDateArabicLong } from "@/lib/utils/report-dates";
import {
  calcInteractionsFromParsedData,
  calcConversionRate,
} from "@/lib/utils/dashboard-aggregations";

function platformBadge(platform: string | undefined) {
  const p = (platform || "").toLowerCase();
  const isWa = p.includes("واتساب") || p.includes("whatsapp");
  const isTk = p.includes("تيك توك") || p.includes("tiktok");
  if (isWa) {
    return (
      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        واتساب
      </span>
    );
  }
  if (isTk) {
    return (
      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-black/5 text-black border border-black/10">
        تيك توك
      </span>
    );
  }
  return (
    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
      {platform || "ماسنجر"}
    </span>
  );
}

function rowConversionStyle(cr: number) {
  if (cr > 10) return "bg-emerald-50 text-emerald-700 border border-emerald-100";
  if (cr >= 5) return "bg-amber-50 text-amber-800 border border-amber-100";
  return "bg-red-50 text-red-700 border border-red-100";
}

export function RecentActivity({ reports }: { reports: any[] }) {
  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 border border-[#E2E8F0] shadow-sm flex flex-col items-center justify-center min-h-[300px] gap-3">
        <span className="material-symbols-outlined text-[40px] text-[#CBD5E1]">receipt_long</span>
        <p className="text-base font-bold text-[#0F172A]">لا توجد تقارير</p>
        <p className="text-sm text-[#64748B]">لا توجد تقارير مرفوعة في هذه الفترة</p>
      </div>
    );
  }

  const sorted = [...reports].sort((a, b) => {
    const da = String(a.date || "");
    const db = String(b.date || "");
    return db.localeCompare(da);
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
      <div className="p-6 flex items-center justify-between border-b border-[#E2E8F0]">
        <h4 className="text-base font-bold text-[#0F172A]">
          آخر التقارير المرفوعة
        </h4>
        <Link to="/reports" className="text-sm font-bold text-[#2563EB] hover:underline">
          عرض الكل
        </Link>
      </div>
      <div className="overflow-x-auto overflow-y-hidden">
        <table className="w-full text-right" dir="rtl">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <tr>
              <th className="px-6 py-3.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide hidden sm:table-cell">الموظف</th>
              <th className="px-6 py-3.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide">التاريخ</th>
              <th className="px-6 py-3.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide hidden md:table-cell">المنصة</th>
              <th className="px-6 py-3.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide text-center">الرسائل</th>
              <th className="px-6 py-3.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide text-center hidden md:table-cell">التفاعل</th>
              <th className="px-6 py-3.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide text-center">التحويل</th>
              <th className="px-6 py-3.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide text-left">عرض</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 10).map((r, idx) => {
              const pd = r.parsedData;
              const msgs = pd?.totalMessages ?? pd?.summary?.totalMessages ?? 0;
              const intr = calcInteractionsFromParsedData(pd);
              const cr = calcConversionRate(intr, msgs);
              const dateKey = typeof r.date === "string" ? r.date : "";
              const dateLabel =
                dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
                  ? formatReportDateArabicLong(dateKey)
                  : String(r.date || "—");

              const isEven = idx % 2 === 0;

              return (
                <tr
                  key={r.id}
                  className={`hover:bg-[#EFF6FF]/40 transition-colors group ${isEven ? "bg-white" : "bg-[#FAFBFC]"} border-b border-[#E2E8F0] last:border-0`}
                >
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                        {r.salesRepName?.charAt(0) || "م"}
                      </div>
                      <span className="text-[13px] font-bold text-[#0F172A] truncate max-w-[120px]">
                        {r.salesRepName || "غير محدد"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[12px] font-bold text-[#64748B] leading-snug max-w-[200px]">
                    {dateLabel}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">{platformBadge(r.platform)}</td>
                  <td className="px-6 py-4 text-center text-[13px] font-bold text-[#0F172A]">
                    {msgs}
                  </td>
                  <td className="px-6 py-4 text-center text-[13px] font-bold text-[#0F172A] hidden md:table-cell">
                    {intr}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`text-[11px] font-black px-3 py-1.5 rounded-full inline-block ${rowConversionStyle(cr)}`}
                    >
                      {cr}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <Link
                      to={`/reports?id=${r.id}`}
                      className="text-[#64748B] hover:text-[#2563EB] transition-colors hover:bg-[#2563EB]/5 p-2 rounded-xl inline-flex"
                      title="عرض التفاصيل"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
