import { Button } from "@/components/ui/Button";

export default function AdvancedMetricsPage() {
  return (
    <div className="max-w-7xl mx-auto font-body">
      {/* Header Section */}
      <div className="flex flex-row-reverse justify-between items-end mb-10">
        <div className="text-right">
          <span className="text-primary font-bold text-sm tracking-wider uppercase">Strategic Oversight</span>
          <h2 className="text-4xl font-extrabold text-on-surface mt-1">المقاييس الاستراتيجية المتقدمة</h2>
          <p className="text-on-surface-variant mt-2 text-lg">تحليل معمق لعوائد الاستثمار وكفاءة الاستحواذ</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="px-6 py-3" icon="calendar_today">الربع الثالث 2024</Button>
          <Button variant="gradient" className="px-6 py-3 shadow-lg shadow-primary/20" icon="download">تصدير التحليل</Button>
        </div>
      </div>

      {/* KPI Hero Section (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] flex flex-col justify-between transition-all hover:translate-y-[-4px] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">-12.4%</span>
          </div>
          <div>
            <p className="text-on-surface-variant font-medium">تكلفة الاستحواذ (CAC)</p>
            <h3 className="text-3xl font-extrabold text-on-surface mt-1">SAR 1,240</h3>
          </div>
          <div className="mt-6 pt-4 border-t border-surface-container-low text-[11px] text-slate-400">
            انخفاض إيجابي مقارنة بالشهر الماضي
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-[2rem] flex flex-col justify-between transition-all hover:translate-y-[-4px] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-tertiary/10 rounded-2xl flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined">groups</span>
            </div>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">+8.2%</span>
          </div>
          <div>
            <p className="text-on-surface-variant font-medium">القيمة الدائمة (LTV)</p>
            <h3 className="text-3xl font-extrabold text-on-surface mt-1">SAR 8,620</h3>
          </div>
          <div className="mt-6 pt-4 border-t border-surface-container-low text-[11px] text-slate-400">
            تحسن في متوسط فترة بقاء العميل
          </div>
        </div>

        <div className="bg-primary p-8 rounded-[2rem] flex flex-col justify-between text-white transition-all hover:translate-y-[-4px] shadow-xl shadow-primary/20">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined">balance</span>
            </div>
            <span className="bg-white/20 px-2 py-1 rounded-md text-xs font-bold">صحي</span>
          </div>
          <div>
            <p className="text-white/70 font-medium">نسبة LTV:CAC</p>
            <h3 className="text-4xl font-extrabold mt-1">6.9x</h3>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-white/50">
            المعيار المرجعي للصناعة: 3.0x
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-[2rem] flex flex-col justify-between transition-all hover:translate-y-[-4px] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">+15.1%</span>
          </div>
          <div>
            <p className="text-on-surface-variant font-medium">عائد الاستثمار (ROI)</p>
            <h3 className="text-3xl font-extrabold text-on-surface mt-1">342%</h3>
          </div>
          <div className="mt-6 pt-4 border-t border-surface-container-low text-[11px] text-slate-400">
            شاملاً ميزانية الحملات التسويقية
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex flex-row-reverse justify-between items-center mb-8">
            <div className="text-right">
              <h4 className="text-xl font-bold">عائد الاستثمار مقابل الميزانية</h4>
              <p className="text-sm text-on-surface-variant">تحليل الارتباط بين الإنفاق والعوائد</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary" /> العائد</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-surface-dim" /> الميزانية</div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 px-4 overflow-hidden">
            {[
              { budget: "40%", return: "65%", label: "يناير" },
              { budget: "45%", return: "75%", label: "فبراير" },
              { budget: "50%", return: "90%", label: "مارس" },
              { budget: "55%", return: "80%", label: "أبريل" },
              { budget: "40%", return: "60%", label: "مايو" },
              { budget: "60%", return: "95%", label: "يونيو" },
            ].map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex items-end gap-1 h-48">
                  <div className="flex-1 bg-surface-dim rounded-t-lg group-hover:bg-primary/20 transition-colors" style={{ height: d.budget }}></div>
                  <div className="flex-1 bg-primary rounded-t-lg shadow-sm" style={{ height: d.return }}></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-low rounded-[2.5rem] p-8 flex flex-col shadow-sm">
          <h4 className="text-xl font-bold mb-6 text-right">السعة التشغيلية مقابل الفرص</h4>
          <div className="space-y-8 flex-grow">
            {[
              { label: "فريق المبيعات (أ)", pct: "85%", color: "bg-primary", sub: "يقترب من السعة القصوى (240 عميل/شهر)" },
              { label: "فريق المبيعات (ب)", pct: "42%", color: "bg-tertiary", sub: "سعة فائضة متاحة لحملات جديدة" },
            ].map((team, i) => (
              <div key={i} className="relative pt-1 text-right">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold inline-block py-1 px-3 uppercase rounded-full text-primary bg-white shadow-sm">{team.label}</span>
                  <span className="text-xs font-bold text-primary">{team.pct}</span>
                </div>
                <div className="h-2 w-full bg-white rounded-full overflow-hidden mb-2">
                  <div className={`h-full ${team.color}`} style={{ width: team.pct }}></div>
                </div>
                <p className="text-[11px] text-on-surface-variant italic">{team.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 p-6 bg-surface-container-lowest rounded-2xl flex flex-row-reverse items-center justify-between shadow-sm">
            <div className="text-right">
              <p className="text-xs text-on-surface-variant">Churn Rate</p>
              <p className="text-2xl font-bold text-error">2.4%</p>
            </div>
            <div className="w-[1px] h-10 bg-outline-variant/30" />
            <div className="text-right">
              <p className="text-xs text-on-surface-variant">Avg Order Value</p>
              <p className="text-xl font-bold text-on-surface">SAR 450</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Analysis Table */}
      <div className="bg-surface-container-lowest rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-surface-container-low flex flex-row-reverse justify-between items-center bg-surface-container-low/20">
          <h4 className="text-xl font-bold font-headline">تحليل هامش المساهمة بالقنوات</h4>
          <span className="material-symbols-outlined text-outline">tune</span>
        </div>
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-8 py-5 text-sm font-bold text-on-surface-variant uppercase tracking-wider">القناة التسويقية</th>
              <th className="px-8 py-5 text-sm font-bold text-on-surface-variant uppercase tracking-wider">الميزانية المستهلكة</th>
              <th className="px-8 py-5 text-sm font-bold text-on-surface-variant uppercase tracking-wider">CAC الفعلي</th>
              <th className="px-8 py-5 text-sm font-bold text-on-surface-variant uppercase tracking-wider">هامش المساهمة</th>
              <th className="px-8 py-5 text-sm font-bold text-on-surface-variant uppercase tracking-wider">الحالة الاستراتيجية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-low">
            {[
              { channel: "إعلانات سناب شات", budget: "SAR 45,000", cac: "SAR 850", margin: "42%", status: "توسع (Scale)", color: "text-emerald-600", bg: "bg-emerald-100 text-emerald-700" },
              { channel: "محركات البحث (Google)", budget: "SAR 82,000", cac: "SAR 1,120", margin: "38%", status: "توازن (Stable)", color: "text-emerald-600", bg: "bg-emerald-100 text-emerald-700" },
              { channel: "المؤثرين (Influencers)", budget: "SAR 120,000", cac: "SAR 1,950", margin: "18%", status: "تحسين (Optimize)", color: "text-amber-600", bg: "bg-amber-100 text-amber-700" },
              { channel: "البريد الإلكتروني (CRM)", budget: "SAR 8,500", cac: "SAR 120", margin: "76%", status: "كفاءة عالية", color: "text-emerald-600", bg: "bg-emerald-100 text-emerald-700" },
            ].map((row, i) => (
              <tr key={i} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-8 py-5 font-bold">{row.channel}</td>
                <td className="px-8 py-5 text-slate-600 font-medium">{row.budget}</td>
                <td className="px-8 py-5 text-slate-600 font-medium">{row.cac}</td>
                <td className={`px-8 py-5 font-bold ${row.color}`}>{row.margin}</td>
                <td className="px-8 py-5">
                  <span className={`${row.bg} px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap`}>{row.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Advisory Banner */}
      <div className="mt-10 bg-gradient-to-r from-[#00174b] to-primary p-12 rounded-[3.5rem] text-white flex flex-row-reverse items-center justify-between relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl text-right">
          <div className="flex items-center gap-2 flex-row-reverse mb-4">
            <span className="material-symbols-outlined text-amber-400">auto_awesome</span>
            <h3 className="text-3xl font-extrabold">توصية الذكاء الاصطناعي الاستراتيجية</h3>
          </div>
          <p className="text-lg opacity-80 leading-relaxed">
            بناءً على مقاييس LTV:CAC الحالية (6.9x)، يوصى بزيادة ميزانية الاستحواذ في القنوات الرقمية بنسبة 25% للربع القادم. القيمة الدائمة للعملاء في نمو مستمر مما يتيح هامشاً أكبر للمنافسة على الكلمات المفتاحية عالية التكلفة في سناب شات وجوجل.
          </p>
          <div className="mt-8 flex flex-row-reverse gap-4">
            <button className="bg-white text-primary px-10 py-4 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl">تطبيق التوصية</button>
            <button className="bg-white/10 text-white px-10 py-4 rounded-2xl font-bold border border-white/20 hover:bg-white/20 transition-all">تجاهل</button>
          </div>
        </div>
        <div className="relative z-10 hidden xl:block opacity-30">
          <span className="material-symbols-outlined text-[180px] animate-pulse">rocket_launch</span>
        </div>
        <div className="absolute left-[-5%] top-[-30%] w-[400px] h-[400px] bg-primary-container rounded-full blur-[120px] opacity-40"></div>
      </div>
    </div>
  );
}
