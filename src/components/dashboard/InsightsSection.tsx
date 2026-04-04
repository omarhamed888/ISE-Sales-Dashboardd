import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";
import { Link } from "react-router-dom";

export function InsightsSection({ currentPeriod, prevPeriod }: { currentPeriod: any[], prevPeriod: any[] }) {
  const cur = calculateAggregates(currentPeriod);
  const prev = calculateAggregates(prevPeriod);
  
  const insights = [];

  // CRITICAL: Conversion Rate drop > 20%
  if (prev.conversionRate > 0) {
      const dropOffset = prev.conversionRate - cur.conversionRate;
      const dropPercentage = (dropOffset / prev.conversionRate) * 100;
      if (dropPercentage >= 20) {
          insights.push({
              type: "critical", color: "red", icon: "trending_down",
              title: "تراجع حاد في التحويل", desc: `معدل التحويل انخفض ${Math.round(dropPercentage)}% مقارنة بالفترة السابقة`
          });
      } else if (dropOffset < 0 && Math.abs(dropPercentage) > 10) {
          // POSITIVE: Conversion rate improves > 10%
          insights.push({
              type: "positive", color: "green", icon: "trending_up",
              title: "تحسن في الأداء", desc: `معدل التحويل تحسن ${Math.abs(Math.round(dropPercentage))}% هذه الفترة`
          });
      }
  }

  // WARNING: Drop-off after price > 80%
  const priceDropRate = cur.interactions > 0 ? (cur.funnel.price / cur.interactions) * 100 : 0;
  if (priceDropRate >= 80) {
      insights.push({
          type: "warning", color: "yellow", icon: "warning",
          title: "تسرب حاد بعد السعر", desc: `${Math.round(priceDropRate)}% من العملاء يتوقفون عند السعر`,
          actionTxt: "تحليل السبب", actionLink: "/ads"
      });
  }

  // CRITICAL: job confusion rate > 15% (globally or ad specific)
  const confusionRate = cur.interactions > 0 ? (cur.jobConfusionCount / cur.interactions) * 100 : 0;
  if (confusionRate > 15) {
      insights.push({
         type: "critical", color: "red", icon: "work_off",
         title: "خلط عالي في الإعلان", desc: `${Math.round(confusionRate)}% من المتفاعلين يظنون الإعلان وظيفة`,
         actionTxt: "عرض الإعلان", actionLink: "/ads"
      });
  }

  // POSITIVE fallback if nothing
  if (insights.length === 0 && cur.interactions > 0) {
      insights.push({
          type: "positive", color: "green", icon: "thumb_up",
          title: "أداء مستقر", desc: "أداء المبيعات مستقر ولا توجد تسربات حرجة في القمع"
      });
  }

  return (
    <div className="w-full flex-col space-y-4 mb-4">
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
        {insights.slice(0, 3).map((insight, idx) => {
            const colors = {
                red: "border-r-4 border-error bg-white",
                yellow: "border-r-4 border-amber-500 bg-white",
                green: "border-r-4 border-emerald-500 bg-white"
            };
            const textColors = {
                red: "text-error",
                yellow: "text-amber-600",
                green: "text-emerald-600"
            };
            const ColorClasses = colors[insight.color as keyof typeof colors];
            const TextColorClass = textColors[insight.color as keyof typeof textColors];

            return (
                <div key={idx} className={`p-5 rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between shrink-0 w-[280px] md:w-auto snap-start ${ColorClasses}`}>
                    <div>
                        <div className={`flex items-center gap-2 mb-2 font-bold ${TextColorClass}`}>
                            <span className="material-symbols-outlined">{insight.icon}</span>
                            <span className="text-sm tracking-tight">{insight.title}</span>
                        </div>
                        <p className="text-[13px] text-on-surface-variant leading-relaxed font-medium mb-3">{insight.desc}</p>
                    </div>
                    {insight.actionTxt && (
                        <Link to={insight.actionLink || "/"} className={`text-xs font-bold ${TextColorClass} underline underline-offset-4 decoration-2 decoration-${insight.color}/30 hover:decoration-${insight.color}`}>
                            {insight.actionTxt}
                        </Link>
                    )}
                </div>
            )
        })}
      </div>
    </div>
  );
}
