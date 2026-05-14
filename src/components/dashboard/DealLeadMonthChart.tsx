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
import type { DealLeadMonthBucket } from "@/lib/utils/dashboard-analytics";

interface TooltipPayloadEntry {
  payload: DealLeadMonthBucket;
}

function LeadMonthTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-right text-xs font-semibold shadow-md"
      dir="rtl"
    >
      <div className="text-[#0F172A]">{p.name}</div>
      <div className="text-[#64748B]">
        {p.count} صفقة · {p.pct}% من الفترة
      </div>
      {p.avgCycleDays != null && (
        <div className="text-[#64748B] mt-0.5">متوسط دورة الإغلاق: {p.avgCycleDays} يوم</div>
      )}
    </div>
  );
}

export function DealLeadMonthChart({ data }: { data: DealLeadMonthBucket[] }) {
  const visible = data.filter((b) => b.count > 0);
  const total = data.reduce((s, b) => s + b.count, 0);

  if (total === 0 || visible.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
        لا توجد صفقات مغلقة في هذه الفترة
      </div>
    );
  }

  const chartData = visible.map((b) => ({
    ...b,
    label: `${b.count} (${b.pct}%)`,
  }));

  return (
    <div className="h-full w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 64, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical stroke="#E2E8F0" />
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
            width={130}
          />
          <Tooltip content={<LeadMonthTooltip />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
            {chartData.map((entry, i) => (
              <Cell key={`lead-month-${i}`} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="label"
              position="right"
              style={{ fill: "#0F172A", fontSize: 10, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
