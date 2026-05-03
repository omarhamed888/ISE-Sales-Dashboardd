import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { LeakPieSlice } from "@/lib/utils/dashboard-analytics";

const renderLegend = (props: any) => {
  const payload = props?.payload as Array<{ value?: string; color?: string }> | undefined;
  if (!payload?.length) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-3 mt-2 text-xs font-semibold text-[#2c3e50] list-none p-0">
      {payload.map((entry, i: number) => (
        <li key={i} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ background: entry.color }} />
          <span>{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};

export function LeakCausesPieChart({ data }: { data: LeakPieSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
        لا توجد بيانات كافية
      </div>
    );
  }

  const chartData = data.map((s) => ({
    name: `${s.name} (${s.pct}%)`,
    value: s.value,
    fill: s.fill,
  }));

  return (
    <div className="h-full w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="46%"
            innerRadius={52}
            outerRadius={88}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={chartData[i].fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e1e8ed",
              textAlign: "right",
              fontWeight: 600,
            }}
            formatter={(value) => [Number(value ?? 0).toLocaleString('en-US'), ""]}
          />
          <Legend content={renderLegend} verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
