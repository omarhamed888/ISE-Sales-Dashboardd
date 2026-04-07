import { useMemo } from "react";
import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";
import { getPlatformStats } from "@/lib/utils/dashboard-analytics";

type Urgency = "فوري" | "قصير المدى" | "متوسط المدى";

interface RecCard {
  urgency: Urgency;
  title: string;
  description: string;
}

const URGENCY_ORDER: Record<Urgency, number> = {
  فوري: 0,
  "قصير المدى": 1,
  "متوسط المدى": 2,
};

const BADGE: Record<Urgency, string> = {
  فوري: "bg-[#fee] text-[#e74c3c]",
  "قصير المدى": "bg-[#fff3e0] text-[#f39c12]",
  "متوسط المدى": "bg-[#e8f5e9] text-[#27ae60]",
};

export function RecommendationsSection({ reports }: { reports: any[] }) {
  const cards = useMemo(() => {
    const cur = calculateAggregates(reports);
    const platform = getPlatformStats(reports);
    const tm = cur.totalMessages;

    const priceLeakPct =
      tm > 0 ? parseFloat(((cur.funnel.price / tm) * 100).toFixed(1)) : 0;
    const detailsLeakPct =
      tm > 0 ? parseFloat(((cur.funnel.details / tm) * 100).toFixed(1)) : 0;

    const list: RecCard[] = [];

    if (platform.messenger.messages > 0 && platform.messenger.interactions === 0) {
      list.push({
        urgency: "فوري",
        title: "إيقاف ماسنجر",
        description:
          "0% معدل تحويل = هدر كامل للميزانية. أوقف جميع حملات ماسنجر وركز الميزانية على واتساب",
      });
    }

    if (priceLeakPct > 60) {
      list.push({
        urgency: "فوري",
        title: "مراجعة السعر",
        description: `${priceLeakPct}% تسرب عند السعر غير طبيعي. راجع التسعير أو طريقة عرض القيمة`,
      });
    }

    if (cur.jobConfusionCount > 3) {
      list.push({
        urgency: "فوري",
        title: "تعديل نص الإعلان",
        description: `${cur.jobConfusionCount} شخص يعتقدون أنه إعلان وظيفة. وضح بشكل صريح أنه منتج/خدمة تدريبية`,
      });
    }

    if (detailsLeakPct > 50) {
      list.push({
        urgency: "قصير المدى",
        title: "تصفية مبكرة",
        description:
          "اذكر نطاق السعر في البداية لتصفية غير الجادين وتقليل الهدر",
      });
    }

    list.push({
      urgency: "قصير المدى",
      title: "A/B Testing",
      description:
        "اختبر نسخاً إعلانية مختلفة لتحسين معدل الاستجابة الأولى",
    });

    if (cur.interactions > 0) {
      list.push({
        urgency: "متوسط المدى",
        title: "تحليل الناجحين",
        description: `ادرس الـ ${cur.interactions.toLocaleString("ar-EG")} تفاعل الناجح - ما القواسم المشتركة بين المهتمين؟`,
      });
    }

    list.push({
      urgency: "متوسط المدى",
      title: "تتبع المبيعات",
      description: `كم من الـ ${cur.interactions.toLocaleString("ar-EG")} تفاعل تحول لعملاء فعليين؟ هذا المقياس الأهم`,
    });

    if (cur.conversionRate > 0) {
      list.push({
        urgency: "متوسط المدى",
        title: "تحليل ROI",
        description: `احسب تكلفة الاكتساب الفعلية - هل ${cur.conversionRate.toFixed(1)}% معدل تحويل مربح؟`,
      });
    }

    list.sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);
    return list;
  }, [reports]);

  return (
    <section className="w-full" dir="rtl">
      <h2 className="mb-6 text-[1.8em] font-semibold text-[#2c3e50]">
        التوصيات الاستراتيجية
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => (
          <article
            key={i}
            className="rounded-[10px] border border-[#e1e8ed] bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className={`mb-3 inline-block rounded-full px-3.5 py-1.5 text-[0.85em] font-medium ${BADGE[c.urgency]}`}
            >
              {c.urgency}
            </span>
            <h3 className="mb-2 text-[1.2em] font-semibold text-[#2c3e50]">{c.title}</h3>
            <p className="text-[0.95em] leading-relaxed text-[#7f8c8d]">{c.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
