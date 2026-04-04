import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface EditMemberModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
}

export function EditMemberModal({ user, isOpen, onClose }: EditMemberModalProps) {
  const [role, setRole] = useState(user?.role || "sales");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
     if (user) {
        setRole(user.role);
        setIsActive(user.isActive !== false);
     }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await updateDoc(doc(db, "users", user.id), {
        role,
        isActive
      });
      onClose();
    } catch (err: any) {
      setError("حدث خطأ أثناء تعديل الصلاحية. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/40 backdrop-blur-sm px-4" dir="rtl">
      <div className="bg-white rounded-[24px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 font-body">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold font-headline text-[#1E293B]">تعديل بطاقة الوصف الوظيفي</h2>
          <button onClick={onClose} className="text-[#64748B] hover:bg-[#F7F9FC] p-2 rounded-full transition-colors">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-error/10 text-error rounded-xl text-sm font-bold border border-error/20 flex items-center gap-2">
             <span className="material-symbols-outlined text-[18px]">error</span>
             {error}
          </div>
        )}

        <div className="mb-6 flex items-center gap-4 bg-[#F7F9FC] p-4 rounded-xl border border-[#E2E8F0]">
           <div className="w-12 h-12 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold text-lg">
             {user.name?.charAt(0) || "U"}
           </div>
           <div>
              <p className="font-bold text-[#1E293B] text-[15px]">{user.name}</p>
              <p className="text-[12px] text-[#64748B] font-bold" dir="ltr">{user.email}</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[13px] font-bold text-[#1E293B] mb-2">الصلاحية</label>
            <div className="grid grid-cols-2 gap-3">
               <button type="button" onClick={() => setRole("sales")} className={`py-3 rounded-xl border flex justify-center text-sm font-bold transition-all ${role === "sales" ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]' : 'bg-[#F7F9FC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'}`}>مبيعات (Sales)</button>
               <button type="button" onClick={() => setRole("admin")} className={`py-3 rounded-xl border flex justify-center text-sm font-bold transition-all ${role === "admin" ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]' : 'bg-[#F7F9FC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'}`}>مشرف (Admin)</button>
            </div>
          </div>

          <div>
             <label className="block text-[13px] font-bold text-[#1E293B] mb-3">حالة الحساب</label>
             <div 
                className={`flex justify-between items-center p-4 rounded-xl border cursor-pointer transition-colors ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}
                onClick={() => setIsActive(!isActive)}
             >
                <div>
                   <p className={`font-bold text-sm ${isActive ? 'text-emerald-700' : 'text-error'}`}>{isActive ? 'نشط (Active)' : 'معطل (Disabled)'}</p>
                   <p className={`text-[11px] font-bold mt-1 ${isActive ? 'text-emerald-600/70' : 'text-error/70'}`}>{isActive ? 'الوصول للنظام متاح بشكل طبيعي' : 'لن يتمكن هذا المستخدم من الدخول لنظام المبيعات'}</p>
                </div>
                <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${isActive ? 'bg-emerald-500 justify-start' : 'bg-red-200 justify-end'}`}>
                   <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
             </div>
          </div>

          <div className="pt-4">
             <button
               type="submit"
               disabled={loading}
               className="w-full bg-[#1E293B] text-white py-3.5 rounded-xl font-bold hover:bg-[#0F172A] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
             >
               {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : "حفظ التعديلات"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
