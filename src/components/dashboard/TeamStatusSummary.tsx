import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeReportDateKey, formatYmdLocal } from "@/lib/utils/report-dates";
import { calcInteractionsFromParsedData } from "@/lib/utils/dashboard-aggregations";

type Rep = { uid: string; name: string };

function latestReportForRepOnDate(
  reports: any[],
  repId: string,
  dateKey: string
): any | null {
  const list = reports.filter(
    (r) => r.salesRepId === repId && normalizeReportDateKey(r) === dateKey
  );
  if (list.length === 0) return null;
  return list.reduce((a, b) => {
    const ta = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
    const tb = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
    return tb >= ta ? b : a;
  });
}

export function TeamStatusSummary({ allReports }: { allReports: any[] }) {
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "users"), where("role", "==", "sales"))
        );
        if (cancelled) return;
        setReps(
          snap.docs.map((d) => ({
            uid: d.id,
            name: (d.data().name as string) || "مندوب",
          }))
        );
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayKey = formatYmdLocal(new Date());

  if (loading || reps.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 w-full" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-black font-headline text-[#1E293B] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#2563EB]">groups</span>
          حالة الفريق
        </h3>
        <span className="text-[11px] font-bold text-[#64748B]">
          {todayKey.replace(/-/g, "/")}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
        {reps.map((rep) => {
          const rpt = latestReportForRepOnDate(allReports, rep.uid, todayKey);
          const pd = rpt?.parsedData;
          const msgs = pd?.totalMessages ?? 0;
          const intr = calcInteractionsFromParsedData(pd);

          return (
            <div
              key={rep.uid}
              className="min-w-[200px] flex-shrink-0 rounded-xl border border-[#E2E8F0] bg-[#F7F9FC] p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-black text-sm">
                  {rep.name.charAt(0)}
                </div>
                <span className="text-[13px] font-black text-[#1E293B] truncate">
                  {rep.name}
                </span>
              </div>
              {rpt ? (
                <>
                  <span className="text-[12px] font-bold text-emerald-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    رفع اليوم
                  </span>
                  <span className="text-[11px] font-bold text-[#64748B]">
                    {msgs} رسالة · {intr} تفاعل
                  </span>
                </>
              ) : (
                <span className="text-[12px] font-bold text-amber-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  لم يرفع بعد
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
