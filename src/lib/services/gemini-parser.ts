import { GoogleGenerativeAI } from "@google/generative-ai";
const PARSE_CACHE_PREFIX = "gemini_parse_cache_v1:";
const PARSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const KEY_STATE_STORAGE = "gemini_key_cooldown_state_v1";
const KEY_COOLDOWN_MS = 60_000;

export interface FunnelStage {
  id: string;
  adName: string;
  adId?: string;
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
  contactAttempts: number;
  dealCategory?: "core" | "side";
  closeDate?: string;
  products?: string[];       // dynamic product IDs from Firestore courses collection
  bookingType?: "self_booking" | "call_booking";
  closureType?: "call" | "self"; // legacy compatibility
  /** When set (e.g. upgrade), skip customer lookup by name */
  customerId?: string;
}

export interface ParsedDealsOutput {
  deals: DealInput[];
  totalDeals: number;
  totalRevenue: number;
}

export interface GeminiObjection {
  id: string;
  text: string;
  count: number;
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
  objections: GeminiObjection[];
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
- أرجع JSON صالح فقط

الاعتراضات (objections): اعتراضات العملاء الذين ردوا ولكنهم أبدوا تحفظات أو رفضاً (مثال: "السعر غالي"، "مش وقتي"، "هفكر"، "مش محتاج دلوقتي"). هذه مختلفة عن أسباب عدم الرد. إن لم توجد → []`;

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
      "firstContactDate": string,
      "contactAttempts": number,
      "dealCategory": "core"|"side",
      "products": [string],
      "bookingType": "self_booking"|"call_booking"
    }
  ],
  "objections": [{ "id": string, "text": string, "count": number }]
}

قواعد JSON:
- واتساب/تيك توك: noReplyAfterGreeting = [] و commentsFunnel كله فارغ
- ماسنجر: funnel = دمج رسائل + كومنتات، commentsFunnel = كومنتات فقط
- notes = الوظائف المذكورة (مفصولة بفاصلة)
- leadNotes = الحالة فقط (بعد "|" في واتساب، أو الجزء الثالث "/" في ماسنجر)
- closedDeals = [] لو مفيش مبيعات
- firstContactDate بصيغة YYYY-MM-DD أو "" لو غائب
- contactAttempts عدد المحاولات، ولو غير متاح استخدم 1
- dealCategory تصنيف الصفقة: core أو side (لو غير واضح استخدم core)
- dealValue رقم فقط بدون عملة
- products: إن أمكن اربط كل صفقة بمعرفات المنتجات من البيانات المتاحة، أو اتركها [] إن لم تستطع
- bookingType: "self_booking" أو "call_booking". إن لم يكن واضحاً استخدم "self_booking"
- objections: استخرج الاعتراضات الصريحة من العملاء الذين ردوا. count = عدد العملاء الذين ذكروا هذا الاعتراض. id = uuid عشوائي. إن لم توجد → []

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
  objections?: any[];
}

type ParseProgressStep = "send" | "analyze" | "extract";
type KeyState = Record<string, number>;

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return `h${(hash >>> 0).toString(16)}`;
}

function getParseCacheKey(rawText: string, platform: string, courses: string[]): string {
  const normalized = `${rawText.trim()}|${platform}|${courses.slice().sort().join(",")}`;
  return `${PARSE_CACHE_PREFIX}${hashString(normalized)}`;
}

function readCache(rawText: string, platform: string, courses: string[]): RawGeminiOutput | null {
  try {
    const key = getParseCacheKey(rawText, platform, courses);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiry: number; data: RawGeminiOutput };
    if (Date.now() > parsed.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(rawText: string, platform: string, courses: string[], data: RawGeminiOutput) {
  try {
    const key = getParseCacheKey(rawText, platform, courses);
    localStorage.setItem(
      key,
      JSON.stringify({
        expiry: Date.now() + PARSE_CACHE_TTL_MS,
        data,
      })
    );
  } catch {
    // ignore cache write errors
  }
}

export function clearParseCache(rawText: string, platform = "واتساب", courses: string[] = []) {
  try {
    localStorage.removeItem(getParseCacheKey(rawText, platform, courses));
  } catch {
    // ignore
  }
}

function loadKeyState(): KeyState {
  try {
    const raw = localStorage.getItem(KEY_STATE_STORAGE);
    if (!raw) return {};
    return JSON.parse(raw) as KeyState;
  } catch {
    return {};
  }
}

function saveKeyState(state: KeyState) {
  try {
    localStorage.setItem(KEY_STATE_STORAGE, JSON.stringify(state));
  } catch {
    // ignore
  }
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
    objections: [],
  };
}

// ── API Key Rotation ──────────────────────────────────────────────────────────
function getApiKeys(): string[] {
  const keys: string[] = [];
  // Collect VITE_GEMINI_API_KEY_1, _2, _3, ...
  for (let i = 1; i <= 10; i++) {
    const key = (import.meta.env as Record<string, string>)[`VITE_GEMINI_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  // Fallback to legacy single key
  if (keys.length === 0 && import.meta.env.VITE_GEMINI_API_KEY) {
    keys.push(import.meta.env.VITE_GEMINI_API_KEY);
  }
  return keys;
}

