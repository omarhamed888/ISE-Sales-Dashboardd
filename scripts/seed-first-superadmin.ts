import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type SeedArgs = {
  email: string;
  name: string;
  password?: string;
  serviceAccountPath: string;
};

function parseArgs(): SeedArgs {
  const args = process.argv.slice(2);
  const get = (key: string) => {
    const hit = args.find((arg) => arg.startsWith(`--${key}=`));
    return hit ? hit.split("=")[1] : "";
  };

  const email = get("email").trim().toLowerCase();
  const name = get("name").trim() || "Super Admin";
  const password = get("password").trim() || undefined;
  const serviceAccountPath = get("serviceAccount").trim();

  if (!email || !serviceAccountPath) {
    throw new Error(
      "Usage: tsx scripts/seed-first-superadmin.ts --email=admin@company.com --name='Admin Name' --serviceAccount=./serviceAccount.json [--password=StrongPass123]"
    );
  }

  return { email, name, password, serviceAccountPath };
}

async function main() {
  const args = parseArgs();
  const serviceAccount = JSON.parse(readFileSync(resolve(args.serviceAccountPath), "utf8"));

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  const auth = getAuth();
  const db = getFirestore();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(args.email);
  } catch {
    userRecord = await auth.createUser({
      email: args.email,
      displayName: args.name,
      password: args.password,
      emailVerified: true,
    });
  }

  await db.collection("users").doc(userRecord.uid).set(
    {
      name: args.name,
      email: args.email,
      role: "superadmin",
      isActive: true,
      addedAt: FieldValue.serverTimestamp(),
      lastLogin: null,
      seededByScript: true,
    },
    { merge: true }
  );

  console.log(`Seeded first superadmin: ${args.email} (${userRecord.uid})`);
}

main().catch((error) => {
  console.error("Failed to seed superadmin:", error);
  process.exit(1);
});
