import { GoogleGenerativeAI } from "@google/generative-ai";

// Types matching the submit-report page
export interface FunnelStage {
  id: string;
  adName: string;
  count: number;
}

export interface ReportFunnels {
  noReplyGreeting: FunnelStage[];
  noReplyDetails: FunnelStage[];
  noReplyPrice: FunnelStage[];
  repliedAfterPrice: FunnelStage[];
}

export interface ParsedReportData {
  date: string;
  platform: string;
  summary: {
    totalMessages: number;
    interactions: number;
    conversionRate: number;
  };
  funnels: ReportFunnels;
  specialCases: string;
}

interface RawGeminiOutput {
  platform?: string;
  totalMessages?: number;
  interactions?: number;
  funnel?: {
    noReplyAfterGreeting?: any[];
    noReplyAfterDetails?: any[];
    noReplyAfterPrice?: any[];
    repliedAfterPrice?: any[];
  };
  funnels?: Partial<ReportFunnels>;
  specialCases?: string | string[];
  conversionRate?: number;
}

/**
 * Backup Regex parser if Gemini fails or rate limits.
 */
function fallbackRegexExtraction(rawText: string): RawGeminiOutput {
  const extractNumber = (pattern: RegExp, fallback: number) => {
    const match = rawText.match(pattern);
    return match ? parseInt(match[1]) : fallback;
  };

  return {
    platform: rawText.includes("واتساب") ? "واتساب" : (rawText.includes("انستقرام") || rawText.includes("إنستغرام") ? "إنستغرام" : "أخرى"),
    totalMessages: extractNumber(/تم استلام (\d+)/, 0),
    interactions: extractNumber(/(\d+) عميل/, 0),
    funnel: {
      noReplyAfterGreeting: [{ adName: "حملة عامة (Fallback)", count: extractNumber(/(\d+) شخص لم يردوا بعد التحية/, 0), id: "fb_g_1" }],
      noReplyAfterDetails: [{ adName: "حملة عامة (Fallback)", count: extractNumber(/(\d+) شخص توقفوا بعد إرسال التفاصيل/, 0), id: "fb_d_1" }],
      noReplyAfterPrice: [{ adName: "باقات منوعة (Fallback)", count: extractNumber(/(\d+) لم يردوا بعد إرسال السعر/, 0), id: "fb_p_1" }],
      repliedAfterPrice: [{ adName: "بناء ثقة (Fallback)", count: extractNumber(/(\d+) أشخاص في مرحلة التفاوض/, 0), id: "fb_r_1" }]
    },
    specialCases: "استخراج احتياطي (Fallback Parser) عمل بسبب فشل اتصال Gemini."
  };
}

/**
 * Call Gemini API directly from client.
 * NOTE: In production, this should be moved to a Firebase Cloud Function.
 */
async function callGeminiApi(rawText: string, platform: string): Promise<RawGeminiOutput> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not configured.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
      You are an expert sales data analyst. Your task is to extract structured data from an Arabic sales report text.
      The report is for the following platform: ${platform}.
      
      Extract the following information and return it STRICTLY as a JSON object with this EXACT structure:
      {
        "totalMessages": number,
        "funnel": {
          "noReplyAfterGreeting": [{ "adName": string, "count": number, "notes": string }],
          "noReplyAfterDetails": [{ "adName": string, "count": number, "notes": string }],
          "noReplyAfterPrice": [{ "adName": string, "count": number, "notes": string }],
          "repliedAfterPrice": [{ "adName": string, "count": number, "notes": string }]
        },
        "specialCases": [string],
        "interactions": number
      }

      DATA EXTRACTION RULES:
      1. 'totalMessages': The total number of new messages/leads received.
      2. 'interactions': The number of people who actually engaged in a conversation (showed interest).
      3. 'funnel': Distribute the customers based on where they stopped in the conversation.
         - 'noReplyAfterGreeting': Stopped after the first greeting.
         - 'noReplyAfterDetails': Stopped after receiving product/service details.
         - 'noReplyAfterPrice': Stopped immediately after the price was mentioned.
         - 'repliedAfterPrice': Engaged, asked follow-up questions, or confirmed purchase after seeing the price.
      4. 'adName': If the text mentions specific ads or campaigns (e.g. "إعلان العقارات", "حملة الصيف"), use that name. If not mentioned, use "عام".
      5. 'notes': Any specific reasons or clues mentioned for that group (e.g. "السعر غالي", "طلب موعد"). If none, use empty string.
      6. 'specialCases': An array of any other important observations, problems, or special customer cases mentioned in the text.
      7. NUMBERS: Ensure all counts are actual numbers, not strings.
      8. LANGUAGE: Keep strings in Arabic as they appear in the report.

      Return ONLY the JSON. No preamble, no markdown formatting.

      REPORT TEXT:
      ${rawText}
    `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  // Clean potential markdown or extra characters
  const cleanJson = responseText.replace(/```json|```/gi, "").trim();

  return JSON.parse(cleanJson);
}

/**
 * Main parser - calls Gemini with fallback to regex.
 */
export async function parseReport(rawText: string, platform: string = "واتساب"): Promise<ParsedReportData> {
  if (rawText.trim().length < 20) {
    throw new Error("النص المدخل أقصر من أن يكون تقريراً مفصلاً. يرجى إدخال تفاصيل أوفى.");
  }

  let rawOutput: RawGeminiOutput;

  try {
    rawOutput = await callGeminiApi(rawText, platform);
    console.log('🔎 Gemini API response:', rawOutput);
  } catch (error) {
    console.warn("Gemini API parsing failed, engaging fallback regex parser:", error);
    rawOutput = fallbackRegexExtraction(rawText);
  }

  // Normalize the output
  const funnel = rawOutput.funnel || {};
  const funnels = rawOutput.funnels;

  const normalizeStages = (arr: any[] | undefined, prefix: string): FunnelStage[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((s: any, i: number) => ({
      id: s.id || `${prefix}_${i}_${Date.now()}`,
      adName: s.adName || "غير محدد",
      count: typeof s.count === 'number' && !isNaN(s.count) ? s.count : 0,
    }));
  };

  const noReplyGreeting = normalizeStages(funnels?.noReplyGreeting || funnel.noReplyAfterGreeting, "g");
  const noReplyDetails = normalizeStages(funnels?.noReplyDetails || funnel.noReplyAfterDetails, "d");
  const noReplyPrice = normalizeStages(funnels?.noReplyPrice || funnel.noReplyAfterPrice, "p");
  const repliedAfterPrice = normalizeStages(funnels?.repliedAfterPrice || funnel.repliedAfterPrice, "r");

  const totalMessages = rawOutput.totalMessages || 0;
  const interactions = rawOutput.interactions || 0;
  const repliedTotal = repliedAfterPrice.reduce((acc, s) => acc + s.count, 0);
  const conversionRate = rawOutput.conversionRate ?? (interactions > 0 ? parseFloat(((repliedTotal / interactions) * 100).toFixed(1)) : 0);

  const specialCases = Array.isArray(rawOutput.specialCases)
    ? rawOutput.specialCases.join(' \n- ')
    : (rawOutput.specialCases || '');

  return {
    date: new Date().toISOString().split('T')[0],
    platform: rawOutput.platform || platform,
    summary: {
      totalMessages,
      interactions,
      conversionRate,
    },
    funnels: {
      noReplyGreeting,
      noReplyDetails,
      noReplyPrice,
      repliedAfterPrice,
    },
    specialCases,
  };
}
