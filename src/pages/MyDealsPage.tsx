import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMyDeals, updateDeal, saveDeals, deleteDeal } from "@/lib/services/deals-service";
import { normalizeCustomerName } from "@/lib/services/customers-service";
import { ProductPicker } from "@/components/ProductPicker";
import { useCourses } from "@/lib/hooks/useCourses";
import { logRuntimeError } from "@/lib/services/runtime-logging-service";
import { classifyDealCategory } from "@/lib/utils/normalize-course-names";

type Range = "month" | "week" | "all";

const RANGE_LABELS: Record<Range, string> = {
  month: "هذا الشهر",
  week: "الأسبوع",
  all: "الكل",
};

function formatNumber(n: number) {
  return n.toLocaleString('en-US');
}

function collectPurchasedProductIds(allDeals: any[], deal: any): Set<string> {
  const cid = deal.customerId;
  const nk = normalizeCustomerName(deal.customerName || "");
  const set = new Set<string>();
  for (const d of allDeals) {
    const match =
      (cid && d.customerId && d.customerId === cid) ||
      (!cid && normalizeCustomerName(d.customerName || "") === nk) ||
      (cid && !d.customerId && normalizeCustomerName(d.customerName || "") === nk);
    if (!match) continue;
    if (Array.isArray(d.products)) {
      d.products.forEach((p: string) => set.add(p));
    }
  }
  return set;
}

function hasUpgradeableProducts(allDeals: any[], deal: any, allCourseIds: string[]): boolean {
  const purchased = collectPurchasedProductIds(allDeals, deal);
  return allCourseIds.some((id) => !purchased.has(id));
}

