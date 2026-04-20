import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFilter } from '@/lib/filter-context';
import { filterReports, filterDealsByDashboardDate } from '@/lib/utils/dashboard-filters';

import { PerformanceTab } from '@/components/team/PerformanceTab';
import { AttendanceTab } from '@/components/team/AttendanceTab';
import { AddMemberModal } from '@/components/team/AddMemberModal';
import { EditMemberModal } from '@/components/team/EditMemberModal';

export default function TeamPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { filter } = useFilter();

    const [activeTab, setActiveTab] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<any>(null);

    useEffect(() => {
        const uSub = onSnapshot(collection(db, "users"), snap => {
            setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const rSub = onSnapshot(query(collection(db, "reports"), orderBy("createdAt", "desc")), snap => {
            setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const dSub = onSnapshot(query(collection(db, "deals"), orderBy("createdAt", "desc")), snap => {
            setDeals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // timeout fallback if excuses collection doesn't exist yet
        const t = setTimeout(() => setLoading(false), 2000);

        return () => { uSub(); rSub(); dSub(); clearTimeout(t); };
    }, []);

    const activeUsersCount = users.filter(u => u.isActive !== false).length;

    // We apply global filters to reports to calculate specific performance accurately
    const filteredReports = filterReports(reports, filter);
    const filteredDeals = filterDealsByDashboardDate(deals, filter);

    if (loading && users.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#2563EB]"></div>
            </div>
        );
    }

    return (
        <div className="max-w-[1500px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 font-body" dir="rtl">
            
            {/* Global Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-[#E2E8F0]">
                <div>
                   <div className="flex items-center gap-3 md:gap-4 mb-2">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-[14px] md:rounded-[16px] bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                         <span className="material-symbols-outlined text-[20px] md:text-[24px]">groups</span>
                      </div>
                      <h1 className="text-[20px] md:text-[28px] font-black tracking-tight text-[#1E293B] font-headline">التحكم وإدارة الفريق</h1>
                   </div>
                   <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <p className="text-[13px] font-bold text-[#64748B]">
                          عدد الأعضاء النشطين: <span className="text-[#2563EB] font-black">{activeUsersCount}</span>
                      </p>
                   </div>
                </div>
                <button 
                   onClick={() => setIsAddModalOpen(true)}
                   className="w-full md:w-auto bg-[#2563EB] text-white px-5 py-3 md:px-6 md:py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1D4ED8] hover:scale-105 transition-all shadow-lg shadow-[#2563EB]/20"
                >
                   <span className="material-symbols-outlined text-[20px]">person_add</span>
                   إضافة موظف
                </button>
            </div>

            {/* Tabs System */}
            <div className="bg-[#1E293B] rounded-2xl p-2 flex gap-2 overflow-x-auto no-scrollbar">
                {(
                    [
                        { id: 0, label: "قياس الأداء", icon: "monitoring" },
                        { id: 1, label: "سجل الحضور", icon: "calendar_month" }
                    ] as { id: number; label: string; icon: string; badge?: number }[]
                ).map((tab, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold transition-all relative ${
                            activeTab === tab.id ? 'bg-white text-[#1E293B] shadow-sm' : 'text-[#94A3B8] hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                        {tab.label}
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="absolute -top-2 -left-2 min-w-6 h-6 bg-error text-white text-[11px] font-black px-2 rounded-full flex items-center justify-center shadow-lg border-[3px] border-[#1E293B]">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Body */}
            <div>
                {activeTab === 0 && (
                    <PerformanceTab 
                        users={users.filter(u => u.isActive !== false)} 
                        reports={filteredReports} 
                        deals={filteredDeals}
                        allReports={reports}
                        onEdit={setEditUser} 
                    />
                )}
                {activeTab === 1 && (
                    <AttendanceTab 
                        users={users.filter(u => u.isActive !== false)} 
                        reports={reports} 
                    />
                )}
            </div>

            {/* Modals */}
            <AddMemberModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            <EditMemberModal user={editUser} isOpen={editUser !== null} onClose={() => setEditUser(null)} />

        </div>
    );
}
