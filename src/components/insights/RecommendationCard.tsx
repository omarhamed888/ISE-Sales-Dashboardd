import type { AIRecommendation } from "@/lib/services/ai-insights-service";

const urgencyStyles: Record<
  AIRecommendation["urgencyColor"],
  string
> = {
  red: "border-red-200 bg-red-50/80 text-red-900",
  yellow: "border-amber-200 bg-amber-50/80 text-amber-900",
  green: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
};

const urgencyBadge: Record<AIRecommendation["urgencyColor"], string> = {
  red: "bg-red-600 text-white",
  yellow: "bg-amber-500 text-white",
  green: "bg-emerald-600 text-white",
};

export function RecommendationCard({ rec }: { rec: AIRecommendation }) {
  const box = urgencyStyles[rec.urgencyColor] ?? urgencyStyles.yellow;
  const badge = urgencyBadge[rec.urgencyColor] ?? urgencyBadge.yellow;

  return (
    <div
      className={`rounded-xl border p-4 text-right shadow-sm ${box}`}
      dir="rtl"
    >
      <span
        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-2 ${badge}`}
      >
        {rec.urgency}
      </span>
      <p className="font-bold text-sm mb-1">{rec.title}</p>
      <p className="text-xs opacity-90 leading-relaxed">{rec.description}</p>
    </div>
  );
}
