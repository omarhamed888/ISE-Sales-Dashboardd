import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useActiveAds } from "@/lib/hooks/useAds";
import { useToast } from "@/components/ui/Toast";
import { saveAdSpendBatch, getMyAdSpend, type SpendEntryInput } from "@/lib/services/ad-spend-service";
import type { AdSpendEntry, Ad } from "@/lib/types";
import { AddAdModal } from "@/components/spend/AddAdModal";

type Platform = AdSpendEntry["platform"];

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: "facebook",  label: "فيسبوك" },
  { value: "instagram", label: "إنستجرام" },
  { value: "tiktok",    label: "تيك توك" },
  { value: "messenger", label: "ماسنجر" },
  { value: "whatsapp",  label: "واتساب" },
];

interface RowState {
  adId: string;
  adName: string;
  platform: Platform;
  spend: string;
  leadsReported: string;
  reach: string;
  impressions: string;
  clicks: string;
  notes: string;
  existingId?: string;
  dirty: boolean;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Build initial row from existing entry or blank. */
function buildRow(ad: Ad, existing?: AdSpendEntry): RowState {
  return {
    adId: ad.id,
    adName: ad.name,
    platform: existing?.platform ?? "facebook",
    spend: existing ? String(existing.spend) : "",
    leadsReported: existing ? String(existing.leadsReported) : "",
    reach: existing?.reach !== undefined ? String(existing.reach) : "",
    impressions: existing?.impressions !== undefined ? String(existing.impressions) : "",
    clicks: existing?.clicks !== undefined ? String(existing.clicks) : "",
    notes: existing?.notes ?? "",
    existingId: existing?.id,
    dirty: false,
  };
}

export default function SpendEntryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { ads, loading: adsLoading } = useActiveAds();

