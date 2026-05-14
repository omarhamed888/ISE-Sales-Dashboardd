import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/firebase";
import { stripUndefined } from "@/lib/utils/strip-undefined";
import type { AppConfig } from "@/lib/hooks/useAppConfig";

export type NotificationType =
  | "new_excuse"
  | "missed_report"
  | "team_milestone"
  | "excuse_approved"
  | "excuse_rejected"
  | "reminder"
  | "deadline_reminder"
  | "pre_deadline_countdown"
  | "customer_followup"
  | "anomaly_alert";

export type NotificationPayload = {
  uid: string;
  type: NotificationType;
  message: string;
  link?: string;
};

const DEBOUNCE_PREFIX = "lastNotifCheck";

function buildHourBucket(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd-HH");
}

function buildDateYmd(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

function markHourlyDebounce(uid: string, type: NotificationType, hourBucket: string) {
  try {
    localStorage.setItem(`${DEBOUNCE_PREFIX}:${uid}:${type}:${hourBucket}`, "1");
  } catch {
    // ignore localStorage failures
  }
}

function hasHourlyDebounce(uid: string, type: NotificationType, hourBucket: string): boolean {
  try {
    return localStorage.getItem(`${DEBOUNCE_PREFIX}:${uid}:${type}:${hourBucket}`) === "1";
  } catch {
    return false;
  }
}

export async function createNotification(payload: NotificationPayload): Promise<void> {
  await addDoc(
    collection(db, "notifications"),
    stripUndefined({
      uid: payload.uid,
      type: payload.type,
      message: payload.message.trim(),
      link: payload.link || "/",
      read: false,
      createdAt: serverTimestamp(),
    })
  );
}

async function hasReportForDate(uid: string, dateYmd: string): Promise<boolean> {
  const snap = await getDocs(
    query(
      collection(db, "reports"),
      where("salesRepId", "==", uid),
      where("date", "==", dateYmd),
      limit(1)
    )
  );
  return !snap.empty;
}

export async function runScheduledChecks(params: {
  user: { uid: string; role: string; name?: string };
  config: AppConfig;
}): Promise<void> {
  const { user, config } = params;
  if (!user?.uid || user.role !== "sales") return;

  const timezone = config.timezone || "Africa/Cairo";
  const now = new Date();
  const hourBucket = buildHourBucket(now, timezone);
  const nowHour = Number(formatInTimeZone(now, timezone, "H"));
  const deadlineHour = Math.min(23, Math.max(0, Number(config.reportDeadlineHour) || 16));
  const reminderHour = (deadlineHour - 1 + 24) % 24;

  if (nowHour === reminderHour && !hasHourlyDebounce(user.uid, "deadline_reminder", hourBucket)) {
    await createNotification({
      uid: user.uid,
      type: "deadline_reminder",
      message: `تبقّى ساعة على موعد التقرير اليوم (${String(deadlineHour).padStart(2, "0")}:00).`,
      link: "/submit-report",
    });
    markHourlyDebounce(user.uid, "deadline_reminder", hourBucket);
  }

  if (!hasHourlyDebounce(user.uid, "missed_report", hourBucket)) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayYmd = buildDateYmd(yesterday, timezone);
    const hasYesterdayReport = await hasReportForDate(user.uid, yesterdayYmd);
    if (!hasYesterdayReport) {
      await createNotification({
        uid: user.uid,
        type: "missed_report",
        message: `لم يتم رفع تقرير يوم ${yesterdayYmd}. فضلاً راجع تسجيل التقارير.`,
        link: "/submit-report",
      });
    }
    markHourlyDebounce(user.uid, "missed_report", hourBucket);
  }
}
