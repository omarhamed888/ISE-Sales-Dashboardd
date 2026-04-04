import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFilter } from '@/lib/filter-context';
import { filterReports } from '@/lib/utils/dashboard-filters';

import { PerformanceTab } from '@/components/team/PerformanceTab';
import { AttendanceTab } from '@/components/team/AttendanceTab';
import { ExcusesTab } from '@/components/team/ExcusesTab';
import { AddMemberModal } from '@/components/team/AddMemberModal';
import { EditMemberModal } from '@/components/team/EditMemberModal';

export default function TeamPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [excuses, setExcuses] = useState<any[]>([]);
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
        });

        const eSub = onSnapshot(collection(db, "excuses"), snap => {
            setExcuses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false); // Consider loaded when all 3 return or last returns
        });

        // timeout fallback if excuses collection doesn't exist yet
        const t = setTimeout(() => setLoading(false), 2000);

        return () => { uSub(); rSub(); eSub(); clearTimeout(t); };
    }, []);

    const activeUsersCount = users.filter(u => u.isActive !== false).length;
    const pendingExcusesCount = excuses.filter(e => e.status === "pending").length;

    // We apply global filters to reports to calculate specific performance accurately
    const filteredReports = filterReports(reports, filter);

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-[32px] shadow-sm border border-[#E2E8F0]">
                <div>
                   <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 rounded-[16px] bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                         <span className="material-symbols-outlined text-[24px]">groups</span>
                      </div>
                      <h1 className="text-[28px] font-black tracking-tight text-[#1E293B] font-headline">التحكم وإدارة الفريق</h1>
                   </div>
                   <div className="flex items-center gap-3">
                      <p className="text-[14px] font-bold text-[#64748B]">
                          عدد الأعضاء النشطين: <span className="text-[#2563EB] font-black">{activeUsersCount}</span>
                      </p>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E2E8F0]"></span>
                      <p className="text-[14px] font-bold text-[#64748B]">إدارة مسؤولي المبيعات وتقييم الأداء</p>
                   </div>
                </div>
                <button 
                   onClick={() => setIsAddModalOpen(true)}
                   className="bg-[#2563EB] text-white px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1D4ED8] hover:scale-105 transition-all shadow-lg shadow-[#2563EB]/20"
                >
                   <span className="material-symbols-outlined text-[20px]">person_add</span>
                   إضافة موظف
                </button>
            </div>

            {/* Tabs System */}
            <div className="bg-[#1E293B] rounded-2xl p-2 flex gap-2 w-full md:w-max mx-auto shadow-xl">
                {[
                    { id: 0, label: "قياس الأداء", icon: "monitoring" },
                    { id: 1, label: "سجل الحضور", icon: "calendar_month" },
                    { id: 2, label: "صندوق الأعذار", icon: "inbox", badge: pendingExcusesCount }
                ].map((tab, idx) => (
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
                        allReports={reports}
                        onEdit={setEditUser} 
                    />
                )}
                {activeTab === 1 && (
                    <AttendanceTab 
                        users={users.filter(u => u.isActive !== false)} 
                        reports={reports} 
                        excuses={excuses} 
                    />
                )}
                {activeTab === 2 && (
                    <ExcusesTab 
                        excuses={excuses} 
                        users={users} 
                    />
                )}
            </div>

            {/* Modals */}
            <AddMemberModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            <EditMemberModal user={editUser} isOpen={editUser !== null} onClose={() => setEditUser(null)} />

        </div>
    );
}
