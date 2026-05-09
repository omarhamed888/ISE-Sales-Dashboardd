import { PRODUCTS, toggleProduct } from "@/lib/constants/products";
import { useCallback, useMemo } from "react";

const LEGACY_EXCLUSIVE_GROUPS: Record<string, string[]> = {
  bdp: ["bdp_online", "bdp_offline", "bdp_recorded"],
};

export function ProductPicker({
  selected,
  onChange,
  allowedIds,
  items,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  /** If set, only these product ids are shown (e.g. upgrade: not yet purchased). */
  allowedIds?: string[];
  /** Optional dynamic items (e.g. Firestore courses). */
  items?: Array<{ id: string; label: string }>;
}) {
  const allowedSet = useMemo(() => (allowedIds ? new Set(allowedIds) : null), [allowedIds]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const list =
    items !== undefined
      ? (allowedSet === null
          ? items
          : items.filter((p) => allowedSet.has(p.id)))
      : (allowedSet === null
          ? PRODUCTS
          : PRODUCTS.filter((p) => allowedSet.has(p.id)));

  const handleToggle = useCallback((id: string) => {
    if (items !== undefined) {
      const isActive = selectedSet.has(id);
      if (isActive) {
        onChange(selected.filter((x) => x !== id));
        return;
      }
      let next = [...selected, id];
      if (LEGACY_EXCLUSIVE_GROUPS.bdp.includes(id)) {
        const siblings = LEGACY_EXCLUSIVE_GROUPS.bdp.filter((x) => x !== id);
        next = next.filter((x) => !siblings.includes(x));
      }
      onChange(next);
      return;
    }
    onChange(toggleProduct(selected, id));
  }, [items, onChange, selected, selectedSet]);

  return (
    <div className="flex flex-wrap gap-2">
      {list.map((p) => {
        const active = selectedSet.has(p.id);

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => handleToggle(p.id)}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-black border transition-all ${
              active
                ? "bg-[#2563EB] text-white border-[#2563EB]"
                : "bg-[#F7F9FC] text-[#64748B] border-[#E2E8F0] hover:border-[#2563EB]/40"
            }`}
          >
            🎓 {p.label}
          </button>
        );
      })}
    </div>
  );
}
