import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';

export function AdMatrixChart({ ads }: { ads: any[] }) {
    const data = ads.filter(a => a.total > 0).map(a => ({
        name: a.name,
        volume: a.total,
        conv: parseFloat(a.conv.toFixed(1)),
        z: (a.funnel.success * 20) + 60, // Minimum size 60
        fill: a.state === 'قوي' ? '#10B981' : (a.state === 'متوسط' ? '#F59E0B' : '#EF4444')
    }));

    return (
        <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-sm border border-[#E2E8F0] font-body mt-6">
            <div className="mb-8" dir="rtl">
                <h3 className="text-[18px] font-black font-headline tracking-tighter text-[#1E293B] mb-1">مصفوفة أداء الحملات</h3>
                <p className="text-[12px] text-[#64748B] font-bold">يوضح المخطط حجم الجمهور المستقطب مقابل كفاءة الإغلاق. الدوائر الكبيرة تعني عدد تحويلات (مبيعات) أعلى.</p>
            </div>
            
            <div className="w-full relative" dir="ltr">
                <div style={{ width: '100%', height: 300 }} className="relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.5} />
                        <XAxis type="number" dataKey="volume" name="Reach" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 'bold' }} tickMargin={10} />
                        <YAxis type="number" dataKey="conv" name="Conv Rate %" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 'bold' }} tickMargin={10} />
                        <ZAxis type="number" dataKey="z" range={[80, 1000]} />
                        <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }} 
                            contentStyle={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', textAlign: 'right', fontWeight: 'bold', fontFamily: 'inherit' }} 
                        />
                        <Scatter name="حملات" data={data} opacity={0.8} />
                    </ScatterChart>
                </ResponsiveContainer>
                
                {/* Quadrant Labels (CSS Overlay) */}
                <div className="absolute inset-0 pointer-events-none p-[20px] pb-[40px] pl-[50px] flex" dir="rtl">
                     <div className="flex-1 border-b border-l border-dashed border-[#CBD5E1]/40 relative">
                         <span className="absolute top-4 left-4 text-[10px] font-black text-[#10B981] bg-[#10B981]/10 px-2 py-1 rounded-lg">نجوم - زود الإنفاق</span>
                     </div>
                     <div className="flex-1 border-b border-dashed border-[#CBD5E1]/40 relative">
                         <span className="absolute top-4 right-4 text-[10px] font-black text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 rounded-lg">راجع الاستهداف</span>
                     </div>
                </div>
                <div className="absolute inset-x-0 bottom-[40px] top-[140px] pointer-events-none pl-[50px] flex" dir="rtl">
                     <div className="flex-1 border-l border-dashed border-[#CBD5E1]/40 relative">
                         <span className="absolute bottom-4 left-4 text-[10px] font-black text-[#2563EB] bg-[#2563EB]/10 px-2 py-1 rounded-lg">واعد المبيعات</span>
                     </div>
                     <div className="flex-1 relative">
                         <span className="absolute bottom-4 right-4 text-[10px] font-black text-[#EF4444] bg-[#EF4444]/10 px-2 py-1 rounded-lg">مكلف - تخلص منه</span>
                     </div>
                </div>
                </div>
            </div>
        </div>
    );
}
