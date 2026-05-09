import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useObjectionCategories } from "@/lib/hooks/useObjectionCategories";
import {
  createObjectionCategory,
  deleteObjectionCategory,
  reorderObjectionCategories,
  updateObjectionCategory,
  type ObjectionCategory,
} from "@/lib/services/objection-categories-service";

export function ObjectionCategoriesManager() {
  const { showToast } = useToast();
  const { categories, loading } = useObjectionCategories(true);
  const [newLabel, setNewLabel] = useState("");
  const [newSuggested, setNewSuggested] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingSuggested, setEditingSuggested] = useState("");

  const sorted = useMemo(
    () => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories]
  );

  async function handleCreate() {
    const label = newLabel.trim();
    if (!label) return;
    if (sorted.some((x) => x.label.trim().toLowerCase() === label.toLowerCase())) {
      showToast("warning", "هذه الفئة موجودة بالفعل.");
      return;
    }
    setSaving(true);
    try {
      await createObjectionCategory({
        label,
        suggestedResponse: newSuggested.trim(),
        isActive: true,
        order: sorted.length,
      });
      setNewLabel("");
      setNewSuggested("");
      showToast("success", "تمت إضافة الفئة.");
    } catch (e) {
      console.error(e);
      showToast("error", "تعذّر إضافة الفئة.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: ObjectionCategory) {
    setEditingId(item.id);
    setEditingLabel(item.label);
    setEditingSuggested(item.suggestedResponse || "");
  }

  async function saveEdit() {
    if (!editingId || !editingLabel.trim()) return;
    setSaving(true);
    try {
      await updateObjectionCategory(editingId, {
        label: editingLabel.trim(),
        suggestedResponse: editingSuggested.trim(),
      });
      setEditingId(null);
      setEditingLabel("");
      setEditingSuggested("");
      showToast("success", "تم تحديث الفئة.");
    } catch (e) {
      console.error(e);
      showToast("error", "تعذّر تحديث الفئة.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: ObjectionCategory) {
    try {
      await updateObjectionCategory(item.id, { isActive: !item.isActive });
    } catch (e) {
      console.error(e);
      showToast("error", "تعذّر تحديث حالة الفئة.");
    }
  }

  async function removeItem(item: ObjectionCategory) {
    const ok = window.confirm(`حذف فئة «${item.label}»؟`);
    if (!ok) return;
    try {
      await deleteObjectionCategory(item.id);
      showToast("success", "تم حذف الفئة.");
    } catch (e) {
      console.error(e);
      showToast("error", "تعذّر حذف الفئة.");
    }
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= sorted.length) return;
    const ids = sorted.map((x) => x.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(next, 0, moved);
    try {
      await reorderObjectionCategories(ids);
    } catch (e) {
      console.error(e);
      showToast("error", "تعذّر إعادة ترتيب الفئات.");
    }
  }

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm">
      <div className="p-6 border-b border-[#E2E8F0] bg-[#F7F9FC]">
        <h3 className="text-[15px] font-black text-[#1E293B] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#EF4444]">thumb_down</span>
          فئات الاعتراضات
        </h3>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="اسم الفئة (مثال: السعر)"
            className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 font-bold text-[13px] text-[#1E293B] focus:border-[#2563EB] outline-none"
          />
          <input
            value={newSuggested}
            onChange={(e) => setNewSuggested(e.target.value)}
            placeholder="رد مقترح (اختياري)"
            className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 font-bold text-[13px] text-[#1E293B] focus:border-[#2563EB] outline-none"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving || !newLabel.trim()}
            className="bg-[#2563EB] text-white px-4 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            إضافة فئة
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-[#64748B] font-bold text-[12px]">
            جاري تحميل الفئات...
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-8 text-[#94A3B8] font-bold text-[12px]">
            لا توجد فئات اعتراضات بعد.
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((item, index) => (
              <div
                key={item.id}
                className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-3 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
                      />
                      <input
                        value={editingSuggested}
                        onChange={(e) => setEditingSuggested(e.target.value)}
                        placeholder="رد مقترح (اختياري)"
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] font-bold text-[#334155] focus:border-[#2563EB] outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void saveEdit()}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#2563EB] text-white"
                        >
                          حفظ
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[13px] font-black text-[#1E293B]">{item.label}</p>
                      {item.suggestedResponse?.trim() && (
                        <p className="text-[11px] font-bold text-[#64748B] mt-1">
                          رد مقترح: {item.suggestedResponse}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void moveItem(index, -1)}
                    className="w-8 h-8 rounded-lg hover:bg-white text-[#64748B]"
                    title="لأعلى"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void moveItem(index, 1)}
                    className="w-8 h-8 rounded-lg hover:bg-white text-[#64748B]"
                    title="لأسفل"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(item)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
                      item.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.isActive ? "نشط" : "معطل"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="w-8 h-8 rounded-lg hover:bg-white text-[#2563EB]"
                    title="تعديل"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeItem(item)}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500"
                    title="حذف"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
