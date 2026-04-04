export function AdsSummaryRow({ ads }: { ads: any[] }) {
    if (ads.length === 0) return null;

    // Best Ad
    const bestAd = [...ads].sort((a, b) => b.conv - a.conv)[0];
    // Worst Ad (minimum 10 total messages to be statistically relevant, or just fallback to last)
    const validAds = ads.filter(a => a.total > 10);
    const worstAd = validAds.length > 0 ? [...validAds].sort((a, b) => a.conv - b.conv)[0] : [...ads].sort((a, b) => a.conv - b.conv)[0];
    
    // Highest Confusion
    const highestConfusion = [...ads].sort((a, b) => b.confusion - a.confusion)[0];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-body" dir="rtl">
            {/* Best Ad */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
                <div className="flex justify-between items-start mb-4 pl-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-[#64748B] uppercase tracking-widest">أفضل إعلان</p>
                            <h3 className="text-[16px] font-black text-[#1E293B] mt-0.5">{bestAd?.name || 'غير متوفر'}</h3>
                        </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-200 uppercase">
                        الأفضل
                    </span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#1E293B]">{bestAd?.conv?.toFixed(1) || 0}%</span>
                    <span className="text-[12px] font-bold text-[#64748B]">معدل التحويل</span>
                </div>
            </div>

            {/* Worst Ad */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-error"></div>
                <div className="flex justify-between items-start mb-4 pl-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-error flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">trending_down</span>
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-[#64748B] uppercase tracking-widest">أسوأ إعلان</p>
                            <h3 className="text-[16px] font-black text-[#1E293B] mt-0.5 max-w-[140px] truncate">{worstAd?.name || 'غير متوفر'}</h3>
                        </div>
                    </div>
                    <span className="bg-red-50 text-error text-[10px] font-black px-2.5 py-1 rounded-full border border-red-200 uppercase">
                        يحتاج مراجعة
                    </span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#1E293B]">{worstAd?.conv?.toFixed(1) || 0}%</span>
                    <span className="text-[12px] font-bold text-[#64748B]">معدل التحويل</span>
                </div>
            </div>

            {/* Highest Confusion */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500"></div>
                <div className="flex justify-between items-start mb-4 pl-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">work_off</span>
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-[#64748B] uppercase tracking-widest">أعلى خلط بوظيفة</p>
                            <h3 className="text-[16px] font-black text-[#1E293B] mt-0.5 truncate max-w-[140px]">{highestConfusion?.name || 'غير متوفر'}</h3>
                        </div>
                    </div>
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-200 uppercase">
                        تنبيه
                    </span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#1E293B]">{highestConfusion?.confusion?.toFixed(1) || 0}%</span>
                    <span className="text-[12px] font-bold text-[#64748B]">ظنوا الإعلان توظيف</span>
                </div>
            </div>
        </div>
    );
}
