import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import type { WeeklyDealBucket } from "@/lib/services/deals-service";

const CORE_COLOR = "#2563EB";
const SIDE_COLOR = "#8B5CF6";

function WeekTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as WeeklyDealBucket | undefined;
  if (!row) return null;
  return (
    <div
      className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-right text-xs font-semibold shadow-md"
      dir="rtl"
    >
      <div className="text-[#0F172A] font-black mb-1">{label}</div>
      <div className="flex items-center gap-2 text-[#475569]">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CORE_COLOR }} />
        أساسي: <span className="font-black tabular-nums">{row.core}</span>
      </div>
      <div className="flex items-center gap-2 text-[#475569]">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SIDE_COLOR }} />
        ثانوي: <span className="font-black tabular-nums">{row.side}</span>
      </div>
      <div className="text-[#0F172A] mt-1">
        الإجمالي: <span className="font-black tabular-nums">{row.total}</span>
      </div>
    </div>
  );
}

export function WeeklyClosedDealsChart({ data }: { data: WeeklyDealBucket[] }) {
  const totalAll = data.reduce((s, b) => s + b.total, 0);

  if (totalAll === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
        لا توجد صفقات مغلقة في هذا الشهر
      </div>
    );
  }

  return (
    <div className="h-full w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 11, fontWeight: 700, fill: "#1E293B" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fontWeight: 700, fill: "#64748B" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<WeekTooltip />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
          <Legend
            verticalAlign="top"
            align="center"
            wrapperStyle={{ paddingBottom: 12, fontSize: 12, fontWeight: 700 }}
            formatter={(value) => <span style={{ color: "#1E293B" }}>{value}</span>}
          />
          <Bar
            dataKey="core"
            name="أساسي (Core)"
            stackId="deals"
            fill={CORE_COLOR}
            radius={[0, 0, 0, 0]}
            maxBarSize={64}
          />
          <Bar
            dataKey="side"
            name="ثانوي (Side)"
            stackId="deals"
            fill={SIDE_COLOR}
            radius={[6, 6, 0, 0]}
            maxBarSize={64}
          >
            <LabelList
              dataKey="total"
              position="top"
              formatter={(v) => {
                const n = Number(v);
                return n > 0 ? String(n) : "";
              }}
              style={{ fill: "#0F172A", fontSize: 11, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
