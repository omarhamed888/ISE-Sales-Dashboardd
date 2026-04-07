import { useMemo } from "react";
import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";
import {
  buildDailyBuckets,
  buildSalesRepBuckets,
  findBestAdByConversion,
  getPlatformStats,
} from "@/lib/utils/dashboard-analytics";

type IssueItem = { text: string; variant: "critical" | "info" };

export function SmartInsightsSection({ reports }: { reports: any[] }) {
  const { issues, positives } = useMemo(() => {
    const cur = calculateAggregates(reports);
    const platform = getPlatformStats(reports);
    const daily = buildDailyBuckets(reports);
    const reps = buildSalesRepBuckets(reports);
    const tm = cur.totalMessages;

    const priceLeakPct =
      tm > 0 ? parseFloat(((cur.funnel.price / tm) * 100).toFixed(1)) : 0;
    const detailsLeakPct =
      tm > 0 ? parseFloat(((cur.funnel.details / tm) * 100).toFixed(1)) : 0;
    const jobY =
      tm > 0
        ? parseFloat(((cur.jobConfusionCount / tm) * 100).toFixed(1))
        : 0;

    const issueList: IssueItem[] = [];

    const msMsgs = platform.messenger.messages;
    const msIntr = platform.messenger.interactions;
    if (msMsgs > 0 && msIntr === 0) {
      issueList.push({
        variant: "critical",
        text: `🚫 فشل ماسنجر الكامل: ${msMsgs.toLocaleString("ar-EG")} رسائل بدون أي تفاعل (0%) - يجب إيقاف الإنفاق فوراً`,
      });
    }

    if (priceLeakPct > 60) {
      issueList.push({
        variant: "critical",
        text: `💰 التسرب الكبير عند السعر: ${priceLeakPct}% من المهتمين يتسربون عند معرفة السعر`,
      });
    }

    if (cur.jobConfusionCount > 0) {
      issueList.push({
        variant: "critical",
        text: `🔀 الخلط مع إعلان الوظيفة: ${cur.jobConfusionCount.toLocaleString("ar-EG")} شخص (${jobY}%) ظنوا أنه إعلان توظيف`,
      });
    }

    if (cur.conversionRate < 5 && tm > 0) {
      issueList.push({
        variant: "info",
        text: `📉 معدل تحويل ضعيف: ${cur.conversionRate.toFixed(1)}% فقط من الرسائل تحولت لتفاعل حقيقي`,
      });
    }

    if (detailsLeakPct > 50) {
      issueList.push({
        variant: "critical",
        text: `📋 تسرب كبير بعد التفاصيل: ${detailsLeakPct}% يتوقفون قبل الوصول لمرحلة السعر`,
      });
    }

    const pos: string[] = [];
    const wa = platform.whatsapp;
    const ms = platform.messenger;
    if (wa.messages > 0 && ms.messages > 0) {
      const waR = (wa.interactions / wa.messages) * 100;
      const msR = (ms.interactions / ms.messages) * 100;
      if (waR > msR + 0.1) {
        pos.push(
          `📱 واتساب ناجح: ${waR.toFixed(1)}% معدل تحويل مقابل ${msR.toFixed(1)}% في ماسنجر`
        );
      } else if (msR > waR + 0.1) {
        pos.push(
          `📱 ماسنجر ناجح: ${msR.toFixed(1)}% معدل تحويل مقابل ${waR.toFixed(1)}% في واتساب`
        );
      }
    }

    const daysWithMsgs = daily.filter((d) => d.msgs > 0);
    if (daysWithMsgs.length > 0) {
      const best = daysWithMsgs.reduce((a, d) =>
        d.conversionRate > a.conversionRate ? d : a
      );
      if (best.conversionRate > 0) {
        pos.push(
          `🔥 أفضل يوم: ${best.labelDayMonth} حقق ${best.conversionRate.toFixed(1)}% معدل تحويل`
        );
      }
    }

    if (reps.length >= 2) {
      const rates = reps.map((r) => r.conversionRate);
      const mx = Math.max(...rates);
      const mn = Math.min(...rates);
      if (mx - mn < 1.5) {
        const names = reps.map((r) => r.displayName).join("، ");
        const avg = (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1);
        pos.push(`⚖️ أداء متوازن: ${names} لديهم نفس معدل التحويل (${avg}%)`);
      }
    }

    const bestAd = findBestAdByConversion(cur.adsData, 5);
    if (bestAd) {
      pos.push(
        `🏆 أفضل إعلان: '${bestAd.adName}' يحقق ${bestAd.rate.toFixed(1)}% تحويل`
      );
    }

    return { issues: issueList, positives: pos };
  }, [reports]);

  return (
    <div
      className="w-full rounded-xl border border-[#e1e8ed] bg-white p-6 shadow-sm"
      dir="rtl"
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3
            className="mb-4 border-b-2 border-[#ecf0f1] pb-2.5 text-[1.5em] font-semibold text-[#2c3e50]"
          >
            المشاكل الحرجة
          </h3>
          {issues.length === 0 ? (
            <p className="text-[#27ae60] font-semibold leading-relaxed">
              لا توجد مشاكل حرجة في هذه الفترة
            </p>
          ) : (
            <ul className="list-none space-y-3 p-0">
              {issues.map((it, i) => (
                <li
                  key={i}
                  className={
                    it.variant === "critical"
                      ? "rounded-md border-r-[3px] border-[#e74c3c] bg-[#fff5f5] px-5 py-4 leading-relaxed text-[#2c3e50]"
                      : "rounded-md border-r-[3px] border-[#3498db] bg-[#f8f9fa] px-5 py-4 leading-relaxed text-[#2c3e50]"
                  }
                >
                  {it.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3
            className="mb-4 border-b-2 border-[#ecf0f1] pb-2.5 text-[1.5em] font-semibold text-[#2c3e50]"
          >
            النقاط الإيجابية
          </h3>
          {positives.length === 0 ? (
            <p className="font-semibold leading-relaxed text-[#7f8c8d]">
              جمّع المزيد من البيانات لعرض النقاط الإيجابية
            </p>
          ) : (
            <ul className="list-none space-y-3 p-0">
              {positives.map((t, i) => (
                <li
                  key={i}
                  className="rounded-md border-r-[3px] border-[#27ae60] bg-[#f8f9fa] px-5 py-4 leading-relaxed text-[#2c3e50]"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
