import { useMemo } from "react";
import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";
import {
  buildConversionFunnelBars,
  buildDailyBuckets,
  buildLeakCausesPieData,
  buildSalesRepBuckets,
  getPlatformStats,
} from "@/lib/utils/dashboard-analytics";
import { DashboardChartCard } from "@/components/dashboard/DashboardChartCard";
import { LeakCausesPieChart } from "@/components/dashboard/LeakCausesPieChart";
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
} from "recharts";

export function ChartsGrid({ reports }: { reports: any[] }) {
  const cur = calculateAggregates(reports);
  const platform = useMemo(() => getPlatformStats(reports), [reports]);
  const funnelData = useMemo(() => buildConversionFunnelBars(cur), [cur]);
  const dailyBuckets = useMemo(() => buildDailyBuckets(reports), [reports]);
  const leakPie = useMemo(() => buildLeakCausesPieData(cur), [cur]);
  const repBuckets = useMemo(() => buildSalesRepBuckets(reports), [reports]);

  const dropOffAdData = useMemo(() => {
    return Object.entries(cur.adsData)
      .map(([name, data]: [string, any]) => ({
        name: name.length > 22 ? `${name.slice(0, 20)}…` : name,
        "بعد التحية": data.greeting,
        "بعد التفاصيل": data.details,
        "بعد السعر": data.price,
        _total: data.greeting + data.details + data.price + data.success,
      }))
      .sort((a, b) => b._total - a._total)
      .slice(0, 8)
      .map(({ _total, ...rest }) => rest);
  }, [cur.adsData]);

  const donutData = useMemo(() => {
    const wa = platform.whatsapp.messages;
    const ms = platform.messenger.messages;
    const tk = platform.tiktok?.messages || 0;
    const waI = platform.whatsapp.interactions;
    const msI = platform.messenger.interactions;
    const tkI = platform.tiktok?.interactions || 0;
    const slices: { name: string; value: number; fill: string }[] = [];
    if (wa > 0) {
      slices.push({
        name: `واتساب (${waI} تفاعل)`,
        value: wa,
        fill: "#3498db",
      });
    }
    if (ms > 0) {
      slices.push({
        name: `ماسنجر (${msI} تفاعل)`,
        value: ms,
        fill: msI === 0 ? "#e8f5e9" : "#85c1e9",
      });
    }
    if (tk > 0) {
      slices.push({
        name: `تيك توك (${tkI} تفاعل)`,
        value: tk,
        fill: tkI === 0 ? "#f2f2f2" : "#333333",
      });
    }
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

      <DashboardChartCard title="أداء المنصات" subtitle="إجمالي الرسائل والتفاعلات حسب المنصة">
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

      <DashboardChartCard title="معدل التحويل اليومي" subtitle="نسبة التفاعل الحقيقي لكل يوم">
        <DailyConversionChart data={dailyBuckets} />
      </DashboardChartCard>

      <DashboardChartCard title="مقارنة أداء المندوبين" subtitle="الرسائل والتفاعلات لكل مندوب">
        <SalesRepComparisonChart data={repBuckets} />
      </DashboardChartCard>

      <DashboardChartCard title="توزيع مراحل التسرب" subtitle="توزيع التسرب عبر مراحل قمع التحويل">
        <LeakCausesPieChart data={leakPie} />
      </DashboardChartCard>

      <DashboardChartCard
        title="التسرب حسب الإعلان"
        subtitle="أداء كل إعلان في الفترة المحددة"
        fullWidth
      >
        <div className="h-full w-full" dir="ltr">
          {dropOffAdData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
              لا توجد بيانات إعلانات في هذه الفترة
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dropOffAdData} margin={{ top: 10, right: 10, left: -12, bottom: 28 }}>
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
                <YAxis tick={{ fill: "#7f8c8d", fontSize: 10 }} axisLine={false} tickLine={false} />
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
                <Bar dataKey="بعد التحية" stackId="a" fill="#f8b4b4" radius={[0, 0, 0, 0]} />
                <Bar dataKey="بعد التفاصيل" stackId="a" fill="#f9d99d" />
                <Bar dataKey="بعد السعر" stackId="a" fill="#a3daf7" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </DashboardChartCard>
    </div>
  );
}
