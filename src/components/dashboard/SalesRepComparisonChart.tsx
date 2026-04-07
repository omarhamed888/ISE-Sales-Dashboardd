import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SalesRepBucket } from "@/lib/utils/dashboard-analytics";

export function SalesRepComparisonChart({ data }: { data: SalesRepBucket[] }) {
  const chartData = data.map((r) => ({
    name: r.displayName,
    الرسائل: r.messages,
    التفاعلات: r.interactions,
  }));

  const singleRep = data.length <= 1;

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-[#7f8c8d]" dir="rtl">
        لا توجد بيانات للمسؤولين
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col" dir="rtl">
      {singleRep && (
        <p className="mb-2 text-center text-xs font-semibold text-[#7f8c8d]">
          لا يوجد موظفون آخرون للمقارنة
        </p>
      )}
      <div className="min-h-0 flex-1" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e8ed" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#7f8c8d", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fill: "#7f8c8d", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e1e8ed",
                textAlign: "right",
                fontWeight: 600,
              }}
            />
            <Legend
              verticalAlign="top"
              align="center"
              wrapperStyle={{ paddingBottom: 8 }}
              formatter={(value) => <span style={{ color: "#2c3e50" }}>{value}</span>}
            />
            <Bar dataKey="الرسائل" fill="#3498db" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="التفاعلات" fill="#27ae60" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
