import type { ReactNode } from "react";

export function DashboardChartCard({
  title,
  subtitle,
  children,
  fullWidth = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 flex flex-col ${fullWidth ? "lg:col-span-2" : ""}`}
      dir="rtl"
    >
      <div className="mb-4">
        <h3 className="text-base font-bold text-[#0F172A] text-right">{title}</h3>
        {subtitle && (
          <p className="text-xs font-semibold text-[#94A3B8] mt-0.5 text-right">{subtitle}</p>
        )}
      </div>
      <div className="w-full h-[280px] pb-2">
        {children}
      </div>
    </div>
  );
}
