import { PRODUCTS, toggleProduct } from "@/lib/constants/products";

export function ProductPicker({
  selected,
  onChange,
  allowedIds,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  /** If set, only these product ids are shown (e.g. upgrade: not yet purchased). */
  allowedIds?: string[];
}) {
  const list =
    allowedIds === undefined
      ? PRODUCTS
      : PRODUCTS.filter((p) => allowedIds.includes(p.id));
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((p) => {
        const active = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(toggleProduct(selected, p.id))}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-black border transition-all ${
              active
                ? p.type === "book"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-[#2563EB] text-white border-[#2563EB]"
                : "bg-[#F7F9FC] text-[#64748B] border-[#E2E8F0] hover:border-[#2563EB]/40"
            }`}
          >
            {p.type === "book" ? "📖 " : "🎓 "}
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