export default function MyDealsPage() {
  const { user } = useAuth();
  const courses = useCourses();
  const courseItems = useMemo(
    () =>
      courses.reduce<Array<{ id: string; label: string }>>((acc, c) => {
        const key = c.name.trim().toLowerCase().replace(/\s+/g, " ");
        if (!key) return acc;
        if (acc.some((x) => x.label.trim().toLowerCase().replace(/\s+/g, " ") === key)) return acc;
        acc.push({ id: c.id, label: c.name });
        return acc;
      }, []),
    [courses]
  );
  const courseMap = useMemo(() => new Map(courseItems.map((c) => [c.id, c.label])), [courseItems]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("month");
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: "",
    adSource: "",
    dealValue: 0,
    firstContactDate: "",
    contactAttempts: 1,
    closeDate: "",
    products: [] as string[],
    bookingType: "self_booking" as "self_booking" | "call_booking",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [upgradeForDeal, setUpgradeForDeal] = useState<any | null>(null);
  const [upgradeSelected, setUpgradeSelected] = useState<string[]>([]);
  const [upgradeValue, setUpgradeValue] = useState(0);
  const [upgradeFirstContact, setUpgradeFirstContact] = useState("");
  const [upgradeSaving, setUpgradeSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const loadDeals = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    getMyDeals(user.uid, user.name)
      .then(setDeals)
      .catch((e: unknown) => {
        console.error("Failed to load my deals:", e);
        void logRuntimeError({ source: "MyDealsPage.loadDeals", message: String((e as Error)?.message || e) });
        setDeals([]);
        setError("تعذر تحميل صفقاتك حالياً. تأكد من الصلاحيات أو حاول مرة أخرى.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const filtered = useMemo(() => {
    if (range === "all") return deals;
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === "week") cutoff.setDate(cutoff.getDate() - 7);
    if (range === "month") cutoff.setDate(cutoff.getDate() - 30);
    return deals.filter((d) => {
      const date = d.closeDate ? new Date(d.closeDate) : null;
      return date && date >= cutoff;
    });
  }, [deals, range]);
  const visibleDeals = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const totalRevenue = filtered.reduce((s: number, d: any) => s + (d.dealValue || 0), 0);
  const avgDeal = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;
  const avgCycle = (() => {
    const withCycle = filtered.filter((d: any) => typeof d.closingCycleDays === "number");
    if (!withCycle.length) return 0;
    return (
      withCycle.reduce((s: number, d: any) => s + d.closingCycleDays, 0) / withCycle.length
    ).toFixed(1);
  })();

  const upgradeAvailableProducts = useMemo(() => {
    if (!upgradeForDeal) return [] as Array<{ id: string; label: string }>;
    const purchased = collectPurchasedProductIds(deals, upgradeForDeal);
    return courseItems.filter((p) => !purchased.has(p.id));
  }, [upgradeForDeal, deals, courseItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" dir="rtl">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-[#2563EB]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 font-body" dir="rtl">
        <div className="bg-white rounded-2xl border border-red-200 py-12 text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[40px] text-red-500">error</span>
          <p className="text-base font-bold text-[#0F172A]">{error}</p>
        </div>
      </div>
    );
  }

  const startEdit = (deal: any) => {
    setSaveMsg(null);
    setEditingDealId(deal.id);
    setEditForm({
      customerName: deal.customerName || "",
      adSource: deal.adSource || "",
      dealValue: Number(deal.dealValue) || 0,
      firstContactDate: deal.firstContactDate || "",
      contactAttempts:
        typeof deal.contactAttempts === "number" && deal.contactAttempts >= 1
          ? Math.round(deal.contactAttempts)
          : 1,
      closeDate: deal.closeDate || deal.date || "",
      products: Array.isArray(deal.products) ? [...deal.products] : [],
      bookingType:
        deal.bookingType === "call_booking"
          ? "call_booking"
          : deal.closureType === "call"
            ? "call_booking"
            : "self_booking",
    });
  };

  const cancelEdit = () => {
    setEditingDealId(null);
    setIsSavingEdit(false);
  };

  const saveEdit = async () => {
    if (!editingDealId) return;
    if (!Number.isFinite(Number(editForm.contactAttempts)) || Number(editForm.contactAttempts) < 1) {
      setSaveMsg("عدد مرات التواصل يجب أن يكون رقمًا صحيحًا يبدأ من 1.");
      return;
    }
    setIsSavingEdit(true);
    setSaveMsg(null);
    try {
      const selectedLabels = editForm.products
        .map((id) => courseMap.get(id))
        .filter((v): v is string => Boolean(v));
      const progName =
        selectedLabels.length > 0 ? selectedLabels.join("، ") : "غير محدد";
      const progCount = editForm.products.length > 0 ? editForm.products.length : 1;
      await updateDeal(editingDealId, {
        customerName: editForm.customerName,
        adSource: editForm.adSource,
        programName: progName,
        programCount: Math.max(1, progCount),
        dealValue: editForm.dealValue,
        firstContactDate: editForm.firstContactDate,
        contactAttempts: editForm.contactAttempts,
        closeDate: editForm.closeDate,
        products: editForm.products,
        bookingType: editForm.bookingType,
        dealCategory: classifyDealCategory({ products: editForm.products, programName: progName }),
      });
      setDeals((prev) =>
        prev.map((d) => {
          if (d.id !== editingDealId) return d;
          let cycle: number | null = null;
          if (editForm.firstContactDate?.trim() && editForm.closeDate?.trim()) {
            const first = new Date(editForm.firstContactDate.trim());
            const close = new Date(editForm.closeDate.trim());
            if (!isNaN(first.getTime()) && !isNaN(close.getTime())) {
              cycle = Math.max(
                0,
                Math.round((close.getTime() - first.getTime()) / (1000 * 60 * 60 * 24))
              );
            }
          }
          return {
            ...d,
            customerName: editForm.customerName.trim(),
            adSource: editForm.adSource.trim(),
            programName: progName,
            programCount: Math.max(1, progCount),
            dealValue: Math.max(0, Number(editForm.dealValue) || 0),
            firstContactDate: editForm.firstContactDate?.trim() || null,
            contactAttempts: Math.max(1, Math.round(Number(editForm.contactAttempts) || 1)),
            closeDate: editForm.closeDate?.trim() || null,
            date: editForm.closeDate?.trim() || null,
            closingCycleDays: cycle,
            products: editForm.products,
            bookingType: editForm.bookingType,
            dealCategory: classifyDealCategory({ products: editForm.products, programName: progName }),
          };
        })
      );
      setEditingDealId(null);
      setSaveMsg("تم تحديث الصفقة في قاعدة البيانات بنجاح");
    } catch (e) {
      console.error("Update deal failed:", e);
      void logRuntimeError({ source: "MyDealsPage.saveEdit", message: String((e as Error)?.message || e) });
      setSaveMsg("فشل تحديث الصفقة. تأكد من الصلاحيات ثم حاول مرة أخرى.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openUpgrade = (deal: any) => {
    setSaveMsg(null);
    setUpgradeForDeal(deal);
    setUpgradeSelected([]);
    setUpgradeValue(0);
    const d = new Date();
    setUpgradeFirstContact(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  };

  const closeUpgrade = () => {
    setUpgradeForDeal(null);
    setUpgradeSaving(false);
  };

  const saveUpgrade = async () => {
    if (!user || !upgradeForDeal) return;
    if (upgradeSelected.length === 0) {
      setSaveMsg("اختر منتجاً واحداً على الأقل للترقية.");
      return;
    }
    if (upgradeValue <= 0) {
      setSaveMsg("أدخل سعر الصفقة كاملاً (أكبر من صفر).");
      return;
    }
    setUpgradeSaving(true);
    setSaveMsg(null);
    try {
      const selectedLabels = upgradeSelected
        .map((id) => courseMap.get(id))
        .filter((v): v is string => Boolean(v));
      await saveDeals(
        [
          {
            customerName: upgradeForDeal.customerName,
            adSource: upgradeForDeal.adSource || "",
            programName: selectedLabels.join("، "),
            programCount: upgradeSelected.length,
            dealValue: upgradeValue,
            firstContactDate: upgradeFirstContact || "",
            contactAttempts: 1,
            products: upgradeSelected,
            bookingType: "call_booking",
            dealCategory: classifyDealCategory({ products: upgradeSelected, programName: selectedLabels.join("، ") }),
            customerId: upgradeForDeal.customerId,
          },
        ],
        user.uid,
        user.name,
        user.teamName
      );
      closeUpgrade();
      setSaveMsg("تم تسجيل صفقة الترقية بنجاح.");
      loadDeals();
    } catch (e) {
      console.error("Upgrade save failed:", e);
      void logRuntimeError({ source: "MyDealsPage.saveUpgrade", message: String((e as Error)?.message || e) });
      setSaveMsg("فشل حفظ الترقية. حاول مرة أخرى.");
    } finally {
      setUpgradeSaving(false);
    }
  };

  const confirmDelete = async (deal: any) => {
    const label = deal.customerName?.trim() || "بدون اسم";
    const ok = window.confirm(
      `حذف صفقة «${label}» بقيمة ${formatNumber(deal.dealValue || 0)} ج.م؟\nلا يمكن التراجع عن هذا الإجراء.`
    );
    if (!ok) return;
    setSaveMsg(null);
    setDeletingId(deal.id);
    try {
      await deleteDeal(deal.id);
      setDeals((prev) => prev.filter((d) => d.id !== deal.id));
      if (editingDealId === deal.id) setEditingDealId(null);
      if (upgradeForDeal?.id === deal.id) closeUpgrade();
      setSaveMsg("تم حذف الصفقة.");
    } catch (e) {
      console.error("Delete deal failed:", e);
      void logRuntimeError({ source: "MyDealsPage.delete", message: String((e as Error)?.message || e) });
      setSaveMsg("تعذر حذف الصفقة. يمكنك حذف صفقاتك فقط أو حاول مرة أخرى.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 font-body" dir="rtl">
      <h1 className="text-2xl font-black text-[#1E293B]">💰 صفقاتي</h1>
      {saveMsg && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#334155]">
          {saveMsg}
        </div>
      )}

      {/* Range Tabs */}
      <div className="flex gap-2">
        {(["month", "week", "all"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${range === r ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"}`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#2563EB] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">الصفقات</p>
            <span
              className="material-symbols-outlined text-[20px] text-[#2563EB]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              handshake
            </span>
          </div>
          <p className="text-3xl font-black text-[#0F172A]">{filtered.length}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#10B981] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">الإيرادات</p>
            <span
              className="material-symbols-outlined text-[20px] text-[#10B981]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              payments
            </span>
          </div>
          <p className="text-2xl font-black text-[#10B981]">
            {formatNumber(totalRevenue)} <span className="text-base font-bold">ج.م</span>
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#8B5CF6] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">متوسط الصفقة</p>
            <span
              className="material-symbols-outlined text-[20px] text-[#8B5CF6]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              calculate
            </span>
          </div>
          <p className="text-2xl font-black text-[#0F172A]">
            {formatNumber(avgDeal)} <span className="text-base font-bold text-[#64748B]">ج.م</span>
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 flex flex-col gap-2 border-r-4 border-r-[#F59E0B] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">زمن الإغلاق</p>
            <span
              className="material-symbols-outlined text-[20px] text-[#F59E0B]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              timer
            </span>
          </div>
          <p className="text-2xl font-black text-[#0F172A]">
            {avgCycle} <span className="text-base font-bold text-[#64748B]">يوم</span>
          </p>
        </div>
      </div>

      {/* Deals List */}
      <div>
        <h3 className="text-base font-bold text-[#0F172A] mb-3">الصفقات</h3>
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] py-14 text-center flex flex-col items-center gap-3">
            <span
              className="material-symbols-outlined text-[40px] text-[#CBD5E1]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              monetization_on
            </span>
            <p className="text-base font-bold text-[#0F172A]">لا توجد صفقات</p>
            <p className="text-sm text-[#64748B]">لا توجد صفقات مسجلة في هذه الفترة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleDeals.map((deal: any, i: number) => (
              <div
                key={deal.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-black text-sm shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#0F172A] text-sm truncate">{deal.customerName}</p>
                      <p className="text-xs text-[#64748B] mt-0.5 truncate">{deal.adSource}</p>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-black text-[#2563EB] text-base">
                      {formatNumber(deal.dealValue)} <span className="text-xs font-bold">ج.م</span>
                    </p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      {deal.closeDate
                        ? new Date(deal.closeDate).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => startEdit(deal)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[#2563EB]/20 text-[#2563EB] hover:bg-[#EFF6FF]"
                  >
                    تعديل
                  </button>
                  {hasUpgradeableProducts(deals, deal, courseItems.map((c) => c.id)) && (
                    <button
                      type="button"
                      onClick={() => openUpgrade(deal)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-700 bg-amber-50 hover:bg-amber-100"
                    >
                      ترقية
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => confirmDelete(deal)}
                    disabled={deletingId === deal.id}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === deal.id ? "جاري الحذف..." : "حذف"}
                  </button>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {deal.programName && (
                    <span className="inline-block bg-[#F1F5F9] text-[#64748B] text-xs px-2.5 py-1 rounded-full font-bold border border-[#E2E8F0]">
                      {deal.programName}
                    </span>
                  )}
                  {deal.bookingType === "self_booking" ? (
                    <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-bold">
                      حجز ذاتي
                    </span>
                  ) : (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-bold">
                      مكالمة مبيعات
                    </span>
                  )}
                  <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-bold border ${((deal.dealCategory || classifyDealCategory(deal)) === "side") ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
                    {(deal.dealCategory || classifyDealCategory(deal)) === "side" ? "Side Deal" : "Core Deal"}
                  </span>
                  {typeof deal.closingCycleDays === "number" && (
                    <span className="inline-block bg-[#EFF6FF] text-[#2563EB] text-xs px-2.5 py-1 rounded-full font-bold border border-[#2563EB]/10">
                      {deal.closingCycleDays} يوم إغلاق
                    </span>
                  )}
                  {typeof deal.contactAttempts === "number" && deal.contactAttempts >= 1 && (
                    <span className="inline-block bg-[#FEF9C3] text-[#854D0E] text-xs px-2.5 py-1 rounded-full font-bold border border-[#FDE68A]">
                      {deal.contactAttempts} محاولة تواصل
                    </span>
                  )}
                </div>

                {editingDealId === deal.id && (
                  <div className="mt-4 border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC] space-y-3">
                    <div>
                      <p className="text-[11px] font-bold text-[#64748B] mb-2">
                        المنتجات / الكورسات{" "}
                        <span className="text-[#94A3B8] font-normal">(اختياري)</span>
                      </p>
                      <ProductPicker
                        selected={editForm.products}
                        onChange={(ids) => setEditForm((p) => ({ ...p, products: ids }))}
                        items={courseItems}
                      />
                      {editForm.products.length === 0 && (
                        <p className="text-[10px] text-[#94A3B8] font-bold mt-1">
                          بدون اختيار سيُحفظ كـ «غير محدد».
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditForm((p) => ({ ...p, bookingType: "call_booking" }))}
                        className={`flex-1 py-2 text-[12px] font-black rounded-xl border ${editForm.bookingType === "call_booking" ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-white text-[#64748B] border-[#E2E8F0]"}`}
                      >
                        مكالمة مبيعات
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm((p) => ({ ...p, bookingType: "self_booking" }))}
                        className={`flex-1 py-2 text-[12px] font-black rounded-xl border ${editForm.bookingType === "self_booking" ? "bg-[#8B5CF6] text-white border-[#8B5CF6]" : "bg-white text-[#64748B] border-[#E2E8F0]"}`}
                      >
                        حجز ذاتي
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        value={editForm.customerName}
                        onChange={(e) => setEditForm((p) => ({ ...p, customerName: e.target.value }))}
                        placeholder="اسم العميل"
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                      <input
                        value={editForm.adSource}
                        onChange={(e) => setEditForm((p) => ({ ...p, adSource: e.target.value }))}
                        placeholder="مصدر الإعلان"
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        value={editForm.dealValue}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, dealValue: Number(e.target.value) || 0 }))
                        }
                        placeholder="قيمة الصفقة"
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={editForm.contactAttempts}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, contactAttempts: Math.max(1, Number(e.target.value) || 1) }))
                        }
                        placeholder="مرات التواصل"
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                      <input
                        type="date"
                        value={editForm.firstContactDate}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, firstContactDate: e.target.value }))
                        }
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                      <input
                        type="date"
                        value={editForm.closeDate}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, closeDate: e.target.value }))
                        }
                        className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={isSavingEdit}
                        className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-bold disabled:opacity-50"
                      >
                        {isSavingEdit ? "جاري الحفظ..." : "حفظ التعديل"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isSavingEdit}
                        className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] text-sm font-bold"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {visibleCount < filtered.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + 20)}
                className="w-full py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#334155] text-sm font-bold hover:bg-[#F8FAFC]"
              >
                تحميل المزيد ({filtered.length - visibleCount} متبقي)
              </button>
            )}
          </div>
        )}
      </div>

      {upgradeForDeal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-2">
              <div>
                <h3 className="text-lg font-black text-[#0F172A]">ترقية — منتجات جديدة</h3>
                <p className="text-sm text-[#64748B] mt-1">
                  العميل: <span className="font-bold text-[#1E293B]">{upgradeForDeal.customerName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeUpgrade}
                className="text-[#94A3B8] hover:text-[#64748B]"
                aria-label="إغلاق"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {upgradeAvailableProducts.length === 0 ? (
              <p className="text-sm font-bold text-[#64748B]">لا توجد منتجات إضافية متاحة للترقية.</p>
            ) : (
              <>
                <p className="text-[12px] font-bold text-[#64748B]">اختر المنتجات (السعر كامل للصفقة الجديدة)</p>
                <ProductPicker
                  selected={upgradeSelected}
                  onChange={setUpgradeSelected}
                  allowedIds={upgradeAvailableProducts.map((p) => p.id)}
                  items={courseItems}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] block mb-1">قيمة الصفقة (ج.م)</label>
                    <input
                      type="number"
                      min={0}
                      value={upgradeValue || ""}
                      onChange={(e) => setUpgradeValue(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] block mb-1">أول تواصل</label>
                    <input
                      type="date"
                      value={upgradeFirstContact}
                      onChange={(e) => setUpgradeFirstContact(e.target.value)}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={saveUpgrade}
                    disabled={upgradeSaving}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-black disabled:opacity-50"
                  >
                    {upgradeSaving ? "جاري الحفظ..." : "حفظ صفقة الترقية"}
                  </button>
                  <button
                    type="button"
                    onClick={closeUpgrade}
                    disabled={upgradeSaving}
                    className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-bold text-[#475569]"
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
