import { GoogleGenerativeAI } from "@google/generative-ai";

export interface FunnelStage {
  id: string; // generated client side
  adName: string;
  count: number;
  notes?: string;
}

export interface ReportFunnel {
  noReplyAfterGreeting: FunnelStage[];
  noReplyAfterDetails: FunnelStage[];
  noReplyAfterPrice: FunnelStage[];
  repliedAfterPrice: FunnelStage[];
}

export interface ParsedReportData {
  totalMessages: number;
  interactions: number;
  conversionRate: number;
  funnel: ReportFunnel;
  specialCases: string[];
  jobConfusionCount: number;
  leadsByAd: Array<{ adName: string; leadCount: number }>;
  rejectionReasons: Array<{ reason: string; count: number }>;
  salesNotes: string;
}

interface RawGeminiOutput {
  totalMessages?: number;
  interactions?: number;
  funnel?: {
    noReplyAfterGreeting?: any[];
    noReplyAfterDetails?: any[];
    noReplyAfterPrice?: any[];
    repliedAfterPrice?: any[];
  };
  specialCases?: string[];
  jobConfusionCount?: number;
  leadsByAd?: Array<{ adName: string; leadCount: number }>;
  rejectionReasons?: Array<{ reason: string; count: number }>;
  salesNotes?: string;
}

function fallbackRegexExtraction(rawText: string): RawGeminiOutput {
  const extractNumber = (pattern: RegExp, fallback: number) => {
    const match = rawText.match(pattern);
    return match ? parseInt(match[1]) : fallback;
  };

  return {
    totalMessages: extractNumber(/تم استلام (\d+)/, 0),
    interactions: extractNumber(/(\d+) عميل/, 0),
    funnel: {
      noReplyAfterGreeting: [],
      noReplyAfterDetails: [],
      noReplyAfterPrice: [],
      repliedAfterPrice: []
    },
    specialCases: ["استخراج احتياطي (Fallback Parser) عمل بسبب فشل اتصال Gemini."],
    jobConfusionCount: 0,
    leadsByAd: [],
    rejectionReasons: [],
    salesNotes: "",
  };
}

async function callGeminiApi(rawText: string): Promise<RawGeminiOutput> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not configured.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
أنت محلل بيانات مبيعات متخصص.
ستستقبل تقرير مبيعات يومي مكتوب بالعربية كنص خام.

مهمتك:
استخرج البيانات وأرجعها كـ JSON صحيح فقط بدون أي نص إضافي.

الهيكل المطلوب بالضبط:
{
  "totalMessages": number,
  "funnel": {
    "noReplyAfterGreeting": [
      { "adName": string, "count": number, "notes": string }
    ],
    "noReplyAfterDetails": [
      { "adName": string, "count": number, "notes": string }
    ],
    "noReplyAfterPrice": [
      { "adName": string, "count": number, "notes": string }
    ],
    "repliedAfterPrice": [
      { "adName": string, "count": number, "notes": string }
    ]
  },
  "specialCases": [string],
  "interactions": number,
  "jobConfusionCount": number,
  "leadsByAd": [
    { "adName": string, "leadCount": number }
  ],
  "rejectionReasons": [
    { "reason": string, "count": number }
  ],
  "salesNotes": string
}

قواعد صارمة:
- interactions = فقط عدد الردود بعد السعر
- jobConfusionCount = عدد من ظنوا التقرير وظيفة
- لو مفيش بيانات لمرحلة، أرجع array فارغة []
- leadsByAd من قسم "توزيع الليدز حسب الإعلان" بصيغة "- اسم الإعلان: رقم"
- rejectionReasons من قسم "أسباب الرفض" بصيغة "- السبب: رقم"
- salesNotes كل النص بعد "📝 ملاحظات:" أو "ملاحظات:"
- لا تخترع بيانات غير موجودة في النص
- أرجع JSON صالح فقط، لا شيء آخر

REPORT TEXT:
${rawText}
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  // Clean potential markdown or extra characters
  const cleanJson = responseText.replace(/```json|```/gi, "").trim();

  return JSON.parse(cleanJson);
}

export async function parseReport(rawText: string, platform: string = "واتساب"): Promise<{parsedData: ParsedReportData, platform: string}> {
  if (rawText.trim().length < 20) {
    throw new Error("النص المدخل أقصر من أن يكون تقريراً مفصلاً. يرجى إدخال تفاصيل أوفى.");
  }

  let rawOutput: RawGeminiOutput;

  try {
    rawOutput = await callGeminiApi(rawText);
  } catch (error) {
    console.warn("Gemini API parsing failed, engaging fallback regex parser:", error);
    rawOutput = fallbackRegexExtraction(rawText);
  }

  // NORMALIZATION LAYER
  const rawFunnel = rawOutput.funnel || {};

  const normalizeStages = (arr: any[] | undefined, prefix: string): FunnelStage[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((s: any, i: number) => ({
      id: `${prefix}_${i}_${Date.now()}`,
      adName: s.adName && s.adName.trim() ? s.adName : "عام",
      count: typeof s.count === 'number' && !isNaN(s.count) ? s.count : 0,
      notes: s.notes || "",
    }));
  };

  const noReplyAfterGreeting = normalizeStages(rawFunnel.noReplyAfterGreeting, "g");
  const noReplyAfterDetails = normalizeStages(rawFunnel.noReplyAfterDetails, "d");
  const noReplyAfterPrice = normalizeStages(rawFunnel.noReplyAfterPrice, "p");
  const repliedAfterPrice = normalizeStages(rawFunnel.repliedAfterPrice, "r");

  const totalMessages = rawOutput.totalMessages || 0;
  const interactions = rawOutput.interactions || 0;
  
  const specialCases = Array.isArray(rawOutput.specialCases) ? rawOutput.specialCases : [];
  const jobConfusionCount = rawOutput.jobConfusionCount || 0;

  // DERIVED METRICS
  let conversionRate = 0;
  if (totalMessages > 0 && interactions > 0) {
      conversionRate = parseFloat(((interactions / totalMessages) * 100).toFixed(1));
  } else if (interactions > 0 && repliedAfterPrice.length > 0) {
      // Fallback calculation in case totalMessages is botched
      const repSum = repliedAfterPrice.reduce((sum, s) => sum + s.count, 0);
      conversionRate = parseFloat(((repSum / interactions) * 100).toFixed(1));
  }

  const leadsByAd = Array.isArray(rawOutput.leadsByAd)
    ? rawOutput.leadsByAd.map((l: any) => ({
        adName: l.adName || "",
        leadCount: typeof l.leadCount === "number" ? l.leadCount : 0,
      }))
    : [];

  const rejectionReasons = Array.isArray(rawOutput.rejectionReasons)
    ? rawOutput.rejectionReasons.map((r: any) => ({
        reason: r.reason || "",
        count: typeof r.count === "number" ? r.count : 0,
      }))
    : [];

  const salesNotes = typeof rawOutput.salesNotes === "string" ? rawOutput.salesNotes : "";

  return {
    parsedData: {
      totalMessages,
      interactions,
      conversionRate,
      funnel: {
        noReplyAfterGreeting,
        noReplyAfterDetails,
        noReplyAfterPrice,
        repliedAfterPrice,
      },
      specialCases,
      jobConfusionCount,
      leadsByAd,
      rejectionReasons,
      salesNotes,
    },
    platform
  };
}
