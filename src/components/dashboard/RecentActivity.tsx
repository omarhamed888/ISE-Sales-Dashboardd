import { Link } from "react-router-dom";

export function RecentActivity({ reports }: { reports: any[] }) {
  if (reports.length === 0) {
      return (
          <div className="bg-white rounded-2xl p-8 border border-[#E2E8F0] shadow-sm flex flex-col items-center justify-center min-h-[300px]">
              <p className="text-[#64748B] font-bold">لا توجد تقارير حتى الآن</p>
          </div>
      );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
      <div className="p-6 flex items-center justify-between border-b border-[#E2E8F0]">
         <h4 className="font-bold text-[18px] text-[#1E293B] font-headline tracking-tight">آخر التقارير</h4>
         <Link to="/reports" className="text-sm font-bold text-primary hover:underline">عرض الكل</Link>
      </div>
      <div className="overflow-x-auto overflow-y-hidden">
         <table className="w-full text-right" dir="rtl">
            <thead className="bg-[#F7F9FC] text-[#64748B] text-xs font-bold border-b border-[#E2E8F0]">
               <tr>
                  <th className="px-6 py-4 hidden sm:table-cell">الموظف</th>
                  <th className="px-6 py-4">التاريخ</th>
                  <th className="px-6 py-4 hidden md:table-cell">المنصة</th>
                  <th className="px-6 py-4 text-center">الرسائل</th>
                  <th className="px-6 py-4 text-center hidden md:table-cell">التفاعل</th>
                  <th className="px-6 py-4 text-center">التحويل</th>
                  <th className="px-6 py-4 text-left">عرض</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
               {reports.slice(0, 10).map((r) => {
                  const summary = r.parsedData?.summary || r.parsedData || { totalMessages: 0, interactions: 0, conversionRate: 0 };
                  const cr = r.parsedData?.conversionRate ?? summary.conversionRate;
                  return (
                      <tr key={r.id} className="hover:bg-[#F7F9FC]/50 transition-colors group">
                          <td className="px-6 py-4 hidden sm:table-cell">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                   {r.salesRepName?.charAt(0) || "م"}
                                </div>
                                <span className="text-[13px] font-bold text-[#1E293B] truncate max-w-[120px]">{r.salesRepName || 'غير مسجل'}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-[13px] font-bold text-[#64748B] whitespace-nowrap">{r.date}</td>
                          <td className="px-6 py-4 hidden md:table-cell">
                             <span className="text-[11px] font-bold px-2 py-1 bg-[#EFF6FF] text-[#2563EB] rounded-md uppercase">
                                {r.platform}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-center text-[13px] font-bold text-[#1E293B]">{summary.totalMessages || 0}</td>
                          <td className="px-6 py-4 text-center text-[13px] font-bold text-[#1E293B] hidden md:table-cell">{summary.interactions || 0}</td>
                          <td className="px-6 py-4 text-center">
                             <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg ${cr >= 10 ? 'bg-emerald-50 text-emerald-600' : (cr > 0 ? 'bg-amber-50 text-amber-600' : 'bg-[#F7F9FC] text-[#64748B]')}`}>
                                {cr}%
                             </span>
                          </td>
                          <td className="px-6 py-4 text-left">
                             <Link to={`/reports?id=${r.id}`} className="text-[#64748B] hover:text-[#2563EB] transition-colors hover:bg-primary/5 p-2 rounded-xl inline-flex" title="عرض التفاصيل">
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
