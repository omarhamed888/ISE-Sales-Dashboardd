import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ParsedReportData } from "@/lib/services/gemini-parser";
import { normalizeReportDateKey } from "@/lib/utils/report-dates";
import { calcInteractionsFromParsedData } from "@/lib/utils/dashboard-aggregations";

export type InsightPeriod = "today" | "week" | "month" | "all";

export interface ReportDocument {
  id?: string;
  date?: string;
  platform?: string;
  salesRepId?: string;
  salesRepName?: string;
  parsedData?: ParsedReportData & {
    summary?: { totalMessages?: number; interactions?: number };
    funnels?: ParsedReportData["funnel"];
  };
}

export interface AIInsightItem {
  id: string;
  type: "critical" | "warning" | "positive" | "info";
  emoji: string;
  title: string;
  description: string;
}

export interface AIRecommendation {
  id: string;
  urgency: "فوري" | "قصير المدى" | "متوسط المدى";
  urgencyColor: "red" | "yellow" | "green";
  title: string;
  description: string;
}

export interface AIInsightsResult {
  period: InsightPeriod;
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
  criticalIssues: AIInsightItem[];
  positivePoints: AIInsightItem[];
  recommendations: AIRecommendation[];
  summary: string;
  generatedAt: Date;
  dataSnapshot: {
    totalMessages: number;
    totalInteractions: number;
    conversionRate: number;
    reportsCount: number;
    salesRepsCount: number;
  };
}

export type GenerateInsightsFailureCode =
  | "no_reports"
  | "low_data"
  | "rate_limited"
  | "no_api_key"
  | "gemini_failed"
  | "bad_json";

export type GenerateInsightsResponse =
  | { ok: true; data: AIInsightsResult }
  | { ok: false; code: GenerateInsightsFailureCode };

function reportMessages(pd: ReportDocument["parsedData"]): number {
  if (!pd) return 0;
  const tm =
    (typeof pd.totalMessages === "number" ? pd.totalMessages : null) ??
    pd.summary?.totalMessages ??
    0;
  return tm;
}

function reportInteractions(pd: ReportDocument["parsedData"]): number {
  if (!pd) return 0;
  return calcInteractionsFromParsedData(pd);
}

function getFunnel(r: ReportDocument) {
  const pd = r.parsedData;
  if (!pd) return null;
  return pd.funnel || pd.funnels || null;
}

type FunnelStageKey = "greeting" | "details" | "price" | "replied";

const FUNNEL_STAGE_KEYS: Record<
  FunnelStageKey,
  readonly string[]
> = {
  greeting: ["noReplyAfterGreeting", "noReplyGreeting"],
  details: ["noReplyAfterDetails", "noReplyDetails"],
  price: ["noReplyAfterPrice", "noReplyPrice"],
  replied: ["repliedAfterPrice"],
};

function funnelStageArray(
  f: NonNullable<ReturnType<typeof getFunnel>>,
  key: FunnelStageKey
): Array<{ adName: string; count: number }> | undefined {
  for (const k of FUNNEL_STAGE_KEYS[key]) {
    const arr = (f as unknown as Record<string, unknown>)[k];
    if (Array.isArray(arr)) return arr as Array<{ adName: string; count: number }>;
  }
  return undefined;
}

function sumStageCounts(
  arr: Array<{ adName: string; count: number }> | undefined
): number {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((s, a) => s + (a.count ?? 0), 0);
}

/** Stable fingerprint for cache keys (sorted doc ids, hashed if huge). */
function fingerprintReports(reports: ReportDocument[]): string {
  const ids = reports.map((r) => r.id ?? "").sort();
  const joined = ids.join("|");
  if (joined.length <= 1500) return joined;
  let h = 0;
  for (let i = 0; i < joined.length; i++) {
    h = (Math.imul(31, h) + joined.charCodeAt(i)) | 0;
  }
  return `h${(h >>> 0).toString(16)}_n${reports.length}`;
}

