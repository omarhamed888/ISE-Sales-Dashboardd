/**
 * Run: npx tsx scripts/parser-smoke.ts
 * Validates validateAndCorrect + extractRepliedAfterPriceFromText (no Gemini).
 */
import {
  validateAndCorrect,
  extractRepliedAfterPriceFromText,
} from "../src/lib/services/gemini-parser.ts";

const test1 = `واتساب
اجمالى (66)

مردش بعد التفاصيل (49)
14 (منغير اعلان)
10 (ليه الشركات بتعين دكاترة ومهندسين)
مردش بعد السعر (11)
4 (منغير اعلان)
رد بعد السعر (6)
3 (اعلان الويبنار)
هيحضر الويبنار
1 (منغير اعلان)
هيحجز فى الصيف`;

const test2 = `واتساب
اجمالى (19)

مردش بعد اهلا (2)
2 (ليه الشركات بتعين دكاترة ومهندسين)
مردش بعد التفاصيل (14)
3 (عايز تحترف مبيعات)
6 (منغير اعلان)
5 (ليه الشركات بتعين دكاترة ومهندسين)
مردش بعد السعر (2)
1 (ليه الشركات بتعين دكاترة ومهندسين)
1 (عايز تحترف مبيعات)`;

function summarize(label: string, raw: string) {
  const extracted = extractRepliedAfterPriceFromText(raw);
  const r = validateAndCorrect({ funnel: {} }, raw);
  console.log(`\n=== ${label} ===`);
  console.log("totalMessages:", r.totalMessages);
  console.log("greeting count:", r.funnel.noReplyAfterGreeting.length, "sum", r.funnel.noReplyAfterGreeting.reduce((s, x) => s + x.count, 0));
  console.log("details rows:", r.funnel.noReplyAfterDetails.length);
  console.log("price rows:", r.funnel.noReplyAfterPrice.length);
  console.log("replied rows:", r.funnel.repliedAfterPrice.length, "extracted-only lines:", extracted.length);
  console.log("interactions:", r.interactions, "conversionRate:", r.conversionRate);
  console.log("repliedAfterPrice:", JSON.stringify(r.funnel.repliedAfterPrice.map((x) => ({ adName: x.adName, count: x.count, notes: x.notes })), null, 2));
}

summarize("Test 1 (with رد بعد السعر)", test1);
summarize("Test 2 (no رد بعد السعر)", test2);
