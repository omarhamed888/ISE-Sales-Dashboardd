import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function ExcusesTab({ excuses, users }: { excuses: any[], users: any[] }) {
    const [filter, setFilter] = useState("all");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const filteredExcuses = excuses.filter(e => {
        if (filter === "all") return true;
        return e.status === filter;
    });

    const handleAction = async (id: string, newStatus: string) => {
        setActionLoading(id);
        try {
            await updateDoc(doc(db, "excuses", id), { status: newStatus });
        } catch (err) {
            console.error("Failed to update excuse", err);
            alert("حدث خطأ أثناء تعديل حالة العذر");
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusUI = (status: string) => {
        switch (status) {
            case "pending": return { label: "قيد الانتظار", bg: "bg-amber-100", text: "text-amber-700", border: 'border-amber-200' };
            case "approved": return { label: "مقبول", bg: "bg-emerald-100", text: "text-emerald-700", border: 'border-emerald-200' };
            case "rejected": return { label: "مرفوض", bg: "bg-red-100", text: "text-error", border: 'border-red-200' };
            default: return { label: "غير محدد", bg: "bg-gray-100", text: "text-gray-700", border: 'border-gray-200' };
        }
    };

    return (
        <div className="font-body animate-in fade-in slide-in-from-bottom-4" dir="rtl">
            
            {/* Context Filters */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
                {[
                    { id: "all", label: "كافة الأعذار", icon: "all_inbox" },
                    { id: "pending", label: "قيد الانتظار", icon: "pending_actions" },
                    { id: "approved", label: "الأعذار المقبولة", icon: "task_alt" },
                    { id: "rejected", label: "الأعذار المرفوضة", icon: "cancel" }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors whitespace-nowrap ${
                            filter === f.id ? 'bg-[#1E293B] text-white border-[#1E293B]' : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F7F9FC]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">{f.icon}</span>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {filteredExcuses.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 border border-[#E2E8F0] shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
                    <span className="material-symbols-outlined text-[48px] text-[#CBD5E1] mb-4">drafts</span>
                    <h3 className="text-lg font-black text-[#1E293B] mb-2">لا توجد سجلات</h3>
                    <p className="text-[#64748B] text-[13px] font-bold">لا توجد أعذار مطابقة لحالة الفلتر المحددة حالياً.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredExcuses.map(excuse => {
                        const statusUI = getStatusUI(excuse.status);
                        const user = users.find(u => u.id === excuse.userId);
                        const displayName = user?.name || excuse.userName || "غير مسجل";
                        
                        return (
                            <div key={excuse.id} className="bg-white rounded-[24px] p-6 border border-[#E2E8F0] shadow-sm flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
                                
                                {/* Status Ribbon */}
                                {excuse.status === 'pending' && <div className="absolute top-0 right-0 w-2 h-full bg-amber-400"></div>}
                                
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-black text-lg border border-[#2563EB]/10">
                                           {displayName.charAt(0)}
                                       </div>
                                       <div>
                                           <h3 className="font-bold text-[14px] text-[#1E293B]">{displayName}</h3>
                                           <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] mt-0.5">
                                               <span className="material-symbols-outlined text-[14px]">event</span>
                                               <span dir="ltr">{excuse.date}</span>
                                           </div>
                                       </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${statusUI.bg} ${statusUI.text} ${statusUI.border}`}>
                                        {statusUI.label}
                                    </span>
                                </div>

                                {/* Body */}
                                <div className="flex-1 bg-[#F7F9FC] rounded-xl p-4 mb-5 border border-[#E2E8F0]/50 relative">
                                    <span className="material-symbols-outlined absolute top-3 left-3 text-[#CBD5E1] text-[20px]">format_quote</span>
                                    <p className="text-[13px] font-bold text-[#475569] leading-relaxed relative z-10 pl-6">
                                        "{excuse.reason}"
                                    </p>
                                </div>

                                {/* Actions */}
                                {excuse.status === 'pending' ? (
                                    <div className="grid grid-cols-2 gap-3 mt-auto">
                                        <button 
                                            onClick={() => handleAction(excuse.id, "approved")}
                                            disabled={actionLoading === excuse.id}
                                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 py-2.5 rounded-xl font-bold text-[13px] hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                                        >
                                            {actionLoading === excuse.id ? <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> : <><span className="material-symbols-outlined text-[16px]">check_circle</span> قبول العذر</>}
                                        </button>
                                        <button 
                                            onClick={() => handleAction(excuse.id, "rejected")}
                                            disabled={actionLoading === excuse.id}
                                            className="bg-red-50 text-error border border-red-200 py-2.5 rounded-xl font-bold text-[13px] hover:bg-error hover:text-white hover:border-error transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">cancel</span> رفض وتسجيل غياب
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-auto">
                                        <button 
                                            onClick={() => handleAction(excuse.id, "pending")}
                                            disabled={actionLoading === excuse.id}
                                            className="w-full bg-white text-[#64748B] border border-[#E2E8F0] py-2.5 rounded-xl font-bold text-[12px] hover:bg-[#F7F9FC] transition-colors"
                                        >
                                            إعادة التقييم
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
