import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ar } from "date-fns/locale";
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import "react-day-picker/dist/style.css";

type Range = { from: Date | null; to: Date | null };

interface DateRangePickerProps {
  from: Date | null;
  to: Date | null;
  onChange: (range: Range) => void;
}

function fmt(d: Date): string {
  return format(d, "d MMMM yyyy", { locale: ar });
}

function shortFmt(d: Date): string {
  return format(d, "d MMM", { locale: ar });
}

function sameRange(a: Range, b: Range): boolean {
  const aFrom = a.from ? +a.from : 0;
  const aTo = a.to ? +a.to : 0;
  const bFrom = b.from ? +b.from : 0;
  const bTo = b.to ? +b.to : 0;
  return aFrom === bFrom && aTo === bTo;
}

function buildPresets(today: Date): { key: string; label: string; range: Range }[] {
  const startOfThisMonth = startOfMonth(today);
  const lastMonth = subMonths(today, 1);
  return [
    { key: "today",      label: "اليوم",          range: { from: today,                          to: today } },
    { key: "yesterday",  label: "أمس",            range: { from: subDays(today, 1),              to: subDays(today, 1) } },
    { key: "last7",      label: "آخر 7 أيام",     range: { from: subDays(today, 6),              to: today } },
    { key: "last14",     label: "آخر 14 يوم",     range: { from: subDays(today, 13),             to: today } },
    { key: "last30",     label: "آخر 30 يوم",     range: { from: subDays(today, 29),             to: today } },
    { key: "thisMonth",  label: "هذا الشهر",      range: { from: startOfThisMonth,               to: today } },
    { key: "lastMonth",  label: "الشهر السابق",   range: { from: startOfMonth(lastMonth),        to: endOfMonth(lastMonth) } },
    { key: "last90",     label: "آخر 90 يوم",     range: { from: subDays(today, 89),             to: today } },
  ];
}

/**
 * Chip-style date range picker with prev/next navigation arrows.
 * - Click the chip → calendar (popover on desktop, bottom-sheet on mobile).
 * - Arrows shift the current range backward / forward by its own length.
 *
 * Range is committed on "تطبيق"; "إلغاء" reverts pending changes.
 */
