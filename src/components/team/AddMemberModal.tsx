import { useState } from "react";
import { collection, query, where, getDocs, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useCourses } from "@/lib/hooks/useCourses";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddMemberModal({ isOpen, onClose }: AddMemberModalProps) {
  const { user } = useAuth();
  const courses = useCourses();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("sales");
  const [teamName, setTeamName] = useState("");
  const [programTrack, setProgramTrack] = useState("");
  const [password, setPassword] = useState("");
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const createAuthUser = async (memberEmail: string, memberPassword: string) => {
    const secondaryApp = initializeApp(firebaseConfig, `secondary-add-member-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, memberEmail, memberPassword);
      return cred.user.uid;
    } finally {
      await deleteApp(secondaryApp);
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Check if email exists
      const q = query(collection(db, "users"), where("email", "==", email.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setError("هذا البريد الإلكتروني مسجل مسبقاً.");
        setLoading(false);
        return;
      }

      if (password.trim().length < 6) {
        setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
        setLoading(false);
        return;
      }

      const uid = await createAuthUser(email.toLowerCase().trim(), password.trim());
      await setDoc(doc(db, "users", uid), {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        authUid: uid,
        role,
        isActive: true,
        teamName: teamName.trim() || null,
        programTrack: programTrack.trim() || null,
        addedBy: user?.uid,
        addedAt: serverTimestamp()
      });

      onClose();
    } catch (err: any) {
      setError("حدث خطأ أثناء إضافة الموظف. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/40 backdrop-blur-sm px-4" dir="rtl">
      <div className="bg-white rounded-[24px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 font-body">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold font-headline text-[#1E293B]">إضافة موظف جديد</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-[#1E293B] mb-2">الاسم الكامل</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all placeholder:text-[#94A3B8]"
              placeholder="مثال: أحمد محمد"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[#1E293B] mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all placeholder:text-[#94A3B8]"
              placeholder="employee@gmail.com"
              disabled={loading}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[#1E293B] mb-2">كلمة المرور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all placeholder:text-[#94A3B8]"
              placeholder="6 أحرف على الأقل"
              disabled={loading}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[#1E293B] mb-2">اسم الفريق</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all placeholder:text-[#94A3B8]"
              placeholder="مثال: Team ميرنا"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[#1E293B] mb-2">المسار / الكورس (اختياري)</label>
            <select
              value={programTrack}
              onChange={e => setProgramTrack(e.target.value)}
              disabled={loading}
              className="w-full bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
            >
              <option value="">-- اختر كورساً --</option>
              {courses.map(c => (
                <option key={c.id} value={c.name}>{c.name} ({c.shortCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[#1E293B] mb-2">الصلاحية</label>
            <div className="grid grid-cols-2 gap-3">
               <button type="button" onClick={() => setRole("sales")} className={`py-3 rounded-xl border flex justify-center text-sm font-bold transition-all ${role === "sales" ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]' : 'bg-[#F7F9FC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'}`}>مبيعات</button>
               <button type="button" onClick={() => setRole("admin")} className={`py-3 rounded-xl border flex justify-center text-sm font-bold transition-all ${role === "admin" ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]' : 'bg-[#F7F9FC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'}`}>مشرف</button>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
             <button
               type="submit"
               disabled={loading}
               className="w-full bg-[#2563EB] text-white py-3 rounded-xl font-bold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
             >
               {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : "إضافة الموظف"}
             </button>
             <p className="text-center text-[11px] font-bold text-[#94A3B8]">يسجل الموظف الدخول باستخدام البريد الإلكتروني المدخل</p>
          </div>
        </form>
      </div>
    </div>
  );
}
