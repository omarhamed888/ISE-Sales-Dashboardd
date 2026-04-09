import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import type { RejectionReason } from '@/lib/services/gemini-parser';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  'سعر':               { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    hex: '#ef4444' },
  'خلط وظيفي':         { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', hex: '#f97316' },
  'عدم اهتمام':        { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200',   hex: '#6b7280' },
  'توقيت':             { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', hex: '#eab308' },
  'صيغة الدراسة':      { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   hex: '#3b82f6' },
  'احتياج غير مطابق':  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', hex: '#8b5cf6' },
  'سلطة قرار':         { bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200',   hex: '#ec4899' },
  'عدم فهم':           { bg: 'bg-cyan-100',   text: 'text-cyan-700',   border: 'border-cyan-200',   hex: '#06b6d4' },
  'قطاع/وظيفة':        { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  hex: '#10b981' },
  'أخرى':              { bg: 'bg-gray-50',    text: 'text-gray-400',   border: 'border-gray-100',   hex: '#d1d5db' },
};

const DEFAULT_COLOR = { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-100', hex: '#d1d5db' };

interface Props {
  reports: any[];
}

export function RejectionAnalyticsSection({ reports }: Props) {
  const { allReasons, categoryTotals, sortedReasons } = useMemo(() => {
    // Aggregate all rejection reasons across reports
    const reasonMap = new Map<string, RejectionReason>();

    for (const report of reports) {
      const reasons: RejectionReason[] = report?.parsedData?.rejectionReasons || [];
      for (const r of reasons) {
        if (!r.rawText) continue;
        const key = r.rawText.trim();
        if (reasonMap.has(key)) {
          const existing = reasonMap.get(key)!;
          reasonMap.set(key, { ...existing, count: existing.count + r.count });
        } else {
          reasonMap.set(key, { rawText: key, count: r.count, category: r.category || 'أخرى' });
        }
      }
    }

    const allReasons = Array.from(reasonMap.values()).sort((a, b) => b.count - a.count);

    // Category totals for bar chart
    const catMap = new Map<string, number>();
    for (const r of allReasons) {
      const cat = r.category || 'أخرى';
      catMap.set(cat, (catMap.get(cat) || 0) + r.count);
    }
    const categoryTotals = Array.from(catMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const sortedReasons = allReasons.slice(0, 20); // Top 20 for table

    return { allReasons, categoryTotals, sortedReasons };
  }, [reports]);

  if (allReasons.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-8 shadow-sm flex items-center justify-center min-h-[160px]">
        <p className="text-[#64748B] font-bold text-[13px]">لا توجد بيانات رفض في هذه الفترة.</p>
      </div>
    );
  }

  // Word cloud font size scale
  const maxCount = Math.max(...allReasons.map(r => r.count), 1);
  const minFontSize = 0.75;
  const maxFontSize = 2;

  const getFontSize = (count: number) => {
    const ratio = count / maxCount;
    return (minFontSize + ratio * (maxFontSize - minFontSize)).toFixed(2) + 'rem';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Word Cloud */}
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
        <h3 className="text-[15px] font-black text-[#1E293B] mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-500">tag</span>
          سحابة أسباب الرفض
        </h3>
        <div className="flex flex-wrap gap-3 leading-loose p-2">
          {allReasons.map((reason, i) => {
            const colors = CATEGORY_COLORS[reason.category] || DEFAULT_COLOR;
            return (
              <span
                key={i}
                title={`${reason.category}: ${reason.count} مرة`}
                className={`inline-block px-3 py-1 rounded-xl border font-bold cursor-default transition-all hover:opacity-80 hover:scale-105 ${colors.bg} ${colors.text} ${colors.border}`}
                style={{ fontSize: getFontSize(reason.count) }}
              >
                {reason.rawText}
              </span>
            );
          })}
        </div>
        {/* Category Legend */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E2E8F0] pt-4">
          {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
            <span key={cat} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
        <h3 className="text-[15px] font-black text-[#1E293B] mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500">bar_chart</span>
          الرفض حسب الفئة
        </h3>
        {categoryTotals.length === 0 ? (
          <p className="text-[#64748B] text-[13px] font-bold">لا توجد بيانات في هذه الفترة.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryTotals} layout="vertical" margin={{ right: 16, left: 0, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }}
                width={100}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [String(value) + ' حالة', 'العدد']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700 }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {categoryTotals.map((entry, index) => (
                  <Cell key={index} fill={(CATEGORY_COLORS[entry.category] || DEFAULT_COLOR).hex} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Reasons Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm lg:col-span-2">
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F7F9FC] flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500">format_list_numbered</span>
          <h3 className="text-[15px] font-black text-[#1E293B]">أبرز أسباب الرفض</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[13px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F7F9FC]/50">
                <th className="p-4 font-bold text-[#64748B] w-8">#</th>
                <th className="p-4 font-bold text-[#64748B]">سبب الرفض</th>
                <th className="p-4 font-bold text-[#64748B] w-36">الفئة</th>
                <th className="p-4 font-bold text-[#64748B] w-24 text-center">العدد</th>
              </tr>
            </thead>
            <tbody>
              {sortedReasons.map((reason, i) => {
                const colors = CATEGORY_COLORS[reason.category] || DEFAULT_COLOR;
                const isEven = i % 2 === 0;
                return (
                  <tr key={i} className={`border-b border-[#E2E8F0] last:border-0 hover:bg-[#EFF6FF]/40 transition-colors ${isEven ? "bg-white" : "bg-[#FAFBFC]"}`}>
                    <td className="p-4 font-black text-[#94A3B8]">{i + 1}</td>
                    <td className="p-4 font-bold text-[#0F172A]">{reason.rawText}</td>
                    <td className="p-4">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {reason.category}
                      </span>
                    </td>
                    <td className="p-4 text-center font-black text-[#0F172A]">{reason.count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
