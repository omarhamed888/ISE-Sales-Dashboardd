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

export interface RejectionReason {
  rawText: string;
  count: number;
  category: string; // Gemini-classified
}

export interface DetectedJob {
  rawText: string;
  normalizedLabel: string;
  sector: string;
  count: number;
  stage: string;
}

export interface ParsedReportData {
  totalMessages: number;       // رسائل + كومنتات combined
  messagesCount: number;       // رسائل فقط (Messenger)
  commentsCount: number;       // كومنتات فقط (Messenger)
  interactions: number;
  conversionRate: number;
  funnel: ReportFunnel;                // combined رسائل + كومنتات
  commentsFunnel: ReportFunnel;        // كومنتات only (Messenger), empty for other platforms
  specialCases: string[];
  jobConfusionCount: number;
  rejectionReasons: RejectionReason[];
  detectedJobs: DetectedJob[];
  leadsByAd: Array<{ adName: string; leadCount: number }>;
  salesNotes: string;
  programTrack: string;
  sourceType: string;                  // "واتساب" | "ماسنجر" | "تيك توك"
}

export interface DealInput {
  customerName: string;
  adSource: string;
  programName: string;
  programCount: number;
  dealValue: number;
  firstContactDate: string;
}

export interface ParsedDealsOutput {
  deals: DealInput[];
  totalDeals: number;
  totalRevenue: number;
}

const REJECTION_CATEGORIES = [
  'سعر', 'خلط وظيفي', 'عدم اهتمام', 'توقيت', 'صيغة الدراسة',
  'احتياج غير مطابق', 'سلطة قرار', 'عدم فهم', 'قطاع/وظيفة', 'أخرى'
];

const SYSTEM_INSTRUCTION = `أنت محلل بيانات مبيعات متخصص في السوق العربي.
ستستقبل تقرير مبيعات يومي مكتوب بالعربية كنص خام.

مهمتك: استخرج البيانات وأرجعها كـ JSON صحيح فقط بدون أي نص إضافي أو markdown.

━━━ فهم فورمات المنصات ━━━

فورمات واتساب وتيك توك (نفس الشيء):
  اجمالى (N)
  مردش بعد أهلا (N)  → noReplyAfterGreeting
  مردش بعد التفاصيل (N) → noReplyAfterDetails
  مردش بعد السعر (N) → noReplyAfterPrice
  رد بعد السعر (N) → repliedAfterPrice

فورمات ماسنجر:
  السطر الأول: "ماسنجر ( X رساله - Y كومنت )" → messagesCount=X, commentsCount=Y, totalMessages=X+Y
  ━━━ رسائل ( X ) ━━━  ← قسم الرسائل
  ━━━ كومنتات ( Y ) ━━━ ← قسم الكومنتات
  كل قسم له نفس مراحل الفانل

قاعدة التفاصيل (لجميع المنصات):
  "مردش بعد أهلا ( N )" يليه أسطر: "N اسم_الإعلان"
    → كل سطر = entry في noReplyAfterGreeting: {adName: "اسم_الإعلان", count: N, job: ""}
  "مردش بعد التفاصيل ( N )" يليه: "- اسم_الإعلان / الوظيفة"
    → كل سطر = entry: {adName: "اسم_الإعلان", count: 1, job: "الوظيفة"}
  "مردش بعد السعر ( N )" → نفس الطريقة
  "رد بعد السعر ( N )" → نفس الطريقة

حساب messagesCount و commentsCount:
  - واتساب/تيك توك: messagesCount = totalMessages, commentsCount = 0
  - ماسنجر: استخرج X و Y من هيدر "ماسنجر ( X رساله - Y كومنت )"

للماسنجر:
  - funnel = دمج رسائل + كومنتات معاً (جمع الأرقام)
  - commentsFunnel = كومنتات بمفردها

عند استخراج أسباب الرفض، صنّف كل سبب في إحدى هذه الفئات فقط:
سعر | خلط وظيفي | عدم اهتمام | توقيت | صيغة الدراسة | احتياج غير مطابق | سلطة قرار | عدم فهم | قطاع/وظيفة | أخرى

قواعد عامة:
- interactions = مجموع أعداد "رد بعد السعر" فقط
- jobConfusionCount = من ظنوا التقرير وظيفة
- الوظيفة بعد "/" في السطر تذهب لحقل notes في الـ entry
- الأرقام العربية (١٢٣) والإنجليزية (123) كلاهما صحيح، تعامل معهما نفس الشيء
- لو مفيش بيانات لمرحلة أرجع []
- لا تخترع بيانات غير موجودة
- أرجع JSON صالح فقط`;

