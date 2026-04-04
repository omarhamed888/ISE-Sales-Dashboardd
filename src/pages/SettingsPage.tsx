import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { collection, getDocs, updateDoc, doc, deleteDoc, setDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SettingsPage() {
    const { user } = useAuth();
    
    // System Settings
    const [savingSettings, setSavingSettings] = useState(false);
    const [settings, setSettings] = useState({
        companyName: "ISE Sales Intelligence",
        workingDays: ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"],
        reminderTime: "16:00"
    });

    // Ads Settings
    const [adNames, setAdNames] = useState([
        { id: "1", name: "عام" },
        { id: "2", name: "إعلان العقارات" },
        { id: "3", name: "باقة ريادة الأعمال" }
    ]);
    const [newAdName, setNewAdName] = useState("");

    // Users
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    // System Data
    const [systemData, setSystemData] = useState({ reportCount: 0, storageUsed: "25.4 MB" });

    useEffect(() => {
        if (user?.role !== 'superadmin') return;

        // Fetch users
        const fetchUsers = async () => {
            const snap = await getDocs(collection(db, "users"));
            const uList: any[] = [];
            snap.forEach(d => uList.push({ id: d.id, ...d.data() }));
            setUsers(uList);
            setLoadingUsers(false);
        };
        fetchUsers();

        // Fetch reports count
        const fetchReports = async () => {
             const snap = await getDocs(collection(db, "reports"));
             setSystemData(prev => ({ ...prev, reportCount: snap.size }));
        };
        fetchReports();

    }, [user]);

    const handleSaveSystemSettings = () => {
        setSavingSettings(true);
        setTimeout(() => setSavingSettings(false), 1000);
        // Will store in a settings doc in firestore later
    };

    const addAdName = () => {
        if (!newAdName.trim()) return;
        setAdNames([...adNames, { id: Date.now().toString(), name: newAdName.trim() }]);
        setNewAdName("");
    };

    const removeAdName = (id: string) => {
        setAdNames(adNames.filter(a => a.id !== id));
    };

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            await updateDoc(doc(db, "users", userId), { role: newRole });
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (e) {
            console.error(e);
        }
    };

    const toggleUserActive = async (userId: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "users", userId), { isActive: !currentStatus });
            setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
        } catch (e) {
            console.error(e);
        }
    };

    if (user?.role !== 'superadmin') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in zoom-in-95">
                <span className="material-symbols-outlined text-[64px] text-error mb-4">gpp_maybe</span>
                <h2 className="text-[24px] font-black font-headline text-[#1E293B]">صلاحيات غير كافية</h2>
                <p className="text-[#64748B] font-bold mt-2">هذه الصفحة مخصصة لمدير النظام (Super Admin) فقط.</p>
            </div>
        );
    }

    return (
        <div className="max-w-[960px] mx-auto font-body pb-32 animate-in slide-in-from-bottom-8" dir="rtl">
            <header className="mb-8 items-end gap-4">
                <div>
                    <h1 className="text-[28px] font-black text-[#1E293B] font-headline mb-2">الإعدادات المتقدمة</h1>
                    <p className="text-[13px] font-bold text-[#64748B]">إدارة النظام، الإعلانات، المستخدمين، وقواعد البيانات.</p>
                </div>
            </header>

            <div className="flex flex-col gap-6">

                {/* 1. System Settings */}
                <section className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[#E2E8F0] bg-[#F7F9FC]">
                        <h3 className="text-[15px] font-black text-[#1E293B] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#2563EB]">settings</span>
                            1. إعدادات النظام
                        </h3>
                    </div>
                    <div className="p-6 flex flex-col gap-6">
                        <div>
                            <label className="text-[12px] font-bold text-[#64748B] block mb-2">اسم الشركة المنصّة</label>
                            <input 
                               value={settings.companyName} onChange={e => setSettings({...settings, companyName: e.target.value})}
                               className="w-full md:w-1/2 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-3 font-black text-[#1E293B] focus:border-[#2563EB] outline-none" 
                            />
                        </div>
                        
                        <div>
                            <label className="text-[12px] font-bold text-[#64748B] block mb-2">أيام العمل الرسمية (المطلوب فيها تقارير)</label>
                            <div className="flex flex-wrap gap-2">
                                {["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"].map(day => (
                                    <label key={day} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-colors ${settings.workingDays.includes(day) ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]' : 'bg-[#F7F9FC] border-[#E2E8F0] text-[#64748B]'}`}>
                                        <input type="checkbox" className="hidden" checked={settings.workingDays.includes(day)} onChange={(e) => {
                                            if (e.target.checked) setSettings({...settings, workingDays: [...settings.workingDays, day]});
                                            else setSettings({...settings, workingDays: settings.workingDays.filter(d => d !== day)});
                                        }} />
                                        <span className="font-bold text-[13px]">{day}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[12px] font-bold text-[#64748B] block mb-2">وقت إرسال التنبيه اليومي (لتذكير المبيعات)</label>
                            <input type="time" value={settings.reminderTime} onChange={e => setSettings({...settings, reminderTime: e.target.value})} className="w-48 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-3 font-black text-[#1E293B] focus:border-[#2563EB] outline-none" />
                        </div>
                    </div>
                </section>

                {/* 2. Ad Names Configuration */}
                <section className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[#E2E8F0] bg-[#F7F9FC]">
                        <h3 className="text-[15px] font-black text-[#1E293B] flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500">campaign</span>
                            2. الإعلانات المعرّفة
                        </h3>
                    </div>
                    <div className="p-6">
                        <p className="text-[12px] font-bold text-[#64748B] mb-4">هذه القائمة ستظهر للذكاء الاصطناعي كمقترحات استكمال تلقائي عند تحليل التقارير.</p>
                        
                        <div className="flex flex-wrap gap-2 mb-6">
                            {adNames.map(ad => (
                                <div key={ad.id} className="bg-white border border-[#E2E8F0] shadow-sm text-[#1E293B] font-bold text-[12px] px-3 py-1.5 rounded-lg flex items-center gap-2">
                                    {ad.name}
                                    <button onClick={() => removeAdName(ad.id)} className="text-error/50 hover:text-error transition-colors flex items-center"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 max-w-sm">
                            <input 
                               value={newAdName} onChange={e => setNewAdName(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && addAdName()}
                               placeholder="اسم إعلان جديد..."
                               className="flex-1 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-2 font-bold text-[13px] text-[#1E293B] focus:border-[#2563EB] outline-none" 
                            />
                            <button onClick={addAdName} className="bg-[#1E293B] text-white px-4 py-2 rounded-xl font-bold hover:bg-black transition-colors text-[13px]">إضافة</button>
                        </div>
                    </div>
                </section>

                {/* 3. User Role & Auth */}
                <section className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[#E2E8F0] bg-[#F7F9FC] flex justify-between items-center">
                        <h3 className="text-[15px] font-black text-[#1E293B] flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-500">admin_panel_settings</span>
                            3. الصلاحيات وإدارة المستخدمين
                        </h3>
                    </div>
                    <div>
                        {loadingUsers ? <div className="p-8 text-center text-[#64748B]"><span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span></div> : (
                            <table className="w-full text-right text-[13px]">
                                <thead>
                                    <tr className="border-b border-[#E2E8F0] bg-[#F7F9FC]/50">
                                        <th className="p-4 font-bold text-[#64748B]">المستخدم</th>
                                        <th className="p-4 font-bold text-[#64748B]">تاريخ الإضافة</th>
                                        <th className="p-4 font-bold text-[#64748B] w-32">الصلاحية</th>
                                        <th className="p-4 font-bold text-[#64748B] w-32">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC]/50">
                                            <td className="p-4">
                                                <div className="font-black text-[#1E293B]">{u.name}</div>
                                                <div className="font-bold text-[#64748B] text-[11px]">{u.email}</div>
                                            </td>
                                            <td className="p-4 font-bold text-[#1E293B]">{u.createdAt?.toDate ? new Date(u.createdAt.toDate()).toLocaleDateString('ar-EG') : '-'}</td>
                                            <td className="p-4">
                                                <select 
                                                    value={u.role} 
                                                    onChange={e => updateUserRole(u.id, e.target.value)}
                                                    disabled={u.id === user?.uid} // Self protection
                                                    className="bg-[#F7F9FC] border border-[#E2E8F0] outline-none text-[12px] font-bold w-full p-2 rounded-lg"
                                                >
                                                    <option value="sales">مبيعات (Sales)</option>
                                                    <option value="admin">مدير (Admin)</option>
                                                    <option value="superadmin">مدير نظام (Super)</option>
                                                </select>
                                            </td>
                                            <td className="p-4">
                                                <button 
                                                    disabled={u.id === user?.uid}
                                                    onClick={() => toggleUserActive(u.id, u.isActive)} 
                                                    className={`w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 ${u.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-error'}`}
                                                >
                                                    {u.isActive ? "نشط" : "معطل"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

                {/* 4. System Data */}
                <section className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[#E2E8F0] bg-[#F7F9FC]">
                        <h3 className="text-[15px] font-black text-[#1E293B] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#64748B]">storage</span>
                            4. بيانات النظام
                        </h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F7F9FC] flex justify-between items-center">
                            <div>
                                <p className="text-[11px] font-bold text-[#64748B]">إجمالي التقارير المحفوظة</p>
                                <p className="text-[24px] font-black text-[#1E293B]">{systemData.reportCount}</p>
                            </div>
                            <span className="material-symbols-outlined text-[#2563EB] text-[32px] opacity-20">description</span>
                        </div>
                        <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F7F9FC] flex justify-between items-center">
                            <div>
                                <p className="text-[11px] font-bold text-[#64748B]">مساحة التخزين المستهلكة تقديرياً</p>
                                <p className="text-[24px] font-black text-[#1E293B]">{systemData.storageUsed}</p>
                            </div>
                            <span className="material-symbols-outlined text-[#2563EB] text-[32px] opacity-20">cloud_done</span>
                        </div>
                    </div>
                    <div className="p-6 border-t border-[#E2E8F0] bg-white text-left">
                        <button className="bg-[#1E293B] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] hover:bg-black transition-colors flex items-center gap-2 inline-flex mr-auto">
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            تصدير قادة البيانات كاملة بتنسيق CSV
                        </button>
                    </div>
                </section>
                
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 lg:right-64 bg-white/90 backdrop-blur-xl border-t border-[#E2E8F0] p-4 lg:p-6 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                 <div className="max-w-[720px] mx-auto flex justify-between items-center">
                     <p className="text-[12px] font-bold text-[#64748B]">الإعدادات تُحفظ وتُطبق على جميع المستخدمين مباشرة.</p>
                     <button onClick={handleSaveSystemSettings} disabled={savingSettings} className="bg-[#2563EB] text-white px-8 py-3.5 rounded-xl text-[13px] font-black transition-colors disabled:opacity-50 hover:bg-[#1D4ED8] flex items-center gap-2 shadow-lg shadow-[#2563EB]/20">
                         {savingSettings ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : <span className="material-symbols-outlined text-[20px]">save</span>}
                         تأكيد وحفظ الإعدادات
                     </button>
                 </div>
            </div>

        </div>
    );
}
