import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState("الكل");
  const [filterRep, setFilterRep] = useState("الكل");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(fetchedReports);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const salesReps = useMemo(() => {
    const reps = new Set(reports.map(r => r.salesRepName).filter(Boolean));
    return ["الكل", ...Array.from(reps)];
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesPlatform = filterPlatform === "الكل" || report.platform === filterPlatform;
      const matchesRep = filterRep === "الكل" || report.salesRepName === filterRep;
      const matchesSearch = report.salesRepName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            report.rawText?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesPlatform && matchesRep && matchesSearch;
    });
  }, [reports, filterPlatform, filterRep, searchTerm]);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || "??";
  };

  return (
    <div className="max-w-7xl mx-auto font-body space-y-8 p-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface mb-2">تقارير المبيعات الشاملة</h1>
          <p className="text-on-surface-variant italic">مراجعة وتحليل كافة التقارير المقدمة عبر المنصات المختلفة</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none py-2.5" icon="file_download">تصدير CSV</Button>
          <Button variant="gradient" className="flex-1 md:flex-none py-2.5 shadow-lg shadow-primary/20" icon="add_chart" iconPosition="right">إنشاء تقرير</Button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-surface-container-low rounded-3xl p-6 shadow-sm flex flex-wrap gap-6 items-end border border-outline-variant/10">
        <div className="flex-1 min-w-[240px] space-y-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mr-1">البحث في التقارير</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="ابحث باسم الموظف أو محتوى التقرير..." 
              className="w-full bg-surface-container-lowest border-none rounded-xl py-3 px-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline/50 pointer-events-none">search</span>
          </div>
        </div>
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mr-1">المنصة</label>
          <div className="relative">
            <select 
              className="w-full bg-surface-container-lowest border-none rounded-xl py-3 px-4 pr-10 text-sm focus:ring-2 focus:ring-primary/20 appearance-none outline-none cursor-pointer"
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
            >
              <option>الكل</option>
              <option>واتساب</option>
              <option>إنستغرام</option>
              <option>ماسنجر</option>
              <option>تيك توك</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-outline pointer-events-none">apps</span>
          </div>
        </div>
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mr-1">مسؤول المبيعات</label>
          <div className="relative">
            <select 
              className="w-full bg-surface-container-lowest border-none rounded-xl py-3 px-4 pr-10 text-sm focus:ring-2 focus:ring-primary/20 appearance-none outline-none cursor-pointer"
              value={filterRep}
              onChange={(e) => setFilterRep(e.target.value)}
            >
              {salesReps.map(rep => <option key={rep} value={rep}>{rep}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-outline pointer-events-none">person</span>
          </div>
        </div>
      </div>

      {/* Reports Table Card */}
      <div className="bg-surface-container-lowest rounded-[32px] overflow-hidden shadow-sm border border-outline-variant/10 min-h-[500px] flex flex-col">
        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center p-12 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-on-surface-variant font-bold text-sm">جاري جلب التقارير...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-surface-container/30 border-b border-outline-variant/10">
                  <tr>
                    <th className="px-8 py-5 text-xs font-bold text-on-surface-variant uppercase tracking-widest">تاريخ التقديم</th>
                    <th className="px-6 py-5 text-xs font-bold text-on-surface-variant uppercase tracking-widest">مسؤول المبيعات</th>
                    <th className="px-6 py-5 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center">المنصة</th>
                    <th className="px-6 py-5 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center">التفاعل</th>
                    <th className="px-6 py-5 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center">التحويل</th>
                    <th className="px-8 py-5 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-surface-container/20 transition-all group">
                      <td className="px-8 py-6">
                        <p className="font-bold text-sm text-on-surface">{report.date}</p>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3 flex-row-reverse justify-end">
                          <div className={`w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/5`}>
                            {getInitials(report.salesRepName)}
                          </div>
                          <span className="text-sm font-bold">{report.salesRepName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className="px-3 py-1 bg-surface-container-high/40 text-[10px] font-black rounded-full text-on-surface-variant uppercase">
                          {report.platform}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-center font-bold text-sm">
                        {report.parsedData?.summary?.interactions || 0}
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                          (report.parsedData?.summary?.conversionRate || 0) > 10 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {report.parsedData?.summary?.conversionRate || 0}%
                        </span>
                      </td>
                      <td className="px-8 py-6 text-left">
                        <button className="text-primary p-2 hover:bg-primary/5 rounded-xl transition-all">
                          <span className="material-symbols-outlined text-xl">open_in_new</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-auto p-6 bg-surface-container/10 border-t border-outline-variant/10 flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-widest">
               <span>عرض {filteredReports.length} تقرير</span>
               <span>القائمة يتم تحديثها لحظياً</span>
            </div>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center p-20 space-y-6">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center text-outline/50">
              <span className="material-symbols-outlined text-4xl">inventory_2</span>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-bold text-on-surface">لا توجد نتائج مطابقة</h4>
              <p className="text-sm text-on-surface-variant mt-1">جرب تغيير الفلاتر أو البحث بكلمات مختلفة.</p>
            </div>
            <button 
              onClick={() => {setFilterPlatform("الكل"); setFilterRep("الكل"); setSearchTerm("");}}
              className="text-primary text-sm font-bold hover:underline"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
