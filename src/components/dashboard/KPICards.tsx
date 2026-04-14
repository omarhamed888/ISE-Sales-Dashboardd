import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";

interface KPICardProps {
  label: string;
  value: string;
  icon: string;
  accentColor: string;
  bgTint: string;
  iconColor: string;
  valueColor?: string;
}

function KPICard({ label, value, icon, accentColor, bgTint, iconColor, valueColor }: KPICardProps) {
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
      <p className={`text-4xl font-black leading-none ${valueColor ?? "text-[#0F172A]"}`}>{value}</p>
    </div>
  );
}

export function KPICards({ reports }: { reports: any[] }) {
  const cur = calculateAggregates(reports);

  // معدل الرد = (totalMessages - noReplyAfterGreeting) / totalMessages
  const responded = cur.totalMessages - cur.funnel.greeting;
  const responseRate =
    cur.totalMessages > 0
      ? Math.min(100, parseFloat(((responded / cur.totalMessages) * 100).toFixed(1)))
      : 0;

  // معدل الإغلاق color
  const closeRateColor =
    cur.conversionRate >= 15
      ? "text-[#10B981]"
      : cur.conversionRate >= 5
        ? "text-[#F59E0B]"
        : "text-[#EF4444]";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full" dir="rtl">
      {/* Card 1: إجمالي الرسائل */}
      <KPICard
        label="إجمالي الرسائل"
        value={cur.totalMessages.toLocaleString()}
        icon="forum"
        accentColor="border-r-[#2563EB]"
        bgTint="bg-[#EFF6FF]"
        iconColor="text-[#2563EB]"
      />

      {/* Card 2: الصفقات المغلقة */}
      <KPICard
        label="الصفقات المغلقة"
        value={cur.interactions.toLocaleString()}
        icon="handshake"
        accentColor="border-r-[#10B981]"
        bgTint="bg-[#ECFDF5]"
        iconColor="text-[#10B981]"
      />

      {/* Card 3: معدل الرد */}
      <KPICard
        label="معدل الرد"
        value={`${responseRate.toFixed(1)}%`}
        icon="reply"
        accentColor="border-r-[#8B5CF6]"
        bgTint="bg-[#F5F3FF]"
        iconColor="text-[#8B5CF6]"
      />

      {/* Card 4: معدل الإغلاق */}
      <KPICard
        label="معدل الإغلاق"
        value={`${cur.conversionRate.toFixed(1)}%`}
        icon="percent"
        accentColor="border-r-[#F59E0B]"
        bgTint="bg-[#FFFBEB]"
        iconColor="text-[#F59E0B]"
        valueColor={closeRateColor}
      />
    </div>
  );
}