export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<DateRange | undefined>(
    from && to ? { from, to } : undefined
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const presets = useMemo(() => buildPresets(today), [today]);

  // Sync pending when external range changes (e.g. preset / reset from outside).
  useEffect(() => {
    setPending(from && to ? { from, to } : undefined);
  }, [from, to]);

  // Close on outside click (desktop popover) / escape. Body scroll lock on mobile.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    if (window.matchMedia("(max-width: 640px)").matches) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const shiftDays = useCallback(
    (delta: number) => {
      if (!from || !to) return;
      const length = differenceInCalendarDays(to, from) + 1;
      const step = delta * length;
      onChange({ from: addDays(from, step), to: addDays(to, step) });
    },
    [from, to, onChange]
  );

  const handleApply = () => {
    if (pending?.from && pending.to) {
      onChange({ from: pending.from, to: pending.to });
      setOpen(false);
    } else if (pending?.from && !pending.to) {
      // Single-day pick — treat as from = to.
      onChange({ from: pending.from, to: pending.from });
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setPending(from && to ? { from, to } : undefined);
    setOpen(false);
  };

  const handlePreset = (range: Range) => {
    if (range.from && range.to) {
      setPending({ from: range.from, to: range.to });
      onChange(range);
      setOpen(false);
    }
  };

  const chipLabel = useMemo(() => {
    if (!from || !to) return "اختر فترة";
    if (isSameDay(from, to)) return fmt(from);
    return `${shortFmt(from)} ← ${shortFmt(to)}`;
  }, [from, to]);

  const isPresetActive = (range: Range): boolean => sameRange({ from, to }, range);
  const canNavigate = Boolean(from && to);

  return (
    <div ref={rootRef} className="relative flex items-center gap-1 shrink-0" dir="rtl">
      {/* Prev arrow */}
      <button
        type="button"
        onClick={() => shiftDays(-1)}
        disabled={!canNavigate}
        title="الفترة السابقة"
        aria-label="الفترة السابقة"
        className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#1E40AF] hover:border-[#1E40AF]/40 hover:bg-[#EFF6FF] flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#64748B] disabled:hover:border-[#E2E8F0] shrink-0"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>

      {/* Chip — opens picker */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-10 sm:h-9 inline-flex items-center gap-2 px-3.5 rounded-xl border text-[12px] font-bold transition-all duration-150 min-w-0 ${
          from && to
            ? "bg-[#EFF6FF] border-[#1E40AF]/40 text-[#1E40AF] hover:border-[#1E40AF]"
            : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
        }`}
      >
        <span className="material-symbols-outlined text-[16px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          date_range
        </span>
        <span className="whitespace-nowrap truncate">{chipLabel}</span>
        <span className="material-symbols-outlined text-[14px] opacity-60 shrink-0">expand_more</span>
      </button>

      {/* Next arrow */}
      <button
        type="button"
        onClick={() => shiftDays(1)}
        disabled={!canNavigate}
        title="الفترة التالية"
        aria-label="الفترة التالية"
        className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#1E40AF] hover:border-[#1E40AF]/40 hover:bg-[#EFF6FF] flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#64748B] disabled:hover:border-[#E2E8F0] shrink-0"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
      </button>

      {/* Picker overlay — bottom sheet on mobile, popover on sm+ */}
      {open && (
        <>
          {/* Mobile-only backdrop */}
          <div
            className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-[2px] sm:hidden animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            dir="rtl"
            role="dialog"
            aria-label="اختر الفترة الزمنية"
            className="
              fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-3xl shadow-2xl
              p-4 flex flex-col gap-3 max-h-[90vh] overflow-y-auto
              animate-in slide-in-from-bottom duration-300
              sm:absolute sm:inset-auto sm:bottom-auto sm:top-[calc(100%+8px)] sm:right-0
              sm:z-50 sm:rounded-2xl sm:shadow-xl sm:max-h-none sm:overflow-visible
              sm:p-3 sm:w-[640px] sm:max-w-[calc(100vw-32px)]
              sm:flex-row sm:animate-in sm:fade-in sm:zoom-in-95
            "
          >
            {/* Mobile-only header */}
            <div className="sm:hidden flex flex-col gap-2 shrink-0">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-[#E2E8F0]" />
              <div className="flex items-center justify-between">
                <h4 className="text-[14px] font-black text-[#0F172A] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#1E40AF]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    date_range
                  </span>
                  اختر الفترة
                </h4>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="إغلاق"
                  className="h-9 w-9 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Quick presets — grid on mobile, column on desktop */}
            <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-col sm:w-[140px] sm:border-l sm:border-l-[#E2E8F0] sm:pl-3 shrink-0">
              <p className="hidden sm:block text-[10px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">
                فترات سريعة
              </p>
              <p className="sm:hidden col-span-2 text-[10px] font-black uppercase tracking-wider text-[#94A3B8] mt-1">
                فترات سريعة
              </p>
              {presets.map((p) => {
                const active = isPresetActive(p.range);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handlePreset(p.range)}
                    className={`text-center sm:text-right text-[12px] font-bold px-3 py-2.5 sm:py-1.5 rounded-lg transition-all duration-150 ${
                      active
                        ? "bg-[#1E40AF] text-white shadow-sm"
                        : "bg-[#F8FAFC] sm:bg-transparent text-[#475569] hover:bg-[#EFF6FF] hover:text-[#1E40AF] border border-[#E2E8F0] sm:border-transparent sm:hover:border-[#E2E8F0]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Calendar + footer */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex justify-center sm:justify-start">
                <DayPicker
                  mode="range"
                  selected={pending}
                  onSelect={setPending}
                  locale={ar}
                  dir="rtl"
                  showOutsideDays
                  numberOfMonths={1}
                  defaultMonth={pending?.from ?? from ?? today}
                  classNames={{
                    root: "ise-rdp",
                    caption_label: "text-[14px] sm:text-[13px] font-black text-[#0F172A]",
                    button_previous: "h-9 w-9 sm:h-7 sm:w-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B]",
                    button_next: "h-9 w-9 sm:h-7 sm:w-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B]",
                    weekday: "text-[10px] font-black uppercase tracking-wider text-[#94A3B8] py-1.5",
                    day: "p-0.5",
                    day_button: "h-10 w-10 sm:h-8 sm:w-8 rounded-lg text-[13px] sm:text-[12px] font-bold text-[#1E293B] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors",
                    selected: "[&_button]:!bg-[#1E40AF] [&_button]:!text-white [&_button:hover]:!bg-[#1E40AF]",
                    range_start: "[&_button]:!rounded-r-lg",
                    range_end: "[&_button]:!rounded-l-lg",
                    range_middle: "[&_button]:!bg-[#EFF6FF] [&_button]:!text-[#1E40AF] [&_button:hover]:!bg-[#DBEAFE]",
                    today: "[&_button]:ring-2 [&_button]:ring-[#1E40AF]/20 [&_button]:ring-inset",
                    outside: "[&_button]:!text-[#CBD5E1]",
                    disabled: "[&_button]:!text-[#E2E8F0] [&_button:hover]:!bg-transparent cursor-not-allowed",
                  }}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2 pt-3 border-t border-[#F1F5F9]">
                <div className="text-[12px] sm:text-[11px] font-bold text-[#64748B] text-center sm:text-right">
                  {pending?.from && pending?.to ? (
                    <>
                      <span className="text-[#0F172A] font-black">
                        {differenceInCalendarDays(pending.to, pending.from) + 1}
                      </span>{" "}
                      يوم محدد
                    </>
                  ) : pending?.from ? (
                    "اختر تاريخ النهاية"
                  ) : (
                    "اختر تاريخ البداية"
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 sm:flex-none h-11 sm:h-auto text-[13px] sm:text-[11px] font-bold text-[#64748B] hover:text-[#1E293B] px-4 sm:px-3 py-1.5 rounded-xl sm:rounded-lg border border-[#E2E8F0] sm:border-transparent hover:bg-[#F1F5F9] transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={!pending?.from}
                    className="flex-1 sm:flex-none h-11 sm:h-auto text-[13px] sm:text-[11px] font-black text-white bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:bg-[#CBD5E1] disabled:cursor-not-allowed px-5 sm:px-4 py-1.5 rounded-xl sm:rounded-lg transition-colors"
                  >
                    تطبيق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
