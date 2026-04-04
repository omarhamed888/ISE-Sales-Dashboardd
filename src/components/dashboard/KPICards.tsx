import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";

export function KPICards({ reports, prevReports }: { reports: any[], prevReports: any[] }) {
   const cur = calculateAggregates(reports);
   const prev = calculateAggregates(prevReports);

   const TrendArrow = ({ current, previous, reverse = false }: any) => {
       if (previous === 0) return <span className="text-emerald-500 text-[11px] font-bold">جديد</span>;
       const diff = current - previous;
       const percentage = Math.abs((diff / previous) * 100).toFixed(0);
       const isGood = reverse ? diff < 0 : diff >= 0;
       return (
           <span className={`text-[11px] font-bold flex items-center ${isGood ? 'text-emerald-500' : 'text-error'}`}>
               {diff >= 0 ? '↑' : '↓'} {percentage}% عن السابق
           </span>
       );
   };

   return (
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
           
           {/* Card 1 */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col justify-center">
               <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-primary">
                       <span className="material-symbols-outlined text-[20px]">forum</span>
                   </div>
                   <h4 className="text-[14px] text-[#64748B] font-bold">إجمالي الرسائل</h4>
               </div>
               <div className="flex items-end justify-between mt-2">
                  <span className="text-[32px] font-black text-[#1E293B] font-headline tracking-tighter leading-none">{cur.totalMessages.toLocaleString()}</span>
                  <TrendArrow current={cur.totalMessages} previous={prev.totalMessages} />
               </div>
           </div>

           {/* Card 2 */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col justify-center">
               <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                       <span className="material-symbols-outlined text-[20px]">trending_up</span>
                   </div>
                   <h4 className="text-[14px] text-[#64748B] font-bold">معدل التحويل</h4>
               </div>
               <div className="flex items-end justify-between mt-2">
                  <span className="text-[32px] font-black text-[#1E293B] font-headline tracking-tighter leading-none">{cur.conversionRate.toFixed(1)}%</span>
                  <TrendArrow current={cur.conversionRate} previous={prev.conversionRate} />
               </div>
           </div>

           {/* Card 3 */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col justify-center">
               <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                       <span className="material-symbols-outlined text-[20px]">touch_app</span>
                   </div>
                   <h4 className="text-[14px] text-[#64748B] font-bold">إجمالي التفاعل</h4>
               </div>
               <div className="flex items-end justify-between mt-2">
                  <span className="text-[32px] font-black text-[#1E293B] font-headline tracking-tighter leading-none">{cur.interactions.toLocaleString()}</span>
                  <TrendArrow current={cur.interactions} previous={prev.interactions} />
               </div>
           </div>

           {/* Card 4 */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col justify-center">
               <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                       <span className="material-symbols-outlined text-[20px]">warning</span>
                   </div>
                   <h4 className="text-[14px] text-[#64748B] font-bold">أكبر تسرب</h4>
               </div>
               <div className="flex items-end justify-between mt-2">
                  <span className="text-[20px] font-black text-amber-600 font-headline tracking-tighter leading-none">{cur.biggestDrop}</span>
                  <span className="text-[11px] font-bold text-error">{cur.dropPercentage}% يغادرون هنا</span>
               </div>
           </div>

       </div>
   );
}
