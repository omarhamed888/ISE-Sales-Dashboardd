import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getAllDeals, computeDealCycleStats, type DealCycleStats } from '@/lib/services/deals-service';

const TEAM_COLORS = [
  '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
];

function CycleStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-bold text-[#64748B] mb-1">{label}</p>
      <p className="text-[22px] font-black text-[#1E293B] leading-none">{value}</p>
      {sub && <p className="text-[10px] font-bold text-[#94A3B8] mt-0.5">{sub}</p>}
    </div>
  );
}

export function DealCycleSection() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<DealCycleStats | null>(null);
  const [byTeam, setByTeam] = useState<DealCycleStats[]>([]);

  useEffect(() => {
    getAllDeals().then(deals => {
      const stats = computeDealCycleStats(deals);
      setCompany(stats.company);
      setByTeam(stats.byTeam);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-8 shadow-sm flex items-center justify-center min-h-[160px]">
        <span className="material-symbols-outlined animate-spin text-[#2563EB]">progress_activity</span>
      </div>
    );
  }

  if (!company || company.totalDeals === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-8 shadow-sm flex items-center justify-center min-h-[160px]">
        <p className="text-[#64748B] font-bold text-[13px]">لا توجد صفقات مغلقة بعد.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Company-wide KPIs */}
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm lg:col-span-2">
        <h3 className="text-[15px] font-black text-[#1E293B] mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#2563EB]">timer</span>
          متوسط دورة الإغلاق — الشركة كلها
          <span className="text-[11px] font-bold text-[#94A3B8] mr-1">(كل الوقت)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 divide-x divide-x-reverse divide-[#E2E8F0]">
          <CycleStat
            label="متوسط الإغلاق"
            value={`${company.avgCycleDays} يوم`}
            sub="من أول تواصل لحد الإغلاق"
          />
          <CycleStat
            label="أسرع صفقة"
            value={`${company.minCycleDays} يوم`}
          />
          <CycleStat
            label="أبطأ صفقة"
            value={`${company.maxCycleDays} يوم`}
          />
          <CycleStat
            label="إجمالي الصفقات"
            value={company.totalDeals}
          />
          <CycleStat
            label="إجمالي الإيرادات"
            value={company.totalRevenue.toLocaleString('en-US')}
            sub="جنيه"
          />
        </div>
      </div>

      {/* Per-team bar chart */}
      {byTeam.length > 1 && (
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
          <h3 className="text-[15px] font-black text-[#1E293B] mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#10B981]">bar_chart</span>
            متوسط الإغلاق حسب الفريق (أيام)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byTeam} margin={{ right: 8, left: 0, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                unit=" يوم"
              />
              <Tooltip
                formatter={(v) => [`${v} يوم`, 'متوسط الإغلاق']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit' }}
              />
              <Bar dataKey="avgCycleDays" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {byTeam.map((_, i) => (
                  <Cell key={i} fill={TEAM_COLORS[i % TEAM_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-team table */}
      <div className={`bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm ${byTeam.length <= 1 ? 'lg:col-span-2' : ''}`}>
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F7F9FC] flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500">groups</span>
          <h3 className="text-[15px] font-black text-[#1E293B]">تفاصيل الفرق</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[13px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F7F9FC]/50">
                <th className="p-4 font-bold text-[#64748B]">الفريق</th>
                <th className="p-4 font-bold text-[#64748B] text-center">الصفقات</th>
                <th className="p-4 font-bold text-[#64748B] text-center">متوسط الإغلاق</th>
                <th className="p-4 font-bold text-[#64748B] text-center">أسرع</th>
                <th className="p-4 font-bold text-[#64748B] text-center">أبطأ</th>
                <th className="p-4 font-bold text-[#64748B] text-center">الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              {byTeam.map((team, i) => (
                <tr key={i} className={`border-b border-[#E2E8F0] last:border-0 hover:bg-[#EFF6FF]/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}`}>
                  <td className="p-4 font-bold text-[#0F172A] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
                    {team.label}
                  </td>
                  <td className="p-4 text-center font-black text-[#1E293B]">{team.totalDeals}</td>
                  <td className="p-4 text-center">
                    <span className="font-black text-[#2563EB]">{team.avgCycleDays}</span>
                    <span className="text-[11px] font-bold text-[#64748B]"> يوم</span>
                  </td>
                  <td className="p-4 text-center font-bold text-[#10B981]">{team.minCycleDays} يوم</td>
                  <td className="p-4 text-center font-bold text-[#EF4444]">{team.maxCycleDays} يوم</td>
                  <td className="p-4 text-center font-bold text-[#0F172A]">{team.totalRevenue.toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
