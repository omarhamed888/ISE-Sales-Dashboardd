import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ReportDetailModal } from "@/components/reports/ReportDetailModal";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("الكل");
  const [filterRep, setFilterRep] = useState("الكل");
  const [filterAd, setFilterAd] = useState("الكل");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal State
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Compute dynamic filter dropdown options
  const { salesReps, adNames } = useMemo(() => {
    const reps = new Set<string>();
    const ads = new Set<string>();
    
    reports.forEach(r => {
        if (r.salesRepName) reps.add(r.salesRepName);
        const f = r.parsedData?.funnel || r.parsedData?.funnels;
        if (f) {
            Object.values(f).forEach(arr => {
                if (Array.isArray(arr)) arr.forEach((item: any) => { if (item.adName) ads.add(item.adName); });
            });
        }
    });

    return {
        salesReps: ["الكل", ...Array.from(reps)],
        adNames: ["الكل", ...Array.from(ads)]
    };
  }, [reports]);

  // Apply Filters
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // 1. Search
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = !searchStr || 
             report.salesRepName?.toLowerCase().includes(searchStr) || 
             report.rawText?.toLowerCase().includes(searchStr) ||
             (report.parsedData?.funnels && JSON.stringify(report.parsedData.funnels).toLowerCase().includes(searchStr));

      // 2. Dates
      let matchesDate = true;
      const dateVal = typeof report.date === "string" ? report.date : "";
      const validDateString = dateVal.includes('/') ? dateVal.split('/').reverse().join('-') : dateVal;
      const rDate = new Date(validDateString).getTime();
      if (dateFrom) matchesDate = matchesDate && rDate >= new Date(dateFrom).getTime();
      if (dateTo) matchesDate = matchesDate && rDate <= new Date(dateTo).getTime() + 86400000;

      // 3. Platform & Rep
      const matchesPlatform = filterPlatform === "الكل" || report.platform === filterPlatform;
      const matchesRep = filterRep === "الكل" || report.salesRepName === filterRep;


      // 5. Ad Matching
      let matchesAd = filterAd === "الكل";
      if (!matchesAd && report.parsedData) {
         const f = report.parsedData.funnel || report.parsedData.funnels;
         if (f) {
            matchesAd = Object.values(f).some(arr => Array.isArray(arr) && arr.some((item: any) => item.adName === filterAd));
         }
      }

      return matchesSearch && matchesDate && matchesPlatform && matchesRep && matchesAd;
    });
  }, [reports, searchTerm, dateFrom, dateTo, filterPlatform, filterRep, filterAd]);

  // Derived Stats Ticker info
  const tickerStats = useMemo(() => {
      let tMsgs = 0; let tInts = 0; let tConvs = 0;
      filteredReports.forEach(r => {
          tMsgs += (r.parsedData?.totalMessages || 0);
          tInts += (r.parsedData?.interactions || 0);
          tConvs += (r.parsedData?.interactions || 0);
      });
      const convRate = tMsgs > 0 ? ((tConvs / tMsgs) * 100).toFixed(1) : 0;
      return { total: filteredReports.length, messages: tMsgs, integrations: tInts, convRate };
  }, [filteredReports]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
      setSearchTerm(""); setDateFrom(""); setDateTo("");
      setFilterPlatform("الكل"); setFilterRep("الكل"); setFilterAd("الكل");
      setCurrentPage(1);
  };

  const exportExcel = () => {
        // Simplified CSV Export behaving as Excel
        const headers = ["التاريخ", "الموظف", "المنصة", "إجمالي الرسائل", "التفاعل", "التحويل"];
        const rows = filteredReports.map(r => [
            r.date, 
            r.salesRepName, 
            r.platform, 
            r.parsedData?.totalMessages || 0,
            r.parsedData?.interactions || 0,
            r.parsedData?.conversionRate || 0
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `تقارير_BDI_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
  };

  const calculateDeepStatsForColumn = (parsedData: any) => {
        const pd = parsedData;
        if (!pd) return { greeting: 0, details: 0, price: 0 };
        const f = pd.funnel || pd.funnels || {};
        
        const sum = (arr: any[]) => Array.isArray(arr) ? arr.reduce((acc, val) => acc + (val.count || 0), 0) : 0;
        
        return {
            greeting: sum(f.noReplyGreeting || f.noReplyAfterGreeting),
            details: sum(f.noReplyDetails || f.noReplyAfterDetails),
            price: sum(f.noReplyPrice || f.noReplyAfterPrice)
        };
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-20 font-body" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-[#E2E8F0]">
        <div>
           <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-[16px] bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                 <span className="material-symbols-outlined text-[24px]">inventory_2</span>
              </div>
              <h1 className="text-[28px] font-black tracking-tight text-[#1E293B] font-headline">أرشيف التقارير</h1>
           </div>
           <div className="flex items-center gap-3">
              <p className="text-[14px] font-bold text-[#64748B]">
                  تم العثور على <span className="text-[#2563EB] font-black">{tickerStats.total}</span> تقرير
              </p>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E2E8F0]"></span>
              <p className="text-[14px] font-bold text-[#64748B]">إدارة ومراجعة تمامی البيانات الخام المدخلة يومياً</p>
           </div>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E2E8F0] space-y-4">
          
          {/* Row 1: Search & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-1 border border-[#E2E8F0] rounded-xl overflow-hidden focus-within:border-[#2563EB] focus-within:ring-1 focus-within:ring-[#2563EB]">
                  <span className="material-symbols-outlined absolute right-3 top-3 text-[#94A3B8]">search</span>
                  <input 
                      type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ابحث بالاسم أو الإعلان..." 
                      className="w-full bg-[#F7F9FC] border-none py-3 pr-10 pl-4 text-[13px] font-bold text-[#1E293B] outline-none"
                  />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden flex items-center bg-[#F7F9FC] px-3 focus-within:border-[#2563EB]">
                      <span className="text-[11px] font-bold text-[#64748B] w-12">من:</span>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-transparent border-none py-3 text-[13px] font-bold text-[#1E293B] outline-none rtl:mr-1" />
                  </div>
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden flex items-center bg-[#F7F9FC] px-3 focus-within:border-[#2563EB]">
                      <span className="text-[11px] font-bold text-[#64748B] w-12">إلى:</span>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-transparent border-none py-3 text-[13px] font-bold text-[#1E293B] outline-none rtl:mr-1" />
                  </div>
              </div>
          </div>

          {/* Row 2: Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                  { label: "المنصة", state: filterPlatform, set: setFilterPlatform, opts: ["الكل", "واتساب", "ماسنجر", "تيك توك"] },
                  { label: "الموظف", state: filterRep, set: setFilterRep, opts: salesReps },
                  { label: "الإعلان", state: filterAd, set: setFilterAd, opts: adNames }
              ].map((f, i) => (
                  <div key={i} className="border border-[#E2E8F0] rounded-xl bg-[#F7F9FC] relative flex items-center px-3 focus-within:border-[#2563EB]">
                      <span className="text-[11px] font-bold text-[#64748B] whitespace-nowrap pl-2">{f.label}:</span>
                      <select value={f.state} onChange={e => f.set(e.target.value)} className="w-full bg-transparent border-none py-3 text-[13px] font-black text-[#1E293B] outline-none appearance-none cursor-pointer pr-1">
                          {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <span className="material-symbols-outlined text-[16px] text-[#94A3B8] pointer-events-none absolute left-3">arrow_drop_down</span>
                  </div>
              ))}
          </div>

          {/* Row 3: Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
              <div className="flex gap-2">
                 <button onClick={() => setCurrentPage(1)} className="bg-[#1E293B] text-white px-6 py-2.5 rounded-xl text-[12px] font-black hover:bg-black transition-colors flex items-center gap-2">
                     <span className="material-symbols-outlined text-[16px]">filter_list</span> تصفية
                 </button>
                 <button onClick={resetFilters} className="bg-[#F7F9FC] text-[#64748B] border border-[#E2E8F0] px-6 py-2.5 rounded-xl text-[12px] font-black hover:bg-[#E2E8F0] transition-colors flex items-center gap-2">
                     إعادة ضبط
                 </button>
              </div>
              <button onClick={exportExcel} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-6 py-2.5 rounded-xl text-[12px] font-black hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">download</span> تصدير Excel
              </button>
          </div>
      </div>

      {/* STATS TICKER */}
      <div className="bg-[#1E293B] rounded-xl p-4 flex items-center overflow-x-auto hide-scrollbar whitespace-nowrap text-white gap-6 shadow-xl w-full mx-auto justify-center select-none">
          <span className="text-[12px] font-black text-amber-400 bg-amber-400/10 px-3 py-1 rounded-lg">عرض {tickerStats.total} تقرير</span>
          <span className="w-1 h-1 bg-[#475569] rounded-full"></span>
          <span className="text-[13px] font-bold"><span className="text-[#94A3B8] font-medium ml-1">إجمالي الرسائل:</span> {tickerStats.messages.toLocaleString()}</span>
          <span className="w-1 h-1 bg-[#475569] rounded-full"></span>
          <span className="text-[13px] font-bold"><span className="text-[#94A3B8] font-medium ml-1">التفاعل:</span> {tickerStats.integrations.toLocaleString()}</span>
          <span className="w-1 h-1 bg-[#475569] rounded-full"></span>
          <span className="text-[13px] font-bold"><span className="text-[#94A3B8] font-medium ml-1">معدل التحويل:</span> <span className="text-emerald-400">{tickerStats.convRate}%</span></span>
      </div>

      {/* REPORTS TABLE */}
      <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {loading ? (
             <div className="flex-1 flex flex-col items-center justify-center p-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]"></div>
             </div>
          ) : paginatedReports.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center p-12 text-[#64748B]">
                <span className="material-symbols-outlined text-5xl mb-4 text-[#CBD5E1]">search_off</span>
                <p className="font-bold text-[14px]">لا توجد تقارير مطابقة لخيارات الفلترة.</p>
             </div>
          ) : (
             <div className="overflow-x-auto flex-1">

               {/* Mobile: Card list (< md) */}
               <div className="md:hidden divide-y divide-[#F1F5F9]">
                 {paginatedReports.map(report => {
                   const drops = calculateDeepStatsForColumn(report.parsedData);
                   const cRate = report.parsedData?.conversionRate || 0;
                   const cClass = cRate > 10 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200';
                   return (
                     <div key={report.id} onClick={() => setSelectedReport(report)}
                       className="p-4 hover:bg-[#F7F9FC] cursor-pointer transition-colors">
                       <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-2">
                           <div className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-black text-[10px] border border-[#2563EB]/10">
                             {report.salesRepName?.charAt(0) || "U"}
                           </div>
                           <span className="font-bold text-[13px] text-[#1E293B]">{report.salesRepName}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${report.platform === 'واتساب' ? 'bg-[#25D366]/10 text-[#25D366]' : report.platform === 'تيك توك' ? 'bg-black/10 text-black' : 'bg-[#0084FF]/10 text-[#0084FF]'}`}>{report.platform}</span>
                           <span className="text-[11px] font-bold text-[#64748B]" dir="ltr">{report.date}</span>
                         </div>
                       </div>
                       <div className="grid grid-cols-4 gap-2 text-center">
                         <div className="bg-[#F8FAFC] rounded-lg p-2">
                           <p className="text-[9px] font-bold text-[#64748B] mb-0.5">الرسائل</p>
                           <p className="text-[13px] font-black text-[#1E293B]">{report.parsedData?.totalMessages || 0}</p>
                         </div>
                         <div className="bg-rose-50 rounded-lg p-2">
                           <p className="text-[9px] font-bold text-rose-500 mb-0.5">تسرب</p>
                           <p className="text-[13px] font-black text-rose-600">{drops.greeting + drops.details + drops.price}</p>
                         </div>
                         <div className="bg-[#F8FAFC] rounded-lg p-2">
                           <p className="text-[9px] font-bold text-[#64748B] mb-0.5">التفاعل</p>
                           <p className="text-[13px] font-black text-[#1E293B]">{report.parsedData?.interactions || 0}</p>
                         </div>
                         <div className={`rounded-lg p-2 border ${cClass}`}>
                           <p className="text-[9px] font-bold mb-0.5">التحويل</p>
                           <p className="text-[13px] font-black">{cRate}%</p>
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>

               {/* Desktop: Table (>= md) */}
               <div className="hidden md:block">
                 <table className="w-full text-right text-[12px]">
                     <thead>
                         <tr className="bg-[#F7F9FC] border-b border-[#E2E8F0]">
                             <th className="px-6 py-4 font-black text-[#64748B] whitespace-nowrap">التاريخ</th>
                             <th className="px-6 py-4 font-black text-[#64748B] whitespace-nowrap">الموظف</th>
                             <th className="px-5 py-4 font-black text-[#64748B] text-center whitespace-nowrap">المنصة</th>
                             <th className="px-5 py-4 font-black text-[#64748B] text-center whitespace-nowrap">الرسائل</th>
                             <th className="px-5 py-4 font-black text-rose-500/70 text-center whitespace-nowrap">مردش أهلاً</th>
                             <th className="px-5 py-4 font-black text-rose-500/70 text-center whitespace-nowrap">مردش تفاصيل</th>
                             <th className="px-5 py-4 font-black text-rose-500/70 text-center whitespace-nowrap">مردش سعر</th>
                             <th className="px-5 py-4 font-black text-[#64748B] text-center whitespace-nowrap">التفاعل</th>
                             <th className="px-5 py-4 font-black text-[#2563EB]/70 text-center whitespace-nowrap">التحويل</th>
                             <th className="px-5 py-4 font-black text-[#64748B] text-center whitespace-nowrap">إجراءات</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-[#E2E8F0]">
                         {paginatedReports.map(report => {
                             const drops = calculateDeepStatsForColumn(report.parsedData);
                             const cRate = report.parsedData?.conversionRate || 0;
                             const cClass = cRate > 10 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200';

                             return (
                                 <tr key={report.id} onClick={() => setSelectedReport(report)} className="hover:bg-[#F7F9FC]/80 transition-colors cursor-pointer group">
                                     <td className="px-6 py-4 font-bold text-[#1E293B] whitespace-nowrap" dir="ltr">{report.date}</td>
                                     <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                           <div className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-black text-[10px] border border-[#2563EB]/10">
                                              {report.salesRepName?.charAt(0) || "U"}
                                           </div>
                                           <span className="font-bold text-[#1E293B]">{report.salesRepName}</span>
                                        </div>
                                     </td>
                                     <td className="px-5 py-4 text-center whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${report.platform === 'واتساب' ? 'bg-[#25D366]/10 text-[#25D366]' : report.platform === 'تيك توك' ? 'bg-black/10 text-black' : 'bg-[#0084FF]/10 text-[#0084FF]'}`}>
                                            {report.platform}
                                        </span>
                                     </td>
                                     <td className="px-5 py-4 font-black text-[#1E293B] text-center">{report.parsedData?.totalMessages || 0}</td>
                                     <td className="px-5 py-4 font-bold text-rose-600 text-center">{drops.greeting}</td>
                                     <td className="px-5 py-4 font-bold text-rose-600 text-center">{drops.details}</td>
                                     <td className="px-5 py-4 font-bold text-rose-600 text-center">{drops.price}</td>
                                     <td className="px-5 py-4 font-black text-[#1E293B] text-center">{report.parsedData?.interactions || 0}</td>
                                     <td className="px-5 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${cClass}`}>
                                            {cRate}%
                                        </span>
                                     </td>
                                     <td className="px-5 py-4 text-center">
                                        <button className="text-[#64748B] group-hover:text-[#2563EB] group-hover:bg-[#EFF6FF] p-1.5 rounded-lg transition-all">
                                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                        </button>
                                     </td>
                                 </tr>
                             );
                         })}
                     </tbody>
                 </table>
               </div>{/* end desktop table */}
             </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
             <div className="border-t border-[#E2E8F0] p-4 bg-[#F7F9FC] flex justify-between items-center text-[12px]">
                 <span className="font-bold text-[#64748B]">عرض {Math.min(filteredReports.length, currentPage * itemsPerPage)} من أصل {filteredReports.length} تقرير</span>
                 <div className="flex gap-2">
                     <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="bg-white border border-[#E2E8F0] px-4 py-2 rounded-lg font-bold text-[#1E293B] disabled:opacity-50 hover:bg-[#F7F9FC] transition-colors"
                     >
                         السابق
                     </button>
                     <div className="flex gap-1 items-center px-2">
                        {Array.from({ length: totalPages }).map((_, i) => (
                           <button 
                              key={i}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`w-8 h-8 rounded-lg font-black transition-colors ${currentPage === i + 1 ? 'bg-[#1E293B] text-white' : 'text-[#64748B] hover:bg-[#E2E8F0]'}`}
                           >
                              {i + 1}
                           </button>
                        ))}
                     </div>
                     <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-white border border-[#E2E8F0] px-4 py-2 rounded-lg font-bold text-[#1E293B] disabled:opacity-50 hover:bg-[#F7F9FC] transition-colors"
                     >
                         التالي
                     </button>
                 </div>
             </div>
          )}
      </div>

      <ReportDetailModal report={selectedReport} isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} />

    </div>
  );
}
