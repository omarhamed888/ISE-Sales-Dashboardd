import { useEffect, useState, useMemo } from 'react';
import { getAllDeals } from '@/lib/services/deals-service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { inferProductIdsFromProgramName, buildProgramNameFromProducts, classifyDealCategory } from '@/lib/utils/normalize-course-names';

const COLORS = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#14B8A6','#6366F1'];

function CategoryAxisTick({ x, y, payload, maxLen = 22 }: { x?: number; y?: number; payload?: { value?: string }; maxLen?: number }) {
  const raw = String(payload?.value ?? "");
  const shown = raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw;
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <title>{raw}</title>
      <text dy={4} textAnchor="end" fill="#475569" fontSize={11} fontWeight={600}>{shown}</text>
    </g>
  );
}

interface RepStats {
  name: string; teamName: string; deals: number; revenue: number;
  avgCycleDays: number; totalContactAttempts: number;
  avgContactAttempts: number; revenuePerAttempt: number;
  programs: Record<string, number>;
}

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string | number; sub?: string; icon: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-[#64748B] leading-tight">{label}</span>
        <span className={`material-symbols-outlined text-[18px] ${accent}`}
          style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <p className="text-[22px] font-black text-[#0F172A] leading-none truncate">{value}</p>
      {sub && <p className="text-[11px] font-bold text-[#94A3B8] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DealsAnalyticsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterRep, setFilterRep] = useState('الكل');
  const [filterTeam, setFilterTeam] = useState('الكل');
  const [filterBookingType, setFilterBookingType] = useState<'الكل'|'self_booking'|'call_booking'>('الكل');
  const [filterDealCategory, setFilterDealCategory] = useState<'الكل'|'core'|'side'>('الكل');
  const [attemptsRange, setAttemptsRange] = useState<'all'|'1-3'|'4-7'|'8+'>('all');
  const [visibleDealsCount, setVisibleDealsCount] = useState(50);

  useEffect(() => {
    getAllDeals().then(setDeals).catch(console.error).finally(() => setLoading(false));
  }, []);

  const allReps  = useMemo(() => ['الكل', ...Array.from(new Set(deals.map(d => d.salesRepName).filter(Boolean)))], [deals]);
  const allTeams = useMemo(() => ['الكل', ...Array.from(new Set(deals.map(d => d.teamName).filter(Boolean)))], [deals]);

  const filtered = useMemo(() => deals.filter(d => {
    if (filterRep  !== 'الكل' && d.salesRepName !== filterRep)  return false;
    if (filterTeam !== 'الكل' && d.teamName     !== filterTeam) return false;
    const bt = d.bookingType || (d.closureType === 'call' ? 'call_booking' : 'self_booking');
    if (filterBookingType !== 'الكل' && bt !== filterBookingType) return false;
    const cat = d.dealCategory || classifyDealCategory(d);
    if (filterDealCategory !== 'الكل' && cat !== filterDealCategory) return false;
    if (dateFrom && d.closeDate < dateFrom) return false;
    if (dateTo   && d.closeDate > dateTo)   return false;
    const att = Number(d.contactAttempts);
    if (attemptsRange === '1-3' && !(att >= 1 && att <= 3)) return false;
    if (attemptsRange === '4-7' && !(att >= 4 && att <= 7)) return false;
    if (attemptsRange === '8+'  && !(att >= 8))              return false;
    return true;
  }), [deals, filterRep, filterTeam, filterBookingType, filterDealCategory, dateFrom, dateTo, attemptsRange]);

  const isFiltered = filterRep !== 'الكل' || filterTeam !== 'الكل' || filterBookingType !== 'الكل'
    || filterDealCategory !== 'الكل' || dateFrom || dateTo || attemptsRange !== 'all';
  const resetFilters = () => { setFilterRep('الكل'); setFilterTeam('الكل'); setFilterBookingType('الكل'); setFilterDealCategory('الكل'); setDateFrom(''); setDateTo(''); setAttemptsRange('all'); };

  // ── Metrics ──────────────────────────────────────────────────────────────
  const coreDeals    = filtered.filter(d => (d.dealCategory || classifyDealCategory(d)) === 'core');
  const sideDeals    = filtered.filter(d => (d.dealCategory || classifyDealCategory(d)) === 'side');
  const coreRevenue  = coreDeals.reduce((s,d) => s + (d.dealValue||0), 0);
  const sideRevenue  = sideDeals.reduce((s,d) => s + (d.dealValue||0), 0);
  const totalRevenue = coreRevenue + sideRevenue;
  const dealsWithCycle = filtered.filter(d => typeof d.closingCycleDays === 'number');
  const avgCycle = dealsWithCycle.length > 0
    ? Math.round(dealsWithCycle.reduce((s,d) => s + d.closingCycleDays, 0) / dealsWithCycle.length) : 0;
  const totalPrograms = filtered.reduce((s,d) => s + (d.programCount||1), 0);
  const dealsWithAtt  = filtered.filter(d => Number.isFinite(Number(d.contactAttempts)) && Number(d.contactAttempts) >= 1);
  const totalAttempts = dealsWithAtt.reduce((s,d) => s + Math.round(Number(d.contactAttempts)), 0);
  const avgAttempts   = dealsWithAtt.length > 0 ? (totalAttempts / dealsWithAtt.length) : 0;
  const revPerAttempt = totalAttempts > 0 ? Math.round(totalRevenue / totalAttempts) : 0;
  const attCoverage   = filtered.length > 0 ? ((dealsWithAtt.length / filtered.length) * 100) : 0;

  // ── Per-rep ───────────────────────────────────────────────────────────────
  const repStats: RepStats[] = useMemo(() => {
    const map = new Map<string, RepStats>();
    for (const d of filtered) {
      const key = d.salesRepName || 'غير محدد';
      if (!map.has(key)) map.set(key, { name: key, teamName: d.teamName||'—', deals:0, revenue:0, avgCycleDays:0, totalContactAttempts:0, avgContactAttempts:0, revenuePerAttempt:0, programs:{} });
      const s = map.get(key)!;
      s.deals++; s.revenue += d.dealValue||0; s.avgCycleDays += d.closingCycleDays||0;
      if (Number.isFinite(Number(d.contactAttempts)) && Number(d.contactAttempts)>=1) s.totalContactAttempts += Math.round(Number(d.contactAttempts));
      const prog = d.programName||'غير محدد';
      s.programs[prog] = (s.programs[prog]||0)+1;
    }
    return Array.from(map.values()).map(s => ({
      ...s,
      avgCycleDays: s.deals>0 ? Math.round(s.avgCycleDays/s.deals) : 0,
      avgContactAttempts: s.deals>0 ? Number((s.totalContactAttempts/s.deals).toFixed(1)) : 0,
      revenuePerAttempt: s.totalContactAttempts>0 ? Math.round(s.revenue/s.totalContactAttempts) : 0,
    })).sort((a,b) => b.revenue - a.revenue);
  }, [filtered]);

  const programDist = useMemo(() => {
    const map = new Map<string,number>();
    for (const d of filtered) {
      const ids = Array.isArray(d.products) ? d.products.filter(Boolean) : [];
      const normIds = ids.length > 0 ? ids : inferProductIdsFromProgramName(d.programName||'');
      if (normIds.length > 0) { for (const id of normIds) { const lbl = buildProgramNameFromProducts([id])||id; map.set(lbl,(map.get(lbl)||0)+1); } }
      else { const p=(d.programName||'غير محدد').trim()||'غير محدد'; map.set(p,(map.get(p)||0)+1); }
    }
    return Array.from(map.entries()).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  }, [filtered]);

  const adDist = useMemo(() => {
    const map = new Map<string,number>();
    for (const d of filtered) { const a=d.adSource||'غير محدد'; map.set(a,(map.get(a)||0)+1); }
    return Array.from(map.entries()).map(([adName,count])=>({adName,count})).sort((a,b)=>b.count-a.count).slice(0,8);
  }, [filtered]);

  const suspiciousReps    = useMemo(() => repStats.filter(r => r.avgCycleDays > 365), [repStats]);
  const bestEfficiencyRep = useMemo(() => [...repStats.filter(r=>r.totalContactAttempts>0)].sort((a,b)=>b.revenuePerAttempt-a.revenuePerAttempt)[0]??null, [repStats]);
  const highAttLowReturn  = useMemo(() => { const l=repStats.filter(r=>r.avgContactAttempts>=8&&r.revenuePerAttempt>0); return l.length>0?[...l].sort((a,b)=>a.revenuePerAttempt-b.revenuePerAttempt)[0]:null; }, [repStats]);
  const visibleDeals = useMemo(() => filtered.slice(0, visibleDealsCount), [filtered, visibleDealsCount]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <span className="material-symbols-outlined animate-spin text-[#2563EB] text-[40px]">progress_activity</span>
      <p className="text-[13px] font-bold text-[#64748B]">جاري تحميل البيانات...</p>
    </div>
  );

  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 font-body" dir="rtl">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-black text-[#0F172A] flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-[#2563EB]" style={{ fontVariationSettings:"'FILL' 1" }}>handshake</span>
            تحليل الصفقات المغلقة
          </h1>
          <p className="text-[12px] font-bold text-[#64748B] mt-0.5">نظرة شاملة على أداء الفريق في إغلاق الصفقات</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-[12px] font-black px-3 py-1.5 rounded-full">
            <span className="material-symbols-outlined text-[14px]">receipt_long</span>
            {filtered.length} صفقة
          </span>
          {isFiltered && (
            <button onClick={resetFilters} className="inline-flex items-center gap-1 text-[12px] font-bold text-[#EF4444] bg-red-50 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors">
              <span className="material-symbols-outlined text-[14px]">close</span>
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm" dir="rtl">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[16px] text-[#64748B]">tune</span>
          <span className="text-[12px] font-black text-[#64748B]">تصفية النتائج</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Rep */}
          <select value={filterRep} onChange={e => setFilterRep(e.target.value)}
            className={`text-[12px] font-bold rounded-xl px-3 py-2 outline-none border transition-colors ${filterRep!=='الكل'?'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]':'bg-[#F7F9FC] border-[#E2E8F0] text-[#475569]'}`}>
            {allReps.map(r=><option key={r}>{r}</option>)}
          </select>
          {/* Team */}
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
            className={`text-[12px] font-bold rounded-xl px-3 py-2 outline-none border transition-colors ${filterTeam!=='الكل'?'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]':'bg-[#F7F9FC] border-[#E2E8F0] text-[#475569]'}`}>
            {allTeams.map(t=><option key={t}>{t}</option>)}
          </select>
          {/* Booking */}
          <select value={filterBookingType} onChange={e => setFilterBookingType(e.target.value as any)}
            className={`text-[12px] font-bold rounded-xl px-3 py-2 outline-none border transition-colors ${filterBookingType!=='الكل'?'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]':'bg-[#F7F9FC] border-[#E2E8F0] text-[#475569]'}`}>
            <option value="الكل">كل أنواع الحجز</option>
            <option value="self_booking">حجز ذاتي</option>
            <option value="call_booking">حجز بمكالمة</option>
          </select>
          {/* Category */}
          <select value={filterDealCategory} onChange={e => setFilterDealCategory(e.target.value as any)}
            className={`text-[12px] font-bold rounded-xl px-3 py-2 outline-none border transition-colors ${filterDealCategory!=='الكل'?'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]':'bg-[#F7F9FC] border-[#E2E8F0] text-[#475569]'}`}>
            <option value="الكل">Core + Side</option>
            <option value="core">Core فقط</option>
            <option value="side">Side فقط</option>
          </select>
          {/* Attempts */}
          <select value={attemptsRange} onChange={e => setAttemptsRange(e.target.value as any)}
            className={`text-[12px] font-bold rounded-xl px-3 py-2 outline-none border transition-colors ${attemptsRange!=='all'?'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]':'bg-[#F7F9FC] border-[#E2E8F0] text-[#475569]'}`}>
            <option value="all">كل المحاولات</option>
            <option value="1-3">١-٣ محاولات</option>
            <option value="4-7">٤-٧ محاولات</option>
            <option value="8+">٨+ محاولات</option>
          </select>
          {/* Date range */}
          <div className="flex items-center gap-1.5 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-3 py-2" dir="ltr">
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              className={`text-[12px] font-bold bg-transparent outline-none w-[130px] ${dateFrom?'text-[#2563EB]':'text-[#94A3B8]'}`} placeholder="من" />
            <span className="text-[#CBD5E1] font-bold text-[12px]">–</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              className={`text-[12px] font-bold bg-transparent outline-none w-[130px] ${dateTo?'text-[#2563EB]':'text-[#94A3B8]'}`} placeholder="إلى" />
          </div>
        </div>
      </div>

      {/* ── KPI rows ───────────────────────────────────────────────────────── */}
      {/* Row 1: Revenue split */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="إجمالي الإيرادات"  value={fmt(totalRevenue)+' ج'} icon="payments"      accent="text-[#10B981]" />
        <KpiCard label="Core Revenue"       value={fmt(coreRevenue)+' ج'}  icon="trending_up"   accent="text-[#2563EB]" sub={`${coreDeals.length} صفقة`} />
        <KpiCard label="Side Revenue"       value={fmt(sideRevenue)+' ج'}  icon="add_chart"     accent="text-[#F59E0B]" sub={`${sideDeals.length} صفقة`} />
        <KpiCard label="إيراد لكل محاولة"  value={fmt(revPerAttempt)+' ج'} icon="bolt"          accent="text-[#8B5CF6]" sub={`تغطية ${attCoverage.toFixed(0)}%`} />
      </div>

      {/* Row 2: Operational metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Core Deals"           value={coreDeals.length}          icon="handshake"       accent="text-[#2563EB]" />
        <KpiCard label="Side Deals"           value={sideDeals.length}          icon="layers"          accent="text-[#F59E0B]" />
        <KpiCard label="متوسط دورة الإغلاق"  value={avgCycle+' يوم'}           icon="timer"           accent="text-[#F59E0B]" />
        <KpiCard label="متوسط مرات التواصل"  value={avgAttempts.toFixed(1)}    icon="contact_phone"   accent="text-[#0EA5E9]" sub={`إجمالي ${fmt(totalAttempts)}`} />
      </div>

      {/* ── Core vs Side explainer ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <span className="material-symbols-outlined text-amber-500 text-[18px] flex-shrink-0" style={{ fontVariationSettings:"'FILL' 1" }}>info</span>
        <p className="text-[12px] font-bold text-[#92400E]">
          <span className="text-[#1D4ED8]">Core Deals</span> = الصفقات الأساسية (برامج التدريب الرئيسية) ·
          <span className="text-[#B45309] mr-1">Side Deals</span> = مبيعات إضافية (كتب، ورش، اشتراكات)
        </p>
      </div>

      {/* ── Insights banner ────────────────────────────────────────────────── */}
      {(bestEfficiencyRep || highAttLowReturn) && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-[13px] font-black text-[#0F172A] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#F59E0B]" style={{ fontVariationSettings:"'FILL' 1" }}>lightbulb</span>
            إنسايتس محاولات التواصل
          </h3>
          {bestEfficiencyRep && (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-emerald-500 text-[18px] flex-shrink-0 mt-0.5" style={{ fontVariationSettings:"'FILL' 1" }}>emoji_events</span>
              <p className="text-[12px] font-bold text-[#065F46]">
                أفضل كفاءة حاليًا: <span className="text-emerald-700 font-black">{bestEfficiencyRep.name}</span> بمتوسط {fmt(bestEfficiencyRep.revenuePerAttempt)} ج لكل محاولة
              </p>
            </div>
          )}
          {highAttLowReturn && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-amber-500 text-[18px] flex-shrink-0 mt-0.5" style={{ fontVariationSettings:"'FILL' 1" }}>warning</span>
              <p className="text-[12px] font-bold text-[#92400E]">
                يحتاج تحسين سكربت المتابعة: <span className="text-amber-700 font-black">{highAttLowReturn.name}</span> ({highAttLowReturn.avgContactAttempts.toFixed(1)} محاولة · {fmt(highAttLowReturn.revenuePerAttempt)} ج/محاولة)
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue per rep */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[18px] text-[#2563EB]" style={{ fontVariationSettings:"'FILL' 1" }}>bar_chart</span>
            <h3 className="text-[14px] font-black text-[#0F172A]">الإيرادات لكل موظف</h3>
          </div>
          <p className="text-[11px] font-bold text-[#94A3B8] mb-4">مرتبة تنازلياً حسب إجمالي الإيراد</p>
          <div className="flex-1 min-h-[260px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repStats} margin={{ top:4, right:8, left:0, bottom:48 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={52}
                  tick={{ fontSize:11, fontWeight:700, fill:"#475569" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fontWeight:600, fill:"#94A3B8" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v:any) => [Number(v).toLocaleString('en-US')+' ج', 'الإيراد']}
                  contentStyle={{ borderRadius:12, border:'1px solid #E2E8F0', fontSize:12, fontWeight:700, fontFamily:'inherit', direction:'rtl' }} />
                <Bar dataKey="revenue" radius={[6,6,0,0]} maxBarSize={44}>
                  {repStats.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Program distribution */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[18px] text-[#8B5CF6]" style={{ fontVariationSettings:"'FILL' 1" }}>school</span>
            <h3 className="text-[14px] font-black text-[#0F172A]">توزيع المنتجات المباعة</h3>
          </div>
          <p className="text-[11px] font-bold text-[#94A3B8] mb-4">عدد الصفقات لكل برنامج</p>
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 240, maxHeight: 400 }}>
            <div dir="ltr" style={{ height: Math.max(240, programDist.length*34+40), minWidth:380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={programDist} layout="vertical" margin={{ right:40, left:8, top:4, bottom:4 }} barCategoryGap={6}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize:10, fontWeight:600, fill:"#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={180} tick={<CategoryAxisTick maxLen={28} />} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v:any) => [v+' صفقة', 'العدد']} contentStyle={{ borderRadius:12, border:'1px solid #E2E8F0', fontSize:12, fontWeight:700, fontFamily:'inherit', direction:'rtl' }} />
                  <Bar dataKey="value" radius={[0,6,6,0]} maxBarSize={22}>
                    {programDist.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Ad source */}
        {adDist.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm lg:col-span-2 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[18px] text-[#F59E0B]" style={{ fontVariationSettings:"'FILL' 1" }}>ads_click</span>
              <h3 className="text-[14px] font-black text-[#0F172A]">أفضل الإعلانات في إغلاق الصفقات</h3>
            </div>
            <p className="text-[11px] font-bold text-[#94A3B8] mb-4">أعلى ٨ مصادر إعلانية من حيث عدد الصفقات المغلقة</p>
            <div className="h-[200px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adDist} layout="vertical" margin={{ right:24, left:8, top:4, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize:10, fontWeight:600, fill:"#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="adName" width={180} tick={<CategoryAxisTick maxLen={24} />} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v:any) => [v+' صفقة', 'العدد']} contentStyle={{ borderRadius:12, border:'1px solid #E2E8F0', fontSize:12, fontWeight:700, fontFamily:'inherit', direction:'rtl' }} />
                  <Bar dataKey="count" radius={[0,6,6,0]} maxBarSize={26}>
                    {adDist.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ── Warning ────────────────────────────────────────────────────────── */}
      {suspiciousReps.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-amber-500 text-[20px] flex-shrink-0 mt-0.5">warning</span>
          <div>
            <p className="text-[13px] font-bold text-amber-800">
              {suspiciousReps.length > 1 ? 'بعض الموظفين لديهم' : `${suspiciousReps[0].name} لديه`} متوسط إغلاق يتجاوز ٣٦٥ يوم
            </p>
            <p className="text-[11px] font-bold text-amber-600 mt-0.5">يرجى مراجعة تاريخ أول تواصل — قد يكون غير دقيق</p>
          </div>
        </div>
      )}

      {/* ── Per-rep table ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#F59E0B]" style={{ fontVariationSettings:"'FILL' 1" }}>leaderboard</span>
          <h3 className="text-[15px] font-black text-[#0F172A]">أداء كل موظف</h3>
          <span className="mr-auto text-[11px] font-bold text-[#94A3B8]">{repStats.length} موظف</span>
        </div>
        {repStats.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-[40px] text-[#CBD5E1]">person_search</span>
            <p className="text-[13px] font-bold text-[#94A3B8] mt-2">لا توجد صفقات في هذه الفترة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[12px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                  <th className="px-4 py-3 font-bold w-8">#</th>
                  <th className="px-4 py-3 font-bold">الموظف</th>
                  <th className="px-4 py-3 font-bold">الفريق</th>
                  <th className="px-4 py-3 font-bold text-center">الصفقات</th>
                  <th className="px-4 py-3 font-bold text-center">الإيرادات</th>
                  <th className="px-4 py-3 font-bold text-center">دورة الإغلاق</th>
                  <th className="px-4 py-3 font-bold text-center">إجمالي محاولات</th>
                  <th className="px-4 py-3 font-bold text-center">متوسط محاولات</th>
                  <th className="px-4 py-3 font-bold text-center">إيراد/محاولة</th>
                  <th className="px-4 py-3 font-bold text-center">البرنامج الأكثر</th>
                </tr>
              </thead>
              <tbody>
                {repStats.map((rep, i) => {
                  const topProgram = Object.entries(rep.programs).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
                  const share = totalRevenue > 0 ? ((rep.revenue/totalRevenue)*100).toFixed(0) : '0';
                  return (
                    <tr key={rep.name} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FBFF] transition-colors">
                      <td className="px-4 py-3.5 font-black text-[#CBD5E1] text-[11px]">{i+1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] text-white flex-shrink-0"
                            style={{ background: COLORS[i%COLORS.length] }}>{rep.name.charAt(0)}</span>
                          <span className="font-bold text-[#0F172A]">{rep.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-[#64748B]">{rep.teamName}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-black text-[#0F172A]">{rep.deals}</span>
                        <span className="text-[10px] font-bold text-[#94A3B8] mr-0.5">صفقة</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="font-black text-[#10B981]">{fmt(rep.revenue)} ج</div>
                        <div className="text-[10px] font-bold text-[#94A3B8]">{share}% من الإجمالي</div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`font-black ${rep.avgCycleDays>365?'text-[#EF4444]':rep.avgCycleDays>90?'text-[#F59E0B]':'text-[#10B981]'}`}>{rep.avgCycleDays}</span>
                        <span className="text-[10px] font-bold text-[#64748B] mr-0.5">يوم</span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-black text-[#0F172A]">{fmt(rep.totalContactAttempts)}</td>
                      <td className="px-4 py-3.5 text-center font-black text-[#0369A1]">{rep.avgContactAttempts.toFixed(1)}</td>
                      <td className="px-4 py-3.5 text-center font-black text-[#10B981]">{fmt(rep.revenuePerAttempt)} ج</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{topProgram}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#0F172A] text-white">
                  <td className="px-4 py-3.5 font-black text-[12px]" colSpan={3}>الإجمالي</td>
                  <td className="px-4 py-3.5 text-center font-black text-[12px]">{coreDeals.length + sideDeals.length}</td>
                  <td className="px-4 py-3.5 text-center font-black text-[12px] text-emerald-400">{fmt(totalRevenue)} ج</td>
                  <td className="px-4 py-3.5 text-center font-black text-[12px] text-amber-400">{avgCycle} يوم</td>
                  <td className="px-4 py-3.5 text-center font-black text-[12px]">{fmt(totalAttempts)}</td>
                  <td className="px-4 py-3.5 text-center font-black text-[12px]">{avgAttempts.toFixed(1)}</td>
                  <td className="px-4 py-3.5 text-center font-black text-[12px] text-emerald-400">{fmt(revPerAttempt)} ج</td>
                  <td className="px-4 py-3.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── All deals table ────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#2563EB]" style={{ fontVariationSettings:"'FILL' 1" }}>receipt_long</span>
          <h3 className="text-[15px] font-black text-[#0F172A]">سجل الصفقات</h3>
          <span className="mr-auto inline-flex items-center gap-1 bg-[#F1F5F9] text-[#475569] text-[11px] font-bold px-2.5 py-1 rounded-full">
            {filtered.length} صفقة
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[12px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                <th className="px-4 py-3 font-bold">العميل</th>
                <th className="px-4 py-3 font-bold">الموظف</th>
                <th className="px-4 py-3 font-bold">البرنامج</th>
                <th className="px-4 py-3 font-bold">المصدر</th>
                <th className="px-4 py-3 font-bold text-center">نوع الحجز</th>
                <th className="px-4 py-3 font-bold text-center">الفئة</th>
                <th className="px-4 py-3 font-bold text-center">المبلغ</th>
                <th className="px-4 py-3 font-bold text-center">دورة الإغلاق</th>
                <th className="px-4 py-3 font-bold text-center">محاولات</th>
                <th className="px-4 py-3 font-bold text-center">أول تواصل</th>
                <th className="px-4 py-3 font-bold text-center">تاريخ الإغلاق</th>
              </tr>
            </thead>
            <tbody>
              {visibleDeals.map((deal, i) => {
                const bt = (deal.bookingType || (deal.closureType==='call'?'call_booking':'self_booking')) === 'call_booking';
                const isSide = (deal.dealCategory || classifyDealCategory(deal)) === 'side';
                return (
                  <tr key={deal.id} className={`border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FBFF] transition-colors ${i%2===0?'':'bg-[#FAFBFC]'}`}>
                    <td className="px-4 py-3 font-bold text-[#0F172A]">{deal.customerName||'—'}</td>
                    <td className="px-4 py-3 font-bold text-[#64748B]">{deal.salesRepName}</td>
                    <td className="px-4 py-3">
                      <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{deal.programName}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#64748B] max-w-[140px] truncate">{deal.adSource||'—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bt?'bg-sky-50 text-sky-700 border border-sky-100':'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                        {bt?'مكالمة':'ذاتي'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSide?'bg-amber-50 text-amber-700 border border-amber-100':'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        {isSide?'Side':'Core'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-black text-[#10B981]">{fmt(deal.dealValue||0)} ج</td>
                    <td className="px-4 py-3 text-center">
                      {deal.closingCycleDays!=null
                        ? <span className="font-black text-[#F59E0B]">{deal.closingCycleDays}<span className="text-[#94A3B8] font-bold text-[10px] mr-0.5">يوم</span></span>
                        : <span className="text-[#CBD5E1]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-black text-[#0369A1]">
                      {typeof deal.contactAttempts==='number'&&deal.contactAttempts>=1 ? deal.contactAttempts : <span className="text-[#CBD5E1]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-[#64748B]" dir="ltr">{deal.firstContactDate||'—'}</td>
                    <td className="px-4 py-3 text-center font-bold text-[#64748B]" dir="ltr">{deal.closeDate||'—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibleDealsCount < filtered.length && (
            <div className="p-4 border-t border-[#E2E8F0]">
              <button onClick={() => setVisibleDealsCount(v => v+50)}
                className="w-full py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#334155] text-[12px] font-bold hover:bg-[#F7F9FC] transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
                تحميل المزيد ({filtered.length-visibleDealsCount} متبقي)
              </button>
            </div>
          )}
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-[40px] text-[#CBD5E1]">receipt_long</span>
              <p className="text-[13px] font-bold text-[#94A3B8] mt-2">لا توجد صفقات تطابق الفلاتر الحالية</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