export function buildInsightsContext(params: {
  period: InsightPeriod;
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
  reports: ReportDocument[];
}): string {
  const { period, periodLabel, dateFrom, dateTo, reports } = params;

  if (reports.length === 0) {
    return "";
  }

  const totalMessages = reports.reduce((sum, r) => sum + reportMessages(r.parsedData), 0);
  const totalInteractions = reports.reduce(
    (sum, r) => sum + reportInteractions(r.parsedData),
    0
  );
  const conversionRate =
    totalMessages > 0 ? ((totalInteractions / totalMessages) * 100).toFixed(1) : "0";

  let greetingTotal = 0;
  let detailsTotal = 0;
  let priceTotal = 0;
  let interactionTotal = 0;

  reports.forEach((r) => {
    const f = getFunnel(r);
    if (!f) return;
    greetingTotal += sumStageCounts(funnelStageArray(f, "greeting"));
    detailsTotal += sumStageCounts(funnelStageArray(f, "details"));
    priceTotal += sumStageCounts(funnelStageArray(f, "price"));
    interactionTotal += sumStageCounts(funnelStageArray(f, "replied"));
  });

  const platformMap: Record<string, { messages: number; interactions: number }> = {};
  reports.forEach((r) => {
    const p = r.platform ?? "غير محدد";
    if (!platformMap[p]) platformMap[p] = { messages: 0, interactions: 0 };
    platformMap[p].messages += reportMessages(r.parsedData);
    platformMap[p].interactions += reportInteractions(r.parsedData);
  });

  const platformLines = Object.entries(platformMap)
    .map(([name, d]) => {
      const cr =
        d.messages > 0 ? ((d.interactions / d.messages) * 100).toFixed(1) : "0";
      return `  - ${name}: ${d.messages} رسالة، ${d.interactions} تفاعل، ${cr}% تحويل`;
    })
    .join("\n");

  const repMap: Record<string, { messages: number; interactions: number; days: number }> =
    {};
  reports.forEach((r) => {
    const name = r.salesRepName ?? "غير محدد";
    if (!repMap[name]) repMap[name] = { messages: 0, interactions: 0, days: 0 };
    repMap[name].messages += reportMessages(r.parsedData);
    repMap[name].interactions += reportInteractions(r.parsedData);
    repMap[name].days += 1;
  });

  const repLines = Object.entries(repMap)
    .map(([name, d]) => {
      const cr =
        d.messages > 0 ? ((d.interactions / d.messages) * 100).toFixed(1) : "0";
      return `  - ${name}: ${d.messages} رسالة، ${d.interactions} تفاعل، ${cr}% تحويل، ${d.days} تقرير`;
    })
    .join("\n");

  const adMap: Record<
    string,
    { greeting: number; details: number; price: number; interactions: number }
  > = {};

  reports.forEach((r) => {
    const f = getFunnel(r);
    if (!f) return;
    const addToMap = (
      arr: Array<{ adName: string; count: number }> | undefined,
      key: keyof (typeof adMap)[string]
    ) => {
      arr?.forEach(({ adName, count }) => {
        if (!adMap[adName]) {
          adMap[adName] = { greeting: 0, details: 0, price: 0, interactions: 0 };
        }
        adMap[adName][key] += count ?? 0;
      });
    };
    addToMap(funnelStageArray(f, "greeting"), "greeting");
    addToMap(funnelStageArray(f, "details"), "details");
    addToMap(funnelStageArray(f, "price"), "price");
    addToMap(funnelStageArray(f, "replied"), "interactions");
  });

  const adLines = Object.entries(adMap)
    .map(([name, d]) => {
      const total = d.greeting + d.details + d.price + d.interactions;
      const cr = total > 0 ? ((d.interactions / total) * 100).toFixed(1) : "0";
      return (
        `  - "${name}": إجمالي ${total}، تفاعل ${d.interactions}، تحويل ${cr}%` +
        ` | تسرب: تحية ${d.greeting}، تفاصيل ${d.details}، سعر ${d.price}`
      );
    })
    .join("\n");

  const jobConfusionTotal = reports.reduce(
    (sum, r) => sum + (r.parsedData?.jobConfusionCount ?? 0),
    0
  );
  const jobConfusionPct =
    totalMessages > 0 ? ((jobConfusionTotal / totalMessages) * 100).toFixed(1) : "0";

  const dayMap: Record<string, { messages: number; interactions: number }> = {};
  reports.forEach((r) => {
    const d = normalizeReportDateKey(r);
    if (!d) return;
    if (!dayMap[d]) dayMap[d] = { messages: 0, interactions: 0 };
    dayMap[d].messages += reportMessages(r.parsedData);
    dayMap[d].interactions += reportInteractions(r.parsedData);
  });

  const dayLines = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      const cr =
        d.messages > 0 ? ((d.interactions / d.messages) * 100).toFixed(1) : "0";
      return `  - ${date}: ${d.messages} رسالة، ${d.interactions} تفاعل، ${cr}% تحويل`;
    })
    .join("\n");

  return `
═══ بيانات أداء حملة المبيعات ═══

الفترة الزمنية: ${periodLabel} (${dateFrom} → ${dateTo})
إجمالي التقارير المحللة: ${reports.length} تقرير
عدد موظفي المبيعات: ${Object.keys(repMap).length}

─── المؤشرات الرئيسية ───
إجمالي الرسائل: ${totalMessages}
إجمالي التفاعل الحقيقي: ${totalInteractions}
معدل التحويل الإجمالي: ${conversionRate}%
الخلط بإعلان الوظيفة: ${jobConfusionTotal} شخص (${jobConfusionPct}%)

─── قمع التحويل (أين يتسرب العملاء) ───
تسرب بعد التحية: ${greetingTotal} شخص
تسرب بعد التفاصيل: ${detailsTotal} شخص
تسرب بعد السعر: ${priceTotal} شخص
تفاعل فعلي (وصل للنهاية): ${interactionTotal} شخص

─── أداء المنصات ───
${platformLines || "  لا توجد بيانات منصات"}

─── أداء الموظفين ───
${repLines || "  لا توجد بيانات موظفين"}

─── أداء الإعلانات ───
${adLines || "  لا توجد بيانات إعلانات"}

─── الأداء اليومي ───
${dayLines || "  لا توجد بيانات يومية"}
  `.trim();
}

