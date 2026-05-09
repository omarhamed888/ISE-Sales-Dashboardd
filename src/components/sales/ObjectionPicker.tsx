import type { ObjectionCategory } from "@/lib/services/objection-categories-service";

type ObjectionDraft = {
  id: string;
  text: string;
  count: number;
  categoryId?: string;
  source?: "catalog" | "custom";
  suggestedResponse?: string;
};

export function ObjectionPicker({
  value,
  categories,
  onChange,
  onRemove,
}: {
  value: ObjectionDraft;
  categories: ObjectionCategory[];
  onChange: (next: ObjectionDraft) => void;
  onRemove: () => void;
}) {
  const selectedId =
    value.source === "catalog" && value.categoryId ? value.categoryId : "__custom";
  const selected = categories.find((c) => c.id === value.categoryId);
  const showCustomInput = selectedId === "__custom";
  const hint =
    (selected?.suggestedResponse && selected.suggestedResponse.trim()) ||
    (value.suggestedResponse && value.suggestedResponse.trim()) ||
    "";

  return (
    <div className="border border-[#E2E8F0] rounded-xl p-3 bg-[#FAFBFD]">
      <div className="flex items-center gap-2">
        <select
          value={selectedId}
          onChange={(e) => {
            const id = e.target.value;
            if (id === "__custom") {
              onChange({
                ...value,
                categoryId: undefined,
                source: "custom",
                suggestedResponse: undefined,
              });
              return;
            }
            const cat = categories.find((x) => x.id === id);
            if (!cat) return;
            onChange({
              ...value,
              text: cat.label,
              categoryId: cat.id,
              source: "catalog",
              suggestedResponse: cat.suggestedResponse?.trim() || undefined,
            });
          }}
          className="flex-1 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
        >
          <option value="__custom">أخرى (إدخال يدوي)</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={1}
          value={value.count}
          onChange={(e) =>
            onChange({
              ...value,
              count: Math.max(1, parseInt(e.target.value, 10) || 1),
            })
          }
          className="w-20 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#1E293B] text-center focus:border-[#2563EB] outline-none"
        />

        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-[#94A3B8] hover:bg-red-50 hover:text-red-400 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>

      {showCustomInput && (
        <input
          value={value.text}
          onChange={(e) =>
            onChange({
              ...value,
              text: e.target.value,
              categoryId: undefined,
              source: "custom",
              suggestedResponse: undefined,
            })
          }
          placeholder="نص الاعتراض... (مثال: السعر غالي)"
          className="mt-2 w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[13px] font-bold text-[#1E293B] focus:border-[#2563EB] outline-none"
        />
      )}

      {!!hint && (
        <p className="mt-2 text-[11px] font-bold text-[#64748B] bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-2.5 py-1.5">
          رد مقترح: {hint}
        </p>
      )}
    </div>
  );
}
