import { useEffect, useState, useMemo } from 'react';
import { getAllDeals } from '@/lib/services/deals-service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#14B8A6','#6366F1'];

interface RepStats {
  name: string;
  teamName: string;
  deals: number;
  revenue: number;
  avgCycleDays: number;
  programs: Record<string, number>;
}

export default function DealsAnalyticsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterRep, setFilterRep] = useState('الكل');
  const [filterTeam, setFilterTeam] = useState('الكل');

  useEffect(() => {
    getAllDeals().then(setDeals).catch(console.error).finally(() => setLoading(false));
  }, []);

  const allReps = useMemo(() => ['الكل', ...Array.from(new Set(deals.map(d => d.salesRepName).filter(Boolean)))], [deals]);
  const allTeams = useMemo(() => ['الكل', ...Array.from(new Set(deals.map(d => d.teamName).filter(Boolean)))], [deals]);

  const filtered = useMemo(() => {
    return deals.filter(d => {
      if (filterRep !== 'الكل' && d.salesRepName !== filterRep) return false;
      if (filterTeam !== 'الكل' && d.teamName !== filterTeam) return false;
      if (dateFrom && d.closeDate < dateFrom) return false;
      if (dateTo && d.closeDate > dateTo) return false;
      return true;
    });
  }, [deals, filterRep, filterTeam, dateFrom, dateTo]);

  // Company totals
  const totalDeals = filtered.length;
  const totalRevenue = filtered.reduce((s, d) => s + (d.dealValue || 0), 0);
  const dealsWithCycle = filtered.filter(d => typeof d.closingCycleDays === 'number' && d.closingCycleDays !== null);
  const avgCycle = dealsWithCycle.length > 0
    ? Math.round(dealsWithCycle.reduce((s, d) => s + d.closingCycleDays, 0) / dealsWithCycle.length)
    : 0;
  const totalPrograms = filtered.reduce((s, d) => s + (d.programCount || 1), 0);

  // Per-rep stats
  const repStats: RepStats[] = useMemo(() => {
    const map = new Map<string, RepStats>();
    for (const d of filtered) {
      const key = d.salesRepName || 'غير محدد';
      if (!map.has(key)) map.set(key, { name: key, teamName: d.teamName || '—', deals: 0, revenue: 0, avgCycleDays: 0, programs: {} });
      const s = map.get(key)!;
      s.deals++;
      s.revenue += d.dealValue || 0;
      s.avgCycleDays += d.closingCycleDays || 0;
      const prog = d.programName || 'غير محدد';
      s.programs[prog] = (s.programs[prog] || 0) + 1;
    }
    return Array.from(map.values()).map(s => ({
      ...s,
      avgCycleDays: s.deals > 0 ? Math.round(s.avgCycleDays / s.deals) : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  // Program distribution — top 7 + "أخرى"
  const programDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of filtered) {
      const p = d.programName || 'غير محدد';
      map.set(p, (map.get(p) || 0) + 1);
    }
    const sorted = Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (sorted.length <= 7) return sorted;
    const top7 = sorted.slice(0, 7);
    const rest = sorted.slice(7).reduce((s, x) => s + x.value, 0);
    return [...top7, { name: 'أخرى', value: rest }];
  }, [filtered]);

  // Data validation
  const suspiciousReps = useMemo(() => repStats.filter(r => r.avgCycleDays > 365), [repStats]);

  // Ad source distribution
  const adDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of filtered) {
      const a = d.adSource || 'غير محدد';
      map.set(a, (map.get(a) || 0) + 1);
    }
    return Array.from(map.entries()).map(([adName, count]) => ({ adName, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtered]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span className="material-symbols-outlined animate-spin text-[#2563EB] text-4xl">progress_activity</span></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-black text-[#1E293B]">تحليل الصفقات المغلقة</h1>
          <p className="text-[13px] font-bold text-[#64748B] mt-0.5">نظرة شاملة على أداء الفريق في إغلاق الصفقات</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-4 flex flex-wrap gap-3 items-center shadow-sm">
        <span className="material-symbols-outlined text-[#64748B] text-[18px]">filter_list</span>
        <select value={filterRep} onChange={e => setFilterRep(e.target.value)} className="text-[13px] font-bold bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none">
          {allReps.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="text-[13px] font-bold bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none">
          {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-[13px] font-bold bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none" />
        <span className="text-[#94A3B8] font-bold text-[12px]">←</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-[13px] font-bold bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none" />
        {(filterRep !== 'الكل' || filterTeam !== 'الكل' || dateFrom || dateTo) && (
          <button onClick={() => { setFilterRep('الكل'); setFilterTeam('الكل'); setDateFrom(''); setDateTo(''); }}
            className="text-[12px] font-bold text-[#EF4444] bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition-colors">
            إعادة ضبط
          </button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الصفقات', value: totalDeals, icon: 'handshake', color: '#2563EB', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'إجمالي الإيرادات', value: totalRevenue.toLocaleString() + ' ج', icon: 'payments', color: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'متوسط دورة الإغلاق', value: avgCycle + ' يوم', icon: 'timer', color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'إجمالي البرامج', value: totalPrograms, icon: 'school', color: '#8B5CF6', bg: 'bg-purple-50', border: 'border-purple-200' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white border ${kpi.border} rounded-[20px] p-5 shadow-sm flex items-center gap-4`}>
            <div className={`${kpi.bg} rounded-xl p-3`}>
              <span className="material-symbols-outlined text-[22px]" style={{ color: kpi.color, fontVariationSettings: "'FILL' 1" }}>{kpi.icon}</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#64748B]">{kpi.label}</p>
              <p className="text-[20px] font-black text-[#1E293B]">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue per rep bar chart */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
          <h3 className="text-[15px] font-black text-[#1E293B] mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2563EB]">bar_chart</span>
            الإيرادات لكل موظف
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={repStats} margin={{ right: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => (v/1000)+'k'} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString() + ' ج', 'الإيراد']} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit' }} />
              <Bar dataKey="revenue" radius={[6,6,0,0]} maxBarSize={48}>
                {repStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Program distribution — horizontal bar */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
          <h3 className="text-[15px] font-black text-[#1E293B] mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8B5CF6]">bar_chart_4_bars</span>
            توزيع البرامج المباعة
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(180, programDist.length * 34)}>
            <BarChart data={programDist} layout="vertical" margin={{ right: 40, left: 0, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [v + ' صفقة', 'العدد']} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26} label={{ position: 'right', fontSize: 11, fontWeight: 700, fill: '#64748B' }}>
                {programDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ad source bar */}
        {adDist.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm lg:col-span-2">
            <h3 className="text-[15px] font-black text-[#1E293B] mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F59E0B]">ads_click</span>
              أفضل الإعلانات في إغلاق الصفقات
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={adDist} layout="vertical" margin={{ right: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="adName" width={160} tick={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [v + ' صفقة', 'العدد']} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit' }} />
                <Bar dataKey="count" radius={[0,6,6,0]} maxBarSize={28}>
                  {adDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Validation warning */}
      {suspiciousReps.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-amber-500 text-[20px] flex-shrink-0 mt-0.5">warning</span>
          <div>
            <p className="text-[13px] font-bold text-amber-800">
              تحذير: {suspiciousReps.length > 1 ? 'بعض الموظفين لديهم' : `${suspiciousReps[0].name} لديه`} متوسط إغلاق يتجاوز 365 يوم
            </p>
            <p className="text-[11px] font-bold text-amber-600 mt-0.5">يرجى مراجعة تاريخ أول تواصل المُدخل في التقارير — قد يكون غير دقيق</p>
          </div>
        </div>
      )}

      {/* Per-rep detailed table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F7F9FC] flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500">leaderboard</span>
          <h3 className="text-[15px] font-black text-[#1E293B]">أداء كل موظف</h3>
        </div>
        {repStats.length === 0 ? (
          <div className="p-10 text-center text-[#64748B] font-bold text-[13px]">لا توجد صفقات في هذه الفترة.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F7F9FC]/50">
                  <th className="p-4 font-bold text-[#64748B] w-8">#</th>
                  <th className="p-4 font-bold text-[#64748B]">الموظف</th>
                  <th className="p-4 font-bold text-[#64748B]">الفريق</th>
                  <th className="p-4 font-bold text-[#64748B] text-center">الصفقات</th>
                  <th className="p-4 font-bold text-[#64748B] text-center">الإيرادات</th>
                  <th className="p-4 font-bold text-[#64748B] text-center">متوسط الإغلاق</th>
                  <th className="p-4 font-bold text-[#64748B] text-center">البرنامج الأكثر</th>
                </tr>
              </thead>
              <tbody>
                {repStats.map((rep, i) => {
                  const topProgram = Object.entries(rep.programs).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
                  const revenueShare = totalRevenue > 0 ? ((rep.revenue / totalRevenue) * 100).toFixed(0) : 0;
                  return (
                    <tr key={rep.name} className={`border-b border-[#E2E8F0] last:border-0 hover:bg-[#EFF6FF]/40 transition-colors ${i%2===0?'bg-white':'bg-[#FAFBFC]'}`}>
                      <td className="p-4 font-black text-[#94A3B8]">{i+1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] text-white flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }}>
                            {rep.name.charAt(0)}
                          </span>
                          <span className="font-bold text-[#0F172A]">{rep.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-[#64748B]">{rep.teamName}</td>
                      <td className="p-4 text-center">
                        <span className="font-black text-[#1E293B]">{rep.deals}</span>
                        <span className="text-[10px] font-bold text-[#94A3B8] mr-1">صفقة</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="font-black text-[#10B981]">{rep.revenue.toLocaleString()} ج</div>
                        <div className="text-[10px] font-bold text-[#94A3B8]">{revenueShare}% من الإجمالي</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-black ${rep.avgCycleDays > 365 ? 'text-[#EF4444]' : rep.avgCycleDays > 90 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>{rep.avgCycleDays}</span>
                        <span className="text-[11px] font-bold text-[#64748B]"> يوم</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2.5 py-1 rounded-full">{topProgram}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-[#1E293B] text-white">
                  <td className="p-4" colSpan={3}>
                    <span className="font-black text-[13px]">الإجمالي</span>
                  </td>
                  <td className="p-4 text-center font-black text-[13px]">{totalDeals}</td>
                  <td className="p-4 text-center font-black text-[13px] text-emerald-400">{totalRevenue.toLocaleString()} ج</td>
                  <td className="p-4 text-center font-black text-[13px] text-amber-400">{avgCycle} يوم</td>
                  <td className="p-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* All deals raw table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F7F9FC] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#2563EB]">receipt_long</span>
          <h3 className="text-[15px] font-black text-[#1E293B]">كل الصفقات ({filtered.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[12px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F7F9FC]/50">
                <th className="p-4 font-bold text-[#64748B]">العميل</th>
                <th className="p-4 font-bold text-[#64748B]">الموظف</th>
                <th className="p-4 font-bold text-[#64748B]">البرنامج</th>
                <th className="p-4 font-bold text-[#64748B]">المصدر</th>
                <th className="p-4 font-bold text-[#64748B] text-center">المبلغ</th>
                <th className="p-4 font-bold text-[#64748B] text-center">دورة الإغلاق</th>
                <th className="p-4 font-bold text-[#64748B] text-center">أول تواصل</th>
                <th className="p-4 font-bold text-[#64748B] text-center">تاريخ الإغلاق</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((deal, i) => (
                <tr key={deal.id} className={`border-b border-[#E2E8F0] last:border-0 hover:bg-[#EFF6FF]/30 ${i%2===0?'bg-white':'bg-[#FAFBFC]'}`}>
                  <td className="p-4 font-bold text-[#0F172A]">{deal.customerName || '—'}</td>
                  <td className="p-4 font-bold text-[#64748B]">{deal.salesRepName}</td>
                  <td className="p-4">
                    <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-full">{deal.programName}</span>
                  </td>
                  <td className="p-4 font-bold text-[#64748B] max-w-[150px] truncate">{deal.adSource || '—'}</td>
                  <td className="p-4 text-center font-black text-[#10B981]">{(deal.dealValue||0).toLocaleString()} ج</td>
                  <td className="p-4 text-center">
                    <span className="font-black text-[#F59E0B]">{deal.closingCycleDays ?? '—'}</span>
                    {deal.closingCycleDays != null && <span className="text-[10px] text-[#94A3B8]"> يوم</span>}
                  </td>
                  <td className="p-4 text-center font-bold text-[#64748B]" dir="ltr">{deal.firstContactDate || '—'}</td>
                  <td className="p-4 text-center font-bold text-[#64748B]" dir="ltr">{deal.closeDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 50 && (
            <p className="text-center text-[12px] font-bold text-[#94A3B8] py-4">يتم عرض أول 50 صفقة فقط</p>
          )}
        </div>
      </div>

    </div>
  );
}
