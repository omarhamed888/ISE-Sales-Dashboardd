import { GoogleGenerativeAI } from "@google/generative-ai";

export interface FunnelStage {
  id: string;
  adName: string;
  count: number;
  notes?: string;        // الوظيفة بعد "/" في ماسنجر
  leadNotes?: string[];  // ملاحظات فردية تحت كل عميل في "رد بعد السعر" (واتساب/تيك توك)
}

export interface ReportFunnel {
  noReplyAfterGreeting: FunnelStage[];   // ماسنجر فقط
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
  messagesCount: number;       // ماسنجر: رسائل فقط | واتساب/تيك توك: = totalMessages
  commentsCount: number;       // ماسنجر: كومنتات | واتساب/تيك توك: 0
  interactions: number;        // مجموع "رد بعد السعر"
  conversionRate: number;
  funnel: ReportFunnel;
  commentsFunnel: ReportFunnel; // ماسنجر: كومنتات فقط | واتساب/تيك توك: فارغ
  specialCases: string[];
  jobConfusionCount: number;
  rejectionReasons: RejectionReason[];
  detectedJobs: DetectedJob[];
  leadsByAd: Array<{ adName: string; leadCount: number }>;
  salesNotes: string;
  programTrack: string;
  sourceType: string;
  closedDeals: DealInput[];    // الصفقات المغلقة المدمجة في التقرير
}

const REJECTION_CATEGORIES = [
  'سعر', 'خلط وظيفي', 'عدم اهتمام', 'توقيت', 'صيغة الدراسة',
  'احتياج غير مطابق', 'سلطة قرار', 'عدم فهم', 'قطاع/وظيفة', 'أخرى'
];

const SYSTEM_INSTRUCTION = `أنت محلل بيانات مبيعات متخصص في السوق العربي.
ستستقبل تقرير مبيعات يومي كنص خام. مهمتك: استخرج البيانات وأرجع JSON صحيح فقط بدون أي نص إضافي.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
فورمات واتساب / تيك توك (نفس الشيء)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*اجمالى (N)*  →  totalMessages = N

توزيع الليدز حسب الإعلان:
- اسم_الإعلان: N   →  leadsByAd: [{adName, leadCount}]

* مردش بعد التفاصيل (N)
M (اسم_الإعلان)   →  noReplyAfterDetails: [{adName: "اسم_الإعلان", count: M}]
M (اسم_الإعلان)

* مردش بعد السعر (N)
M (اسم_الإعلان)   →  noReplyAfterPrice: [{adName, count: M}]

* رد بعد السعر (N)
M (اسم_الإعلان)   →  repliedAfterPrice: [{adName, count: M, leadNotes: [ملاحظات تحته]}]
هيفكر ويرد         ← هذه ملاحظات عميل تتراكم في leadNotes للـ entry السابق
هيحضر اونلاين      ← نفس الشيء
M (اسم_الإعلان)   →  entry جديد
محتاج يتكلم مراته

قاعدة leadNotes: أي سطر يلي سطر "M (اسم)" وهو ليس "M (اسم)" آخر، يُضاف في leadNotes للـ entry السابق.

أسباب الرفض:
- السبب: N   →  rejectionReasons: [{rawText, count, category}]

ملاحظات:
[نص حر]   →  salesNotes

الصفقات المغلقة: N
1)
الاسم: [اسم]      → customerName
المصدر: [مصدر]    → adSource
البرنامج: [برنامج] → programName
عدد البرامج: N    → programCount
دفع: N            → dealValue
أول تواصل: تاريخ  → firstContactDate (YYYY-MM-DD)

⚠️ واتساب/تيك توك: لا يوجد مرحلة "مردش بعد أهلا" → noReplyAfterGreeting = []
⚠️ واتساب/تيك توك: commentsFunnel كله فارغ []

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
فورمات ماسنجر
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

السطر الأول: "ماسنجر ( X رساله - Y كومنت )"
→ messagesCount = X, commentsCount = Y, totalMessages = X + Y

━━━ رسائل ( X ) ━━━   ← بداية قسم الرسائل

مردش بعد أهلا ( N )
N اسم_الإعلان    →  noReplyAfterGreeting: [{adName: "اسم_الإعلان", count: N}]

مردش بعد التفاصيل ( N )
- اسم_الإعلان / الوظيفة  →  [{adName, count: 1, notes: "الوظيفة"}]

مردش بعد السعر ( N )
- اسم_الإعلان / الوظيفة

رد بعد السعر ( N )
- اسم_الإعلان / الوظيفة

حالات خاصة رسائل:
- وصف_الحالة / اسم_الإعلان  →  specialCases (كنص)

━━━ كومنتات ( Y ) ━━━  ← بداية قسم الكومنتات (نفس هيكل رسائل)

⚠️ للماسنجر:
- funnel = دمج رسائل + كومنتات (اجمع الأعداد لنفس المراحل)
- commentsFunnel = كومنتات فقط (بدون رسائل)
- لا يوجد صفقات مدمجة في ماسنجر عادةً، لكن لو وُجدت استخرجها

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
قواعد عامة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- interactions = مجموع count في repliedAfterPrice
- jobConfusionCount = عدد من ظنوا التقرير وظيفة (من أسباب الرفض "فاكرها وظيفة")
- الأرقام العربية (١٢٣) والإنجليزية (123) كلاهما مقبول
- لو مفيش بيانات لمرحلة → []
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
    {
      "customerName": string,
      "adSource": string,
      "programName": string,
      "programCount": number,
      "dealValue": number,
      "firstContactDate": string
    }
  ]
}

ملاحظات JSON:
- واتساب/تيك توك: noReplyAfterGreeting = [] دائماً
- واتساب/تيك توك: commentsFunnel كل arrays فارغة []
- ماسنجر: funnel = دمج رسائل + كومنتات، commentsFunnel = كومنتات فقط
- leadNotes: الملاحظات الفردية اللي تحت كل "M (اسم_الإعلان)" في رد بعد السعر
- notes: الوظيفة بعد "/" في ماسنجر
- closedDeals: فارغ [] لو مفيش صفقات مغلقة
- firstContactDate بصيغة YYYY-MM-DD أو "" لو غائب

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
  const extractNumber = (pattern: RegExp) => {
    const match = rawText.match(pattern);
    return match ? parseInt(match[1].replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))) : 0;
  };

  return {
    totalMessages: extractNumber(/اجمالى[^\d]*([\d٠-٩]+)/),
    interactions: 0,
    funnel: { noReplyAfterGreeting: [], noReplyAfterDetails: [], noReplyAfterPrice: [], repliedAfterPrice: [] },
    commentsFunnel: { noReplyAfterGreeting: [], noReplyAfterDetails: [], noReplyAfterPrice: [], repliedAfterPrice: [] },
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

  const closedDeals: DealInput[] = Array.isArray(rawOutput.closedDeals)
    ? rawOutput.closedDeals as DealInput[]
    : [];

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
      closedDeals,
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