let _keyIndex = 0;

function nextApiKey(): string {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error("No Gemini API keys configured.");
  const key = keys[_keyIndex % keys.length];
  _keyIndex = (_keyIndex + 1) % keys.length;
  return key;
}

async function callWithKey(apiKey: string, prompt: string): Promise<RawGeminiOutput> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION
  });
  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();
  const cleanJson = responseText.replace(/```json|```/gi, "").trim();
  return JSON.parse(cleanJson);
}

async function callGeminiApi(rawText: string, courses: string[]): Promise<RawGeminiOutput> {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error("No Gemini API keys configured.");

  const prompt = USER_PROMPT(rawText, courses);
  const keyState = loadKeyState();
  const now = Date.now();
  const availableKeys = keys.filter((k) => !keyState[k] || keyState[k] <= now);
  const orderedKeys = availableKeys.length > 0 ? availableKeys : keys;

  for (let attempt = 0; attempt < orderedKeys.length; attempt++) {
    const key = orderedKeys[(_keyIndex + attempt) % orderedKeys.length];
    try {
      const result = await callWithKey(key, prompt);
      _keyIndex = (_keyIndex + attempt + 1) % orderedKeys.length;
      return result;
    } catch (err: any) {
      const msg = String(err?.message || err).toLowerCase();
      const isQuotaError = msg.includes('429') || msg.includes('quota') || msg.includes('rate') || msg.includes('resource exhausted');
      if (isQuotaError) {
        keyState[key] = Date.now() + KEY_COOLDOWN_MS;
        saveKeyState(keyState);
      }
      if (isQuotaError && attempt < orderedKeys.length - 1) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("all_keys_exhausted");
}

function validateRequiredShape(output: RawGeminiOutput): boolean {
  return typeof output.totalMessages === "number" && !!output.funnel;
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

  out.closedDeals = out.closedDeals.map((d: any) => {
    const rawProducts = Array.isArray(d.products)
      ? d.products.filter((x: unknown) => typeof x === "string")
      : [];
    const bookingRaw = d.bookingType;
    const closureRaw = d.closureType;
    const bookingType: "self_booking" | "call_booking" =
      bookingRaw === "call_booking"
        ? "call_booking"
        : bookingRaw === "self_booking"
          ? "self_booking"
          : closureRaw === "call"
            ? "call_booking"
            : "self_booking";
    const dealCategory: "core" | "side" =
      d.dealCategory === "side" ? "side" : "core";
    return {
      customerName: d.customerName || "",
      adSource: d.adSource || "",
      programName: d.programName || "",
      programCount: typeof d.programCount === "number" ? d.programCount : 1,
      dealValue: typeof d.dealValue === "number" ? d.dealValue : 0,
      firstContactDate: d.firstContactDate || "",
      contactAttempts:
        typeof d.contactAttempts === "number" && Number.isFinite(d.contactAttempts)
          ? Math.max(1, Math.round(d.contactAttempts))
          : 1,
      closeDate: d.closeDate || "",
      dealCategory,
      ...(rawProducts.length > 0 ? { products: rawProducts } : {}),
      bookingType,
    };
  });

  if (typeof out.salesNotes !== 'string') out.salesNotes = "";
  if (typeof out.programTrack !== 'string') out.programTrack = "";
  if (typeof out.sourceType !== 'string') out.sourceType = "واتساب";

  if (!Array.isArray(out.objections)) out.objections = [];
  out.objections = out.objections.map((o: any) => ({
    id: typeof o.id === 'string' && o.id ? o.id : crypto.randomUUID(),
    text: typeof o.text === 'string' ? o.text.trim() : String(o.text || ""),
    count: typeof o.count === 'number' && o.count > 0 ? o.count : 1,
  })).filter((o: GeminiObjection) => o.text !== "");

  return out;
}

export async function parseReport(
  rawText: string,
  platform: string = "واتساب",
  courses: string[] = [],
  options: { forceRefresh?: boolean; onProgress?: (step: ParseProgressStep) => void } = {}
): Promise<{ parsedData: ParsedReportData; platform: string }> {
  if (rawText.trim().length < 20) {
    throw new Error("النص المدخل أقصر من أن يكون تقريراً. يرجى إدخال تفاصيل أوفى.");
  }

  let rawOutput: RawGeminiOutput;
  const cached = options.forceRefresh ? null : readCache(rawText, platform, courses);
  if (cached) {
    rawOutput = validateAndCorrect(cached);
  } else {
    try {
    options.onProgress?.("send");
    rawOutput = await callGeminiApi(rawText, courses);
    options.onProgress?.("analyze");
    if (!validateRequiredShape(rawOutput)) {
      rawOutput = await callGeminiApi(`${rawText}\n\nIMPORTANT: RETURN REQUIRED FIELDS totalMessages and funnel in valid JSON.`, courses);
    }
    rawOutput = validateAndCorrect(rawOutput);
    options.onProgress?.("extract");
    writeCache(rawText, platform, courses, rawOutput);
    } catch (error) {
      const msg = String((error as Error)?.message || error || "").toLowerCase();
      if (msg.includes("all_keys_exhausted") || msg.includes("429") || msg.includes("quota")) {
        throw new Error("الخدمة مشغولة حالياً، حاول مرة أخرى بعد دقيقة");
      }
      if (msg.includes("network") || msg.includes("failed to fetch")) {
        throw new Error("تحقق من اتصال الإنترنت");
      }
      if (msg.includes("api key") || msg.includes("invalid key")) {
        console.error("Gemini invalid API key detected:", error);
        throw new Error("مفتاح API غير صالح");
      }
      rawOutput = fallbackRegexExtraction(rawText);
    }
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

  // Keep KPI behavior: Messenger "مردش بعد أهلاً" remains part of totalMessages via parsed total.
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
      objections: (rawOutput.objections || []) as GeminiObjection[],
    },
    platform
  };
}

export async function parseDeals(rawText: string): Promise<ParsedDealsOutput> {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error("No Gemini API keys configured.");
  const apiKey = keys[_keyIndex % keys.length];
  _keyIndex = (_keyIndex + 1) % keys.length;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `استخرج بيانات الصفقات المغلقة من النص. أرجع JSON فقط.

${rawText}

أرجع:
{
  "deals": [
    {
      "customerName": "الاسم",
      "adSource": "المصدر",
      "programName": "البرنامج",
      "programCount": N,
      "dealValue": N,
      "firstContactDate": "YYYY-MM-DD",
      "contactAttempts": N,
      "dealCategory": "core"|"side",
      "products": [string],
      "bookingType": "self_booking"|"call_booking"
    }
  ],
  "totalDeals": N,
  "totalRevenue": N
}
قواعد: dealValue رقم فقط، firstContactDate بصيغة YYYY-MM-DD أو "" إذا غائب، contactAttempts رقم صحيح >= 1 (لو غير متاح استخدم 1). products اختياري. bookingType اختياري وقيمته self_booking أو call_booking. dealCategory اختياري (core أو side) والافتراضي core.`;

  const result = await model.generateContent(prompt);
  const cleanJson = result.response.text().trim().replace(/```json|```/gi, "").trim();
  const parsed = JSON.parse(cleanJson);

  return {
    deals: Array.isArray(parsed.deals)
      ? parsed.deals.map((d: any) => {
          const rawProducts = Array.isArray(d.products)
            ? d.products.filter((x: unknown) => typeof x === "string")
            : [];
          const bookingRaw = d.bookingType;
          const closureRaw = d.closureType;
          const bookingType: "self_booking" | "call_booking" =
            bookingRaw === "call_booking"
              ? "call_booking"
              : bookingRaw === "self_booking"
                ? "self_booking"
                : closureRaw === "call"
                  ? "call_booking"
                  : "self_booking";
          const dealCategory: "core" | "side" =
            d.dealCategory === "side" ? "side" : "core";
          return {
            customerName: d.customerName || "",
            adSource: d.adSource || "",
            programName: d.programName || "",
            programCount: typeof d.programCount === "number" ? d.programCount : 1,
            dealValue: typeof d.dealValue === "number" ? d.dealValue : 0,
            firstContactDate: d.firstContactDate || "",
            contactAttempts:
              typeof d.contactAttempts === "number" && Number.isFinite(d.contactAttempts)
                ? Math.max(1, Math.round(d.contactAttempts))
                : 1,
            closeDate: d.closeDate || "",
            dealCategory,
            ...(rawProducts.length > 0 ? { products: rawProducts } : {}),
            bookingType,
          };
        })
      : [],
    totalDeals: parsed.totalDeals || 0,
    totalRevenue: parsed.totalRevenue || 0,
  };
}
