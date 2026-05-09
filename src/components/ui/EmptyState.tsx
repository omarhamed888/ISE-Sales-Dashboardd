import { Link } from "react-router-dom";
import { useFilter } from "@/lib/filter-context";

export type EmptyStateVariant = "no-data" | "getting-started" | "error" | "filtered-empty";

const DEFAULTS: Record<
  EmptyStateVariant,
  { icon: string; title: string; description: string; actionLabel: string }
> = {
  "filtered-empty": {
    icon: "folder_off",
    title: "لا توجد بيانات للفترة المحددة",
    description: "جرب تغيير الفلتر أو اختر فترة أوسع لعرض الإحصائيات الخاصة بالمبيعات",
    actionLabel: "إعادة تعيين الفلاتر",
  },
  "no-data": {
    icon: "inbox",
    title: "لا توجد بيانات",
    description: "لا توجد عناصر لعرضها في الوقت الحالي.",
    actionLabel: "تحديث",
  },
  "getting-started": {
    icon: "rocket_launch",
    title: "لنبدأ",
    description: "أكمل الخطوة الأولى لتظهر البيانات هنا.",
    actionLabel: "بدء",
  },
  error: {
    icon: "wifi_off",
    title: "تعذر التحميل",
    description: "حدث خطأ أثناء جلب البيانات. حاول مرة أخرى.",
    actionLabel: "إعادة المحاولة",
  },
};

export type EmptyStateProps = {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Renders CTA as react-router Link */
  to?: string;
  icon?: string;
  /** Material symbol for the main CTA (defaults: arrow_forward if `to`, else restart_alt) */
  actionIcon?: string;
  className?: string;
  /** Smaller padding when embedded in a card/table */
  compact?: boolean;
};

export function EmptyState({
  variant = "filtered-empty",
  title,
  description,
  actionLabel,
  onAction,
  to,
  icon,
  actionIcon,
  className = "",
  compact = false,
}: EmptyStateProps) {
  const { resetFilter } = useFilter();
  const d = DEFAULTS[variant];
  const finalIcon = icon ?? d.icon;
  const finalTitle = title ?? d.title;
  const finalDescription = description ?? d.description;
  const finalActionLabel = actionLabel ?? d.actionLabel;

  const defaultFiltered =
    variant === "filtered-empty" && !onAction && !to ? resetFilter : undefined;
  const handleClick = onAction ?? defaultFiltered;

  const showCta = Boolean(to || handleClick);
  const ctaSymbol = actionIcon ?? (to ? "arrow_forward" : "restart_alt");

  const shell = compact
    ? "py-12 px-4 flex flex-col items-center justify-center text-center"
    : "h-80 flex flex-col items-center justify-center";

  const ctaClass =
    "px-6 py-3 bg-[#F7F9FC] text-[#2563EB] text-sm font-bold rounded-xl border border-[#E2E8F0] hover:bg-[#EFF6FF] hover:border-[#2563EB]/20 transition-all flex items-center justify-center gap-2 active:scale-95";

  return (
    <div
      className={`w-full ${shell} bg-white rounded-[24px] border border-[#E2E8F0] shadow-sm animate-in fade-in zoom-in-95 font-body ${className}`.trim()}
      dir="rtl"
    >
      <div className="w-24 h-24 mb-6 relative grayscale opacity-60 flex items-center justify-center">
        <span className={`material-symbols-outlined text-[80px] text-[#94A3B8] font-extralight`}>
          {finalIcon}
        </span>
      </div>

      <h3 className="text-xl font-bold text-[#1E293B] mb-2 font-headline tracking-tight px-2">
        {finalTitle}
      </h3>
      <p className="text-[#64748B] text-sm mb-8 max-w-sm text-center leading-relaxed px-2">
        {finalDescription}
      </p>

      {showCta &&
        (to ? (
          <Link to={to} className={ctaClass}>
            <span className="material-symbols-outlined text-[20px]">{ctaSymbol}</span>
            {finalActionLabel}
          </Link>
        ) : (
          <button type="button" onClick={handleClick} className={ctaClass}>
            <span className="material-symbols-outlined text-[20px]">{ctaSymbol}</span>
            {finalActionLabel}
          </button>
        ))}
    </div>
  );
}
