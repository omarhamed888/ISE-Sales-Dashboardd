import { useMemo } from "react";
import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";
import {
  buildConversionFunnelBars,
  buildDailyBuckets,
  buildSalesRepBuckets,
  getPlatformStats,
} from "@/lib/utils/dashboard-analytics";
import { DashboardChartCard } from "@/components/dashboard/DashboardChartCard";
import { DailyConversionChart } from "@/components/dashboard/DailyConversionChart";
import { SalesRepComparisonChart } from "@/components/dashboard/SalesRepComparisonChart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
  ComposedChart,
  Line,
} from "recharts";

export function ChartsGrid({ reports, deals }: { reports: any[]; deals?: any[] }) {
  const cur = useMemo(() => calculateAggregates(reports, deals), [reports, deals]);
  const platform = useMemo(() => getPlatformStats(reports, deals), [reports, deals]);
  const funnelData = useMemo(() => buildConversionFunnelBars(cur), [cur]);
  const dailyBuckets = useMemo(() => buildDailyBuckets(reports, deals), [reports, deals]);
  const repBuckets = useMemo(() => buildSalesRepBuckets(reports, deals), [reports, deals]);

  // Actual closed deals registered in deal-closing, grouped by ad source.
  const actualDealsByAd = useMemo(() => {
    const m = new Map<string, number>();
    (deals ?? []).forEach((d) => {
      const src = String(d?.adSource || "").trim();
      if (!src) return;
      m.set(src, (m.get(src) ?? 0) + 1);
    });
    return m;
  }, [deals]);

  const dropOffAdData = useMemo(() => {
    return Object.entries(cur.adsData)
      .map(([name, data]: [string, any]) => ({
        name: name.length > 22 ? `${name.slice(0, 20)}…` : name,
        "بعد التحية": data.greeting,
        "بعد التفاصيل": data.details,
        "بعد السعر": data.price,
        "الصفقات الفعلية": actualDealsByAd.get(name.trim()) ?? 0,
        _total: data.greeting + data.details + data.price + data.success,
      }))
      .sort((a, b) => b._total - a._total)
      .slice(0, 8)
      .map(({ _total, ...rest }) => rest);
  }, [cur.adsData, actualDealsByAd]);

  const donutData = useMemo(() => {
    // Donut is sized by messages (reports own the messages signal). Deal counts
    // intentionally omitted — they live in the KPI card and other deal-driven charts.
    const wa = platform.whatsapp.messages;
    const ms = platform.messenger.messages;
    const tk = platform.tiktok?.messages || 0;
    const slices: { name: string; value: number; fill: string }[] = [];
    if (wa > 0) slices.push({ name: "واتساب", value: wa, fill: "#3498db" });
    if (ms > 0) slices.push({ name: "ماسنجر", value: ms, fill: "#85c1e9" });
    if (tk > 0) slices.push({ name: "تيك توك", value: tk, fill: "#333333" });
    return slices;
  }, [platform]);

  const FunnelTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div
        className="rounded-lg border border-[#e1e8ed] bg-white px-3 py-2 text-right text-xs font-semibold shadow-md"
        dir="rtl"
      >
        <div className="text-[#2c3e50]">{p.name}</div>
        <div className="text-[#7f8c8d]">
          {p.count} · {p.pct}% من الإجمالي
        </div>
      </div>
    );
  };

  const trendLineData = dailyBuckets.map((d) => ({
    ...d,
    labelShort: d.labelDayMonth,
  }));

  return (
    <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
      <DashboardChartCard
        title="قمع التحويل"
        subtitle="توزيع المراحل من إجمالي الرسائل"
      >
        <div className="h-full w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={funnelData}
              margin={{ top: 0, right: 64, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical stroke="#e1e8ed" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7f8c8d", fontSize: 11, fontWeight: 600 }}
                width={100}
              />
              <Tooltip content={<FunnelTooltip />} cursor={{ fill: "rgba(52,152,219,0.06)" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                {funnelData.map((entry, index) => (
                  <Cell key={`f-${index}`} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="label"
                  position="right"
                  style={{ fill: "#2c3e50", fontSize: 10, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardChartCard>

      <DashboardChartCard title="أداء المنصات" subtitle="إجمالي الرسائل حسب المنصة">
        <div className="h-full w-full" dir="ltr">
          {donutData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
              لا توجد بيانات منصات في هذه الفترة
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="46%"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={donutData[i].fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e1e8ed",
                    textAlign: "right",
                    fontWeight: 600,
                  }}
                />
                <Legend verticalAlign="bottom" height={40} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </DashboardChartCard>

      <DashboardChartCard title="الرسائل اليومية" subtitle="إجمالي الرسائل لكل يوم">
        <div className="h-full w-full" dir="ltr">
          {trendLineData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
              لا توجد بيانات في هذه الفترة
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendLineData} margin={{ top: 10, right: 8, left: -12, bottom: 4 }}>
                <defs>
                  <linearGradient id="msgAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(52,152,219)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="rgb(52,152,219)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e8ed" vertical={false} />
                <XAxis
                  dataKey="labelDayMonth"
                  tick={{ fill: "#7f8c8d", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={44}
                />
                <YAxis tick={{ fill: "#7f8c8d", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e1e8ed",
                    textAlign: "right",
                    fontWeight: 600,
                  }}
                  labelFormatter={(_, p) =>
                    p?.[0]?.payload?.label ? `التاريخ: ${p[0].payload.label}` : ""
                  }
                />
                <Area
                  type="monotone"
                  dataKey="msgs"
                  name="الرسائل"
                  stroke="#3498db"
                  strokeWidth={2}
                  fill="url(#msgAreaFill)"
                  dot={{ r: 4, strokeWidth: 2, fill: "#3498db", stroke: "#3498db" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </DashboardChartCard>

      <DashboardChartCard title="معدل الإغلاق اليومي" subtitle="نسبة الصفقات المغلقة لكل يوم">
        <DailyConversionChart data={dailyBuckets} />
      </DashboardChartCard>

      <DashboardChartCard title="مقارنة أداء المندوبين" subtitle="الرسائل والصفقات المغلقة لكل مندوب">
        <SalesRepComparisonChart data={repBuckets} />
      </DashboardChartCard>

      <DashboardChartCard
        title="التسرب حسب الإعلان"
        subtitle="مراحل التسرب من التقارير + الصفقات الفعلية المسجّلة في تقفيل الصفقات"
        fullWidth
      >
        <div className="h-full w-full" dir="ltr">
          {dropOffAdData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
              لا توجد بيانات إعلانات في هذه الفترة
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dropOffAdData} margin={{ top: 10, right: 10, left: -12, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e8ed" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7f8c8d", fontSize: 9 }}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={64}
                />
                <YAxis yAxisId="left" tick={{ fill: "#7f8c8d", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  allowDecimals={false}
                  tick={{ fill: "#16A34A", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(52,152,219,0.06)" }}
                  contentStyle={{
                    borderRadius: 10,
                    textAlign: "right",
                    fontWeight: 600,
                    border: "1px solid #e1e8ed",
                  }}
                />
                <Legend verticalAlign="top" height={32} iconType="circle" />
                <Bar yAxisId="left" dataKey="بعد التحية" stackId="a" fill="#f8b4b4" radius={[0, 0, 0, 0]} />
                <Bar yAxisId="left" dataKey="بعد التفاصيل" stackId="a" fill="#f9d99d" />
                <Bar yAxisId="left" dataKey="بعد السعر" stackId="a" fill="#a3daf7" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="الصفقات الفعلية"
                  stroke="#16A34A"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#16A34A", stroke: "#16A34A" }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </DashboardChartCard>
    </div>
  );
}
