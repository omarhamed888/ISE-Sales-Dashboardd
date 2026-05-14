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
import type { DaysToCloseBucket } from "@/lib/services/deals-service";

function DaysTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as DaysToCloseBucket | undefined;
  if (!row) return null;
  return (
    <div
      className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-right text-xs font-semibold shadow-md"
      dir="rtl"
    >
      <div className="text-[#0F172A] font-black mb-0.5">{row.segmentAr}</div>
      <div className="text-[#64748B]">{row.rangeLabel}</div>
      <div className="text-[#0F172A] mt-1">
        <span className="font-black tabular-nums">{row.count}</span> صفقة
        <span className="text-[#64748B] mr-1">({row.pct}%)</span>
      </div>
    </div>
  );
}

export function DaysToCloseChart({ data }: { data: DaysToCloseBucket[] }) {
  const total = data.reduce((s, b) => s + b.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
        لا توجد بيانات لدورة الإغلاق بعد
      </div>
    );
  }

  const chartData = data.map((b) => ({
    ...b,
    label: b.count > 0 ? `${b.count} (${b.pct}%)` : "",
  }));

  return (
    <div className="h-full w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 28, right: 8, left: -8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="rangeLabel"
            tick={{ fontSize: 11, fontWeight: 700, fill: "#1E293B" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<DaysTooltip />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={72}>
            {chartData.map((entry, i) => (
              <Cell key={`days-${i}`} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="label"
              position="top"
              style={{ fill: "#0F172A", fontSize: 11, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
