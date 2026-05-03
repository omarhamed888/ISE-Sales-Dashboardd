import { useState } from "react";
import { Link } from "react-router-dom";

export function AdCardsList({ ads }: { ads: any[] }) {
    const [sortMethod, setSortMethod] = useState("conv"); // conv, reach, confusion

    const sortedAds = [...ads].sort((a, b) => {
        if (sortMethod === "reach") return b.total - a.total;
        if (sortMethod === "confusion") return b.confusion - a.confusion;
        return b.conv - a.conv; // default to conv
    });

    return (
        <div className="mt-10 font-body" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-schema mb-6">
                 <div>
                     <h2 className="text-[20px] font-black text-[#1E293B] font-headline">تفاصيل الحملات التنافسية</h2>
                     <p className="text-[13px] font-bold text-[#64748B]">تقرير تفصيلي لتدفق مبيعات كل إعلان على حدة.</p>
                 </div>
                 
                 <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-[#E2E8F0] shadow-sm w-max">
                     {[
                         { id: "conv", label: "التحويل" },
                         { id: "reach", label: "الوصول" },
                         { id: "confusion", label: "الخلط" }
                     ].map(opt => (
                         <button 
                             key={opt.id}
                             onClick={() => setSortMethod(opt.id)}
                             className={`px-4 py-2 rounded-lg text-[12px] font-black transition-colors ${sortMethod === opt.id ? 'bg-[#1E293B] text-white shadow-sm' : 'text-[#64748B] hover:text-[#1E293B]'}`}
                         >
                             {opt.label}
                         </button>
                     ))}
                 </div>
            </div>

            {sortedAds.length === 0 && (
                <div className="bg-white rounded-[24px] p-10 text-center border border-[#E2E8F0]">
                    <p className="text-[#64748B] font-bold text-sm">لا تتطابق أي إعلانات مع بحثك الحالي.</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sortedAds.map((ad, idx) => {
                    const badgeUI = 
                        ad.state === 'قوي' ? { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '🟢', label: 'قوي' } :
                        ad.state === 'متوسط' ? { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '🟡', label: 'متوسط' } :
                        ad.state === 'خلط' ? { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '⚠️', label: 'خلط' } :
                        { bg: 'bg-red-50', text: 'text-error', border: 'border-red-200', icon: '🔴', label: 'ضعيف' };

                    // Calculate funnel stages for visuals
                    const totalLead = ad.funnel.greeting + ad.funnel.details + ad.funnel.price + ad.funnel.success;
                    const stage1Width = totalLead > 0 ? 100 : 0; // "أهلاً" is everyone basically 100%
                    const stage2Width = totalLead > 0 ? ((ad.funnel.details + ad.funnel.price + ad.funnel.success) / totalLead) * 100 : 0;
                    const stage3Width = totalLead > 0 ? ((ad.funnel.price + ad.funnel.success) / totalLead) * 100 : 0;
                    const stage4Width = totalLead > 0 ? (ad.funnel.success / totalLead) * 100 : 0;

                    return (
                        <div key={idx} className="bg-white rounded-[24px] p-6 pr-8 border border-[#E2E8F0] shadow-sm relative overflow-hidden flex flex-col justify-between">
                            {/* Color Highlight Line */}
                            <div className="absolute top-0 right-0 w-2 h-full" style={{ backgroundColor: ad.state === 'قوي' ? '#10B981' : ad.state === 'ضعيف' ? '#EF4444' : ad.state === 'خلط' ? '#F97316' : '#F59E0B' }}></div>
                            
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-6 border-b border-[#E2E8F0] pb-4">
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <span className="material-symbols-outlined text-[18px] text-[#2563EB]">campaign</span>
                                      <h3 className="text-[17px] font-black text-[#1E293B] font-headline">{ad.name}</h3>
                                   </div>
                                </div>
                                <span className={`px-3 py-1.5 rounded-xl text-[11px] font-black border ${badgeUI.bg} ${badgeUI.text} ${badgeUI.border} shadow-sm flex items-center gap-1`}>
                                    {badgeUI.icon} {badgeUI.label}
                                </span>
                            </div>

                            {/* Core Metrics */}
                            <div className="grid grid-cols-4 gap-2 text-center mb-6">
                                <div>
                                    <p className="text-[10px] font-bold text-[#64748B] mb-1">الوصول</p>
                                    <p className="text-[15px] font-black text-[#1E293B]">{ad.total.toLocaleString('en-US')}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-[#64748B] mb-1">التفاعل</p>
                                    <p className="text-[15px] font-black text-[#1E293B]">{ad.interactions.toLocaleString('en-US')}</p>
                                </div>
                                <div className="bg-[#EFF6FF] rounded-lg -m-1 p-1">
                                    <p className="text-[10px] font-bold text-[#2563EB]/70 mb-1">التحويل</p>
                                    <p className="text-[15px] font-black text-[#2563EB]">{ad.conv.toFixed(1)}%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-[#64748B] mb-1">الخلط</p>
                                    <p className={`text-[15px] font-black ${ad.confusion > 15 ? 'text-error' : 'text-[#1E293B]'}`}>{ad.confusion.toFixed(1)}%</p>
                                </div>
                            </div>

                            {/* Visual Funnel */}
                            <div className="space-y-3 mb-6 bg-[#F7F9FC] p-4 rounded-2xl border border-[#E2E8F0]/50">
                                <p className="text-[11px] font-bold text-[#64748B] mb-3">قمع الإعلان التدريجي:</p>
                                
                                <div className="flex items-center gap-3">
                                   <span className="text-[11px] font-bold w-12 text-[#1E293B]">أهلاً</span>
                                   <div className="flex-1 h-3 bg-white rounded-full overflow-hidden shadow-sm border border-[#E2E8F0]">
                                       <div className="h-full bg-[#94A3B8] rounded-full" style={{ width: `${stage1Width}%` }}></div>
                                   </div>
                                   <span className="text-[10px] font-black w-8 text-left text-[#64748B]">{Math.round(stage1Width)}%</span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                   <span className="text-[11px] font-bold w-12 text-[#1E293B]">تفاصيل</span>
                                   <div className="flex-1 h-3 bg-white rounded-full overflow-hidden shadow-sm border border-[#E2E8F0]">
                                       <div className="h-full bg-[#2563EB] rounded-full opacity-80" style={{ width: `${stage2Width}%` }}></div>
                                   </div>
                                   <span className="text-[10px] font-black w-8 text-left text-[#64748B]">{Math.round(stage2Width)}%</span>
                                </div>

                                <div className="flex items-center gap-3">
                                   <span className="text-[11px] font-bold w-12 text-[#1E293B]">سعر</span>
                                   <div className="flex-1 h-3 bg-white rounded-full overflow-hidden shadow-sm border border-[#E2E8F0]">
                                       <div className="h-full bg-[#10B981] rounded-full opacity-80" style={{ width: `${stage3Width}%` }}></div>
                                   </div>
                                   <span className="text-[10px] font-black w-8 text-left text-[#64748B]">{Math.round(stage3Width)}%</span>
                                </div>

                                <div className="flex items-center gap-3">
                                   <span className="text-[11px] font-bold w-12 text-[#1E293B]">تفاعل</span>
                                   <div className="flex-1 h-3 bg-white rounded-full overflow-hidden shadow-sm border border-[#E2E8F0]">
                                       <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${stage4Width}%` }}></div>
                                   </div>
                                   <span className="text-[10px] font-black w-8 text-left text-[#10B981]">{Math.round(stage4Width)}%</span>
                                </div>
                            </div>

                            {/* Deep Insights context */}
                            <div className="mb-6 space-y-3">
                                <div className="flex items-center gap-2 text-[12px] font-black bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-200/50">
                                    <span className="material-symbols-outlined text-[16px]">priority_high</span>
                                    أكبر تسرب للعملاء: عند {ad.biggestDrop} (↓{Math.round(ad.dropRate)}%)
                                </div>
                                
                                {ad.notes && ad.notes.length > 0 && (
                                    <div className="bg-[#1E293B]/5 p-3 rounded-xl border border-[#1E293B]/10">
                                        <p className="text-[10px] font-black text-[#1E293B] mb-2 px-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px] text-[#2563EB]">auto_awesome</span>
                                            ملاحظات الشائعة من الـ AI
                                        </p>
                                        <ul className="space-y-1.5 px-2">
                                            {ad.notes.map((note: string, idx: number) => (
                                                <li key={idx} className="text-[11px] font-bold text-[#475569] flex items-start gap-1.5 leading-relaxed">
                                                    <span className="text-[#2563EB] font-black mt-[-1px]">•</span> {note}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <Link to="/reports" className="mt-auto block text-center w-full py-3 bg-[#F7F9FC] text-[#1E293B] border border-[#E2E8F0] rounded-xl text-[12px] font-black hover:bg-[#E2E8F0] transition-colors">
                                عرض جميع التقارير
                            </Link>

                        </div>
                    );
                })}
            </div>
        </div>
    );
}
