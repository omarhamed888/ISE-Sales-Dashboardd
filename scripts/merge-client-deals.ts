import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v];
  })
);

const serviceAccount = args.serviceAccount;
const dryRun = args.dryRun !== "false";

if (!serviceAccount) {
  throw new Error("Usage: tsx scripts/merge-client-deals.ts --serviceAccount=./Keys/serviceAccount.json --dryRun=true");
}

initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccount, "utf8"))) });
const db = getFirestore();

function clientKey(d: any): string {
  const cid = String(d.customerId || "").trim();
  if (cid) return cid;
  return `${String(d.salesRepId || "").trim()}::${String(d.customerName || "").trim().toLowerCase().replace(/\s+/g, " ")}`;
}

async function main() {
  const snap = await db.collection("deals").get();
  const docs = snap.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() as any }));
  const groups = new Map<string, typeof docs>();
  for (const doc of docs) {
    const key = clientKey(doc.data);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(doc);
  }

  let mergedGroups = 0;
  let deletedDocs = 0;
  const batch = db.batch();

  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    mergedGroups++;
    const sorted = [...group].sort((a, b) => {
      const aDate = String(a.data.closeDate || a.data.date || "");
      const bDate = String(b.data.closeDate || b.data.date || "");
      return aDate.localeCompare(bDate);
    });
    const base = sorted[0];
    const others = sorted.slice(1);
    const mergedProducts = Array.from(
      new Set(
        sorted.flatMap((x) => (Array.isArray(x.data.products) ? x.data.products : []))
      )
    );
    const totalRevenue = sorted.reduce((s, x) => s + (Number(x.data.dealValue) || 0), 0);
    const totalAttempts = sorted.reduce((s, x) => s + (Number(x.data.contactAttempts) || 0), 0);
    const latest = sorted[sorted.length - 1];

    if (!dryRun) {
      batch.update(base.ref, {
        products: mergedProducts,
        programCount: Math.max(1, mergedProducts.length),
        programName: mergedProducts.join("، ") || base.data.programName || "غير محدد",
        dealValue: totalRevenue,
        contactAttempts: totalAttempts,
        closeDate: latest.data.closeDate || latest.data.date || base.data.closeDate || base.data.date || null,
        date: latest.data.closeDate || latest.data.date || base.data.date || null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      for (const d of others) {
        batch.delete(d.ref);
        deletedDocs++;
      }
    } else {
      deletedDocs += others.length;
    }
  }

  if (!dryRun) await batch.commit();
  console.log(`merge-client-deals: mergedGroups=${mergedGroups} duplicateDocs=${deletedDocs} dryRun=${dryRun}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
