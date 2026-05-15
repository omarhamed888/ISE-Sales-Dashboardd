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
import type { DailyBucket } from "@/lib/utils/dashboard-analytics";

/**
 * Combined daily performance chart:
 *   • Bar (left axis)  — total messages
 *   • Bar (left axis)  — closed deals
 *   • Line (right %)   — conversion rate
 *
 * One picture, three signals — so a drop in close rate can be read against
 * whether it was a low-volume day or a low-quality day.
 */
export function DailyConversionChart({ data }: { data: DailyBucket[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
        لا توجد بيانات يومية
      </div>
    );
  }

  const chartData = data.map((d) => ({
    label: d.labelDayMonth,
    fullLabel: d.label,
    messages: d.msgs,
    deals: d.interactions,
    rate: d.conversionRate,
  }));

  // Right axis ceiling: at least 10 %, otherwise rate + 2 rounded up.
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
        <div className="text-[#0F172A] font-black mb-1">{row.fullLabel || row.label}</div>
        <div className="flex items-center justify-between gap-3 text-[#3498db]">
          <span>الرسائل</span>
          <span className="font-black">{row.messages.toLocaleString("en-US")}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[#10B981]">
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
    <div className="h-full w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 24, right: 8, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e8ed" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#7f8c8d", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#7f8c8d", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
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
          <Tooltip content={renderTooltip} cursor={{ fill: "rgba(52,152,219,0.06)" }} />
          <Legend
            verticalAlign="top"
            align="center"
            wrapperStyle={{ paddingBottom: 6, fontSize: 11 }}
            formatter={(value) => <span style={{ color: "#2c3e50", fontWeight: 700 }}>{value}</span>}
          />
          <Bar
            yAxisId="left"
            dataKey="messages"
            name="الرسائل"
            fill="#3498db"
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
          <Bar
            yAxisId="left"
            dataKey="deals"
            name="الصفقات"
            fill="#10B981"
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
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
  );
}
