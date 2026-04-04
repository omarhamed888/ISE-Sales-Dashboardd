import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell, Legend
} from 'recharts';

// Custom card wrapper for charts
function ChartCard({ title, subtitle, children, fullWidth = false }: any) {
  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col h-[380px] ${fullWidth ? 'md:col-span-2 lg:col-span-4' : 'md:col-span-2'}`}>
      <div className="mb-4 flex justify-between items-start">
        <div>
           <h3 className="text-[16px] font-black font-headline tracking-tighter text-[#1E293B] mb-0.5">{title}</h3>
           <p className="text-[12px] text-[#64748B] font-bold">{subtitle}</p>
        </div>
        <button className="text-[#94A3B8] hover:text-[#2563EB] transition-colors"><span className="material-symbols-outlined text-[20px]">download</span></button>
      </div>
      <div className="flex-1 w-full h-full pb-2">
        {children}
      </div>
    </div>
  );
}

export function ChartsGrid({ reports, prevReports }: { reports: any[], prevReports: any[] }) {
   const cur = calculateAggregates(reports);

   // 1. Funnel Data
   const funnelData = [
     { name: 'تحية', count: cur.funnel.greeting + cur.funnel.details + cur.funnel.price + cur.funnel.success },
     { name: 'تفاصيل', count: cur.funnel.details + cur.funnel.price + cur.funnel.success },
     { name: 'سعر', count: cur.funnel.price + cur.funnel.success },
     { name: 'استجابة', count: cur.funnel.success }
   ];

   // 2. Trend Data (Mocked out dynamically from reports)
   const trendMap: Record<string, any> = {};
   reports.forEach(r => {
      const d = r.date || r.createdAt;
      if (!d) return;
      if (!trendMap[d]) trendMap[d] = { date: d, msgs: 0, interactions: 0, conv: 0 };
      trendMap[d].msgs += r.parsedData?.totalMessages || r.parsedData?.summary?.totalMessages || 0;
      trendMap[d].interactions += r.parsedData?.interactions || r.parsedData?.summary?.interactions || 0;
   });
   const trendData = Object.values(trendMap).slice(0, 14).reverse(); // simple chronological

   // 4. Ad Matrix (Scatter)
   const scatterData = Object.entries(cur.adsData).map(([name, data]: any, i) => {
       const total = data.greeting + data.details + data.price + data.success;
       const conv = total > 0 ? (data.success / total) * 100 : 0;
       return { name, volume: total, conv: parseFloat(conv.toFixed(1)), z: data.success * 10 || 50, fill: conv > 10 ? '#10B981' : (conv > 5 ? '#F59E0B' : '#EF4444') };
   });

   // 5. Drop-off Per Ad
   const dropOffAdData = Object.entries(cur.adsData).map(([name, data]: any) => {
      return { name: name.substring(0, 10), "بعد التحية": data.greeting, "بعد التفاصيل": data.details, "بعد السعر": data.price };
   });

   // 7. Heatmap (CSS Grid mockup)
   const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

   // 8. Platform Donut
   let wa = 0; let ms = 0;
   reports.forEach(r => {
       if (r.platform?.toLowerCase().includes('واتساب') || r.platform?.toLowerCase().includes('whatsapp')) wa++;
       else ms++;
   });
   const donutData = [{ name: 'واتساب', value: wa }, { name: 'ماسنجر', value: ms }];

   // 9. Job Confusion cards
   const confusionAds = Object.entries(cur.adsData).map(([name, data]: any) => {
      const total = data.greeting + data.details + data.price + data.success;
      // Using global confusion proportionally or mocked if per-ad isn't precise in text
      const confuse = total > 0 ? (data.confusion / total) * 100 : 0;
      return { name, confuse: parseFloat(confuse.toFixed(1)) };
   }).sort((a,b) => b.confuse - a.confuse).slice(0, 3);

   return (
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full" dir="ltr">
           
           {/* Chart 1: Funnel */}
           <ChartCard title="قمع التحويل" subtitle="تتبع التسرب في مراحل المحادثة">
               <ResponsiveContainer width="100%" height="100%">
                   <BarChart layout="vertical" data={funnelData} margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#E2E8F0" />
                       <XAxis type="number" hide />
                       <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 'bold' }} />
                       <Tooltip cursor={{ fill: '#F7F9FC' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                       <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={24} />
                   </BarChart>
               </ResponsiveContainer>
           </ChartCard>

           {/* Chart 2: Daily Trend */}
           <ChartCard title="الاتجاه اليومي" subtitle="مقارنة الرسائل والتفاعل والتحويل مجمعة">
               <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                       <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                       <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }} />
                       <Line type="monotone" dataKey="msgs" name="الرسائل" stroke="#94A3B8" strokeWidth={2} dot={false} />
                       <Line type="monotone" dataKey="interactions" name="التفاعل" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                   </LineChart>
               </ResponsiveContainer>
           </ChartCard>

           {/* Chart 4: Ad Matrix */}
           <ChartCard title="مصفوفة الإعلانات" subtitle="حجم التفاعل مقابل معدل التحويل للإعلان" fullWidth>
               <ResponsiveContainer width="100%" height="100%">
                   <ScatterChart margin={{ top: 20, right: 30, left: -20, bottom: 10 }}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                       <XAxis type="number" dataKey="volume" name="رسائل" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                       <YAxis type="number" dataKey="conv" name="التحويل %" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                       <ZAxis type="number" dataKey="z" range={[60, 400]} />
                       <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }} />
                       <Scatter name="الإعلانات" data={scatterData} opacity={0.8} />
                   </ScatterChart>
               </ResponsiveContainer>
           </ChartCard>

           {/* Chart 5: Drop-off per Ad */}
           <ChartCard title="تحليل التسرب الإعلاني" subtitle="تفصيل مكان خسارة العملاء لكل إعلان" fullWidth>
               <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={dropOffAdData.slice(0,8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                       <Tooltip cursor={{ fill: '#F7F9FC' }} contentStyle={{ borderRadius: '12px',textAlign: 'right' }} />
                       <Legend verticalAlign="top" height={36} iconType="circle" />
                       <Bar dataKey="بعد التحية" stackId="a" fill="#CBD5E1" />
                       <Bar dataKey="بعد التفاصيل" stackId="a" fill="#94A3B8" />
                       <Bar dataKey="بعد السعر" stackId="a" fill="#F59E0B" />
                   </BarChart>
               </ResponsiveContainer>
           </ChartCard>

           {/* Chart 8: Platform Donut */}
           <ChartCard title="مقارنة المنصات" subtitle="إنستغرام/ماسنجر مقابل واتساب">
               <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                       <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                           <Cell fill="#10B981" />
                           <Cell fill="#3B82F6" />
                       </Pie>
                       <Tooltip contentStyle={{ borderRadius: '12px',border: 'none',textAlign:'right' }} />
                       <Legend verticalAlign="bottom" height={36} iconType="circle" />
                   </PieChart>
               </ResponsiveContainer>
           </ChartCard>

           {/* Chart 9: Job Confusion (Custom UI) */}
           <ChartCard title="نسبة الخلط الوظيفي" subtitle="النسبة التي ظنت الإعلان وظيفة شاغرة">
               <div className="flex flex-col gap-4 mt-2 justify-center h-full" dir="rtl">
                   {confusionAds.length === 0 && <p className="text-[#64748B] text-center font-bold text-sm">ممتاز! لا يوجد أي نسبة خلط مسجلة</p>}
                   {confusionAds.map(ad => (
                       <div key={ad.name} className="flex flex-col gap-2 p-3 bg-[#F7F9FC] rounded-xl border border-[#E2E8F0]">
                           <div className="flex justify-between items-center text-[13px] font-bold">
                               <span className="text-[#1E293B] flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[16px] text-[#64748B]">campaign</span>
                                  {ad.name}
                               </span>
                               <span className={`${ad.confuse > 15 ? 'text-error' : (ad.confuse > 5 ? 'text-amber-500' : 'text-emerald-500')}`}>
                                  {ad.confuse}% خلط
                               </span>
                           </div>
                           <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden flex">
                               <div className={`${ad.confuse > 15 ? 'bg-error' : (ad.confuse > 5 ? 'bg-amber-500' : 'bg-emerald-500')} h-full rounded-full transition-all`} style={{ width: `${ad.confuse}%` }}></div>
                           </div>
                       </div>
                   ))}
               </div>
           </ChartCard>

       </div>
   );
}