const USER_PROMPT = (text: string, courses: string[]) => `
الكورسات المتاحة للإسناد: ${courses.length > 0 ? courses.join('، ') : 'غير محدد'}

الهيكل المطلوب بالضبط:
{
  "totalMessages": number,
  "messagesCount": number,
  "commentsCount": number,
  "interactions": number,
  "jobConfusionCount": number,
  "sourceType": "واتساب" | "ماسنجر" | "تيك توك",
  "programTrack": string,
  "salesNotes": string,
  "funnel": {
    "noReplyAfterGreeting": [ { "adName": string, "count": number, "notes": string } ],
    "noReplyAfterDetails": [ { "adName": string, "count": number, "notes": string } ],
    "noReplyAfterPrice": [ { "adName": string, "count": number, "notes": string } ],
    "repliedAfterPrice": [ { "adName": string, "count": number, "notes": string } ]
  },
  "commentsFunnel": {
    "noReplyAfterGreeting": [ { "adName": string, "count": number, "notes": string } ],
    "noReplyAfterDetails": [ { "adName": string, "count": number, "notes": string } ],
    "noReplyAfterPrice": [ { "adName": string, "count": number, "notes": string } ],
    "repliedAfterPrice": [ { "adName": string, "count": number, "notes": string } ]
  },
  "specialCases": [string],
  "rejectionReasons": [
    { "rawText": string, "count": number, "category": string }
  ],
  "detectedJobs": [
    { "rawText": string, "normalizedLabel": string, "sector": string, "count": number, "stage": string }
  ],
  "leadsByAd": [
    { "adName": string, "leadCount": number }
  ]
}

ملاحظات JSON:
- notes في كل entry = الوظيفة المكتوبة بعد "/" في السطر (إن وُجدت)
- للماسنجر: funnel = دمج رسائل + كومنتات، commentsFunnel = كومنتات فقط
- للواتساب/تيك توك: commentsFunnel يكون فيه arrays فارغة

REPORT TEXT:
${text}
`;

interface RawGeminiOutput {
  totalMessages?: number;
  messagesCount?: number;
  commentsCount?: number;
  interactions?: number;
  jobConfusionCount?: number;
  sourceType?: string;
  programTrack?: string;
  salesNotes?: string;
  funnel?: {
    noReplyAfterGreeting?: any[];
    noReplyAfterDetails?: any[];
    noReplyAfterPrice?: any[];
    repliedAfterPrice?: any[];
  };
  commentsFunnel?: {
    noReplyAfterGreeting?: any[];
    noReplyAfterDetails?: any[];
    noReplyAfterPrice?: any[];
    repliedAfterPrice?: any[];
  };
  specialCases?: string[];
  rejectionReasons?: any[];
  detectedJobs?: any[];
  leadsByAd?: any[];
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
    messagesCount: 0,
    commentsCount: 0,
    specialCases: ["استخراج احتياطي (Fallback Parser) عمل بسبب فشل اتصال Gemini."],
    jobConfusionCount: 0,
    rejectionReasons: [],
    detectedJobs: [],
    leadsByAd: [],
    salesNotes: "",
    programTrack: "",
    sourceType: "واتساب",
    commentsFunnel: {
      noReplyAfterGreeting: [],
      noReplyAfterDetails: [],
      noReplyAfterPrice: [],
      repliedAfterPrice: [],
    }
  };
}

async function callGeminiApi(rawText: string, courses: string[]): Promise<RawGeminiOutput> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not configured.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION
  });

  const prompt = USER_PROMPT(rawText, courses);

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  // Clean potential markdown or extra characters
  const cleanJson = responseText.replace(/```json|```/gi, "").trim();

  return JSON.parse(cleanJson);
}

function validateAndCorrect(rawOutput: RawGeminiOutput): RawGeminiOutput {
  const out = { ...rawOutput };

  // Ensure arrays exist
  if (!Array.isArray(out.specialCases)) out.specialCases = [];
  if (!Array.isArray(out.rejectionReasons)) out.rejectionReasons = [];
  if (!Array.isArray(out.detectedJobs)) out.detectedJobs = [];
  if (!Array.isArray(out.leadsByAd)) out.leadsByAd = [];

  // Validate rejection reason categories
  out.rejectionReasons = out.rejectionReasons.map((r: any) => ({
    rawText: r.rawText || r.text || "",
    count: typeof r.count === 'number' ? r.count : 1,
    category: REJECTION_CATEGORIES.includes(r.category) ? r.category : 'أخرى'
  }));

  // Validate detectedJobs
  out.detectedJobs = out.detectedJobs.map((j: any) => ({
    rawText: j.rawText || j.text || "",
    normalizedLabel: j.normalizedLabel || j.rawText || "",
    sector: j.sector || "",
    count: typeof j.count === 'number' ? j.count : 1,
    stage: j.stage || ""
  }));

  // Validate leadsByAd
  out.leadsByAd = out.leadsByAd.map((l: any) => ({
    adName: l.adName || "عام",
    leadCount: typeof l.leadCount === 'number' ? l.leadCount : 0
  }));

  // Ensure strings
  if (typeof out.salesNotes !== 'string') out.salesNotes = "";
  if (typeof out.programTrack !== 'string') out.programTrack = "";
  if (typeof out.sourceType !== 'string') out.sourceType = "واتساب";

  return out;
}