  const [date, setDate] = useState<string>(todayStr());
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [todaysExisting, setTodaysExisting] = useState<AdSpendEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Fetch buyer's spend history (last 14 days) → derive "active campaign" ads
  // Plus today's entries (for editing)
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    setHistoryLoading(true);
    getMyAdSpend(user.uid, 14)
      .then((all) => {
        if (cancelled) return;
        // Today's entries (for pre-fill)
        const todays = all.filter((e) => e.date === date);
        setTodaysExisting(todays);

        // Derive active ad set: any ad with spend in last 14 days OR today
        const activeIds = new Set<string>();
        all.forEach((e) => activeIds.add(e.adId));
        setSelectedAdIds(activeIds);
      })
      .catch(() => {
        if (cancelled) return;
        setTodaysExisting([]);
        setSelectedAdIds(new Set());
      })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [user?.uid, date]);

  // Build rows when data is ready
  useEffect(() => {
    if (adsLoading || historyLoading) return;
    setRows((prev) => {
      const next: Record<string, RowState> = {};
      const adById = new Map(ads.map((a) => [a.id, a]));
      selectedAdIds.forEach((adId) => {
        const ad = adById.get(adId);
        if (!ad) return; // ad was removed/archived from system
        const prevRow = prev[adId];
        if (prevRow && prevRow.dirty) {
          next[adId] = prevRow; // preserve user edits
          return;
        }
        const existing = todaysExisting.find((e) => e.adId === adId);
        next[adId] = buildRow(ad, existing);
      });
      return next;
    });
  }, [ads, adsLoading, selectedAdIds, todaysExisting, historyLoading]);

  const updateRow = (adId: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [adId]: { ...prev[adId], ...patch, dirty: true } }));
  };

  const handleAddAd = (ad: Ad) => {
    if (selectedAdIds.has(ad.id)) return;
    setSelectedAdIds((prev) => {
      const next = new Set(prev);
      next.add(ad.id);
      return next;
    });
    showToast("info", `تمت إضافة "${ad.name}" لقائمتك`);
  };

  const handleRemoveAd = (adId: string, adName: string) => {
    if (rows[adId]?.existingId) {
      // Has saved data — confirm before removing from view
      if (!window.confirm(`الإعلان "${adName}" عليه بيانات محفوظة لتاريخ ${date}. حذفه من القائمة لن يحذف البيانات المحفوظة. متابعة؟`)) {
        return;
      }
    }
    setSelectedAdIds((prev) => {
      const next = new Set(prev);
      next.delete(adId);
      return next;
    });
    setRows((prev) => {
      const next = { ...prev };
      delete next[adId];
      return next;
    });
  };

  const totals = useMemo(() => {
    let totalSpend = 0;
    let totalLeads = 0;
    let filledCount = 0;
    Object.values(rows).forEach((r) => {
      const s = Number(r.spend) || 0;
      const l = Number(r.leadsReported) || 0;
      totalSpend += s;
      totalLeads += l;
      if (s > 0 || l > 0) filledCount += 1;
    });
    return { totalSpend, totalLeads, filledCount };
  }, [rows]);

  const availableAdsForPicker = useMemo(() => {
    return ads.filter((a) => !selectedAdIds.has(a.id));
  }, [ads, selectedAdIds]);

  const handleSave = async () => {
    if (!user) return;
    const inputs: SpendEntryInput[] = [];
    for (const r of Object.values(rows)) {
      const spend = Number(r.spend) || 0;
      const leads = Number(r.leadsReported) || 0;
      // Skip empty rows that don't already have data
      if (spend === 0 && leads === 0 && !r.existingId) continue;
      inputs.push({
        date,
        adId: r.adId,
        adName: r.adName,
        platform: r.platform,
        spend,
        leadsReported: leads,
        reach: r.reach !== "" ? Number(r.reach) || 0 : undefined,
        impressions: r.impressions !== "" ? Number(r.impressions) || 0 : undefined,
        clicks: r.clicks !== "" ? Number(r.clicks) || 0 : undefined,
        notes: r.notes,
        mediaBuyerId: user.uid,
        mediaBuyerName: user.name,
      });
    }
    if (inputs.length === 0) {
      showToast("warning", "لا توجد بيانات لحفظها. أدخل قيم لإعلان واحد على الأقل.");
      return;
    }
    setSaving(true);
    try {
      await saveAdSpendBatch(inputs);
      showToast("success", `تم حفظ ${inputs.length} سجل بنجاح ✓`);
      const all = await getMyAdSpend(user.uid, 14);
      setTodaysExisting(all.filter((e) => e.date === date));
      setRows((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { next[k] = { ...next[k], dirty: false }; });
        return next;
      });
    } catch (e: any) {
      showToast("error", e?.message || "فشل الحفظ. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const isLoading = adsLoading || historyLoading;
  const hasNoAds = !isLoading && selectedAdIds.size === 0;
  const visibleAds = ads.filter((a) => selectedAdIds.has(a.id));

  return (
    <div className="max-w-[1200px] mx-auto pb-24" dir="rtl">
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-[22px] md:text-[28px] font-black text-[#1E293B] mb-1">إدخال مصروف الإعلانات</h1>
          <p className="text-[13px] font-bold text-[#64748B]">سجّل مصروفك يومياً للحصول على تحليلات ROI دقيقة.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-bold text-[#64748B]">التاريخ:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayStr()}
            className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
            dir="ltr"
          />
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 border-r-4 border-r-[#10B981]">
          <p className="text-xs font-semibold text-[#64748B] uppercase">إجمالي المصروف</p>
          <p className="text-3xl font-black text-[#0F172A] mt-1">{totals.totalSpend.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-[#94A3B8] mt-1">جنيه</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 border-r-4 border-r-[#2563EB]">
          <p className="text-xs font-semibold text-[#64748B] uppercase">إجمالي الـ Leads</p>
          <p className="text-3xl font-black text-[#0F172A] mt-1">{totals.totalLeads.toLocaleString('en-US')}</p>
          <p className="text-xs text-[#94A3B8] mt-1">من المنصات</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 border-r-4 border-r-[#F59E0B]">
          <p className="text-xs font-semibold text-[#64748B] uppercase">CPL متوسط</p>
          <p className="text-3xl font-black text-[#0F172A] mt-1">
            {totals.totalLeads > 0 ? (totals.totalSpend / totals.totalLeads).toFixed(2) : '—'}
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">جنيه/lead</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <p className="text-[13px] font-bold text-[#64748B]">
            {visibleAds.length} إعلان في قائمتك · {totals.filledCount} مُدخل
          </p>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            disabled={availableAdsForPicker.length === 0}
            className="bg-[#EFF6FF] text-[#2563EB] px-3 py-1.5 rounded-lg text-[12px] font-bold hover:bg-[#2563EB]/10 disabled:opacity-50 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            إضافة إعلان
          </button>
        </div>
        <label className="flex items-center gap-2 text-[12px] font-bold text-[#64748B] cursor-pointer">
          <input
            type="checkbox"
            checked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.target.checked)}
            className="w-4 h-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-0"
          />
          إظهار حقول متقدمة
        </label>
      </div>

      {/* Entry table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-[#64748B] font-bold text-sm">جاري تحميل البيانات...</div>
        ) : hasNoAds ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-[#CBD5E1] block mb-3">campaign</span>
            <p className="text-base font-black text-[#0F172A] mb-1">ابدأ بإضافة إعلاناتك الجارية</p>
            <p className="text-sm text-[#64748B] mb-5 max-w-md mx-auto">
              اختر الإعلانات اللي بتصرف عليها هذا الأسبوع. هتظهر هنا كل يوم لإدخال البيانات بسرعة.
            </p>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              disabled={ads.length === 0}
              className="bg-[#2563EB] text-white px-6 py-3 rounded-xl text-[13px] font-black hover:bg-[#1D4ED8] disabled:opacity-50 inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              {ads.length === 0 ? "لا توجد إعلانات نشطة في النظام" : "اختر إعلاناتك"}
            </button>
            {ads.length === 0 && (
              <p className="text-xs text-[#94A3B8] mt-3">
                تواصل مع الأدمن لإضافة الإعلانات في إدارة الإعلانات.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[13px]">
              <thead className="bg-[#F7F9FC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="p-3 font-bold text-[#64748B] text-xs">الإعلان</th>
                  <th className="p-3 font-bold text-[#64748B] text-xs w-32">المنصة</th>
                  <th className="p-3 font-bold text-[#64748B] text-xs text-center w-28">المصروف</th>
                  <th className="p-3 font-bold text-[#64748B] text-xs text-center w-24">Leads</th>
                  {showAdvanced && (
                    <>
                      <th className="p-3 font-bold text-[#64748B] text-xs text-center w-24">Reach</th>
                      <th className="p-3 font-bold text-[#64748B] text-xs text-center w-28">Impressions</th>
                      <th className="p-3 font-bold text-[#64748B] text-xs text-center w-24">Clicks</th>
                    </>
                  )}
                  <th className="p-3 font-bold text-[#64748B] text-xs">ملاحظة</th>
                  <th className="p-3 font-bold text-[#64748B] text-xs text-center w-12"></th>
                </tr>
              </thead>
              <tbody>
                {visibleAds.map((ad) => {
                  const row = rows[ad.id];
                  if (!row) return null;
                  const spendVal = Number(row.spend) || 0;
                  const leadsVal = Number(row.leadsReported) || 0;
                  const cpl = spendVal > 0 && leadsVal > 0 ? (spendVal / leadsVal).toFixed(2) : null;
                  return (
                    <tr key={ad.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC]/50">
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-black text-[13px] text-[#1E293B]">{ad.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {row.existingId && <span className="text-[10px] font-bold text-emerald-600">✓ محفوظ</span>}
                            {cpl && <span className="text-[10px] font-bold text-amber-600">CPL: {cpl} ج</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <select
                          value={row.platform}
                          onChange={(e) => updateRow(ad.id, { platform: e.target.value as Platform })}
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-[12px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
                        >
                          {PLATFORM_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.spend}
                          onChange={(e) => updateRow(ad.id, { spend: e.target.value })}
                          placeholder="0"
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-[13px] font-bold text-[#1E293B] text-center focus:border-[#2563EB] outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={row.leadsReported}
                          onChange={(e) => updateRow(ad.id, { leadsReported: e.target.value })}
                          placeholder="0"
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-[13px] font-bold text-[#1E293B] text-center focus:border-[#2563EB] outline-none"
                        />
                      </td>
                      {showAdvanced && (
                        <>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              value={row.reach}
                              onChange={(e) => updateRow(ad.id, { reach: e.target.value })}
                              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-[12px] text-center focus:border-[#2563EB] outline-none"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              value={row.impressions}
                              onChange={(e) => updateRow(ad.id, { impressions: e.target.value })}
                              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-[12px] text-center focus:border-[#2563EB] outline-none"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              value={row.clicks}
                              onChange={(e) => updateRow(ad.id, { clicks: e.target.value })}
                              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-[12px] text-center focus:border-[#2563EB] outline-none"
                            />
                          </td>
                        </>
                      )}
                      <td className="p-3">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => updateRow(ad.id, { notes: e.target.value })}
                          placeholder="مثلاً: غيرت الـ creative"
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-[12px] text-[#1E293B] focus:border-[#2563EB] outline-none"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveAd(ad.id, ad.name)}
                          className="text-[#94A3B8] hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"
                          title="إزالة من قائمتي"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save bar */}
      {!hasNoAds && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-[#E2E8F0] p-4 z-40">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
            <p className="text-[12px] font-bold text-[#64748B]">
              {totals.filledCount} إعلان جاهز · إجمالي {totals.totalSpend.toLocaleString('en-US', { maximumFractionDigits: 2 })} ج
            </p>
            <button
              onClick={handleSave}
              disabled={saving || totals.filledCount === 0}
              className="bg-[#2563EB] text-white px-8 py-3 rounded-xl text-[13px] font-black shadow-lg hover:bg-[#1D4ED8] disabled:opacity-50 disabled:bg-[#94A3B8] flex items-center gap-2"
            >
              {saving ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> جاري الحفظ...</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">save</span> حفظ كل البيانات</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Add Ad Modal */}
      <AddAdModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        availableAds={availableAdsForPicker}
        onPick={handleAddAd}
      />
    </div>
  );
}
