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
      className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col ${fullWidth ? "lg:col-span-2" : ""}`}
      dir="rtl"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-1 text-right">{title}</h3>
      {subtitle ? (
        <p className="text-sm text-gray-400 mb-4 text-right">{subtitle}</p>
      ) : (
        <div className="mb-4" />
      )}
      <div className="w-full" style={{ height: 300 }}>
        {children}
      </div>
    </div>
  );
}
