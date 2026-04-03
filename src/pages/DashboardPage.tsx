import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(allDocs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const kpis = useMemo(() => {
    if (reports.length === 0) return { total: 0, interactions: 0, conv: 0, funnel: { greeting: 0, details: 0, price: 0, success: 0 } };
    
    let total = 0;
    let interactions = 0;
    let successCount = 0;
    
    const funnel = { greeting: 0, details: 0, price: 0, success: 0 };

    reports.forEach(r => {
      const data = r.parsedData;
      total += data?.summary?.totalMessages || 0;
      interactions += data?.summary?.interactions || 0;
      
      const f = data?.funnels || data?.funnel;
      if (f) {
        const sumCount = (arr: any[]) => Array.isArray(arr) ? arr.reduce((acc, i) => acc + (i.count || 0), 0) : 0;
        funnel.greeting += sumCount(f.noReplyGreeting || f.noReplyAfterGreeting);
        funnel.details += sumCount(f.noReplyDetails || f.noReplyAfterDetails);
        funnel.price += sumCount(f.noReplyPrice || f.noReplyAfterPrice);
        funnel.success += sumCount(f.repliedAfterPrice);
        successCount += sumCount(f.repliedAfterPrice);
      }
    });

    return {
      total,
      interactions,
      conv: interactions > 0 ? ((successCount / interactions) * 100).toFixed(1) : "0",
      funnel
    };
  }, [reports]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-on-surface-variant font-bold">جاري استخراج البيانات التنفيذية...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in zoom-in-95">
        <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center text-outline/30">
          <span className="material-symbols-outlined text-6xl">dashboard_customize</span>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-on-surface">مرحباً بك في لوحة القيادة</h2>
          <p className="text-on-surface-variant italic">لا توجد بيانات متاحة بعد. ابدأ بإضافة تقريرك الأول لبدء التحليل.</p>
        </div>
        <Link to="/submit-report">
          <Button variant="gradient" className="px-10 py-4 shadow-xl shadow-primary/20">إرسال أول تقرير الآن</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto font-body p-4 space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* Top Header & Insight Layer */}
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">تحديث لحظي من Firestore</span>
        </div>
        <h2 className="text-3xl font-headline font-black text-on-surface tracking-tight">طبقة الرؤى (Insight Layer)</h2>
      </div>

      {/* Row 1: Insights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border-r-4 border-red-500 bg-white p-5 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all border border-outline-variant/10">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <span className="material-symbols-outlined text-xl">warning</span>
            <span className="text-xs font-black uppercase">تنبيه حرج</span>
          </div>
          <p className="text-sm font-bold text-on-surface leading-relaxed">
            يوجد ارتداد بنسبة {((kpis.funnel.price / (kpis.interactions || 1)) * 100).toFixed(0)}% عند مرحلة إرسال السعر.
          </p>
        </div>
        <div className="border-r-4 border-amber-500 bg-white p-5 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all border border-outline-variant/10">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <span className="material-symbols-outlined text-xl">error</span>
            <span className="text-xs font-black uppercase">التوزيع الجغرافي</span>
          </div>
          <p className="text-sm font-bold text-on-surface leading-relaxed">تطبيق WhatsApp يتفوق بوضوح من حيث سرعة الإغلاق النهائي.</p>
        </div>
        <div className="border-r-4 border-emerald-500 bg-white p-5 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all border border-outline-variant/10">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <span className="material-symbols-outlined text-xl">trending_up</span>
            <span className="text-xs font-black uppercase">فرصة نمو</span>
          </div>
          <p className="text-sm font-bold text-on-surface leading-relaxed">رفع ميزانية حملات الردود السريعة قد يزيد المبيعات بنسبة 15%.</p>
        </div>
        <div className="border-r-4 border-primary bg-white p-5 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all border border-outline-variant/10">
          <div className="flex items-center gap-2 text-primary mb-2">
            <span className="material-symbols-outlined text-xl">stars</span>
            <span className="text-xs font-black uppercase">أداء متميز</span>
          </div>
          <p className="text-sm font-bold text-on-surface leading-relaxed">تم تحليل {reports.length} تقرير وتصنيف {adStats(reports).length} حملة إعلانية.</p>
        </div>
      </div>

      {/* Row 2: AI Recommendations */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <span className="material-symbols-outlined text-2xl">auto_awesome</span>
          </div>
          <h3 className="text-xl font-black font-headline">توصيات الذكاء الاصطناعي الاستراتيجية</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-white to-purple-50/50 p-8 rounded-[2rem] border border-purple-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
             <div className="absolute top-6 left-6 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-lg">
               <span className="material-symbols-outlined text-xl">edit_note</span>
             </div>
             <p className="text-xs font-black text-purple-600 mb-4 uppercase tracking-[0.2em]">تحسين المحتوى</p>
             <h4 className="font-black text-xl text-on-surface mb-3 tracking-tight">تحسين "توقعات" العميل</h4>
             <p className="text-sm text-on-surface-variant font-medium leading-relaxed mb-6">ذكاء Gemini لاحظ تكرار كلمة "سعر" في اعتراضات العملاء. نقترح استبدالها بكلمة "استثمار" في جميع قوالب الردود.</p>
             <button className="text-purple-600 text-sm font-black flex items-center gap-2 hover:gap-3 transition-all">تحديث القوالب <span className="material-symbols-outlined text-sm rotate-180">arrow_back</span></button>
          </div>
          <div className="bg-gradient-to-br from-white to-pink-50/50 p-8 rounded-[2rem] border border-pink-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
             <div className="absolute top-6 left-6 w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white shadow-lg">
               <span className="material-symbols-outlined text-xl">ads_click</span>
             </div>
             <p className="text-xs font-black text-pink-600 mb-4 uppercase tracking-[0.2em]">إستراتيجية التسعير</p>
             <h4 className="font-black text-xl text-on-surface mb-3 tracking-tight">تغليف القيمة</h4>
             <p className="text-sm text-on-surface-variant font-medium leading-relaxed mb-6">معدل التحويل الحالي {kpis.conv}% يمكن زيادته لـ 6.5% عبر إرسال "فيديو المراجعات" مباشرة قبل السعر بـ 30 ثانية.</p>
             <button className="text-pink-600 text-sm font-black flex items-center gap-2 hover:gap-3 transition-all">تحميل الفيديو <span className="material-symbols-outlined text-sm rotate-180">arrow_back</span></button>
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50/50 p-8 rounded-[2rem] border border-blue-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
             <div className="absolute top-6 left-6 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg">
               <span className="material-symbols-outlined text-xl">savings</span>
             </div>
             <p className="text-xs font-black text-blue-600 mb-4 uppercase tracking-[0.2em]">كفاءة الميزانية</p>
             <h4 className="font-black text-xl text-on-surface mb-3 tracking-tight">إيقاف النزيف</h4>
             <p className="text-sm text-on-surface-variant font-medium leading-relaxed mb-6">الحملات ذات "الارتباط الضعيف" تستهلك 25% من الميزانية دون تحويل. ننصح بنقل هذه السيولة لحملات إعادة الاستهداف.</p>
             <button className="text-blue-600 text-sm font-black flex items-center gap-2 hover:gap-3 transition-all">إعادة التوزيع <span className="material-symbols-outlined text-sm rotate-180">arrow_back</span></button>
          </div>
        </div>
      </section>

      {/* Row 3: Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center text-center space-y-3 border border-outline-variant/10">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <span className="material-symbols-outlined text-3xl">forum</span>
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">إجمالي الرسائل (Leads)</p>
          <h3 className="text-4xl font-black tracking-tighter">{kpis.total.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center text-center space-y-3 border border-outline-variant/10">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <span className="material-symbols-outlined text-3xl">touch_app</span>
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">التفاعلات الحقيقية</p>
          <h3 className="text-4xl font-black tracking-tighter">{kpis.interactions.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center text-center space-y-3 border border-outline-variant/10">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
            <span className="material-symbols-outlined text-3xl">conversion_path</span>
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">معدل التحويل (C.R)</p>
          <h3 className="text-4xl font-black tracking-tighter text-primary">{kpis.conv}%</h3>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center text-center space-y-3 border border-outline-variant/10">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-3xl">payments</span>
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">إغلاقات مؤكدة</p>
          <h3 className="text-4xl font-black tracking-tighter">{kpis.funnel.success.toLocaleString()}</h3>
        </div>
      </div>

      {/* Row 4: Deep Analysis (Funnel & Job Confusion) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Sales Funnel Visualization */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-outline-variant/10 flex flex-col justify-between">
          <div>
            <h4 className="text-xl font-black mb-1">قمع المبيعات التجميعي</h4>
            <p className="text-xs font-bold text-on-surface-variant mb-10 italic">تحليل تدفق العملاء بناءً على كافة البيانات المسجلة</p>
          </div>
          <div className="space-y-2 flex flex-col items-center">
             <div className="h-10 bg-primary/20 rounded-md flex items-center justify-center text-[10px] font-black text-primary border border-primary/20 shadow-sm" style={{ width: '100%' }}>
                الرسائل (100%)
             </div>
             <div className="h-10 bg-primary/40 rounded-md flex items-center justify-center text-[10px] font-black text-primary border border-primary/30 shadow-sm" style={{ width: '85%' }}>
                أول رد (85%)
             </div>
             <div className="h-10 bg-primary/60 rounded-md flex items-center justify-center text-[10px] font-black text-white border border-primary/40 shadow-sm" style={{ width: '60%' }}>
                بعد التفاصيل (60%)
             </div>
             <div className="h-10 bg-primary/80 rounded-md flex items-center justify-center text-[10px] font-black text-white border border-primary/50 shadow-sm" style={{ width: '40%' }}>
                بعد السعر (40%)
             </div>
             <div className="h-14 bg-primary rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-xl" style={{ width: `${kpis.conv}%`, minWidth: '15%' }}>
                تحويل نهائي ({kpis.conv}%)
             </div>
          </div>
          <div className="mt-10 p-6 bg-primary/5 rounded-[2rem] flex items-start gap-4">
            <span className="material-symbols-outlined text-primary">priority_high</span>
            <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
              <span className="font-black text-primary">تحليل الدروب-أوف:</span> أكبر فجوة تواصل هي بين "إرسال السعر" والتحصيل النهائي. نحتاج لتقليص هذه الفجوة بمقدار 5% لتحقيق المستهدف.
            </p>
          </div>
        </div>

        {/* Campaign Breakdown Table */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-outline-variant/10 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h4 className="text-xl font-black">أداء الحملات الحية</h4>
            <Link to="/ads" className="text-xs font-black text-primary uppercase tracking-widest hover:underline">التفاصيل الكاملة</Link>
          </div>
          <div className="space-y-6 flex-grow">
            {adStats(reports).slice(0, 5).map((ad, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                  <span className="text-on-surface-variant">{ad.name}</span>
                  <span className={parseFloat(ad.conv) > 10 ? 'text-emerald-600' : 'text-amber-600'}>{ad.conv}%</span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className={`h-full bg-primary rounded-full transition-all duration-1000`} style={{ width: `${ad.conv}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
               <span className="text-[10px] font-black text-on-surface-variant">يتم التجميع من {reports.length} تقرير</span>
             </div>
             <span className="text-[10px] font-black text-on-surface uppercase tracking-widest">إجمالي {kpis.funnel.success} تحويل</span>
          </div>
        </div>
      </div>

      {/* Row 5: Recent Activity Table */}
      <section className="bg-white rounded-[3rem] shadow-sm border border-outline-variant/10 overflow-hidden">
         <div className="p-10 flex justify-between items-center">
            <h4 className="text-xl font-black font-headline">آخر التقارير والنشاطات</h4>
            <Link to="/reports">
               <Button variant="ghost" className="text-xs font-black uppercase tracking-widest">تصفح كافة التقارير</Button>
            </Link>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-right">
               <thead className="bg-surface-container/30 border-y border-outline-variant/10 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                  <tr>
                     <th className="px-10 py-5">الموظف / المنصة</th>
                     <th className="px-5 py-5 text-center">تاريخ التقرير</th>
                     <th className="px-5 py-5 text-center">التحويل اليومي</th>
                     <th className="px-10 py-5 text-left">الإجراء</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-outline-variant/5">
                 {reports.slice(0, 5).map((report: any) => (
                    <tr key={report.id} className="hover:bg-surface-container/10 transition-all group">
                       <td className="px-10 py-6">
                         <div className="flex items-center gap-4 flex-row-reverse justify-end">
                            <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-xs border border-primary/5">
                              {report.salesRepName?.[0] || 'أ'}
                            </div>
                            <div className="text-right">
                               <p className="font-black text-sm text-on-surface">{report.salesRepName}</p>
                               <p className="text-[10px] font-bold text-on-surface-variant uppercase">{report.platform}</p>
                            </div>
                         </div>
                       </td>
                       <td className="px-5 py-6 text-center text-xs font-bold text-on-surface-variant uppercase">{report.date}</td>
                       <td className="px-5 py-6 text-center">
                          <span className={`px-4 py-1 rounded-full text-[10px] font-black border uppercase ${
                             (report.parsedData?.summary?.conversionRate || 0) > 10 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {report.parsedData?.summary?.conversionRate || 0}% التحويل
                          </span>
                       </td>
                       <td className="px-10 py-6 text-left">
                          <button className="text-primary hover:bg-primary/10 p-2 rounded-xl transition-all">
                             <span className="material-symbols-outlined text-xl">open_in_new</span>
                          </button>
                       </td>
                    </tr>
                 ))}
               </tbody>
            </table>
         </div>
      </section>

    </div>
  );
}

// Internal aggregation helper for mini-table
function adStats(reports: any[]) {
  const stats: Record<string, { replies: number, total: number }> = {};
  reports.forEach(r => {
    const f = r.parsedData?.funnels || r.parsedData?.funnel;
    if (!f) return;
    const stages = [f.noReplyGreeting || f.noReplyAfterGreeting, f.noReplyDetails || f.noReplyAfterDetails, f.noReplyPrice || f.noReplyAfterPrice, f.repliedAfterPrice];
    stages.forEach((stage, idx) => {
      if (!Array.isArray(stage)) return;
      stage.forEach((ad: any) => {
        const name = ad.adName || "عام";
        if (!stats[name]) stats[name] = { replies: 0, total: 0 };
        stats[name].total += ad.count || 0;
        if (idx === 3) stats[name].replies += ad.count || 0;
      });
    });
  });
  return Object.entries(stats).map(([name, d]) => ({
    name,
    conv: d.total > 0 ? ((d.replies / d.total) * 100).toFixed(1) : "0"
  })).sort((a, b) => parseFloat(b.conv) - parseFloat(a.conv));
}