const SYSTEM_INSTRUCTION = `
أنت محلل أعمال خبير متخصص في تحليل أداء المبيعات عبر واتساب وماسنجر.
لديك بيانات تفصيلية عن حملة مبيعات لكورسات تدريبية.

قواعد صارمة يجب اتباعها:
1. استخدم الأرقام الحقيقية الموجودة في البيانات فقط - لا تخترع أي رقم
2. كل insight يجب أن يحتوي على رقم محدد من البيانات
3. التوصيات يجب أن تكون قابلة للتنفيذ الفعلي في سياق المبيعات
4. إذا كانت البيانات غير كافية لاستنتاج معين، لا تذكره
5. الرد باللغة العربية فقط
6. أرجع JSON صحيح فقط بدون أي نص قبله أو بعده
7. لا تضع markdown أو code blocks حول الـ JSON
8. النسب يجب ألا تتجاوز 100% أبداً
`.trim();

const USER_PROMPT_TEMPLATE = (context: string) => `
البيانات المطلوب تحليلها:

${context}

قم بتحليل هذه البيانات وأرجع JSON بهذا الشكل بالضبط:

{
  "summary": "فقرة واحدة تلخص أداء الحملة بشكل عام بالأرقام الحقيقية",
  "criticalIssues": [
    {
      "id": "issue_1",
      "type": "critical",
      "emoji": "💸",
      "title": "عنوان المشكلة (5 كلمات max)",
      "description": "وصف المشكلة بالرقم الحقيقي من البيانات"
    }
  ],
  "positivePoints": [
    {
      "id": "positive_1",
      "type": "positive",
      "emoji": "🎯",
      "title": "عنوان الإيجابية (5 كلمات max)",
      "description": "وصف الإيجابية بالرقم الحقيقي من البيانات"
    }
  ],
  "recommendations": [
    {
      "id": "rec_1",
      "urgency": "فوري",
      "urgencyColor": "red",
      "title": "عنوان التوصية",
      "description": "وصف قابل للتنفيذ مع ذكر الرقم المرتبط"
    }
  ]
}

قواعد المحتوى:
- criticalIssues: 2-5 مشاكل فقط (الأكثر أهمية وخطورة)
  أمثلة: تسرب > 70%، منصة فاشلة (0% تحويل)، خلط بالوظيفة، معدل تحويل < 3%

- positivePoints: 2-4 نقاط إيجابية حقيقية
  أمثلة: أفضل إعلان، أفضل يوم، منصة ناجحة، موظف متميز

- recommendations: 4-8 توصيات مرتبة من الأهم للأقل
  urgency values: "فوري" (red) | "قصير المدى" (yellow) | "متوسط المدى" (green)

- summary: فقرة 2-3 جمل تلخص الأداء العام

إذا كانت البيانات قليلة جداً (< 50 رسالة):
- قلل عدد الـ insights
- أشر في summary أن البيانات قليلة
`;

