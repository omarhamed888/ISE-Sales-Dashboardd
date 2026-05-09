import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v];
  })
);

const serviceAccount = args.serviceAccount;
if (!serviceAccount) {
  throw new Error("Usage: tsx scripts/backup-deals-snapshot.ts --serviceAccount=./Keys/serviceAccount.json");
}

initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccount, "utf8"))) });
const db = getFirestore();

async function main() {
  const snap = await db.collection("deals").get();
  const payload = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const outDir = join(process.cwd(), "docs", "migration-backups");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = join(outDir, `deals-backup-${stamp}.json`);
  writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
  console.log(`backup_file=${outFile}`);
  console.log(`backup_count=${payload.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
