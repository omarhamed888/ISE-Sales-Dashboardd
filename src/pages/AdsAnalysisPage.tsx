import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";

export default function AdsAnalysisPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const adStats = useMemo(() => {
    const stats: Record<string, { replies: number, total: number, drops: number }> = {};
    
    reports.forEach(report => {
      const funnel = report.parsedData?.funnels || report.parsedData?.funnel;
      if (!funnel) return;

      // Extract from all stages
      const stages = [
        { data: funnel.noReplyGreeting || funnel.noReplyAfterGreeting, type: 'drop' },
        { data: funnel.noReplyDetails || funnel.noReplyAfterDetails, type: 'drop' },
        { data: funnel.noReplyPrice || funnel.noReplyAfterPrice, type: 'drop' },
        { data: funnel.repliedAfterPrice, type: 'reply' }
      ];

      stages.forEach(stage => {
        if (!Array.isArray(stage.data)) return;
        stage.data.forEach((ad: any) => {
          const name = ad.adName || "عام";
          if (!stats[name]) stats[name] = { replies: 0, total: 0, drops: 0 };
          
          stats[name].total += ad.count || 0;
          if (stage.type === 'reply') stats[name].replies += ad.count || 0;
          else stats[name].drops += ad.count || 0;
        });
      });
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      conv: data.total > 0 ? ((data.replies / data.total) * 100).toFixed(1) : "0",
      total: data.total,
      drops: data.drops,
      status: data.total > 100 ? (parseFloat(String(data.replies / data.total)) > 0.1 ? "الأعلى أداءً" : "تحتاج تدخل") : "بيانات محدودة"
    })).sort((a, b) => parseFloat(b.conv) - parseFloat(a.conv));
  }, [reports]);

  if (loading) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] py-20 space-y-4">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
         <p className="text-on-surface-variant font-bold">جاري تحليل بيانات الحملات...</p>
       </div>
     );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-20 space-y-6">
        <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center text-outline/30">
          <span className="material-symbols-outlined text-5xl">ads_click</span>
        </div>
        <div className="text-center">
            <h3 className="text-xl font-bold text-on-surface">لا توجد بيانات حملات حالياً</h3>
            <p className="text-on-surface-variant mt-1">ابدأ بإضافة أول تقرير مبيعات ليقوم الذكاء الاصطناعي بتحليل الأداء.</p>
        </div>
        <Link to="/submit-report">
          <Button variant="gradient">إضافة تقرير جديد</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto font-body space-y-10 animate-in fade-in duration-700 p-4">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight font-headline">ذكاء الحملات الإعلانية</h1>
          <p className="text-on-surface-variant mt-1">تحليل تجميعي لأداء الحملات بناءً على كافة تقارير المبيعات</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none">تصدير التحليلات</Button>
          <Button variant="gradient" className="flex-1 md:flex-none" icon="refresh" onClick={() => window.location.reload()}>تحديث البيانات</Button>
        </div>
      </div>

      {/* Main Aggregated Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-outline-variant/10 flex flex-col justify-between group">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                <span className="material-symbols-outlined text-3xl">insights</span>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100">تحليل حي (Live)</span>
            </div>
            <h3 className="text-on-surface-variant font-bold text-sm mb-2">متوسط معدل التحويل الإجمالي</h3>
            <div className="text-6xl font-black text-primary tracking-tighter">
              { (adStats.reduce((acc, a) => acc + parseFloat(a.conv), 0) / adStats.length).toFixed(1) }%
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 text-xs font-bold text-on-surface-variant">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
            ذكاء Gemini يقوم حالياً بتحديث التوصيات بناءً على {reports.length} تقرير
          </div>
        </div>
        <div className="bg-surface-container-low p-8 rounded-[2.5rem] flex flex-col justify-center text-center space-y-4 border border-outline-variant/10">
          <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">إجمالي الجمهور المستهدف</h3>
          <div className="text-4xl font-black text-on-surface">
             { adStats.reduce((acc, a) => acc + a.total, 0).toLocaleString() }
          </div>
          <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed px-4">إجمالي عدد الأشخاص الذين تواصلوا عبر كافة المنصات</p>
        </div>
        <div className="bg-surface-container-low p-8 rounded-[2.5rem] flex flex-col justify-center text-center space-y-4 border border-outline-variant/10">
          <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">تغطية الحملات</h3>
          <div className="text-4xl font-black text-on-surface">{adStats.length}</div>
          <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed px-4">عدد الحملات الإعلانية الفريدة التي تم رصدها في التقارير</p>
        </div>
      </div>

      {/* Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-outline-variant/10">
          <div className="p-8 border-b border-outline-variant/10 bg-surface-container-lowest">
            <h2 className="text-xl font-bold text-on-surface">أداء الحملات (Leaderboard)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-8 py-5 text-xs font-bold text-on-surface-variant uppercase tracking-widest">اسم الحملة / الإعلان</th>
                  <th className="px-4 py-5 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center">معدل التحويل</th>
                  <th className="px-4 py-5 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center">إجمالي الوصول</th>
                  <th className="px-8 py-5 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-left">التصنيف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {adStats.map((ad, i) => (
                  <tr key={i} className="hover:bg-surface-container/20 transition-all font-body">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold">
                          {ad.name[0]}
                        </div>
                        <div className="font-bold text-sm text-on-surface">{ad.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-6 text-center">
                       <span className="text-sm font-black text-on-surface">{ad.conv}%</span>
                    </td>
                    <td className="px-4 py-6 text-center text-sm font-bold text-on-surface-variant">{ad.total.toLocaleString()}</td>
                    <td className="px-8 py-6 text-left">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        ad.status === "الأعلى أداءً" ? "bg-emerald-50 text-emerald-700" : (ad.status === "تحتاج تدخل" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700")
                      }`}>
                        {ad.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Sidebar Stats */}
        <div className="bg-[#00174b] p-8 rounded-[2.5rem] text-white flex flex-col shadow-xl">
          <h3 className="text-lg font-bold mb-8">تحليل الارتداد لكل حملة</h3>
          <div className="space-y-8 flex-grow">
            {adStats.slice(0, 5).map((ad, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs mb-1 font-bold">
                  <span className="opacity-70">{ad.name}</span>
                  <span>{ ((ad.drops / ad.total) * 100).toFixed(0) }%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full ${i === 0 ? 'bg-primary-container' : (i === 1 ? 'bg-secondary' : 'bg-white/40')}`} style={{ width: `${(ad.drops / ad.total) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-white/10 flex gap-3">
             <span className="material-symbols-outlined text-primary-container">lightbulb</span>
             <p className="text-[10px] opacity-60 leading-relaxed font-medium">
               يتم احتساب معدل الارتداد تجميعياً من كافة التقارير التي ذكرت اسم هذه الحملة.
             </p>
          </div>
        </div>
      </div>

    </div>
  );
}
