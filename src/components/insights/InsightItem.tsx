import type { AIInsightItem } from "@/lib/services/ai-insights-service";

export function InsightItem({
  item,
  variant,
}: {
  item: AIInsightItem;
  variant: "critical" | "positive";
}) {
  const border =
    variant === "critical"
      ? "border-red-100 bg-red-50/50"
      : "border-emerald-100 bg-emerald-50/50";
  return (
    <div
      className={`mb-3 last:mb-0 p-3 rounded-lg border ${border} text-right`}
      dir="rtl"
    >
      <div className="flex items-start gap-2 justify-end">
        <span className="text-lg shrink-0">{item.emoji}</span>
        <div className="min-w-0">
          <p className="font-bold text-[#1E293B] text-sm">{item.title}</p>
          <p className="text-[#64748B] text-xs mt-1 leading-relaxed">{item.description}</p>
        </div>
      </div>
    </div>
  );
}
