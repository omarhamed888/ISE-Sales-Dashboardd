import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SalesRepBucket } from "@/lib/utils/dashboard-analytics";

/**
 * Per-rep comparison with three signals:
 *   • Bar (left)   — messages handled
 *   • Bar (left)   — closed deals
 *   • Line (right) — close rate %
 *
 * Two reps with the same close count can look very different here — the line
 * separates "high volume / low quality" from "low volume / high quality".
 */
export function SalesRepComparisonChart({ data }: { data: SalesRepBucket[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
        لا توجد بيانات للمسؤولين
      </div>
    );
  }

  const chartData = data.map((r) => ({
    name: r.displayName,
    fullName: r.name,
    messages: r.messages,
    deals: r.interactions,
    rate: r.conversionRate,
  }));

  const singleRep = data.length <= 1;
  const maxRate = Math.max(...chartData.map((d) => d.rate), 1);
  const rateMax = Math.max(10, Math.ceil(maxRate + 2));

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload as (typeof chartData)[number] | undefined;
    if (!row) return null;
    return (
      <div
        className="rounded-lg border border-[#e1e8ed] bg-white px-3 py-2 text-right text-xs font-semibold shadow-md min-w-[160px]"
        dir="rtl"
      >
        <div className="text-[#0F172A] font-black mb-1">{row.fullName}</div>
        <div className="flex items-center justify-between gap-3 text-[#3498db]">
          <span>الرسائل</span>
          <span className="font-black">{row.messages.toLocaleString("en-US")}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[#27ae60]">
          <span>الصفقات</span>
          <span className="font-black">{row.deals.toLocaleString("en-US")}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[#F59E0B] mt-1 pt-1 border-t border-[#E2E8F0]">
          <span>معدل الإغلاق</span>
          <span className="font-black">{row.rate}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col" dir="rtl">
      {singleRep && (
        <p className="mb-2 text-center text-xs font-semibold text-[#7f8c8d]">
          لا يوجد موظفون آخرون للمقارنة
        </p>
      )}
      <div className="min-h-0 flex-1" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 24, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e8ed" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#7f8c8d", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: "#7f8c8d", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, rateMax]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#F59E0B", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={renderTooltip} cursor={{ fill: "rgba(52,152,219,0.05)" }} />
            <Legend
              verticalAlign="top"
              align="center"
              wrapperStyle={{ paddingBottom: 8, fontSize: 11 }}
              formatter={(value) => <span style={{ color: "#2c3e50", fontWeight: 700 }}>{value}</span>}
            />
            <Bar
              yAxisId="left"
              dataKey="messages"
              name="الرسائل"
              fill="#3498db"
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
            />
            <Bar
              yAxisId="left"
              dataKey="deals"
              name="الصفقات المغلقة"
              fill="#27ae60"
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rate"
              name="معدل الإغلاق %"
              stroke="#F59E0B"
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 2, fill: "#fff", stroke: "#F59E0B" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
