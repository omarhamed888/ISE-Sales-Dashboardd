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

  const submitted = reps.filter(rep => !!latestReportForRepOnDate(allReports, rep.uid, todayKey)).length;
  const total = reps.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 w-full" dir="rtl">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
          حالة الفريق اليوم
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#64748B]">
            {todayKey.replace(/-/g, "/")}
          </span>
          <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/10">
            {submitted}/{total} رفعوا
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {reps.map((rep) => {
          const rpt = latestReportForRepOnDate(allReports, rep.uid, todayKey);
          const pd = rpt?.parsedData;
          const msgs = pd?.totalMessages ?? 0;
          const intr = calcInteractionsFromParsedData(pd);
          const submitted = !!rpt;

          return (
            <div
              key={rep.uid}
              className={`rounded-xl border p-4 flex flex-col gap-2.5 transition-all ${submitted ? "border-[#10B981]/30 bg-[#ECFDF5]/50" : "border-[#E2E8F0] bg-[#F8FAFC]"}`}
            >
              <div className="flex items-center gap-2">
                {/* Colored status dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${submitted ? "bg-[#10B981]" : "bg-[#EF4444]"}`} />
                <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-black text-sm shrink-0">
                  {rep.name.charAt(0)}
                </div>
                <span className="text-[13px] font-black text-[#0F172A] truncate flex-1">
                  {rep.name}
                </span>
              </div>
              {rpt ? (
                <>
                  <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    رفع اليوم
                  </span>
                  <div className="flex gap-3">
                    <span className="text-[10px] font-bold text-[#64748B] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-md">{msgs} رسالة</span>
                    <span className="text-[10px] font-bold text-[#64748B] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-md">{intr} تفاعل</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10B981] rounded-full"
                      style={{ width: msgs > 0 ? `${Math.min(100, (intr / msgs) * 100)}%` : "0%" }}
                    />
                  </div>
                </>
              ) : (
                <span className="text-[11px] font-bold text-[#EF4444] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
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
