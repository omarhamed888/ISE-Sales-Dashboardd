import { useMemo } from 'react';

export function calculateAggregates(reports: any[]) {
    let totalMessages = 0;
    let interactions = 0;
    const funnel = { greeting: 0, details: 0, price: 0, success: 0 };
    let jobConfusionCount = 0;
    const adsData: Record<string, any> = {};

    reports.forEach(r => {
        const pd = r.parsedData;
        if (!pd) return;

        totalMessages += pd.totalMessages || pd.summary?.totalMessages || 0;
        interactions += pd.interactions || pd.summary?.interactions || 0;
        jobConfusionCount += pd.jobConfusionCount || 0;

        const f = pd.funnel || pd.funnels;
        if (f) {
            const processStage = (arr: any[], stageName: string) => {
                if (!Array.isArray(arr)) return 0;
                let sum = 0;
                arr.forEach(item => {
                    const count = item.count || 0;
                    sum += count;
                    const ad = item.adName || "عام";
                    if (!adsData[ad]) adsData[ad] = { greeting:0, details:0, price:0, success:0, confusion: jobConfusionCount };
                    adsData[ad][stageName] += count;
                });
                return sum;
            };

            funnel.greeting += processStage(f.noReplyAfterGreeting || f.noReplyGreeting, "greeting");
            funnel.details += processStage(f.noReplyAfterDetails || f.noReplyDetails, "details");
            funnel.price += processStage(f.noReplyAfterPrice || f.noReplyPrice, "price");
            funnel.success += processStage(f.repliedAfterPrice, "success");
        }
    });

    const conversionRate = interactions > 0 ? ((funnel.success / interactions) * 100) : 0;
    
    // Biggest drop off string
    let biggestDrop = "بعد السعر";
    let dropVal = 0;
    const gToD = funnel.greeting;
    const dToP = funnel.details;
    const pToS = funnel.price; // those who didn't reply after price
    if (pToS > dropVal) { dropVal = pToS; biggestDrop = "بعد السعر"; }
    if (dToP > dropVal) { dropVal = dToP; biggestDrop = "بعد التفاصيل"; }
    if (gToD > dropVal) { dropVal = gToD; biggestDrop = "بعد التحية"; }
    
    const dropPercentage = interactions > 0 ? Math.round((dropVal / interactions) * 100) : 0;

    return { totalMessages, interactions, funnel, conversionRate, biggestDrop, dropPercentage, dropVal, adsData, jobConfusionCount };
}
