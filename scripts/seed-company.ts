import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";

// ── Parse CLI args ──────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, "").split("=");
    return [k, rest.join("=")];
  })
);

const {
  company,
  adminEmail,
  serviceAccount,
  adminName        = "Super Admin",
  logoUrl          = "",           // HTTPS URL to company logo (Firebase Storage or CDN)
  currency         = "EGP",
  currencyLabel    = "جنيه",
  dataQualityDate  = new Date().toISOString().slice(0, 10),  // defaults to today
  timezone         = "Africa/Cairo",
} = args;

if (!company || !adminEmail || !serviceAccount) {
  throw new Error(
    "Usage: tsx scripts/seed-company.ts " +
    "--company=NAME --adminEmail=a@b.com --serviceAccount=./sa.json " +
    "[--adminName=NAME] [--logoUrl=https://...] [--currency=EGP] " +
    "[--currencyLabel=جنيه] [--dataQualityDate=YYYY-MM-DD] [--timezone=Africa/Cairo]"
  );
}

// ── Init Firebase Admin ─────────────────────────────────────────────────────
initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccount, "utf8"))) });
const db   = getFirestore();
const auth = getAuth();

async function main() {
  // 1. Create or find the superadmin user
  let user;
  try {
    user = await auth.getUserByEmail(adminEmail);
    console.log(`Found existing user: ${user.uid}`);
  } catch {
    user = await auth.createUser({ email: adminEmail, emailVerified: true });
    console.log(`Created new user: ${user.uid}`);
  }

  // 2. Write app_config/settings
  await db.doc("app_config/settings").set({
    companyName: company,
    companyLogo: logoUrl || "/logo.png",
    companyColors: { primary: "#1E40AF", secondary: "#3B82F6", accent: "#10B981" },
    currency,
    currencyLabel,
    language: "ar",
    timezone,
    workingDays: [0, 1, 2, 3, 4, 6],
    reportDeadlineHour: 16,
    dataQualityFromDate: dataQualityDate,
    ignoredAdNames: [],              // company fills this in via Settings page
    conversionGreenThreshold: 15,
    conversionAmberThreshold: 5,
    features: {
      adsAnalysis:    true,
      aiInsights:     true,
      dealsTracking:  true,
      attendance:     true,
      excuses:        true,
      targets:        true,
    },
  }, { merge: true });
  console.log("✅ app_config/settings written");

  // 3. Write the superadmin user doc
  await db.doc(`users/${user.uid}`).set({
    authUid:   user.uid,
    email:     adminEmail,
    name:      adminName,
    role:      "superadmin",
    isActive:  true,
    addedAt:   FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`✅ users/${user.uid} written`);

  console.log("");
  console.log(`🚀 Company "${company}" seeded successfully.`);
  console.log(`   Admin: ${adminEmail} (uid: ${user.uid})`);
  if (logoUrl) {
    console.log(`   Logo:  ${logoUrl}`);
  } else {
    console.log("   Logo:  /logo.png (default) — update companyLogo in Firestore after uploading your logo");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
