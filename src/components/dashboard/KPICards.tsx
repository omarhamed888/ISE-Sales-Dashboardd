import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";

interface KPICardProps {
  label: string;
  value: string;
  icon: string;
  accentColor: string;
  bgTint: string;
  iconColor: string;
}

function KPICard({ label, value, icon, accentColor, bgTint, iconColor }: KPICardProps) {
  return (
    <div
      className={`bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-r-4 ${accentColor}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">{label}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgTint}`}>
          <span className={`material-symbols-outlined text-[20px] ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
      </div>
      <p className="text-4xl font-black leading-none text-[#0F172A]">{value}</p>
    </div>
  );
}

export function KPICards({ reports }: { reports: any[] }) {
  const cur = calculateAggregates(reports);

  const convColor =
    cur.conversionRate > 8
      ? "text-[#10B981]"
      : cur.conversionRate >= 4
        ? "text-[#F59E0B]"
        : "text-[#EF4444]";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full" dir="rtl">
      <KPICard
        label="إجمالي الرسائل"
        value={cur.totalMessages.toLocaleString()}
        icon="forum"
        accentColor="border-r-[#2563EB]"
        bgTint="bg-[#EFF6FF]"
        iconColor="text-[#2563EB]"
      />
      <KPICard
        label="إجمالي التفاعلات"
        value={cur.interactions.toLocaleString()}
        icon="touch_app"
        accentColor="border-r-[#10B981]"
        bgTint="bg-[#ECFDF5]"
        iconColor="text-[#10B981]"
      />
      <div
        className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-r-4 border-r-[#8B5CF6]"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">معدل التحويل</p>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#F5F3FF]">
            <span className="material-symbols-outlined text-[20px] text-[#8B5CF6]" style={{ fontVariationSettings: "'FILL' 1" }}>percent</span>
          </div>
        </div>
        <p className={`text-4xl font-black leading-none ${convColor}`}>
          {cur.conversionRate.toFixed(1)}%
        </p>
      </div>
      <KPICard
        label={`التسرب عند ${cur.biggestDrop}`}
        value={`${cur.biggestLeakPct}%`}
        icon="leak_remove"
        accentColor="border-r-[#F59E0B]"
        bgTint="bg-[#FFFBEB]"
        iconColor="text-[#F59E0B]"
      />
    </div>
  );
}
