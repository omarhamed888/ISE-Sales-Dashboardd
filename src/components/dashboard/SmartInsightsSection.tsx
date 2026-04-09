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
        text: `🚫 فشل ماسنجر الكامل: ${msMsgs.toLocaleString()} رسائل بدون أي تفاعل (0%) - يجب إيقاف الإنفاق فوراً`,
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
        text: `🔀 الخلط مع إعلان الوظيفة: ${cur.jobConfusionCount.toLocaleString()} شخص (${jobY}%) ظنوا أنه إعلان توظيف`,
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
    <div className="w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6" dir="rtl">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Critical Issues */}
        <div>
          <h3 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#EF4444] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            المشاكل الحرجة
          </h3>
          {issues.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-[#ECFDF5] rounded-xl border border-[#10B981]/20">
              <span className="material-symbols-outlined text-[#10B981] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <p className="text-sm font-semibold text-[#10B981]">
                لا توجد مشاكل حرجة في هذه الفترة
              </p>
            </div>
          ) : (
            <ul className="list-none space-y-2.5 p-0">
              {issues.map((it, i) => (
                <li
                  key={i}
                  className={
                    it.variant === "critical"
                      ? "rounded-xl border-r-4 border-[#EF4444] bg-[#FEF2F2] px-5 py-3.5 leading-relaxed text-sm text-[#374151]"
                      : "rounded-xl border-r-4 border-[#2563EB] bg-[#EFF6FF] px-5 py-3.5 leading-relaxed text-sm text-[#374151]"
                  }
                >
                  {it.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Positive Points */}
        <div>
          <h3 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#10B981] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
            النقاط الإيجابية
          </h3>
          {positives.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <span className="material-symbols-outlined text-[#94A3B8] text-[18px]">info</span>
              <p className="text-sm font-semibold text-[#64748B]">
                جمّع المزيد من البيانات لعرض النقاط الإيجابية
              </p>
            </div>
          ) : (
            <ul className="list-none space-y-2.5 p-0">
              {positives.map((t, i) => (
                <li
                  key={i}
                  className="rounded-xl border-r-4 border-[#10B981] bg-[#ECFDF5] px-5 py-3.5 leading-relaxed text-sm text-[#374151]"
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
