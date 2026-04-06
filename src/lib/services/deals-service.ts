import { collection, doc, writeBatch, serverTimestamp, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface DealInput {
  customerName: string;
  adSource: string;
  programName: string;
  programCount: number;
  dealValue: number;
  firstContactDate: string; // YYYY-MM-DD
}

export interface ParsedDealsResult {
  deals: DealInput[];
  totalDeals: number;
  totalRevenue: number;
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function parseDealsFromText(rawText: string): Promise<ParsedDealsResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not configured.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `استخرج بيانات الصفقات المغلقة من النص.
أرجع JSON فقط. لا تستنتج أي بيانات غير موجودة.
تاريخ الإغلاق لا تستخرجه من النص.

استخرج الصفقات من هذا النص:

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
      "firstContactDate": "YYYY-MM-DD"
    }
  ],
  "totalDeals": N,
  "totalRevenue": N
}

قواعد:
- dealValue = رقم فقط بدون "ج.م"
- firstContactDate من "أول تواصل" بصيغة YYYY-MM-DD
- لو التاريخ مكتوب "2026-04-08" خذه كما هو
- لو مكتوب "8-4" حوله لـ "2026-04-08"
- لو مش موجود أرجع ""
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();
  const cleanJson = responseText.replace(/```json|```/gi, "").trim();
  return JSON.parse(cleanJson);
}

export async function saveDeals(
  deals: DealInput[],
  salesRepId: string,
  salesRepName: string
): Promise<void> {
  const today = getTodayString();
  const batch = writeBatch(db);

  deals.forEach((deal) => {
    const dealRef = doc(collection(db, "deals"));

    const firstContact = deal.firstContactDate ? new Date(deal.firstContactDate) : null;
    const closeDate = new Date(today);
    const cycleDays =
      firstContact && !isNaN(firstContact.getTime())
        ? Math.max(0, Math.round((closeDate.getTime() - firstContact.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

    batch.set(dealRef, {
      salesRepId,
      salesRepName,
      date: today,
      customerName: deal.customerName,
      adSource: deal.adSource,
      programName: deal.programName,
      programCount: deal.programCount,
      dealValue: deal.dealValue,
      firstContactDate: deal.firstContactDate,
      closeDate: today,
      closingCycleDays: cycleDays,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function getMyDeals(salesRepId: string): Promise<any[]> {
  const q = query(
    collection(db, "deals"),
    where("salesRepId", "==", salesRepId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
