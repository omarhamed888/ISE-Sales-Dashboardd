import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import {
  testMetaConnection,
  syncMetaAds,
  saveMetaConfig,
  updateAutoSync,
  subscribeToMetaConfig,
  type MetaConnectionConfig,
  type TestConnectionResult,
} from "@/lib/services/meta-api-service";

function formatTimestamp(ts: unknown): string {
  if (!ts) return "—";
  try {
    if (typeof (ts as { toDate?: () => Date }).toDate === "function") {
      return (ts as { toDate: () => Date }).toDate().toLocaleString("ar-EG");
    }
  } catch {
    /* ignore */
  }
  return "—";
}

export default function MetaIntegrationPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isSuperAdmin = user?.role === "superadmin";

  const [config, setConfig] = useState<MetaConnectionConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // form
  const [accessToken, setAccessToken] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [showToken, setShowToken] = useState(false);

  // ops state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [togglingAutoSync, setTogglingAutoSync] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMetaConfig(
      (c) => {
        setConfig(c);
        setLoading(false);
        if (c?.adAccountId) setAdAccountId(c.adAccountId);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  const isConnected = !!(config?.accessToken && config?.adAccountId);

  const handleTest = async () => {
    const token = accessToken.trim() || config?.accessToken || "";
    const account = adAccountId.trim();
    if (!token || !account) {
      showToast("warning", "أدخل التوكن ورقم الحساب أولاً.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testMetaConnection(token, account);
      setTestResult(result);
      if (result.success) {
        showToast("success", `تم الاتصال بنجاح: ${result.accountName ?? account}`);
      } else {
        showToast("error", result.error || "فشل الاتصال.");
      }
    } catch (e: any) {
      const message = e?.message || "تعذّر الاتصال بـ Meta.";
      setTestResult({ success: false, error: message });
      showToast("error", message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    const token = accessToken.trim();
    const account = adAccountId.trim();
    if (!token || !account) {
      showToast("warning", "أدخل التوكن ورقم الحساب أولاً.");
      return;
    }
    if (!testResult?.success) {
      showToast("warning", "اختبر الاتصال أولاً قبل الحفظ.");
      return;
    }
    setSaving(true);
    try {
      await saveMetaConfig({
        accessToken: token,
        adAccountId: account,
        autoSyncEnabled: config?.autoSyncEnabled !== false,
      });
      setAccessToken("");
      showToast("success", "تم حفظ بيانات Meta بنجاح ✓");
    } catch (e: any) {
      showToast("error", e?.message || "تعذّر الحفظ.");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!isConnected) {
      showToast("warning", "اربط حساب Meta أولاً.");
      return;
    }
    setSyncing(true);
    try {
      const result = await syncMetaAds(7);
      showToast("success", `تم سحب ${result.written} سجل من Meta ✓`);
    } catch (e: any) {
      showToast("error", e?.message || "فشلت المزامنة.");
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleAutoSync = async () => {
    if (!isSuperAdmin || !isConnected) return;
    const next = !(config?.autoSyncEnabled !== false);
    setTogglingAutoSync(true);
    try {
      await updateAutoSync(next);
      showToast("success", next ? "تم تفعيل المزامنة التلقائية." : "تم إيقاف المزامنة التلقائية.");
    } catch (e: any) {
      showToast("error", e?.message || "تعذّر تحديث الإعداد.");
    } finally {
      setTogglingAutoSync(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20" dir="rtl">
      <header className="mb-6">
        <h1 className="text-[22px] md:text-[28px] font-black text-[#1E293B] mb-1">ربط حسابات الإعلانات</h1>
        <p className="text-[13px] font-bold text-[#64748B]">
          لما تربط حسابك، النظام يسحب البيانات تلقائياً يومياً (المصروف، Leads، Reach، إلخ).
        </p>
      </header>

      {/* Connection status */}
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
          {loading ? (
            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-200 shrink-0">
              جاري التحميل...
            </span>
          ) : isConnected ? (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              متصل
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-200 shrink-0">
              <span className="material-symbols-outlined text-[12px]">link_off</span>
              غير متصل
            </span>
          )}
        </div>

        {/* Sync status (when connected) */}
        {isConnected && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-3">
              <p className="text-[10px] font-bold text-[#64748B] uppercase">رقم الحساب</p>
              <p className="text-[13px] font-black text-[#1E293B] mt-1 truncate">{config?.adAccountId}</p>
            </div>
            <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-3">
              <p className="text-[10px] font-bold text-[#64748B] uppercase">آخر مزامنة</p>
              <p className="text-[13px] font-black text-[#1E293B] mt-1">{formatTimestamp(config?.lastSyncAt)}</p>
            </div>
            <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-3">
              <p className="text-[10px] font-bold text-[#64748B] uppercase">حالة آخر مزامنة</p>
              <p className={`text-[13px] font-black mt-1 ${config?.lastSyncStatus === "success" ? "text-emerald-600" : config?.lastSyncStatus === "error" ? "text-red-600" : "text-slate-500"}`}>
                {config?.lastSyncStatus === "success" ? `نجاح (${config?.lastSyncCount ?? 0})` : config?.lastSyncStatus === "error" ? "فشل" : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Error from last sync */}
        {isConnected && config?.lastSyncStatus === "error" && config?.lastSyncError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 flex items-start gap-2">
            <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5 shrink-0">error</span>
            <p className="text-[12px] font-bold text-red-700 leading-relaxed break-all">{config.lastSyncError}</p>
          </div>
        )}

        {/* Privacy note */}
        <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-3 mb-5 flex items-start gap-2">
          <span className="material-symbols-outlined text-[#F59E0B] text-[18px] mt-0.5 shrink-0">shield_lock</span>
          <p className="text-[11px] font-bold text-[#92400E] leading-relaxed">
            <strong>الخصوصية:</strong> التوكن يتخزن في Firestore بصلاحيات مقيدة للسوبر-أدمن فقط. يستخدم Firebase Cloud Function للاتصال بـ Meta. لا يصل للمتصفح.
          </p>
        </div>

        {/* Token form (superadmin only) */}
        {isSuperAdmin ? (
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Meta Access Token (System User)</label>
              <div className="flex gap-2">
                <input
                  type={showToken ? "text" : "password"}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={isConnected ? "•••••••• (محفوظ — اتركه فارغاً للإبقاء عليه)" : "ضع توكن System User الطويل المدى"}
                  className="flex-1 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="px-3 py-2 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl text-[#64748B] hover:text-[#1E293B]"
                  title={showToken ? "إخفاء" : "إظهار"}
                >
                  <span className="material-symbols-outlined text-[16px]">{showToken ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Ad Account ID</label>
              <input
                type="text"
                value={adAccountId}
                onChange={(e) => setAdAccountId(e.target.value)}
                placeholder="act_1234567890 (مع act_ أو بدونه)"
                className="w-full bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
                dir="ltr"
              />
            </div>

            {/* Test result */}
            {testResult && (
              <div className={`rounded-xl p-3 flex items-start gap-2 ${testResult.success ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${testResult.success ? "text-emerald-500" : "text-red-500"}`}>
                  {testResult.success ? "check_circle" : "error"}
                </span>
                <div className="flex-1 text-[12px] font-bold leading-relaxed">
                  {testResult.success ? (
                    <span className="text-emerald-700">
                      ✓ تم الاتصال — {testResult.accountName} ({testResult.currency})
                    </span>
                  ) : (
                    <span className="text-red-700 break-all">{testResult.error}</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="flex-1 bg-[#1E293B] text-white px-4 py-2.5 rounded-xl text-[13px] font-black hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {testing ? (
                  <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> جاري الاختبار...</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">network_check</span> اختبار الاتصال</>
                )}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !testResult?.success}
                className="flex-1 bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-[13px] font-black hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:bg-[#94A3B8] flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> جاري الحفظ...</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">save</span> حفظ الإعدادات</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 text-[12px] font-bold text-slate-600">
            إعداد التوكن متاح للسوبر-أدمن فقط. ممكنك تشغيل المزامنة اليدوية لو الحساب متصل.
          </div>
        )}

        {/* Sync controls */}
        {isConnected && (
          <div className="border-t border-[#E2E8F0] pt-4 space-y-3">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="w-full bg-emerald-600 text-white px-5 py-3 rounded-xl text-[13px] font-black hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncing ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> جاري السحب...</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">sync</span> مزامنة الآن (آخر 7 أيام)</>
              )}
            </button>

            {isSuperAdmin && (
              <label className="flex items-center justify-between bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-3 cursor-pointer">
                <span className="text-[12px] font-bold text-[#1E293B]">المزامنة التلقائية اليومية (6 ص بتوقيت القاهرة)</span>
                <input
                  type="checkbox"
                  checked={config?.autoSyncEnabled !== false}
                  onChange={handleToggleAutoSync}
                  disabled={togglingAutoSync}
                  className="w-5 h-5 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-0"
                />
              </label>
            )}
          </div>
        )}

        {/* Documentation link */}
        <div className="mt-5 pt-4 border-t border-[#E2E8F0]">
          <a
            href="https://developers.facebook.com/docs/marketing-api/system-users"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#2563EB] hover:underline"
          >
            <span className="material-symbols-outlined text-[14px]">help</span>
            كيفية الحصول على System User Token من Meta Business Suite
          </a>
        </div>
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
