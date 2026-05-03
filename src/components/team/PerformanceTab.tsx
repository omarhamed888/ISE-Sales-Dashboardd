import { useMemo } from "react";
import { calculateAggregates } from "@/lib/utils/dashboard-aggregations";
import { Link } from "react-router-dom";

const UNASSIGNED_TEAM_LABEL = "بدون فريق";

function normalizeTeamLabel(name: unknown): string {
    const s = typeof name === "string" && name.trim() ? name.trim() : UNASSIGNED_TEAM_LABEL;
    return s;
}

interface PerformanceTabProps {
  users: any[];
  reports: any[];
  /** Deals already filtered by dashboard date range (same window as performance reports). */
  deals: any[];
  allReports: any[]; // unfiltered to find 'last report' time accurately bypassing filters
  onEdit: (user: any) => void;
}

export function PerformanceTab({ users, reports, deals, allReports, onEdit }: PerformanceTabProps) {
    const teamAgg = calculateAggregates(reports);
    const teamAverage = teamAgg.conversionRate || 0;

    const teamNames = useMemo(() => {
        const s = new Set<string>();
        users.forEach((u) => {
            if (u.teamName) s.add(normalizeTeamLabel(u.teamName));
        });
        deals.forEach((d) => {
            s.add(normalizeTeamLabel(d.teamName));
        });
        return Array.from(s)
            .filter((name) => name !== UNASSIGNED_TEAM_LABEL)
            .sort((a, b) => a.localeCompare(b, "ar"));
    }, [users, deals]);

    const teamDealStats = useMemo(() => {
        return teamNames.map((teamName) => {
            const list = deals.filter((d) => normalizeTeamLabel(d.teamName) === teamName);
            const cycles = list
                .map((d) => d.closingCycleDays)
                .filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
            const avgCycleDays =
                cycles.length > 0
                    ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
                    : null;
            return { teamName, dealCount: list.length, avgCycleDays };
        });
    }, [deals, teamNames]);
    
    // Sort users by performance natively
    const usersWithStats = users.map(u => {
        const uReports = reports.filter(r => r.salesRepId === u.id || r.salesRepName === u.name);
        const agg = calculateAggregates(uReports);
        const uDeals = deals.filter((d) => d.salesRepId === u.id || d.salesRepName === u.name);
        const dealCount = uDeals.length;
        const cycleVals = uDeals
            .map((d) => d.closingCycleDays)
            .filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
        const avgDealCycleDays =
            cycleVals.length > 0
                ? Math.round(cycleVals.reduce((a, b) => a + b, 0) / cycleVals.length)
                : null;
        const lastReport = allReports.find(r => r.salesRepId === u.id || r.salesRepName === u.name);
        
        let statusColor = "bg-[#E2E8F0]"; // Gray default
        let statusText = "لا توجد تقارير مطلوبة اليوم";
        
        const now = new Date();
        const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        const lrTime = lastReport ? (lastReport.createdAt ? new Date(lastReport.createdAt).getTime() : new Date((lastReport.date || "").split('/').reverse().join('-')).getTime()) : 0;
        
        if (lrTime >= todayStr && lrTime < todayStr + 86400000) {
            statusColor = "bg-emerald-500";
            statusText = "سلم تقرير الإنتاجية اليوم";
        } else if (now.getHours() < 16) {
            statusColor = "bg-amber-400";
            statusText = "حاضر — لم يرفع تقريره بعد";
        } else {
             statusColor = "bg-error";
             statusText = "لم يرفع تقرير اليوم";
        }

        return { ...u, agg, dealCount, avgDealCycleDays, lastReport, statusColor, statusText };
    }).sort((a, b) => b.agg.conversionRate - a.agg.conversionRate);

    if (usersWithStats.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-8 border border-[#E2E8F0] shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                <p className="text-[#64748B] font-bold">لا يوجد موظفون نشطون حالياً</p>
            </div>
        );
    }

    function performanceTier(conversionRate: number, avg: number) {
        const a = avg > 0 ? avg : 0;
        if (a <= 0) {
            if (conversionRate > 0) return { tier: "high" as const, label: "أعلى من المتوسط" };
            return { tier: "low" as const, label: "أقل من المتوسط" };
        }
        const ratio = conversionRate / a;
        if (ratio >= 1) return { tier: "high" as const, label: "أعلى من المتوسط" };
        if (ratio >= 0.7) return { tier: "medium" as const, label: "متوسط" };
        return { tier: "low" as const, label: "أقل من المتوسط" };
    }

    function performanceBarPercent(conversionRate: number, avg: number) {
        if (avg > 0) return Math.min(100, Math.max(6, (conversionRate / avg) * 50));
        if (conversionRate > 0) return Math.min(100, 55 + conversionRate * 5);
        return 8;
    }

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95" dir="rtl">
            {/* Team-level: deals + avg closing cycle (same date filter as KPI bar) */}
            {teamDealStats.length > 0 && (
                <section className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <h2 className="text-[16px] font-black text-[#1E293B] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#2563EB]">groups</span>
                            مؤشرات الفرق (الصفقات المغلقة)
                        </h2>
                        <p className="text-[11px] font-bold text-[#94A3B8]">
                            متوافق مع فترة الفلتر العلوية (اليوم / الأسبوع / الشهر…)
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {teamDealStats.map(({ teamName, dealCount, avgCycleDays }) => (
                            <div
                                key={teamName}
                                className="bg-white rounded-[20px] shadow-sm border border-[#E2E8F0] p-5 flex flex-col gap-4 min-w-0 overflow-hidden"
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-[#2563EB]/15">
                                        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            groups
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <p className="text-[14px] font-black text-[#1E293B] truncate" title={teamName}>
                                            {teamName}
                                        </p>
                                        <p className="text-[11px] font-bold text-[#475569] leading-snug">
                                            {avgCycleDays != null ? (
                                                <>
                                                    متوسط عدد أيام إغلاق الصفقة في الفترة:{" "}
                                                    <span className="tabular-nums text-[#0F172A] font-black">{avgCycleDays} يوم</span>
                                                </>
                                            ) : dealCount > 0 ? (
                                                <span className="text-[#94A3B8]">
                                                    لا تتوفر بيانات كافية لحساب متوسط الإغلاق
                                                </span>
                                            ) : (
                                                <span className="text-[#94A3B8]">لا توجد صفقات في الفترة لهذا الفريق</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
                                    <p className="text-[20px] font-black text-[#0F172A] leading-none tabular-nums">{dealCount}</p>
                                    <p className="text-[10px] font-bold text-[#64748B] mt-1.5">صفقات في الفترة</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-6 max-w-[1200px] mx-auto">
            {usersWithStats.map(user => {
                const { tier: perfTier, label: perfLabel } = performanceTier(user.agg.conversionRate, teamAverage);
                const barPct = performanceBarPercent(user.agg.conversionRate, teamAverage);
                const deptBadge =
                    typeof user.teamName === "string" && user.teamName.trim()
                        ? user.teamName.trim()
                        : user.role === "admin"
                          ? "إداري"
                          : "مبيعات";

                const statusDotClass =
                    user.statusColor.includes("emerald")
                        ? "bg-[#22c55e]"
                        : user.statusColor.includes("amber")
                          ? "bg-[#f59e0b]"
                          : "bg-[#ef4444]";

                const progressFill =
                    perfTier === "high"
                        ? "bg-gradient-to-l from-[#22c55e] to-[#16a34a]"
                        : perfTier === "medium"
                          ? "bg-gradient-to-l from-[#fbbf24] to-[#f59e0b]"
                          : "bg-gradient-to-l from-[#f87171] to-[#ef4444]";

                const perfBadge =
                    perfTier === "high"
                        ? "bg-[#dcfce7] text-[#16a34a]"
                        : perfTier === "medium"
                          ? "bg-[#fef3c7] text-[#d97706]"
                          : "bg-[#fee2e2] text-[#dc2626]";

                return (
                    <div
                        key={user.id}
                        className="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_36px_rgba(0,0,0,0.12)]"
                    >
                        <div className="relative overflow-hidden bg-gradient-to-bl from-[#1e3a5f] to-[#2d5f8a] px-6 pt-6 pb-6">
                            <div className="pointer-events-none absolute -top-8 -start-8 size-[120px] rounded-full bg-white/[0.05]" />
                            <div className="pointer-events-none absolute -bottom-10 -end-5 size-[100px] rounded-full bg-white/[0.03]" />

                            <div className="relative flex flex-wrap items-start justify-between gap-3 gap-y-2">
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                    <div className="relative shrink-0">
                                        <div className="flex size-[52px] items-center justify-center rounded-2xl bg-gradient-to-bl from-[#e8f4fd] to-[#b8dff5] text-[22px] font-extrabold text-[#1e3a5f]">
                                            {user.name?.charAt(0) || "؟"}
                                        </div>
                                        <span
                                            className={`absolute -bottom-0.5 -start-0.5 size-3 rounded-full border-2 border-[#1e3a5f] ${statusDotClass}`}
                                            title={user.statusText}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-[20px] font-bold leading-tight text-white truncate">{user.name}</h3>
                                        <p className="mt-0.5 text-[12px] font-semibold text-white/65 truncate text-end" dir="ltr">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/15 px-3.5 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm">
                                        {deptBadge}
                                    </span>
                                    {user.programTrack && (
                                        <span className="inline-flex max-w-[160px] items-center truncate rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/90">
                                            {user.programTrack}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pt-5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="rounded-[14px] border border-amber-300/90 bg-gradient-to-br from-[#fffbeb] to-[#fef3c7] px-2 py-3.5 text-center transition-colors hover:border-[#fbbf24]">
                                    <p className="text-[22px] font-extrabold leading-none tabular-nums text-[#b45309]">
                                        {user.agg.conversionRate.toFixed(1)}%
                                    </p>
                                    <p className="mt-1 text-[10px] font-semibold leading-snug text-[#64748b]">نسبة التحويل</p>
                                </div>
                                <div className="rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-2 py-3.5 text-center transition-all hover:border-[#bdd4f0] hover:bg-[#eef5ff]">
                                    <p className="text-[22px] font-extrabold leading-none tabular-nums text-[#1e3a5f]">
                                        {user.avgDealCycleDays != null ? user.avgDealCycleDays : "—"}
                                    </p>
                                    <p className="mt-1 text-[10px] font-semibold leading-snug text-[#64748b]">متوسط أيام الإغلاق</p>
                                </div>
                                <div className="rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-2 py-3.5 text-center transition-all hover:border-[#bdd4f0] hover:bg-[#eef5ff]">
                                    <p className="text-[22px] font-extrabold leading-none tabular-nums text-[#1e3a5f]">
                                        {user.dealCount.toLocaleString('en-US')}
                                    </p>
                                    <p className="mt-1 text-[10px] font-semibold leading-snug text-[#64748b]">صفقات</p>
                                </div>
                                <div className="rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-2 py-3.5 text-center transition-all hover:border-[#bdd4f0] hover:bg-[#eef5ff]">
                                    <p className="text-[22px] font-extrabold leading-none tabular-nums text-[#1e3a5f]">
                                        {user.agg.totalMessages.toLocaleString('en-US')}
                                    </p>
                                    <p className="mt-1 text-[10px] font-semibold leading-snug text-[#64748b]">الرسائل</p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pb-5 pt-2">
                            <div className="rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[13px] font-semibold text-[#64748b]">الأداء مقارنةً بالفريق</span>
                                    <span className={`rounded-full px-3 py-0.5 text-[12px] font-bold ${perfBadge}`}>{perfLabel}</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${progressFill}`}
                                        style={{ width: `${barPct}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3.5 px-6 pb-6">
                            <div className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#94a3b8]">
                                <svg className="size-3.5 shrink-0 text-[#94a3b8]" viewBox="0 0 24 24" aria-hidden>
                                    <path
                                        fill="currentColor"
                                        d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"
                                    />
                                </svg>
                                <span>
                                    آخر نشاط:{" "}
                                    {user.lastReport
                                        ? user.lastReport.date ||
                                          new Date(user.lastReport.createdAt).toLocaleDateString("ar-EG")
                                        : "لا يوجد بيانات مسجلة"}
                                </span>
                            </div>

                            <div className="flex gap-2.5">
                                <Link
                                    to={`/reports?user=${user.id}`}
                                    className="flex-1 rounded-xl bg-gradient-to-bl from-[#1e3a5f] to-[#2d5f8a] py-2.5 text-center text-[13px] font-bold text-white shadow-none transition-all hover:from-[#162d4a] hover:to-[#1e3a5f] hover:shadow-[0_4px_12px_rgba(30,58,95,0.3)]"
                                >
                                    عرض التقارير
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => onEdit(user)}
                                    className="flex-1 rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] py-2.5 text-center text-[13px] font-bold text-[#1e3a5f] transition-colors hover:bg-[#e2e8f0]"
                                >
                                    تعديل البيانات
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
            </div>
        </div>
    );
}