export async function parseReport(
  rawText: string,
  platform: string = "واتساب",
  courses: string[] = []
): Promise<{ parsedData: ParsedReportData; platform: string }> {
  if (rawText.trim().length < 20) {
    throw new Error("النص المدخل أقصر من أن يكون تقريراً مفصلاً. يرجى إدخال تفاصيل أوفى.");
  }

  let rawOutput: RawGeminiOutput;

  try {
    rawOutput = await callGeminiApi(rawText, courses);
    rawOutput = validateAndCorrect(rawOutput);
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

  // commentsFunnel (Messenger only)
  const rawCommentsFunnel = rawOutput.commentsFunnel || {};
  const commentsFunnel: ReportFunnel = {
    noReplyAfterGreeting: normalizeStages(rawCommentsFunnel.noReplyAfterGreeting, "cg"),
    noReplyAfterDetails: normalizeStages(rawCommentsFunnel.noReplyAfterDetails, "cd"),
    noReplyAfterPrice: normalizeStages(rawCommentsFunnel.noReplyAfterPrice, "cp"),
    repliedAfterPrice: normalizeStages(rawCommentsFunnel.repliedAfterPrice, "cr"),
  };

  const totalMessages = rawOutput.totalMessages || 0;
  const messagesCount = rawOutput.messagesCount ?? totalMessages;
  const commentsCount = rawOutput.commentsCount ?? 0;
  const interactions = rawOutput.interactions || 0;

  const specialCases = Array.isArray(rawOutput.specialCases) ? rawOutput.specialCases : [];
  const jobConfusionCount = rawOutput.jobConfusionCount || 0;

  const rejectionReasons: RejectionReason[] = Array.isArray(rawOutput.rejectionReasons)
    ? rawOutput.rejectionReasons as RejectionReason[]
    : [];
  const detectedJobs: DetectedJob[] = Array.isArray(rawOutput.detectedJobs)
    ? rawOutput.detectedJobs as DetectedJob[]
    : [];
  const leadsByAd: Array<{ adName: string; leadCount: number }> = Array.isArray(rawOutput.leadsByAd)
    ? rawOutput.leadsByAd as Array<{ adName: string; leadCount: number }>
    : [];
  const salesNotes = rawOutput.salesNotes || "";
  const programTrack = rawOutput.programTrack || "";
  const sourceType = rawOutput.sourceType || platform;

  // DERIVED METRICS
  let conversionRate = 0;
  if (totalMessages > 0 && interactions > 0) {
      conversionRate = parseFloat(((interactions / totalMessages) * 100).toFixed(1));
  } else if (interactions > 0 && repliedAfterPrice.length > 0) {
      const repSum = repliedAfterPrice.reduce((sum, s) => sum + s.count, 0);
      conversionRate = parseFloat(((repSum / interactions) * 100).toFixed(1));
  }

  return {
    parsedData: {
      totalMessages,
      messagesCount,
      commentsCount,
      interactions,
      conversionRate,
      funnel: {
        noReplyAfterGreeting,
        noReplyAfterDetails,
        noReplyAfterPrice,
        repliedAfterPrice,
      },
      commentsFunnel,
      specialCases,
      jobConfusionCount,
      rejectionReasons,
      detectedJobs,
      leadsByAd,
      salesNotes,
      programTrack,
      sourceType,
    },
    platform
  };
}

export async function parseDeals(rawText: string): Promise<ParsedDealsOutput> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not configured.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `استخرج بيانات الصفقات المغلقة من النص. أرجع JSON فقط. لا تستنتج أي بيانات غير موجودة.

${rawText}

أرجع:
{
  "deals": [
    { "customerName": "الاسم", "adSource": "المصدر", "programName": "البرنامج", "programCount": N, "dealValue": N, "firstContactDate": "YYYY-MM-DD" }
  ],
  "totalDeals": N,
  "totalRevenue": N
}
قواعد: dealValue رقم فقط، firstContactDate بصيغة YYYY-MM-DD أو "" إذا غائب.`;

  const result = await model.generateContent(prompt);
  const cleanJson = result.response.text().trim().replace(/\`\`\`json|\`\`\`/gi, "").trim();
  const parsed = JSON.parse(cleanJson);

  return {
    deals: Array.isArray(parsed.deals) ? parsed.deals.map((d: any) => ({
      customerName: d.customerName || "",
      adSource: d.adSource || "",
      programName: d.programName || "",
      programCount: typeof d.programCount === "number" ? d.programCount : 1,
      dealValue: typeof d.dealValue === "number" ? d.dealValue : 0,
      firstContactDate: d.firstContactDate || "",
    })) : [],
    totalDeals: parsed.totalDeals || 0,
    totalRevenue: parsed.totalRevenue || 0,
  };
}
