import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAllAds } from "@/lib/hooks/useAds";
import { createAd, updateAd, deleteAd, bulkCreateAds } from "@/lib/services/ads-service";
import type { Ad } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

const STATUS_LABELS: Record<Ad["status"], { label: string; classes: string }> = {
  active:   { label: "نشط",    classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused:   { label: "موقوف",  classes: "bg-amber-50 text-amber-700 border-amber-200" },
  archived: { label: "مؤرشف", classes: "bg-slate-100 text-slate-500 border-slate-200" },
};

interface AdFormState {
  name: string;
  postLink: string;
  status: Ad["status"];
}

const emptyForm = (): AdFormState => ({ name: "", postLink: "", status: "active" });

interface ImportRow { name: string; postLink: string }

export default function AdsManagementPage() {
  const { showToast } = useToast();
  const { ads, loading } = useAllAds();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Add / Edit modal ─────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // ── Bulk import modal ────────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // ── Delete confirm ───────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Search ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const filtered = ads.filter(a =>
    !search || a.name.includes(search) || a.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Handlers: Add / Edit ─────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setModalError(null);
    setShowModal(true);
  }

  function openEdit(ad: Ad) {
    setEditingId(ad.id);
    setForm({ name: ad.name, postLink: ad.postLink, status: ad.status });
    setModalError(null);
    setShowModal(true);
  }

  async function handleSaveModal() {
    if (!form.name.trim()) { setModalError("اسم الإعلان مطلوب"); return; }
    setSaving(true);
    setModalError(null);
    try {
      if (editingId) {
        await updateAd(editingId, form);
        showToast("success", "تم تحديث الإعلان.");
      } else {
        await createAd(form);
        showToast("success", "تم إضافة الإعلان.");
      }
      setShowModal(false);
    } catch {
      setModalError("حدث خطأ، حاول مرة أخرى");
      showToast("error", "حدث خطأ، حاول مرة أخرى");
    } finally {
      setSaving(false);
    }
  }

  // ── Handlers: Delete ─────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteAd(deletingId);
      showToast("success", "تم حذف الإعلان.");
      setDeletingId(null);
    } catch {
      showToast("error", "تعذر حذف الإعلان.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Handlers: Bulk import ─────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const isCSV = file.name.toLowerCase().endsWith(".csv");
    const reader = new FileReader();

    reader.onload = async ev => {
      try {
        const XLSX = await import("xlsx");
        let wb;
        if (isCSV) {
          // Read as UTF-8 text to preserve Arabic characters
          wb = XLSX.read(ev.target!.result as string, { type: "string" });
        } else {
          wb = XLSX.read(new Uint8Array(ev.target!.result as ArrayBuffer), { type: "array" });
        }

        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        // Skip header row if first cell looks like a header
        const startIdx = rows.length > 0 && /name|اسم|إعلان/i.test(String(rows[0][0])) ? 1 : 0;
        const parsed: ImportRow[] = rows
          .slice(startIdx)
          .filter(r => String(r[0] ?? "").trim())
          .map(r => ({ name: String(r[0] ?? "").trim(), postLink: String(r[1] ?? "").trim() }));

        if (parsed.length === 0) { setImportError("لم يتم العثور على بيانات في الملف"); return; }
        setImportRows(parsed);
        setShowImport(true);
      } catch {
        setImportError("تعذر قراءة الملف — تأكد أنه Excel أو CSV صحيح");
      }
      e.target.value = "";
    };

    // CSV: read as UTF-8 text; Excel: read as binary ArrayBuffer
    if (isCSV) {
      reader.readAsText(file, "UTF-8");
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  async function handleConfirmImport() {
    if (!importRows.length) return;
    const count = importRows.length;
    setImporting(true);
    try {
      await bulkCreateAds(importRows);
      setShowImport(false);
      setImportRows([]);
      showToast("success", `تم استيراد ${count} إعلان.`);
    } catch {
      setImportError("فشل الاستيراد، حاول مرة أخرى");
      showToast("error", "فشل استيراد الإعلانات.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto font-body pb-16" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] font-black text-[#1E293B]">إدارة الإعلانات</h1>
          <p className="text-[12px] font-bold text-[#64748B] mt-0.5">
            {loading ? "جاري تحميل الإعلانات..." : `${ads.length} إعلان إجمالاً`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 border border-[#E2E8F0] bg-white text-[#475569] font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-[#F7F9FC] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            رفع Excel/CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#2563EB] text-white font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            إضافة إعلان
          </button>
        </div>
      </div>

      {importError && !showImport && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[12px] font-bold text-red-600 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span> {importError}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-[#94A3B8]">search</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث عن إعلان..."
          className="w-full bg-white border border-[#E2E8F0] rounded-xl pr-10 pl-4 py-2.5 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
        />
      </div>

      {/* Ads table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-[40px] text-[#CBD5E1]">progress_activity</span>
            <p className="text-[13px] font-bold text-[#94A3B8] mt-2">جاري تحميل الإعلانات...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 px-4">
            <EmptyState
              variant={search ? "filtered-empty" : "getting-started"}
              icon="campaign"
              title={search ? "لا توجد نتائج للبحث" : "لم يتم إضافة أي إعلانات بعد"}
              description={
                search
                  ? "جرّب كلمات مختلفة أو امسح البحث لعرض كل الإعلانات."
                  : "أضف إعلاناً ليربطه السيلز بالتقارير اليومية."
              }
              actionLabel={search ? "مسح البحث" : "إضافة إعلان"}
              actionIcon={search ? "close" : "add"}
              onAction={search ? () => setSearch("") : openAdd}
              compact
              className="border-0 shadow-none min-h-0"
            />
          </div>
        ) : (
          <table className="w-full text-right">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[11px] font-black text-[#64748B]">اسم الإعلان</th>
                <th className="px-4 py-3 text-[11px] font-black text-[#64748B] hidden sm:table-cell">الرابط</th>
                <th className="px-4 py-3 text-[11px] font-black text-[#64748B]">الحالة</th>
                <th className="px-4 py-3 text-[11px] font-black text-[#64748B] text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ad => {
                const statusInfo = STATUS_LABELS[ad.status];
                return (
                  <tr key={ad.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#FAFBFC]">
                    <td className="px-4 py-3 text-[13px] font-bold text-[#1E293B]">
                      {ad.name}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {ad.postLink ? (
                        <a
                          href={ad.postLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 max-w-[200px] truncate"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          <span className="truncate">{ad.postLink.replace(/^https?:\/\//, "")}</span>
                        </a>
                      ) : (
                        <span className="text-[12px] text-[#CBD5E1] font-bold">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black border ${statusInfo.classes}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to={`/ads-management/${ad.id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors"
                          title="الإحصائيات"
                        >
                          <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                        </Link>
                        <button
                          onClick={() => openEdit(ad)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F7F9FC] transition-colors"
                          title="تعديل"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => setDeletingId(ad.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="حذف"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add / Edit Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in slide-in-from-bottom-4">
            <h2 className="text-[16px] font-black text-[#1E293B] mb-5">
              {editingId ? "تعديل الإعلان" : "إضافة إعلان جديد"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-[#64748B] mb-1 block">اسم الإعلان *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="الاعتماد على غيرك مش مشكلة"
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-[#64748B] mb-1 block">رابط البوست</label>
                <input
                  value={form.postLink}
                  onChange={e => setForm(p => ({ ...p, postLink: e.target.value }))}
                  placeholder="https://www.facebook.com/..."
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-[#64748B] mb-1 block">الحالة</label>
                <div className="flex gap-2">
                  {(["active", "paused", "archived"] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, status: s }))}
                      className={`flex-1 py-2 rounded-xl text-[12px] font-black border transition-colors ${
                        form.status === s
                          ? STATUS_LABELS[s].classes + " border-current"
                          : "border-[#E2E8F0] text-[#94A3B8]"
                      }`}
                    >
                      {STATUS_LABELS[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {modalError && (
              <p className="mt-3 text-[12px] font-bold text-red-500">{modalError}</p>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-[#E2E8F0] text-[#64748B] font-bold text-[13px] py-2.5 rounded-xl hover:bg-[#F7F9FC] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveModal}
                disabled={saving}
                className="flex-1 bg-[#2563EB] text-white font-bold text-[13px] py-2.5 rounded-xl hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
              >
                {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Import Preview Modal ─────────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in slide-in-from-bottom-4">
            <h2 className="text-[16px] font-black text-[#1E293B] mb-1">معاينة الاستيراد</h2>
            <p className="text-[12px] font-bold text-[#64748B] mb-4">
              تم العثور على <span className="text-[#2563EB]">{importRows.length}</span> إعلان — تأكد من البيانات قبل الاستيراد
            </p>

            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden mb-4 max-h-64 overflow-y-auto">
              <table className="w-full text-right">
                <thead className="bg-[#F7F9FC] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-[11px] font-black text-[#64748B]">اسم الإعلان</th>
                    <th className="px-3 py-2 text-[11px] font-black text-[#64748B]">الرابط</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, i) => (
                    <tr key={i} className="border-t border-[#F1F5F9]">
                      <td className="px-3 py-2 text-[12px] font-bold text-[#1E293B]">{row.name}</td>
                      <td className="px-3 py-2 text-[11px] text-[#64748B] max-w-[160px] truncate">{row.postLink || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importError && (
              <p className="mb-3 text-[12px] font-bold text-red-500">{importError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowImport(false); setImportRows([]); setImportError(null); }}
                className="flex-1 border border-[#E2E8F0] text-[#64748B] font-bold text-[13px] py-2.5 rounded-xl hover:bg-[#F7F9FC] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="flex-1 bg-[#2563EB] text-white font-bold text-[13px] py-2.5 rounded-xl hover:bg-[#1D4ED8] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">upload</span>
                {importing ? "جاري الاستيراد..." : `استيراد ${importRows.length} إعلان`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-[20px]">warning</span>
              </div>
              <div>
                <h2 className="text-[15px] font-black text-[#1E293B]">حذف الإعلان</h2>
                <p className="text-[12px] font-bold text-[#64748B]">هذا الإجراء لا يمكن التراجع عنه</p>
              </div>
            </div>
            <p className="text-[13px] font-bold text-[#475569] mb-5">
              سيتم حذف الإعلان "{ads.find(a => a.id === deletingId)?.name}" نهائياً.
              البيانات التاريخية في التقارير لن تتأثر.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 border border-[#E2E8F0] text-[#64748B] font-bold text-[13px] py-2.5 rounded-xl hover:bg-[#F7F9FC] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 text-white font-bold text-[13px] py-2.5 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleting ? "جاري الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
