export function getAdsDeepStats(reports: any[]) {
    const adsData: Record<string, any> = {};

    reports.forEach(r => {
        const pd = r.parsedData;
        if (!pd) return;

        const f = pd.funnel || pd.funnels;
        if (!f) return;

        const processStage = (arr: any[], stageName: string) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((item: any) => {
                const count = item.count || 0;
                const ad = item.adName || "عام";
                if (!adsData[ad]) adsData[ad] = { greeting: 0, details: 0, price: 0, success: 0, total: 0, confusion: 0, notes: [] };
                adsData[ad][stageName] += count;
                adsData[ad].total += count;
                if (item.notes && item.notes.length > 3) adsData[ad].notes.push(item.notes);
            });
        };

        processStage(f.noReplyAfterGreeting || f.noReplyGreeting, "greeting");
        processStage(f.noReplyAfterDetails || f.noReplyDetails, "details");
        processStage(f.noReplyAfterPrice || f.noReplyPrice, "price");
        processStage(f.repliedAfterPrice, "success");

        // Job confusion
        if (pd.jobConfusionCount && pd.jobConfusionCount > 0) {
            // Find ad with most volume in this specific report to attribute the job confusion
            const fallbackAd = "عام";
            adsData[fallbackAd] = adsData[fallbackAd] || { greeting: 0, details: 0, price: 0, success: 0, total: 0, confusion: 0, notes: [] };
            adsData[fallbackAd].confusion += pd.jobConfusionCount;
        }

        // Add special cases to global fallback if not assigned
        if (pd.specialCases && Array.isArray(pd.specialCases)) {
             const fallbackAd = "عام";
             adsData[fallbackAd] = adsData[fallbackAd] || { greeting: 0, details: 0, price: 0, success: 0, total: 0, confusion: 0, notes: [] };
             pd.specialCases.forEach((note: string) => {
                 if (note.length > 5) adsData[fallbackAd].notes.push(note);
             });
        }
    });

    const result = Object.entries(adsData).map(([name, data]: any) => {
        const conv = data.total > 0 ? (data.success / data.total) * 100 : 0;
        const confuseRate = data.total > 0 ? (data.confusion / data.total) * 100 : 0;
        
        let biggestDrop = "التفاصيل";
        let dropVol = data.details;
        if (data.price > dropVol) { biggestDrop = "السعر"; dropVol = data.price }
        if (data.greeting > dropVol) { biggestDrop = "التحية"; dropVol = data.greeting }
        
        const dropRate = data.total > 0 ? (dropVol / data.total) * 100 : 0;

        return {
            name,
            total: data.total,
            interactions: data.total - data.greeting,
            conv,
            confusion: confuseRate,
            funnel: {
                greeting: data.greeting,
                details: data.details,
                price: data.price,
                success: data.success
            },
            biggestDrop,
            dropRate,
            notes: [...new Set(data.notes)].filter((n: any) => typeof n === 'string' && n.trim() !== "").slice(0, 3)
        };
    });

    const totalValidAds = result.filter(r => r.total > 0);
    const teamConv = totalValidAds.reduce((acc, r) => acc + r.conv, 0) / (totalValidAds.length || 1);
    
    return result.map(r => {
        let state = "متوسط";
        // 🟢 قوي: conversion > team average
        // 🟡 متوسط: conversion within 20% of average (handled naturally if not weak or strong)
        // 🔴 ضعيف: conversion < 50% of average
        // ⚠️ خلط: job confusion > 15%
        if (r.confusion > 15) state = "خلط";
        else if (r.conv < teamConv * 0.5) state = "ضعيف";
        else if (r.conv > teamConv) state = "قوي";

        return { ...r, state };
    }).sort((a, b) => b.conv - a.conv);
}
