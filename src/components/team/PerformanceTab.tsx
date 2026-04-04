import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";
import { Link } from "react-router-dom";

interface PerformanceTabProps {
  users: any[];
  reports: any[];
  allReports: any[]; // unfiltered to find 'last report' time accurately bypassing filters
  onEdit: (user: any) => void;
}

export function PerformanceTab({ users, reports, allReports, onEdit }: PerformanceTabProps) {
    const teamAgg = calculateAggregates(reports);
    const teamAverage = teamAgg.conversionRate || 0;
    
    // Sort users by performance natively
    const usersWithStats = users.map(u => {
        const uReports = reports.filter(r => r.salesRepId === u.id || r.salesRepName === u.name);
        const agg = calculateAggregates(uReports);
        const lastReport = allReports.find(r => r.salesRepId === u.id || r.salesRepName === u.name);
        
        let statusColor = "bg-[#E2E8F0]"; // Gray default
        let statusText = "لا توجد تقارير مطلوبة اليوم";
        
        const now = new Date();
        const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        const lrTime = lastReport ? (lastReport.createdAt ? new Date(lastReport.createdAt).getTime() : new Date((lastReport.date || "").split('/').reverse().join('-')).getTime()) : 0;
        
        if (lrTime >= todayStr && lrTime < todayStr + 86400000) {
            statusColor = "bg-emerald-500";
            statusText = "سلم تقرير الإنتاجية اليوم";
        } else if (now.getHours() < 16) {
            statusColor = "bg-amber-400";
            statusText = "مسجل حضور، ولم يسجل التقرير بعد";
        } else {
             statusColor = "bg-error";
             statusText = "لم يستكمل تقرير اليوم! + لا أعذار";
        }

        return { ...u, agg, lastReport, statusColor, statusText };
    }).sort((a, b) => b.agg.conversionRate - a.agg.conversionRate);

    if (usersWithStats.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-8 border border-[#E2E8F0] shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                <p className="text-[#64748B] font-bold">لا يوجد موظفين نشطين حالياً</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95" dir="rtl">
            {usersWithStats.map(user => {
                const isAboveAvg = user.agg.conversionRate >= teamAverage;
                
                return (
                    <div key={user.id} className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] p-6 hover:shadow-md transition-shadow">
                        
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                   <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] font-black text-lg flex items-center justify-center border border-[#2563EB]/10">
                                      {user.name?.charAt(0) || "U"}
                                   </div>
                                   <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${user.statusColor}`} title={user.statusText}></div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#1E293B] text-[15px]">{user.name}</h3>
                                    <p className="text-[#64748B] text-[11px] font-bold" dir="ltr">{user.email}</p>
                                </div>
                            </div>
                            <span className="bg-[#F7F9FC] text-[#64748B] px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-[#E2E8F0]">
                                {user.role === "admin" ? "إنتاج وإشراف" : "مبيعات مباشرة"}
                            </span>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                            <div className="bg-[#F7F9FC] rounded-xl p-3 border border-[#E2E8F0] flex flex-col justify-center">
                                <span className="text-[#1E293B] font-black text-lg">{user.agg.totalMessages.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mt-1">الرسائل</span>
                            </div>
                            <div className="bg-[#F7F9FC] rounded-xl p-3 border border-[#E2E8F0] flex flex-col justify-center">
                                <span className="text-[#1E293B] font-black text-lg">{user.agg.interactions.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mt-1">تفاعل</span>
                            </div>
                            <div className="bg-[#EFF6FF] rounded-xl p-3 border border-[#2563EB]/20 flex flex-col justify-center">
                                <span className="text-[#2563EB] font-black text-lg leading-tight">{user.agg.conversionRate.toFixed(1)}%</span>
                                <span className="text-[10px] font-bold text-[#2563EB]/70 uppercase tracking-widest mt-1">التحويل</span>
                            </div>
                        </div>

                        {/* Progress Tracker vs Team */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center text-[11px] font-bold mb-2">
                                <span className="text-[#64748B]">قياس الكفاءة مقابل الفريق</span>
                                <span className={isAboveAvg ? "text-emerald-600" : "text-amber-600"}>
                                    {isAboveAvg ? "+ أعلى من المتوسط" : "أقل من المتوسط"}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-[#F7F9FC] rounded-full relative overflow-hidden block border border-[#E2E8F0]">
                                {/* User Bar */}
                                <div className={`absolute top-0 right-0 h-full rounded-full transition-all duration-1000 ${isAboveAvg ? 'bg-[#2563EB]' : 'bg-amber-500'}`} style={{ width: `${Math.min((user.agg.conversionRate / (teamAverage || 1)) * 50, 100)}%` }}></div>
                                {/* Team Average Marker (placed logically at 50% for visual baseline) */}
                                <div className="absolute top-0 right-[50%] w-0.5 h-full bg-[#1E293B] shadow-sm z-10"></div>
                            </div>
                        </div>

                        {/* Last Action Context */}
                        <div className="flex items-center gap-2 mb-6 bg-surface-container-low p-2 rounded-lg text-[11px] font-bold text-[#64748B]">
                             <span className="material-symbols-outlined text-[16px]">history</span>
                             آخر نشاط: {user.lastReport ? (user.lastReport.date || new Date(user.lastReport.createdAt).toLocaleDateString('ar-EG')) : "لا يوجد بيانات مسجلة"}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 border-t border-[#E2E8F0] pt-4">
                            <Link to={`/reports?user=${user.id}`} className="flex-1 text-center text-[12px] font-bold bg-[#F7F9FC] text-[#1E293B] border border-[#E2E8F0] py-2.5 rounded-xl hover:bg-[#E2E8F0] transition-colors">
                                عرض التقارير
                            </Link>
                            <button onClick={() => onEdit(user)} className="flex-1 text-center text-[12px] font-bold bg-white text-[#2563EB] border border-[#2563EB]/20 py-2.5 rounded-xl hover:bg-[#EFF6FF] transition-colors">
                                تعديل الصلاحية
                            </button>
                        </div>

                    </div>
                );
            })}
        </div>
    );
}
