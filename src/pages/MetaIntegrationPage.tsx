import { Link } from "react-router-dom";

export default function MetaIntegrationPage() {
  return (
    <div className="max-w-2xl mx-auto pb-20" dir="rtl">
      <header className="mb-6">
        <h1 className="text-[22px] md:text-[28px] font-black text-[#1E293B] mb-1">ربط حسابات الإعلانات</h1>
        <p className="text-[13px] font-bold text-[#64748B]">
          لما تربط حسابك، النظام يسحب البيانات تلقائياً يومياً (المصروف، Leads، Reach، إلخ).
        </p>
      </header>

      {/* Meta connection card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
            </div>
            <div>
              <h2 className="text-[16px] font-black text-[#1E293B]">Meta (Facebook + Instagram)</h2>
              <p className="text-[12px] font-bold text-[#64748B] mt-0.5">
                ربط حساب Meta Business لسحب بيانات الإعلانات تلقائياً
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-200 shrink-0">
            <span className="material-symbols-outlined text-[12px]">schedule</span>
            قريباً
          </span>
        </div>

        {/* Features list */}
        <div className="bg-[#F8FAFC] rounded-xl p-4 mb-5 border border-[#E2E8F0]">
          <h3 className="text-[12px] font-black text-[#1E293B] mb-2">عند الربط:</h3>
          <ul className="space-y-2 text-[12px] font-bold text-[#475569]">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-[16px] mt-0.5 shrink-0">check_circle</span>
              سحب يومي تلقائي للمصروف والـ Leads (الساعة 6 صباحاً)
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-[16px] mt-0.5 shrink-0">check_circle</span>
              ربط الإعلانات بالحملات في Meta Ads Manager
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-[16px] mt-0.5 shrink-0">check_circle</span>
              زرار "Sync Now" لتحديث فوري
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-[16px] mt-0.5 shrink-0">check_circle</span>
              حساب CPL/ROAS تلقائي بدون إدخال يدوي
            </li>
          </ul>
        </div>

        {/* Privacy note */}
        <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-3 mb-5 flex items-start gap-2">
          <span className="material-symbols-outlined text-[#F59E0B] text-[18px] mt-0.5 shrink-0">shield_lock</span>
          <p className="text-[11px] font-bold text-[#92400E] leading-relaxed">
            <strong>الخصوصية:</strong> النظام يطلب صلاحية القراءة فقط (ads_read). لن نقدر ننشر أو نعدل أي حاجة في حسابك.
          </p>
        </div>

        {/* Disabled connect button */}
        <button
          type="button"
          disabled
          className="w-full bg-blue-600 text-white px-5 py-3 rounded-xl text-[13px] font-black opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">link</span>
          ربط حساب Meta
        </button>

        <p className="text-[11px] text-[#94A3B8] text-center mt-3">
          هذه الميزة في طور التطوير (Phase 2). دلوقتي ادخل بياناتك يدوياً من <Link to="/spend-entry" className="text-[#2563EB] hover:underline font-bold">إدخال المصروف</Link>.
        </p>
      </div>

      {/* TikTok placeholder */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 opacity-60">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center text-black shrink-0">
              <span className="material-symbols-outlined text-[24px]">music_note</span>
            </div>
            <div>
              <h2 className="text-[16px] font-black text-[#1E293B]">TikTok Ads</h2>
              <p className="text-[12px] font-bold text-[#64748B] mt-0.5">سحب بيانات إعلانات تيك توك</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-200 shrink-0">
            مستقبلاً
          </span>
        </div>
      </div>
    </div>
  );
}
