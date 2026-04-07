import type { SavedInsightReport } from "@/lib/services/insights-firestore";
import { formatDistanceToNow } from "date-fns";
import { arEG } from "date-fns/locale/ar-EG";

function formatRelativeTime(d: Date): string {
  return formatDistanceToNow(d, { addSuffix: true, locale: arEG });
}

export function SavedInsightsList({
  reports,
  onOpen,
  onDelete,
}: {
  reports: SavedInsightReport[];
  onOpen: (report: SavedInsightReport) => void;
  onDelete: (id: string) => void;
}) {
  if (reports.length === 0) {
    return (
      <p className="text-center text-[#94A3B8] text-sm py-8" dir="rtl">
        لا توجد تقارير محفوظة بعد
      </p>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {reports.map((report) => {
        const cr = report.dataSnapshot?.conversionRate ?? 0;
        const crCls =
          cr > 8
            ? "bg-emerald-100 text-emerald-700"
            : cr > 4
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700";

        return (
          <div
            key={report.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(report)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(report);
              }
            }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-lg border border-[#F1F5F9] hover:border-[#93C5FD] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center text-xl shrink-0">
                🤖
              </div>
              <div className="text-right min-w-0">
                <p className="font-semibold text-[#0F172A] truncate">{report.name}</p>
                <p className="text-xs text-[#94A3B8]">
                  {report.periodLabel} • {report.dataSnapshot?.reportsCount ?? 0} تقرير • حفظه{" "}
                  {report.savedByName} • {formatRelativeTime(report.savedAt)}
                </p>
              </div>
            </div>

            <div className="flex gap-2 items-center justify-end shrink-0">
              <span className="text-xs bg-[#F1F5F9] px-2 py-1 rounded-full font-medium">
                {report.dataSnapshot?.totalMessages ?? 0} رسالة
              </span>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${crCls}`}>
                {Number.isFinite(cr) ? cr.toFixed(1) : "0"}% تحويل
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(report.id);
                }}
                className="text-red-400 hover:text-red-600 text-xs p-2 rounded-lg hover:bg-red-50"
                aria-label="حذف"
              >
                🗑️
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
