import type { AIInsightsResult } from "@/lib/services/ai-insights-service";
import { InsightItem } from "./InsightItem";
import { RecommendationCard } from "./RecommendationCard";
import { Pill } from "./Pill";

interface InsightResultPanelProps {
  result: AIInsightsResult;
  reportName: string;
  onReportNameChange: (name: string) => void;
  onSave: () => void;
  isSaving: boolean;
  showSave?: boolean;
}

export function InsightResultPanel({
  result,
  reportName,
  onReportNameChange,
  onSave,
  isSaving,
  showSave = true,
}: InsightResultPanelProps) {
  const cr = result.dataSnapshot.conversionRate;
  const crDisplay = Number.isFinite(cr) ? cr.toFixed(1) : "0";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-2xl">📋</span>
          <h2 className="text-lg font-bold text-[#1E3A8A]">الملخص التنفيذي</h2>
          <span className="text-xs text-[#3B82F6] mr-auto">
            {result.periodLabel} • {result.dataSnapshot.reportsCount} تقرير
          </span>
        </div>
        <p className="text-[#1E40AF] leading-relaxed text-right text-sm">
          {result.summary}
        </p>
        <div className="flex gap-3 mt-4 flex-wrap">
          <Pill label="الرسائل" value={result.dataSnapshot.totalMessages} />
          <Pill label="التفاعل" value={result.dataSnapshot.totalInteractions} />
          <Pill label="التحويل" value={`${crDisplay}%`} />
          <Pill label="الموظفون" value={result.dataSnapshot.salesRepsCount} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-[#F1F5F9] shadow-sm p-5">
          <h3 className="font-bold text-[#0F172A] mb-4 flex items-center gap-2 justify-end">
            <span>⚠️</span> المشاكل الحرجة
          </h3>
          {result.criticalIssues.length === 0 ? (
            <p className="text-emerald-600 text-sm text-right">✅ لا توجد مشاكل حرجة</p>
          ) : (
            result.criticalIssues.map((issue) => (
              <InsightItem key={issue.id} item={issue} variant="critical" />
            ))
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#F1F5F9] shadow-sm p-5">
          <h3 className="font-bold text-[#0F172A] mb-4 flex items-center gap-2 justify-end">
            <span>✨</span> النقاط الإيجابية
          </h3>
          {result.positivePoints.length === 0 ? (
            <p className="text-[#94A3B8] text-sm text-right">جمّع المزيد من البيانات</p>
          ) : (
            result.positivePoints.map((point) => (
              <InsightItem key={point.id} item={point} variant="positive" />
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#F1F5F9] shadow-sm p-5 mb-6">
        <h3 className="font-bold text-[#0F172A] mb-4 flex items-center gap-2 justify-end">
          <span>💡</span> التوصيات الاستراتيجية
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {result.recommendations.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      </div>

      {showSave && (
        <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="font-bold text-[#334155] mb-3 text-right">💾 حفظ هذا التقرير</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <input
              type="text"
              value={reportName}
              onChange={(e) => onReportNameChange(e.target.value)}
              placeholder="اسم التقرير..."
              className="flex-1 border border-[#CBD5E1] rounded-lg px-4 py-2.5 text-right text-sm focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] outline-none"
            />
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving || !reportName.trim()}
                className="bg-[#2563EB] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#1D4ED8] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? "⏳ جاري الحفظ..." : "💾 حفظ"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="border border-[#CBD5E1] bg-white text-[#334155] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#F1F5F9]"
              >
                تصدير PDF
              </button>
            </div>
          </div>
          <p className="text-xs text-[#94A3B8] mt-2 text-right">
            سيتم حفظ التقرير في Firestore ويمكن مراجعته لاحقاً — «تصدير PDF» يفتح نافذة الطباعة
          </p>
        </div>
      )}
    </div>
  );
}
