import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  calcInteractionsFromParsedData,
  calcConversionRate,
} from "@/lib/utils/dashboard-aggregations";

export default function MyReportsPage() {
    const { user } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        if (!user) return;

        const fetchMyData = async () => {
            const q = query(
                collection(db, "reports"), 
                where("salesRepId", "==", user.uid),
            );
            
            const snap = await getDocs(q);
            const rpts: any[] = [];
            snap.forEach(doc => {
                rpts.push({ id: doc.id, ...doc.data() });
            });
            
            // sort descending
            rpts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setReports(rpts);

            // Calculate streak (consecutive working days submitted)
            let currentStreak = 0;
            const submittedDates = new Set(rpts.map(r => r.date.replace(/\//g, '-')));
            
            // Loop backwards from today
            let checkDate = new Date();
            while (true) {
                if (checkDate.getDay() === 5) { // Skip Friday
                    checkDate.setDate(checkDate.getDate() - 1);
                    continue;
                }

                const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
                
                if (submittedDates.has(dStr)) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    // if today is missing, we don't break streak yet just in case they haven't submitted today
                    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                    if (dStr === todayStr) {
                         checkDate.setDate(checkDate.getDate() - 1);
                         continue;
                    }
                    break;
                }
            }
            setStreak(currentStreak);
            setLoading(false);
        };

        fetchMyData();
    }, [user]);

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <span className="material-symbols-outlined animate-spin text-[40px] text-[#2563EB]">progress_activity</span>
        </div>
    );

    return (
        <div className="max-w-[960px] mx-auto font-body" dir="rtl">
            <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-[22px] md:text-[28px] font-black text-[#1E293B] font-headline mb-1">تقاريري</h1>
                    <p className="text-[13px] font-bold text-[#64748B]">سجل جميع تقاريرك ومتابعة أدائك.</p>
                </div>
                {streak > 0 && (
                    <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">local_fire_department</span>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-amber-700 leading-none">سلسلة الالتزام</span>
                            <span className="text-[14px] font-black text-amber-900">{streak} أيام متواصلة</span>
                        </div>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#F59E0B] transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] flex items-center justify-center mb-1">
                        <span className="material-symbols-outlined text-[18px] text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    </div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">سلسلة الالتزام</p>
                    <p className="text-4xl font-black text-[#0F172A]">{streak}</p>
                    <p className="text-xs text-[#94A3B8]">أيام متواصلة</p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#2563EB] transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center mb-1">
                        <span className="material-symbols-outlined text-[18px] text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                    </div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">إجمالي التقارير</p>
                    <p className="text-4xl font-black text-[#0F172A]">{reports.length}</p>
                    <p className="text-xs text-[#94A3B8]">تقرير مرفوع</p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#10B981] transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] flex items-center justify-center mb-1">
                        <span className="material-symbols-outlined text-[18px] text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>touch_app</span>
                    </div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">إجمالي التفاعلات</p>
                    <p className="text-4xl font-black text-[#0F172A]">
                        {reports.reduce(
                            (sum, r) => sum + calcInteractionsFromParsedData(r.parsedData),
                            0
                        )}
                    </p>
                    <p className="text-xs text-[#94A3B8]">تفاعل حقيقي</p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#8B5CF6] transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] flex items-center justify-center mb-1">
                        <span className="material-symbols-outlined text-[18px] text-[#8B5CF6]" style={{ fontVariationSettings: "'FILL' 1" }}>percent</span>
                    </div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">معدل التحويل التراكمي</p>
                    <p className="text-4xl font-black text-[#8B5CF6]">
                        {(() => {
                            const tm = reports.reduce(
                                (s, r) => s + (r.parsedData?.totalMessages || 0),
                                0
                            );
                            const intr = reports.reduce(
                                (s, r) => s + calcInteractionsFromParsedData(r.parsedData),
                                0
                            );
                            return calcConversionRate(intr, tm).toFixed(1);
                        })()}%
                    </p>
                    <p className="text-xs text-[#94A3B8]">معدل تراكمي</p>
                </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#E2E8F0]">
                    <h2 className="text-[16px] font-black text-[#1E293B] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#64748B]">receipt_long</span>
                        سجل التقارير
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-[#F1F5F9]">
                      {reports.map(report => (
                        <div key={report.id} className="p-4 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-[13px] text-[#1E293B]">{report.date}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${report.platform === 'واتساب' ? 'bg-[#25D366]/10 text-[#128C7E]' : report.platform === 'تيك توك' ? 'bg-black/5 text-black' : 'bg-[#0084FF]/10 text-[#0084FF]'}`}>{report.platform}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-[#F8FAFC] rounded-lg p-2">
                              <p className="text-[9px] font-bold text-[#64748B]">الرسائل</p>
                              <p className="text-[13px] font-black text-[#1E293B]">{report.parsedData?.totalMessages || 0}</p>
                            </div>
                            <div className="bg-[#F8FAFC] rounded-lg p-2">
                              <p className="text-[9px] font-bold text-[#64748B]">التفاعل</p>
                              <p className="text-[13px] font-black text-[#1E293B]">{calcInteractionsFromParsedData(report.parsedData)}</p>
                            </div>
                            <div className="bg-[#F8FAFC] rounded-lg p-2">
                              <p className="text-[9px] font-bold text-[#64748B]">التحويل</p>
                              <p className="text-[11px] font-black text-[#1E293B]">
                                {report.parsedData?.totalMessages > 0
                                  ? ((calcInteractionsFromParsedData(report.parsedData) / report.parsedData.totalMessages) * 100).toFixed(1) + '%'
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {reports.length === 0 && <p className="p-8 text-center text-[#64748B] font-bold text-[13px]">لا توجد تقارير مرفوعة حتى الآن.</p>}
                    </div>
                    {/* Desktop table */}
                    <table className="w-full text-right text-[13px] hidden md:table">
                        <thead>
                            <tr className="bg-[#F7F9FC] border-b border-[#E2E8F0]">
                                <th className="p-4 font-bold text-[#64748B] w-32">التاريخ</th>
                                <th className="p-4 font-bold text-[#64748B] w-24">المنصة</th>
                                <th className="p-4 font-bold text-[#64748B] text-center w-24">الرسائل</th>
                                <th className="p-4 font-bold text-[#64748B] text-center w-24">التفاعل</th>
                                <th className="p-4 font-bold text-[#64748B] w-32">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map(report => (
                                <tr key={report.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC]/50 transition-colors">
                                    <td className="p-4 font-black text-[#1E293B]">{report.date}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${report.platform === 'واتساب' ? 'bg-[#25D366]/10 text-[#128C7E]' : report.platform === 'تيك توك' ? 'bg-black/5 text-black' : 'bg-[#0084FF]/10 text-[#0084FF]'}`}>
                                            {report.platform}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-[#1E293B] text-center">{report.parsedData?.totalMessages || 0}</td>
                                    <td className="p-4 font-bold text-[#1E293B] text-center">
                                        {calcInteractionsFromParsedData(report.parsedData)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-max">
                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                            <span className="font-bold text-[11px]">مؤكد</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-[#64748B] font-bold text-[13px]">لا توجد تقارير مرفوعة حتى الآن.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
