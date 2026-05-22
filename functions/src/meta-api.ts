import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";

const META_API_VERSION = "v18.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
const AD_SPEND_COLLECTION = "ad_spend";
const META_CONFIG_DOC = "app_config/meta_integration";
const META_SYSTEM_BUYER_ID = "meta-sync-system";
const META_SYSTEM_BUYER_NAME = "Meta Auto-Sync";

interface MetaConfig {
  accessToken: string;
  adAccountId: string;
  autoSyncEnabled?: boolean;
}

async function getUserRole(uid: string): Promise<string | null> {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  return (snap.data()?.role as string) ?? null;
}

function ensureAdmin(role: string | null) {
  if (role !== "admin" && role !== "superadmin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

function ensureSuperAdmin(role: string | null) {
  if (role !== "superadmin") {
    throw new HttpsError("permission-denied", "Super admin access required.");
  }
}

function normalizeAdAccountId(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("act_")) return trimmed;
  return `act_${trimmed}`;
}

function ymdString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface MetaInsightRow {
  ad_id: string;
  ad_name: string;
  campaign_name?: string;
  date_start: string;
  date_stop: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
}

interface MetaInsightsResponse {
  data: MetaInsightRow[];
  paging?: { next?: string };
}

function extractLeadCount(actions: MetaInsightRow["actions"]): number {
  if (!Array.isArray(actions)) return 0;
  let leads = 0;
  for (const a of actions) {
    const t = a.action_type;
    if (
      t === "lead" ||
      t === "leadgen.other" ||
      t === "onsite_conversion.lead_grouped" ||
      t === "offsite_conversion.fb_pixel_lead"
    ) {
      leads += Number(a.value) || 0;
    }
  }
  return leads;
}

async function fetchMetaInsights(
  accessToken: string,
  adAccountId: string,
  daysBack: number
): Promise<MetaInsightRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const until = new Date();

  const params = new URLSearchParams({
    access_token: accessToken,
    level: "ad",
    time_increment: "1",
    fields: "ad_id,ad_name,campaign_name,spend,impressions,reach,clicks,actions",
    time_range: JSON.stringify({ since: ymdString(since), until: ymdString(until) }),
    limit: "500",
  });

  const url = `${META_GRAPH_BASE}/${adAccountId}/insights?${params.toString()}`;
  const rows: MetaInsightRow[] = [];
  let nextUrl: string | undefined = url;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Meta API error (${res.status}): ${errBody}`);
    }
    const json = (await res.json()) as MetaInsightsResponse;
    rows.push(...(json.data || []));
    nextUrl = json.paging?.next;
    if (rows.length >= 5000) break;
  }

  return rows;
}

async function runMetaSync(daysBack: number) {
  const configSnap = await admin.firestore().doc(META_CONFIG_DOC).get();
  if (!configSnap.exists) {
    throw new Error("Meta integration not configured. Please connect first.");
  }
  const config = configSnap.data() as MetaConfig;
  if (!config.accessToken || !config.adAccountId) {
    throw new Error("Meta token or ad account id is missing.");
  }

  const accountId = normalizeAdAccountId(config.adAccountId);
  const rows = await fetchMetaInsights(config.accessToken, accountId, daysBack);

  const db = admin.firestore();
  let written = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const r of rows) {
    const date = r.date_start;
    const adId = r.ad_id;
    if (!date || !adId) continue;
    const docId = `${date}_${adId}_${META_SYSTEM_BUYER_ID}`;
    const ref = db.collection(AD_SPEND_COLLECTION).doc(docId);
    batch.set(
      ref,
      {
        date,
        adId,
        adName: r.ad_name || adId,
        campaignName: r.campaign_name || null,
        platform: "facebook",
        spend: Number(r.spend) || 0,
        leadsReported: extractLeadCount(r.actions),
        reach: r.reach !== undefined ? Number(r.reach) || 0 : null,
        impressions: r.impressions !== undefined ? Number(r.impressions) || 0 : null,
        clicks: r.clicks !== undefined ? Number(r.clicks) || 0 : null,
        notes: null,
        mediaBuyerId: META_SYSTEM_BUYER_ID,
        mediaBuyerName: META_SYSTEM_BUYER_NAME,
        source: "meta_api",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    written += 1;
    batchCount += 1;

    if (batchCount === 500) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  await admin.firestore().doc(META_CONFIG_DOC).set(
    {
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSyncStatus: "success",
      lastSyncError: admin.firestore.FieldValue.delete(),
      lastSyncCount: written,
    },
    { merge: true }
  );

  return { written, daysBack };
}

export const testMetaConnection = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const role = await getUserRole(req.auth.uid);
  ensureSuperAdmin(role);

  const { accessToken, adAccountId } = (req.data ?? {}) as {
    accessToken?: string;
    adAccountId?: string;
  };
  if (!accessToken || !adAccountId) {
    throw new HttpsError("invalid-argument", "accessToken and adAccountId are required.");
  }

  const accountId = normalizeAdAccountId(adAccountId);
  const url = `${META_GRAPH_BASE}/${accountId}?fields=name,currency,account_status&access_token=${encodeURIComponent(accessToken)}`;

  try {
    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok) {
      const message = body?.error?.message || `HTTP ${res.status}`;
      return { success: false, error: message };
    }
    return {
      success: true,
      accountName: body.name,
      currency: body.currency,
      accountStatus: body.account_status,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: message };
  }
});

// Minimum seconds between manual `syncMetaAds` invocations. The cron path
// (`scheduledMetaSync`) bypasses this gate. Tunable here without redeploying.
const MANUAL_SYNC_COOLDOWN_SECONDS = 60;

export const syncMetaAds = onCall({ region: "us-central1", timeoutSeconds: 540 }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const role = await getUserRole(req.auth.uid);
  ensureAdmin(role);

  const daysBackRaw = Number((req.data as { daysBack?: unknown })?.daysBack);
  const daysBack = Number.isFinite(daysBackRaw) && daysBackRaw > 0 && daysBackRaw <= 90 ? Math.floor(daysBackRaw) : 7;

  // Cooldown guard: each Meta API sync hits the Graph API and writes many
  // Firestore docs. Without this, an admin could trigger expensive runs in a
  // tight loop. We read `lastSyncAt` from config and reject if too recent.
  const configSnap = await admin.firestore().doc(META_CONFIG_DOC).get();
  const lastSyncAt = configSnap.data()?.lastSyncAt;
  if (lastSyncAt && typeof lastSyncAt.toMillis === "function") {
    const elapsedSec = (Date.now() - lastSyncAt.toMillis()) / 1000;
    if (elapsedSec < MANUAL_SYNC_COOLDOWN_SECONDS) {
      const wait = Math.ceil(MANUAL_SYNC_COOLDOWN_SECONDS - elapsedSec);
      return {
        success: false,
        rateLimited: true,
        retryAfterSeconds: wait,
        error: `يرجى الانتظار ${wait} ثانية قبل إعادة المزامنة.`,
      };
    }
  }

  try {
    const result = await runMetaSync(daysBack);
    return { success: true, ...result };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await admin.firestore().doc(META_CONFIG_DOC).set(
      {
        lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSyncStatus: "error",
        lastSyncError: message,
      },
      { merge: true }
    );
    logger.error("syncMetaAds failed:", message);
    throw new HttpsError("internal", message);
  }
});

export const scheduledMetaSync = onSchedule(
  { schedule: "0 6 * * *", timeZone: "Africa/Cairo", region: "us-central1" },
  async () => {
    try {
      const configSnap = await admin.firestore().doc(META_CONFIG_DOC).get();
      if (!configSnap.exists) {
        logger.info("scheduledMetaSync: no config — skipping.");
        return;
      }
      const config = configSnap.data() as MetaConfig;
      if (config.autoSyncEnabled === false) {
        logger.info("scheduledMetaSync: auto-sync disabled — skipping.");
        return;
      }
      const result = await runMetaSync(2);
      logger.info(`scheduledMetaSync: wrote ${result.written} rows.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      logger.error("scheduledMetaSync failed:", message);
      await admin.firestore().doc(META_CONFIG_DOC).set(
        {
          lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSyncStatus: "error",
          lastSyncError: message,
        },
        { merge: true }
      );
    }
  }
);

