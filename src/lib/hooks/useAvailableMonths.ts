import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DASHBOARD_DATA_QUALITY_FROM_DATE } from "@/lib/config";
import {
  normalizeReportDateKey,
  formatMonthArabic,
} from "@/lib/utils/report-dates";

export interface AvailableMonth {
  /** YYYY-MM */
  value: string;
  /** Arabic label e.g. "أبريل 2026" */
  label: string;
}

/**
 * Returns the list of months (YYYY-MM, descending) that actually have data
 * — either a report or a closed deal — so the month filter only ever shows
 * options the user can drill into.
 *
 * Reads small projection lists once per mount; no realtime listener needed
 * because the option set only grows over time.
 */
export function useAvailableMonths(): {
  months: AvailableMonth[];
  loading: boolean;
} {
  const [reportMonths, setReportMonths] = useState<Set<string>>(new Set());
  const [dealMonths, setDealMonths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [reportsSnap, dealsSnap] = await Promise.allSettled([
          getDocs(query(collection(db, "reports"))),
          getDocs(query(collection(db, "deals"))),
        ]);

        if (cancelled) return;

        const rMonths = new Set<string>();
        if (reportsSnap.status === "fulfilled") {
          reportsSnap.value.docs.forEach((d) => {
            const key = normalizeReportDateKey(d.data() as any);
            if (key && key >= DASHBOARD_DATA_QUALITY_FROM_DATE) {
              rMonths.add(key.slice(0, 7));
            }
          });
        }
        const dMonths = new Set<string>();
        if (dealsSnap.status === "fulfilled") {
          dealsSnap.value.docs.forEach((d) => {
            const data = d.data() as any;
            const raw =
              typeof data?.closeDate === "string" && data.closeDate.trim()
                ? data.closeDate.trim()
                : typeof data?.date === "string"
                  ? data.date.trim()
                  : "";
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && raw >= DASHBOARD_DATA_QUALITY_FROM_DATE) {
              dMonths.add(raw.slice(0, 7));
            }
          });
        }
        setReportMonths(rMonths);
        setDealMonths(dMonths);
      } catch {
        // swallow; treat as empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const months = useMemo<AvailableMonth[]>(() => {
    const merged = new Set<string>([...reportMonths, ...dealMonths]);
    return Array.from(merged)
      .filter((m) => /^\d{4}-\d{2}$/.test(m))
      .sort((a, b) => b.localeCompare(a))
      .map((value) => ({ value, label: formatMonthArabic(value) }));
  }, [reportMonths, dealMonths]);

  return { months, loading };
}
