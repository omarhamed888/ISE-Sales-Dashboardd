import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import {
  canonicalizeProductIds,
  inferProductIdsFromProgramName,
} from "../src/lib/utils/normalize-course-names";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  })
);

const serviceAccount = args.serviceAccount;
const dryRun = args.dryRun === "true";
const limit = Number(args.limit || 0);

if (serviceAccount) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccount, "utf8"))) });
} else {
  initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function main() {
  const coursesSnap = await db.collection("courses").get();
  const validCourseIds = new Set(coursesSnap.docs.map((d) => d.id));
  const courseLabelById = new Map<string, string>();
  for (const d of coursesSnap.docs) {
    const name = String((d.data() as { name?: unknown }).name || "").trim();
    if (name) courseLabelById.set(d.id, name);
  }

  const snap = await db.collection("deals").get();
  const docs = limit > 0 ? snap.docs.slice(0, limit) : snap.docs;

  let touched = 0;
  let normalizedByProducts = 0;
  let normalizedByProgramName = 0;
  let unchanged = 0;
  const samples: Array<{ id: string; from: string; to: string }> = [];

  let batch = db.batch();
  let ops = 0;

  for (const d of docs) {
    const data = d.data() as {
      products?: string[];
      programName?: string;
      programCount?: number;
    };

    const originalProducts = Array.isArray(data.products) ? data.products.filter(Boolean) : [];
    const fromProgramName = inferProductIdsFromProgramName(data.programName || "");
    const normalizedProducts =
      originalProducts.length > 0
        ? canonicalizeProductIds(originalProducts)
        : canonicalizeProductIds(fromProgramName);
    const sanitizedProducts = normalizedProducts.filter((id) => validCourseIds.has(id));

    const newProgramName =
      sanitizedProducts.length > 0
        ? sanitizedProducts.map((id) => courseLabelById.get(id) || id).join("، ")
        : (data.programName || "").trim();
    const newProgramCount =
      sanitizedProducts.length > 0
        ? sanitizedProducts.length
        : Math.max(1, Number(data.programCount) || 1);

    const productsChanged = !arraysEqual(originalProducts, sanitizedProducts);
    const nameChanged = (data.programName || "").trim() !== newProgramName;
    const countChanged = Math.max(1, Number(data.programCount) || 1) !== newProgramCount;

    if (!productsChanged && !nameChanged && !countChanged) {
      unchanged++;
      continue;
    }

    touched++;
    if (originalProducts.length > 0) normalizedByProducts++;
    else normalizedByProgramName++;

    if (samples.length < 12) {
      samples.push({
        id: d.id,
        from: `${(data.programName || "").trim()} | [${originalProducts.join(", ")}]`,
        to: `${newProgramName} | [${sanitizedProducts.join(", ")}]`,
      });
    }

    if (!dryRun) {
      batch.update(d.ref, {
        products: sanitizedProducts,
        programName: newProgramName,
        programCount: newProgramCount,
        normalizedAt: FieldValue.serverTimestamp(),
      });
      ops++;
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
  }

  if (!dryRun && ops > 0) {
    await batch.commit();
  }

  console.log("Normalize deals products report:");
  console.log(`- total scanned: ${docs.length}`);
  console.log(`- updated candidates: ${touched}`);
  console.log(`- unchanged: ${unchanged}`);
  console.log(`- normalized from products: ${normalizedByProducts}`);
  console.log(`- normalized from programName fallback: ${normalizedByProgramName}`);
  console.log(`- mode: ${dryRun ? "dry-run (no writes)" : "write"}`);
  if (samples.length > 0) {
    console.log("- sample updates:");
    for (const s of samples) {
      console.log(`  * ${s.id}`);
      console.log(`    from: ${s.from}`);
      console.log(`    to  : ${s.to}`);
    }
  }
  if (!serviceAccount) {
    console.log("- auth mode: applicationDefault()");
  } else {
    console.log(`- auth mode: service account (${serviceAccount})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
