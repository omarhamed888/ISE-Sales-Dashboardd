import { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  iconName: string;
  colorType?: "primary" | "secondary" | "tertiary" | "error";
  children?: ReactNode;
}

export function KpiCard({ title, value, trend, trendDirection, iconName, colorType = "primary" }: KpiCardProps) {
  const getColors = () => {
    switch (colorType) {
      case "primary": return "text-primary bg-primary/10";
      case "secondary": return "text-secondary bg-secondary/10";
      case "tertiary": return "text-tertiary bg-tertiary/10";
      case "error": return "text-error bg-error/10";
      default: return "text-primary bg-primary/10";
    }
  };

  const getTrendStyle = () => {
    if (trendDirection === "up") return "text-emerald-600 bg-emerald-50";
    if (trendDirection === "down") return "text-error bg-error/5";
    return "text-outline bg-surface-container";
  };

  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-[0_12px_32px_-4px_rgba(17,28,45,0.04)] flex flex-col justify-between h-40">
      <div className="flex justify-between items-start">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getColors()}`}>
          <span className="material-symbols-outlined">{iconName}</span>
        </div>
        {trend && (
          <span className={`text-sm font-bold px-2 py-1 rounded-lg ${getTrendStyle()}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-on-surface-variant text-sm font-medium">{title}</p>
        <h3 className="text-3xl font-headline font-extrabold text-on-surface">{value}</h3>
      </div>
    </div>
  );
}
