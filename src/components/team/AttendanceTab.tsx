import { useState, useMemo } from "react";

export function AttendanceTab({ users, reports }: { users: any[], reports: any[] }) {
    const [weekOffset, setWeekOffset] = useState(0);

    // Calculate the array of 6 days (Saturday to Thursday) for the requested week
    const weekDays = useMemo(() => {
        const now = new Date();
        const currentDayOfWk = now.getDay(); // 0 is Sunday, 6 is Saturday
        
        // Find last Saturday
        const diffToSaturday = currentDayOfWk === 6 ? 0 : currentDayOfWk + 1;
        const lastSaturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToSaturday);
        
        // Apply week offset
        lastSaturday.setDate(lastSaturday.getDate() + (weekOffset * 7));

        const days = [];
        for (let i = 0; i < 6; i++) { // Sat to Thu
            const d = new Date(lastSaturday);
            d.setDate(lastSaturday.getDate() + i);
            days.push({
                dateObj: d,
                dayName: d.toLocaleDateString("ar-EG", { weekday: 'long' }),
                shortDate: d.toLocaleDateString("ar-EG", { month: 'numeric', day: 'numeric' }),
                ymd: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            });
        }
        return days;
    }, [weekOffset]);

    const normalizeReportDate = (report: any): string | null => {
        const rawDate = typeof report?.date === "string" ? report.date.trim() : "";
        if (rawDate) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
                const [day, month, year] = rawDate.split("/");
                return `${year}-${month}-${day}`;
            }
        }

        const createdAt = report?.createdAt;
        if (!createdAt) return null;

        const parsedDate =
            typeof createdAt?.toDate === "function"
                ? createdAt.toDate()
                : createdAt instanceof Date
                  ? createdAt
                  : typeof createdAt?.seconds === "number"
                    ? new Date(createdAt.seconds * 1000)
                    : new Date(createdAt);

        if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) return null;
        return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
    };

    const getCellStatus = (user: any, targetDate: Date, ymd: string) => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const userIds = new Set([user?.id, user?.uid].filter(Boolean));
        
        const hasReport = reports.some(r => {
             if (!userIds.has(r?.salesRepId)) return false;
             return normalizeReportDate(r) === ymd;
        });

        if (hasReport) return { type: "report", icon: "check_circle", color: "text-emerald-500", bg: "bg-emerald-50", tooltip: "تم تسليم التقرير" };



        if (targetDate.getTime() > now.getTime() && ymd !== todayStr) {
             return { type: "future", icon: "horizontal_rule", color: "text-[#E2E8F0]", bg: "transparent", tooltip: "-" };
        }

        if (ymd === todayStr) {
             return { type: "pending", icon: "schedule", color: "text-amber-500", bg: "bg-amber-50", tooltip: "جاري العمل اليوم" };
        }

        return { type: "absent", icon: "cancel", color: "text-error", bg: "bg-red-50", tooltip: "غياب / لم يتم تسليم العمل" };
    };

    return (
        <div className="bg-white rounded-[32px] border border-[#E2E8F0] shadow-sm overflow-hidden font-body animate-in fade-in slide-in-from-bottom-4" dir="rtl">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F7F9FC]">
                <div>
                   <h3 className="text-lg font-black text-[#1E293B] font-headline">سجل الحضور والغياب</h3>
                   <p className="text-[12px] font-bold text-[#64748B]">يعتمد الحضور على رفع تقارير العمل اليومية.</p>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E2E8F0] p-1 shadow-sm">
                    <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F7F9FC] rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                    <span className="text-[13px] font-bold text-[#1E293B] px-4 min-w-[140px] text-center">
                        {weekOffset === 0 ? "الأسبوع الحالي" : weekOffset === -1 ? "الأسبوع الماضي" : `الأسبوع ${weekOffset}`}
                    </span>
                    <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} className="p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F7F9FC] rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                        <span className="material-symbols-outlined text-[20px] rotate-180">chevron_right</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                    <thead>
                        <tr>
                            <th className="px-8 py-5 border-b border-l border-[#E2E8F0] bg-white sticky right-0 z-20 w-[250px]">
                                <span className="text-[11px] font-black uppercase text-[#64748B] tracking-widest">فريق المبيعات</span>
                            </th>
                            {weekDays.map(d => (
                                <th key={d.ymd} className="px-4 py-5 border-b border-[#E2E8F0] text-center min-w-[100px]">
                                    <p className="text-[13px] font-black text-[#1E293B]">{d.dayName}</p>
                                    <p className="text-[11px] font-bold text-[#64748B] mt-1" dir="ltr">{d.shortDate}</p>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-[#F7F9FC]/50 transition-colors group border-b border-[#E2E8F0] last:border-b-0">
                                <td className="px-8 py-4 border-l border-[#E2E8F0] bg-white group-hover:bg-[#F7F9FC]/50 transition-colors sticky right-0 z-10 w-[250px]">
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex justify-center items-center font-bold text-[11px]">
                                          {user.name?.charAt(0)}
                                      </div>
                                      <span className="text-[13px] font-bold text-[#1E293B] truncate max-w-[150px]">{user.name}</span>
                                   </div>
                                </td>
                                {weekDays.map(d => {
                                    const status = getCellStatus(user, d.dateObj, d.ymd);
                                    return (
                                        <td key={d.ymd} className="px-4 py-4 text-center cursor-pointer hover:bg-black/5 transition-colors group/cell" title={status.tooltip}>
                                            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all ${status.bg} border-transparent border hover:border-black/10`}>
                                                <span className={`material-symbols-outlined text-[24px] ${status.color}`}>
                                                    {status.icon}
                                                </span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
