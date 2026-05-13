import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { getAllAdSpend } from "@/lib/services/ad-spend-service";
import { getAllDeals } from "@/lib/services/deals-service";
import { subscribeToMetaConfig, type MetaConnectionConfig } from "@/lib/services/meta-api-service";
import type { AdSpendEntry } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonChart } from "@/components/ui/Skeleton";

type SourceFilter = "all" | "meta_api" | "manual";

interface PerAdRow {
  adName: string;
  platform: string;
  spend: number;
  leadsMeta: number;
  deals: number;
  revenue: number;
  cpl: number;
  cpa: number;
  roas: number;
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "فيسبوك",
  instagram: "إنستجرام",
  tiktok: "تيك توك",
  messenger: "ماسنجر",
  whatsapp: "واتساب",
};

function ymdToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTimestamp(ts: unknown): string {
  if (!ts) return "—";
  try {
    if (typeof (ts as { toDate?: () => Date }).toDate === "function") {
      return (ts as { toDate: () => Date }).toDate().toLocaleString("ar-EG");
    }
  } catch {
    /* ignore */
  }
  return "—";
}

export default function MetaInsightsPage() {
  const [spend, setSpend] = useState<AdSpendEntry[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [config, setConfig] = useState<MetaConnectionConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState<string>(ymdDaysAgo(30));
  const [toDate, setToDate] = useState<string>(ymdToday());
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("meta_api");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getAllAdSpend(), getAllDeals()])
      .then(([s, d]) => {
        if (cancelled) return;
        setSpend(s);
        setDeals(d as any[]);
      })
      .catch(() => { if (!cancelled) { setSpend([]); setDeals([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const unsub = subscribeToMetaConfig(setConfig);
    return unsub;
  }, []);

  const filteredSpend = useMemo(() => {
    return spend.filter((s) => {
      if (s.date < fromDate || s.date > toDate) return false;
      if (sourceFilter !== "all" && s.source !== sourceFilter) return false;
      return true;
    });
  }, [spend, fromDate, toDate, sourceFilter]);

  const totals = useMemo(() => {
    let totalSpend = 0;
    let totalLeads = 0;
    let totalImpressions = 0;
    let totalReach = 0;
    filteredSpend.forEach((s) => {
      totalSpend += s.spend || 0;
      totalLeads += s.leadsReported || 0;
      totalImpressions += s.impressions || 0;
      totalReach += s.reach || 0;
    });
    return {
      totalSpend,
      totalLeads,
      totalImpressions,
      totalReach,
      cpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
    };
  }, [filteredSpend]);

  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; spend: number; leads: number }>();
    filteredSpend.forEach((s) => {
      if (!map.has(s.date)) map.set(s.date, { date: s.date, spend: 0, leads: 0 });
      const e = map.get(s.date)!;
      e.spend += s.spend || 0;
      e.leads += s.leadsReported || 0;
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSpend]);

  const perAdRows: PerAdRow[] = useMemo(() => {
    const map = new Map<string, PerAdRow>();
    filteredSpend.forEach((s) => {
      const key = s.adName?.trim() || "غير محدد";
      const existing = map.get(key) ?? {
        adName: key,
        platform: s.platform,
        spend: 0,
        leadsMeta: 0,
        deals: 0,
        revenue: 0,
        cpl: 0,
        cpa: 0,
        roas: 0,
      };
      existing.spend += s.spend || 0;
      existing.leadsMeta += s.leadsReported || 0;
      map.set(key, existing);
    });

    deals.forEach((d) => {
      const key = (d.adSource || "").trim();
      if (!key) return;
      const row = map.get(key);
      if (!row) return;
      row.deals += 1;
      row.revenue += Number(d.dealValue) || 0;
    });

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        cpl: r.leadsMeta > 0 ? r.spend / r.leadsMeta : 0,
        cpa: r.deals > 0 ? r.spend / r.deals : 0,
        roas: r.spend > 0 ? r.revenue / r.spend : 0,
      }))
      .sort((a, b) => b.spend - a.spend);
  }, [filteredSpend, deals]);

  const totalRevenue = useMemo(() => perAdRows.reduce((s, r) => s + r.revenue, 0), [perAdRows]);
  const totalROAS = totals.totalSpend > 0 ? totalRevenue / totals.totalSpend : 0;

  if (loading) {
    return (
      <div className="max-w-[1500px] w-full mx-auto pb-20" dir="rtl">
        <Skeleton className="h-[72px] w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[1, 2, 3, 4, 5].map((k) => (
            <Skeleton key={k} className="h-[100px] rounded-2xl" />
          ))}
        </div>
        <SkeletonChart />
      </div>
    );
  }

  const isConnected = !!(config?.accessToken && config?.adAccountId);
  const hasMetaData = spend.some((s) => s.source === "meta_api");

  return (
    <div className="max-w-[1500px] w-full mx-auto pb-20" dir="rtl">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[22px] md:text-[28px] font-black text-[#1E293B] mb-1">تحليلات Meta</h1>
          <p className="text-[13px] font-bold text-[#64748B]">بيانات الإعلانات من Meta Marketing API + ربطها بالصفقات المغلقة</p>
        </div>
        <Link
          to="/integrations/meta"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-black transition-colors ${isConnected ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}
        >
          <span className="material-symbols-outlined text-[16px]">{isConnected ? "check_circle" : "link_off"}</span>
          {isConnected ? `متصل: ${config?.adAccountId}` : "اربط حساب Meta أولاً"}
        </Link>
      </header>

      {/* Connection banner if not connected or no data */}
      {!hasMetaData && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-500 text-[24px] mt-0.5 shrink-0">info</span>
          <div className="flex-1">
            <h3 className="text-[14px] font-black text-amber-900 mb-1">لا توجد بيانات Meta بعد</h3>
            <p className="text-[12px] font-bold text-amber-800 leading-relaxed">
              {isConnected
                ? "الحساب متصل لكن لم تتم المزامنة بعد. اضغط \"مزامنة الآن\" في صفحة الربط."
                : "اربط حساب Meta أولاً من خلال صفحة الربط لسحب البيانات تلقائياً."}
            </p>
            {config?.lastSyncAt && (
              <p className="text-[11px] font-bold text-amber-700 mt-2">آخر محاولة مزامنة: {formatTimestamp(config.lastSyncAt)}</p>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-[#64748B]">من:</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            max={toDate}
            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[12px] font-bold text-[#1E293B]"
            dir="ltr"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-[#64748B]">إلى:</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate}
            max={ymdToday()}
            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[12px] font-bold text-[#1E293B]"
            dir="ltr"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-[#64748B]">المصدر:</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[12px] font-bold text-[#1E293B]"
          >
            <option value="meta_api">Meta API فقط</option>
            <option value="manual">يدوي فقط</option>
            <option value="all">الكل</option>
          </select>
        </div>
      </div>

      {filteredSpend.length === 0 ? (
        <EmptyState
          variant="getting-started"
          icon="bar_chart"
          title="لا توجد بيانات في هذه الفترة"
          description="غيّر التاريخ أو مصدر البيانات لعرض النتائج."
        />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 border-r-4 border-r-[#10B981]">
              <p className="text-xs font-semibold text-[#64748B] uppercase">إجمالي المصروف</p>
              <p className="text-2xl font-black text-[#0F172A] mt-1">{totals.totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
              <p className="text-[10px] text-[#94A3B8] mt-1">جنيه</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 border-r-4 border-r-[#2563EB]">
              <p className="text-xs font-semibold text-[#64748B] uppercase">إجمالي Leads</p>
              <p className="text-2xl font-black text-[#0F172A] mt-1">{totals.totalLeads.toLocaleString("en-US")}</p>
              <p className="text-[10px] text-[#94A3B8] mt-1">من المنصة</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 border-r-4 border-r-[#F59E0B]">
              <p className="text-xs font-semibold text-[#64748B] uppercase">CPL متوسط</p>
              <p className="text-2xl font-black text-[#0F172A] mt-1">{totals.cpl > 0 ? totals.cpl.toFixed(2) : "—"}</p>
              <p className="text-[10px] text-[#94A3B8] mt-1">جنيه/lead</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 border-r-4 border-r-[#8B5CF6]">
              <p className="text-xs font-semibold text-[#64748B] uppercase">Impressions</p>
              <p className="text-2xl font-black text-[#0F172A] mt-1">{totals.totalImpressions.toLocaleString("en-US")}</p>
              <p className="text-[10px] text-[#94A3B8] mt-1">Reach: {totals.totalReach.toLocaleString("en-US")}</p>
            </div>
            <div className={`bg-white border border-[#E2E8F0] rounded-2xl p-5 border-r-4 ${totalROAS >= 3 ? "border-r-emerald-500" : totalROAS >= 1 ? "border-r-amber-500" : "border-r-red-500"}`}>
              <p className="text-xs font-semibold text-[#64748B] uppercase">ROAS</p>
              <p className={`text-2xl font-black mt-1 ${totalROAS >= 3 ? "text-emerald-600" : totalROAS >= 1 ? "text-amber-600" : "text-red-600"}`}>{totalROAS > 0 ? `${totalROAS.toFixed(2)}x` : "—"}</p>
              <p className="text-[10px] text-[#94A3B8] mt-1">إيراد/مصروف</p>
            </div>
          </div>

          {/* Daily charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5">
              <h3 className="text-[14px] font-black text-[#1E293B] mb-4">المصروف اليومي</h3>
              <div className="h-[260px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12, fontWeight: 700 }} />
                    <Area type="monotone" dataKey="spend" stroke="#10B981" strokeWidth={2} fill="url(#spendFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5">
              <h3 className="text-[14px] font-black text-[#1E293B] mb-4">Leads يومياً</h3>
              <div className="h-[260px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12, fontWeight: 700 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    <Bar dataKey="leads" name="Leads" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Per-ad table */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F7F9FC]">
              <h3 className="text-[14px] font-black text-[#1E293B]">تفصيل الإعلانات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-[12px]">
                <thead className="bg-[#F7F9FC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="p-3 font-bold text-[#64748B] text-xs">الإعلان</th>
                    <th className="p-3 font-bold text-[#64748B] text-xs w-24">المنصة</th>
                    <th className="p-3 font-bold text-[#64748B] text-xs text-center w-28">المصروف</th>
                    <th className="p-3 font-bold text-[#64748B] text-xs text-center w-20">Leads</th>
                    <th className="p-3 font-bold text-[#64748B] text-xs text-center w-20">صفقات</th>
                    <th className="p-3 font-bold text-[#64748B] text-xs text-center w-28">الإيراد</th>
                    <th className="p-3 font-bold text-[#64748B] text-xs text-center w-20">CPL</th>
                    <th className="p-3 font-bold text-[#64748B] text-xs text-center w-20">CPA</th>
                    <th className="p-3 font-bold text-[#64748B] text-xs text-center w-20">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {perAdRows.map((r) => (
                    <tr key={r.adName} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC]/50">
                      <td className="p-3 font-bold text-[#1E293B]">{r.adName}</td>
                      <td className="p-3 text-[#475569] font-bold">{PLATFORM_LABELS[r.platform] || r.platform}</td>
                      <td className="p-3 text-center font-bold text-[#1E293B]">{r.spend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td className="p-3 text-center font-bold text-[#1E293B]">{r.leadsMeta.toLocaleString("en-US")}</td>
                      <td className="p-3 text-center font-bold text-emerald-600">{r.deals}</td>
                      <td className="p-3 text-center font-bold text-[#1E293B]">{r.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td className="p-3 text-center font-bold text-amber-600">{r.cpl > 0 ? r.cpl.toFixed(1) : "—"}</td>
                      <td className="p-3 text-center font-bold text-amber-700">{r.cpa > 0 ? r.cpa.toFixed(0) : "—"}</td>
                      <td className={`p-3 text-center font-bold ${r.roas >= 3 ? "text-emerald-600" : r.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>
                        {r.roas > 0 ? `${r.roas.toFixed(2)}x` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
