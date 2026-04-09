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
  فوري: "bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/20",
  "قصير المدى": "bg-[#FFFBEB] text-[#F59E0B] border border-[#F59E0B]/20",
  "متوسط المدى": "bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/20",
};

const ACCENT: Record<Urgency, string> = {
  فوري: "border-t-[#EF4444]",
  "قصير المدى": "border-t-[#F59E0B]",
  "متوسط المدى": "border-t-[#10B981]",
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
        description: `ادرس الـ ${cur.interactions.toLocaleString()} تفاعل الناجح - ما القواسم المشتركة بين المهتمين؟`,
      });
    }

    list.push({
      urgency: "متوسط المدى",
      title: "تتبع المبيعات",
      description: `كم من الـ ${cur.interactions.toLocaleString()} تفاعل تحول لعملاء فعليين؟ هذا المقياس الأهم`,
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
    <section className="w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6" dir="rtl">
      <h3 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>tips_and_updates</span>
        التوصيات الاستراتيجية
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => (
          <article
            key={i}
            className={`bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-t-4 ${ACCENT[c.urgency]}`}
          >
            <span
              className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${BADGE[c.urgency]}`}
            >
              {c.urgency}
            </span>
            <h3 className="mb-2 text-base font-bold text-[#0F172A]">{c.title}</h3>
            <p className="text-sm leading-relaxed text-[#64748B]">{c.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
