import { useState } from "react";

interface ReportDetailModalProps {
  report: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportDetailModal({ report, isOpen, onClose }: ReportDetailModalProps) {
  const [showRawText, setShowRawText] = useState(false);

  if (!isOpen || !report) return null;

  const pd = report.parsedData;
  if (!pd) return null;

  const sum = pd.summary || {};
  const f = pd.funnel || pd.funnels || {};

  // Construct table breakdown by Ad
  // We look through greeting, details, price, success steps
  const adStats: Record<string, any> = {};

  const processStage = (arr: any[], stageField: string) => {
      if (!Array.isArray(arr)) return;
      arr.forEach(item => {
          const ad = item.adName || "عام";
          if (!adStats[ad]) adStats[ad] = { greeting: 0, details: 0, price: 0, success: 0, total: 0 };
          adStats[ad][stageField] += (item.count || 0);
          adStats[ad].total += (item.count || 0);
      });
  };

  processStage(f.noReplyAfterGreeting || f.noReplyGreeting, "greeting");
  processStage(f.noReplyAfterDetails || f.noReplyDetails, "details");
  processStage(f.noReplyAfterPrice || f.noReplyPrice, "price");
  processStage(f.repliedAfterPrice, "success");

  const adsRows = Object.entries(adStats).map(([adName, s]: any) => ({
      adName,
      ...s
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/40 backdrop-blur-sm px-4" dir="rtl">
      <div className="bg-white rounded-[24px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 font-body flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#E2E8F0] bg-[#F7F9FC]">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                <span className="material-symbols-outlined text-[24px]">description</span>
             </div>
             <div>
                 <h2 className="text-[18px] font-black font-headline text-[#1E293B]">تقرير الأداء اليومي</h2>
                 <p className="text-[12px] font-bold text-[#64748B] flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-[14px]">calendar_month</span> {report.date}
                    <span className="text-[#CBD5E1]">•</span>
                    <span className="material-symbols-outlined text-[14px]">person</span> {report.salesRepName}
                    <span className="text-[#CBD5E1]">•</span>
                    <span className="material-symbols-outlined text-[14px]">apps</span> {report.platform}
                 </p>
             </div>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:bg-white p-2 rounded-full transition-colors border border-transparent hover:border-[#E2E8F0] shadow-sm hover:shadow-md">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto hide-scrollbar space-y-6 bg-white">
            
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#F7F9FC] border border-[#E2E8F0] p-4 rounded-xl text-center">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">الرسائل المستلمة</p>
                    <p className="text-[20px] font-black text-[#1E293B]">{sum.totalMessages || 0}</p>
                </div>
                <div className="bg-[#F7F9FC] border border-[#E2E8F0] p-4 rounded-xl text-center">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">الردود الفعالة</p>
                    <p className="text-[20px] font-black text-[#1E293B]">{sum.interactions || 0}</p>
                </div>
                <div className="bg-[#EFF6FF] border border-[#2563EB]/20 p-4 rounded-xl text-center">
                    <p className="text-[11px] font-bold text-[#2563EB] uppercase tracking-widest mb-1">معدل التحويل</p>
                    <p className="text-[20px] font-black text-[#2563EB]">{sum.conversionRate || 0}%</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-1">خلط توظيف</p>
                    <p className="text-[20px] font-black text-amber-900">{pd.jobConfusionCount || 0}</p>
                </div>
            </div>

            {/* Ad Breakdown Table */}
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="bg-[#F7F9FC] px-4 py-3 border-b border-[#E2E8F0] flex justify-between items-center">
                    <h3 className="font-bold text-[#1E293B] text-[14px]">تحليل النزيف حسب الحملة</h3>
                </div>
                {adsRows.length === 0 ? (
                    <div className="p-4 text-center text-[12px] font-bold text-[#64748B]">لا يوجد تحليل مفصل للحملات في هذا التقرير</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-[12px]">
                            <thead className="bg-[#F7F9FC]">
                                <tr>
                                    <th className="px-4 py-3 font-bold text-[#64748B] border-b border-[#E2E8F0]">اسم الإعلان</th>
                                    <th className="px-4 py-3 font-bold text-[#64748B] border-b border-[#E2E8F0] text-center">الإجمالي</th>
                                    <th className="px-4 py-3 font-bold text-[#64748B] border-b border-[#E2E8F0] text-center">تسرب أهلاً</th>
                                    <th className="px-4 py-3 font-bold text-[#64748B] border-b border-[#E2E8F0] text-center">تسرب تفاصيل</th>
                                    <th className="px-4 py-3 font-bold text-[#64748B] border-b border-[#E2E8F0] text-center">تسرب سعر</th>
                                    <th className="px-4 py-3 font-bold text-[#2563EB] border-b border-[#E2E8F0] text-center bg-[#EFF6FF]/50">تحويل ناجح</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                                {adsRows.map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-[#F7F9FC]/50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-[#1E293B] max-w-[150px] truncate">{row.adName}</td>
                                        <td className="px-4 py-3 font-bold text-center">{row.total}</td>
                                        <td className="px-4 py-3 text-center text-error font-medium">{row.greeting}</td>
                                        <td className="px-4 py-3 text-center text-error font-medium">{row.details}</td>
                                        <td className="px-4 py-3 text-center text-error font-medium">{row.price}</td>
                                        <td className="px-4 py-3 text-center text-[#2563EB] font-black bg-[#EFF6FF]/30">{row.success}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Special Cases */}
            {pd.specialCases && pd.specialCases.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                    <h3 className="font-bold text-amber-900 text-[14px] flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                        حالات خاصة / ملاحظات الموظف
                    </h3>
                    <ul className="space-y-2">
                        {pd.specialCases.map((sc: string, i: number) => (
                            <li key={i} className="text-[12px] font-bold text-amber-800 flex items-start gap-2 leading-relaxed">
                                <span className="mt-0.5">•</span> {sc}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Raw Text Accordion */}
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <button 
                  onClick={() => setShowRawText(!showRawText)}
                  className="w-full bg-[#F7F9FC] px-5 py-4 flex justify-between items-center hover:bg-[#E2E8F0]/50 transition-colors"
                >
                    <span className="font-bold text-[#1E293B] text-[13px] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#64748B] text-[18px]">short_text</span>
                        النص الأصلي للتقرير
                    </span>
                    <span className="material-symbols-outlined text-[#64748B] transition-transform" style={{ transform: showRawText ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                </button>
                {showRawText && (
                    <div className="p-5 bg-white text-[12px] font-medium text-[#475569] leading-loose whitespace-pre-wrap border-t border-[#E2E8F0]">
                        {report.rawText}
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}