const RATE_SUCCESS_KEY = "ai_insights_last_success_ms";
const CACHE_PREFIX = "ai_insights_cache_";

function buildCacheKey(period: InsightPeriod, reports: ReportDocument[]): string {
  return `${CACHE_PREFIX}${period}_${fingerprintReports(reports)}`;
}

function getCachedInsights(
  period: InsightPeriod,
  reports: ReportDocument[]
): AIInsightsResult | null {
  try {
    const key = buildCacheKey(period, reports);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, expiry } = JSON.parse(raw) as {
      data: AIInsightsResult;
      expiry: number;
    };
    if (Date.now() > expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return reviveInsightsResult(data);
  } catch {
    return null;
  }
}

function reviveInsightsResult(data: AIInsightsResult): AIInsightsResult {
  return {
    ...data,
    generatedAt: new Date(data.generatedAt as unknown as string),
  };
}

function cacheInsights(
  period: InsightPeriod,
  reports: ReportDocument[],
  result: AIInsightsResult
): void {
  try {
    const key = buildCacheKey(period, reports);
    const expiry = Date.now() + 30 * 60 * 1000;
    const serializable = {
      ...result,
      generatedAt: result.generatedAt.toISOString(),
    };
    localStorage.setItem(key, JSON.stringify({ data: serializable, expiry }));
  } catch {
    // localStorage full - ignore
  }
}

/**
 * Rate limit: at most one successful Gemini call per 60s. Timestamp updates only after success.
 * If still in cooldown and no valid cache, returns rate_limited.
 */
export async function generateAIInsights(params: {
  period: InsightPeriod;
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
  reports: ReportDocument[];
}): Promise<GenerateInsightsResponse> {
  const { period, periodLabel, dateFrom, dateTo, reports } = params;

  const totalMessages = reports.reduce((s, r) => s + reportMessages(r.parsedData), 0);

  if (reports.length === 0) {
    return { ok: false, code: "no_reports" };
  }
  if (totalMessages < 10) {
    return { ok: false, code: "low_data" };
  }

  const cached = getCachedInsights(period, reports);
  if (cached) {
    return { ok: true, data: cached };
  }

  const lastSuccessRaw = localStorage.getItem(RATE_SUCCESS_KEY);
  const lastSuccess = lastSuccessRaw ? parseInt(lastSuccessRaw, 10) : 0;
  if (lastSuccess && Date.now() - lastSuccess < 60_000) {
    return { ok: false, code: "rate_limited" };
  }

  const contextText = buildInsightsContext({
    period,
    periodLabel,
    dateFrom,
    dateTo,
    reports,
  });

  if (!contextText) {
    return { ok: false, code: "no_reports" };
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, code: "no_api_key" };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent(USER_PROMPT_TEMPLATE(contextText));
    const text = result.response.text().trim();

    let parsed: {
      summary: string;
      criticalIssues: AIInsightItem[];
      positivePoints: AIInsightItem[];
      recommendations: AIRecommendation[];
    };

    try {
      const clean = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("Failed to parse Gemini insights JSON:", text);
      return { ok: false, code: "bad_json" };
    }

    const totalInteractions = reports.reduce(
      (s, r) => s + reportInteractions(r.parsedData),
      0
    );

    const insightsResult: AIInsightsResult = {
      period,
      periodLabel,
      dateFrom,
      dateTo,
      criticalIssues: parsed.criticalIssues ?? [],
      positivePoints: parsed.positivePoints ?? [],
      recommendations: parsed.recommendations ?? [],
      summary: parsed.summary ?? "",
      generatedAt: new Date(),
      dataSnapshot: {
        totalMessages,
        totalInteractions,
        conversionRate:
          totalMessages > 0
            ? Math.min(
                100,
                (totalInteractions / totalMessages) * 100
              )
            : 0,
        reportsCount: reports.length,
        salesRepsCount: new Set(reports.map((r) => r.salesRepId).filter(Boolean)).size,
      },
    };

    try {
      localStorage.setItem(RATE_SUCCESS_KEY, Date.now().toString());
    } catch {
      /* ignore */
    }

    cacheInsights(period, reports, insightsResult);

    return { ok: true, data: insightsResult };
  } catch (error) {
    console.error("Gemini insights error:", error);
    return { ok: false, code: "gemini_failed" };
  }
}
