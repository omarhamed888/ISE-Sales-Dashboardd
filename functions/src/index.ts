import * as admin from "firebase-admin";

admin.initializeApp();

export { testMetaConnection, syncMetaAds, scheduledMetaSync } from "./meta-api";
