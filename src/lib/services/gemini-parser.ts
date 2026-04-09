import { GoogleGenerativeAI } from "@google/generative-ai";

export interface FunnelStage {
  id: string;
  adName: string;
  count: number;
  notes?: string;       // الوظائف (comma-separated)
  leadNotes?: string[]; // الحالة (من "رد بعد السعر" أو ماسنجر)
}

export interface ReportFunnel {
  noReplyAfterGreeting: FunnelStage[];  // ماسنجر فقط
  noReplyAfterDetails: FunnelStage[];
  noReplyAfterPrice: FunnelStage[];
  repliedAfterPrice: FunnelStage[];
}

export interface RejectionReason {
  rawText: string;
  count: number;
  category: string;
}

export interface DetectedJob {
  rawText: string;
  normalizedLabel: string;
  sector: string;
  count: number;
  stage: string;
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

export interface ParsedReportData {
  totalMessages: number;
  messagesCount: number;
  commentsCount: number;
  interactions: number;
  conversionRate: number;
  funnel: ReportFunnel;
  commentsFunnel: ReportFunnel;
  specialCases: string[];
  jobConfusionCount: number;
  rejectionReasons: RejectionReason[];
  detectedJobs: DetectedJob[];
  leadsByAd: Array<{ adName: string; leadCount: number }>;
  salesNotes: string;
  programTrack: string;
  sourceType: string;
  closedDeals: DealInput[];
}

const REJECTION_CATEGORIES = [
  'سعر', 'خلط وظيفي', 'عدم اهتمام', 'توقيت', 'صيغة الدراسة',
  'احتياج غير مطابق', 'سلطة قرار', 'عدم فهم', 'قطاع/وظيفة', 'أخرى'
];

const SYSTEM_INSTRUCTION = `أنت محلل بيانات مبيعات متخصص في السوق العربي.
ستستقبل تقرير مبيعات يومي كنص خام. مهمتك: استخرج البيانات وأرجع JSON صحيح فقط بدون أي نص إضافي أو markdown.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 فورمات واتساب / تيك توك (نفس الشيء)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(N) ليد  →  totalMessages = N

توزيع الإعلانات:  ← عنوان فقط، تجاهله

1. مردش بعد التفاصيل (N):  →  noReplyAfterDetails, total count = N
اسم_الإعلان: (الوظائف: وظيفة1، وظيفة2، وظيفة3)
   → entry: { adName: "اسم_الإعلان", count: عدد_الوظائف_المذكورة, notes: "وظيفة1، وظيفة2، وظيفة3", leadNotes: [] }
   count = عدد الوظائف المذكورة بين القوسين (كل وظيفة = شخص)

2. مردش بعد السعر (N):  →  noReplyAfterPrice
اسم_الإعلان: (الوظائف: وظيفة1، وظيفة2)
   → نفس الطريقة

3. رد بعد السعر (N):  →  repliedAfterPrice
اسم_الإعلان: (الوظائف: وظيفة1 | الحالة: حالة1، حالة2)
   → entry: { adName, count: عدد_الوظائف, notes: "وظيفة1", leadNotes: ["حالة1", "حالة2"] }
   الوظائف قبل "|"، الحالة بعد "|"
   لو مفيش "|" فكله وظائف

أسباب الرفض: (سبب1: X - سبب2: Y - سبب3: Z)
   → rejectionReasons: [{ rawText: "سبب1", count: X, category: ... }]

ملاحظات: (نص حر)  →  salesNotes

المبيعات المغلقة (Sales):
اسم | اسم_الإعلان | اسم_البرنامج | المبلغ | التاريخ
   → closedDeals: [{ customerName, adSource, programName, programCount: 1, dealValue, firstContactDate }]
   لو في عدة صفوف → كل سطر = صفقة منفصلة

leadsByAd: اجمع مجموع الليدز لكل إعلان عبر كل المراحل (مردش بعد التفاصيل + مردش بعد السعر + رد بعد السعر)
⚠️ واتساب/تيك توك: noReplyAfterGreeting = [] دائماً
⚠️ واتساب/تيك توك: commentsFunnel كله فارغ []

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 فورمات ماسنجر
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

السطر الأول: (X رسالة - Y كومنت)
   → messagesCount = X, commentsCount = Y, totalMessages = X + Y

━━━ رسائل (X) ━━━

مردش بعد أهلاً (N): (إعلان1: M | إعلان2: M | إعلان3: M)
   → noReplyAfterGreeting: [{ adName: "إعلان1", count: M }, { adName: "إعلان2", count: M }]
   الفصل بـ "|" بين الإعلانات

مردش بعد التفاصيل (N): (اسم_الإعلان / الوظائف)
مردش بعد التفاصيل (N): (اسم_الإعلان / الوظائف)
   → كل سطر = entry واحد: { adName, count: 1, notes: "الوظائف", leadNotes: [] }
   كل إدخال = شخص واحد، يمكن تكرار نفس الإعلان لأشخاص مختلفين

مردش بعد السعر (N): (اسم_الإعلان / الوظائف)
   → نفس الطريقة

رد بعد السعر (N): (اسم_الإعلان / الوظائف / الحالة)
   → { adName, count: 1, notes: "الوظائف", leadNotes: ["الحالة"] }

حالات خاصة: (نوع_الحالة / اسم_الإعلان)
   → specialCases: ["نوع_الحالة / اسم_الإعلان"]

━━━ كومنتات (Y) ━━━  ← نفس هيكل رسائل

⚠️ للماسنجر:
- funnel = دمج رسائل + كومنتات (اجمع entries نفس المرحلة)
- commentsFunnel = كومنتات فقط (بدون رسائل)
- noReplyAfterGreeting موجود في الماسنجر فقط

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
قواعد عامة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- interactions = مجموع count في repliedAfterPrice
- jobConfusionCount = عدد من ظنوا الإعلان وظيفة (من أسباب الرفض)
- الأرقام العربية (١٢٣) والإنجليزية (123) كلاهما مقبول
- لو مفيش بيانات → []
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
  "leadsByAd": [{ "adName": string, "leadCount": number }],
  "funnel": {
    "noReplyAfterGreeting": [{ "adName": string, "count": number, "notes": string, "leadNotes": [string] }],
    "noReplyAfterDetails":  [{ "adName": string, "count": number, "notes": string, "leadNotes": [string] }],
    "noReplyAfterPrice":    [{ "adName": string, "count": number, "notes": string, "leadNotes": [string] }],
    "repliedAfterPrice":    [{ "adName": string, "count": number, "notes": string, "leadNotes": [string] }]
  },
  "commentsFunnel": {
    "noReplyAfterGreeting": [{ "adName": string, "count": number, "notes": string, "leadNotes": [string] }],
    "noReplyAfterDetails":  [{ "adName": string, "count": number, "notes": string, "leadNotes": [string] }],
    "noReplyAfterPrice":    [{ "adName": string, "count": number, "notes": string, "leadNotes": [string] }],
    "repliedAfterPrice":    [{ "adName": string, "count": number, "notes": string, "leadNotes": [string] }]
  },
  "specialCases": [string],
  "rejectionReasons": [{ "rawText": string, "count": number, "category": string }],
  "detectedJobs": [{ "rawText": string, "normalizedLabel": string, "sector": string, "count": number, "stage": string }],
  "closedDeals": [
    { "customerName": string, "adSource": string, "programName": string, "programCount": number, "dealValue": number, "firstContactDate": string }
  ]
}

قواعد JSON:
- واتساب/تيك توك: noReplyAfterGreeting = [] و commentsFunnel كله فارغ
- ماسنجر: funnel = دمج رسائل + كومنتات، commentsFunnel = كومنتات فقط
- notes = الوظائف المذكورة (مفصولة بفاصلة)
- leadNotes = الحالة فقط (بعد "|" في واتساب، أو الجزء الثالث "/" في ماسنجر)
- closedDeals = [] لو مفيش مبيعات
- firstContactDate بصيغة YYYY-MM-DD أو "" لو غائب
- dealValue رقم فقط بدون عملة

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
  leadsByAd?: any[];
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
  closedDeals?: any[];
}

function fallbackRegexExtraction(rawText: string): RawGeminiOutput {
  const toEn = (s: string) => s.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const extractNumber = (pattern: RegExp) => {
    const m = rawText.match(pattern);
    return m ? parseInt(toEn(m[1])) : 0;
  };
  const empty = { noReplyAfterGreeting: [], noReplyAfterDetails: [], noReplyAfterPrice: [], repliedAfterPrice: [] };
  return {
    totalMessages: extractNumber(/\((\d+|[٠-٩]+)\)\s*ليد/),
    interactions: 0,
    funnel: { ...empty },
    commentsFunnel: { ...empty },
    messagesCount: 0,
    commentsCount: 0,
    specialCases: ["استخراج احتياطي (Fallback) بسبب فشل اتصال Gemini."],
    jobConfusionCount: 0,
    rejectionReasons: [],
    detectedJobs: [],
    leadsByAd: [],
    salesNotes: "",
    programTrack: "",
    sourceType: "واتساب",
    closedDeals: [],
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

  const result = await model.generateContent(USER_PROMPT(rawText, courses));
  const responseText = result.response.text().trim();
  const cleanJson = responseText.replace(/```json|```/gi, "").trim();
  return JSON.parse(cleanJson);
}

function validateAndCorrect(rawOutput: RawGeminiOutput): RawGeminiOutput {
  const out = { ...rawOutput };

  if (!Array.isArray(out.specialCases)) out.specialCases = [];
  if (!Array.isArray(out.rejectionReasons)) out.rejectionReasons = [];
  if (!Array.isArray(out.detectedJobs)) out.detectedJobs = [];
  if (!Array.isArray(out.leadsByAd)) out.leadsByAd = [];
  if (!Array.isArray(out.closedDeals)) out.closedDeals = [];

  out.rejectionReasons = out.rejectionReasons.map((r: any) => ({
    rawText: r.rawText || r.text || "",
    count: typeof r.count === 'number' ? r.count : 1,
    category: REJECTION_CATEGORIES.includes(r.category) ? r.category : 'أخرى'
  }));

  out.detectedJobs = out.detectedJobs.map((j: any) => ({
    rawText: j.rawText || "",
    normalizedLabel: j.normalizedLabel || j.rawText || "",
    sector: j.sector || "",
    count: typeof j.count === 'number' ? j.count : 1,
    stage: j.stage || ""
  }));

  out.leadsByAd = out.leadsByAd.map((l: any) => ({
    adName: l.adName || "عام",
    leadCount: typeof l.leadCount === 'number' ? l.leadCount : 0
  }));

  out.closedDeals = out.closedDeals.map((d: any) => ({
    customerName: d.customerName || "",
    adSource: d.adSource || "",
    programName: d.programName || "",
    programCount: typeof d.programCount === 'number' ? d.programCount : 1,
    dealValue: typeof d.dealValue === 'number' ? d.dealValue : 0,
    firstContactDate: d.firstContactDate || "",
  }));

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
    throw new Error("النص المدخل أقصر من أن يكون تقريراً. يرجى إدخال تفاصيل أوفى.");
  }

  let rawOutput: RawGeminiOutput;
  try {
    rawOutput = await callGeminiApi(rawText, courses);
    rawOutput = validateAndCorrect(rawOutput);
  } catch (error) {
    console.warn("Gemini API parsing failed, engaging fallback:", error);
    rawOutput = fallbackRegexExtraction(rawText);
  }

  const normalizeStages = (arr: any[] | undefined, prefix: string): FunnelStage[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((s: any, i: number) => ({
      id: `${prefix}_${i}_${Date.now()}`,
      adName: s.adName?.trim() || "عام",
      count: typeof s.count === 'number' && !isNaN(s.count) ? s.count : 0,
      notes: s.notes || "",
      leadNotes: Array.isArray(s.leadNotes) ? s.leadNotes.filter(Boolean) : [],
    }));
  };

  const rawFunnel = rawOutput.funnel || {};
  const funnel: ReportFunnel = {
    noReplyAfterGreeting: normalizeStages(rawFunnel.noReplyAfterGreeting, "g"),
    noReplyAfterDetails: normalizeStages(rawFunnel.noReplyAfterDetails, "d"),
    noReplyAfterPrice: normalizeStages(rawFunnel.noReplyAfterPrice, "p"),
    repliedAfterPrice: normalizeStages(rawFunnel.repliedAfterPrice, "r"),
  };

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
  const interactions = rawOutput.interactions ||
    funnel.repliedAfterPrice.reduce((s, st) => s + st.count, 0);

  let conversionRate = 0;
  if (totalMessages > 0 && interactions > 0) {
    conversionRate = parseFloat(((interactions / totalMessages) * 100).toFixed(1));
  }

  return {
    parsedData: {
      totalMessages,
      messagesCount,
      commentsCount,
      interactions,
      conversionRate,
      funnel,
      commentsFunnel,
      specialCases: rawOutput.specialCases || [],
      jobConfusionCount: rawOutput.jobConfusionCount || 0,
      rejectionReasons: (rawOutput.rejectionReasons || []) as RejectionReason[],
      detectedJobs: (rawOutput.detectedJobs || []) as DetectedJob[],
      leadsByAd: (rawOutput.leadsByAd || []) as Array<{ adName: string; leadCount: number }>,
      salesNotes: rawOutput.salesNotes || "",
      programTrack: rawOutput.programTrack || "",
      sourceType: rawOutput.sourceType || platform,
      closedDeals: (rawOutput.closedDeals || []) as DealInput[],
    },
    platform
  };
}

export async function parseDeals(rawText: string): Promise<ParsedDealsOutput> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not configured.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `استخرج بيانات الصفقات المغلقة من النص. أرجع JSON فقط.

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
  const cleanJson = result.response.text().trim().replace(/```json|```/gi, "").trim();
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
