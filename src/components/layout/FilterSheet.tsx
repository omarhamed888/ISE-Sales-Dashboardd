import { useEffect, type ReactNode } from "react";

/**
 * Mobile bottom sheet for the global filters. On small screens the FilterBar
 * collapses to a compact pill + "فلتر" button; tapping it opens this sheet,
 * which hosts the full filter form with large tap targets and a sticky footer.
 *
 * Presentational only — all filter state lives in FilterContext. The parent
 * passes the controls as `children` and wires the footer actions.
 */
export function FilterSheet({
  open,
  onClose,
  onReset,
  activeCount,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  activeCount: number;
  children: ReactNode;
}) {
  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" dir="rtl" role="dialog" aria-modal="true" aria-label="فلاتر">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      />

      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] flex flex-col bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Grab handle + header */}
        <div className="shrink-0 px-5 pt-3 pb-3 border-b border-[#E2E8F0]">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#E2E8F0]" />
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-black text-[#0F172A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#1E40AF]">tune</span>
              تصفية النتائج
              {activeCount > 0 && (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-[#1E40AF] text-white">
                  {activeCount}
                </span>
              )}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable filter body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {children}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 px-5 py-3 border-t border-[#E2E8F0] flex items-center gap-3 bg-white">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-[13px] font-bold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#DC2626] hover:border-red-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
            إعادة تعيين
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-[2] h-11 rounded-xl bg-[#1E40AF] text-white text-[13px] font-black hover:bg-[#1E3A8A] transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
            عرض النتائج
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A labeled field wrapper used inside the sheet to give each control a clear
 * Arabic label and consistent vertical rhythm. Optional icon renders to the
 * right of the label (RTL) — helps the eye land on the right control fast.
 */
export function SheetField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-black text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
        {icon && (
          <span
            className="material-symbols-outlined text-[15px] text-[#1E40AF]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        )}
        {label}
      </span>
      {children}
    </div>
  );
}
