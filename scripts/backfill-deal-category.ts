import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { DEAL_CATEGORY_CONFIG } from "../src/lib/config";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v];
  })
);

const serviceAccount = args.serviceAccount;
const dryRun = args.dryRun !== "false";

if (!serviceAccount) {
  throw new Error("Usage: tsx scripts/backfill-deal-category.ts --serviceAccount=./Keys/serviceAccount.json --dryRun=true");
}

initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccount, "utf8"))) });
const db = getFirestore();

const SIDE_IDS = new Set(
  DEAL_CATEGORY_CONFIG.sideProductIds.map((id) => normalizeForMatch(id))
);
const CORE_IDS = new Set(
  DEAL_CATEGORY_CONFIG.coreProductIds.map((id) => normalizeForMatch(id))
);

function normalizeForMatch(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\s+/g, " ")
    .trim();
}

function classifyDealCategory(data: any): "core" | "side" {
  const products = Array.isArray(data.products)
    ? data.products.map((x: unknown) => normalizeForMatch(String(x || ""))).filter(Boolean)
    : [];

  if (products.length > 0) {
    if (products.some((p) => CORE_IDS.has(p))) return "core";
    return products.every((p) => SIDE_IDS.has(p)) ? "side" : "core";
  }

  const program = normalizeForMatch(data.programName || "");
  if (!program) return "core";
  if (/book|كتاب/.test(program)) return "side";
  if (/workshop|ورشة|ws\b/.test(program)) return "side";
  if (/business[\s_-]*track|مسار\s*الأعمال|مسار\s*الاعمال/.test(program)) return "side";
  return "core";
}

async function main() {
  const snap = await db.collection("deals").get();
  const docs = snap.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() as any }));
  const batch = db.batch();
  let scanned = 0;
  let wouldUpdate = 0;
  let sideCount = 0;
  let coreCount = 0;

  for (const doc of docs) {
    scanned++;
    const nextCategory = classifyDealCategory(doc.data);
    if (nextCategory === "side") sideCount++;
    else coreCount++;

    const prev = doc.data.dealCategory;
    if (prev === nextCategory) continue;
    wouldUpdate++;

    if (!dryRun) {
      batch.update(doc.ref, {
        dealCategory: nextCategory,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  if (!dryRun && wouldUpdate > 0) {
    await batch.commit();
  }

  console.log(
    `backfill-deal-category: scanned=${scanned} updates=${wouldUpdate} core=${coreCount} side=${sideCount} dryRun=${dryRun}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
