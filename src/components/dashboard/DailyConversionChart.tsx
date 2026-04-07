import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { DailyBucket } from "@/lib/utils/dashboard-analytics";

function barColor(rate: number): string {
  if (rate > 5) return "#3498db";
  if (rate > 0) return "#5dade2";
  return "#e8f5e9";
}

export function DailyConversionChart({ data }: { data: DailyBucket[] }) {
  const chartData = data.map((d) => ({
    ...d,
    fill: barColor(d.conversionRate),
    rateLabel: `${d.conversionRate}%`,
  }));

  const maxR = Math.max(1, ...data.map((d) => d.conversionRate));
  const yMax = Math.ceil(maxR + 1);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
        لا توجد بيانات يومية
      </div>
    );
  }

  return (
    <div className="h-full w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 28, right: 8, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e8ed" vertical={false} />
          <XAxis
            dataKey="labelDayMonth"
            tick={{ fill: "#7f8c8d", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis
            domain={[0, yMax]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#7f8c8d", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e1e8ed",
              textAlign: "right",
              fontWeight: 600,
            }}
            formatter={(value) => [`${value ?? 0}%`, "معدل التحويل"]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.labelDayMonth
                ? String(payload[0].payload.labelDayMonth)
                : ""
            }
          />
          <Bar dataKey="conversionRate" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {chartData.map((e, i) => (
              <Cell key={i} fill={e.fill} />
            ))}
            <LabelList
              dataKey="rateLabel"
              position="top"
              style={{ fill: "#2c3e50", fontSize: 10, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
