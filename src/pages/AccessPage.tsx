import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { db } from "@/lib/firebase";

/* ──────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────── */
interface Employee {
  id: string;
  name: string;
  email: string;
  role: "sales" | "admin" | "superadmin";
  isActive: boolean;
  addedAt?: any;
}

type FormRole = "sales" | "admin";

const ROLE_LABELS: Record<string, string> = {
  sales: "مبيعات",
  admin: "مشرف",
  superadmin: "مدير النظام",
};

/* ────────────────────────────────────────────────────────────
   Helper: create Firebase user using a SECONDARY app instance
   so the admin stays signed in on the primary app.
────────────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

async function createAuthUser(email: string, password: string) {
  // Spin up a temporary second Firebase app so the admin keeps their session
  const secondaryAppName = `secondary-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return cred.user.uid;
  } finally {
    // Always clean up the secondary app
    await deleteApp(secondaryApp);
  }
}

/* ──────────────────────────────────────────────────────────
   Component
────────────────────────────────────────────────────────── */
export default function AccessPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<FormRole>("sales");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [listLoading, setListLoading] = useState(true);

  /* ── fetch employees ── */
  const fetchEmployees = async () => {
    setListLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), orderBy("addedAt", "desc")));
      setEmployees(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Employee, "id">) }))
      );
    } catch {
      // silent – index may still be building
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  /* ── create employee: Auth + Firestore ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    if (password.length < 6) {
      showToast("error", "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Firebase Auth user (via secondary app – admin stays signed in)
      const uid = await createAuthUser(email.trim(), password);

      // 2. Write the Firestore user document
      await setDoc(doc(db, "users", uid), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        isActive: true,
        addedAt: serverTimestamp(),
      });

      showToast("success", `✓ تم إنشاء حساب "${name.trim()}" بنجاح`);
      setName(""); setEmail(""); setPassword(""); setRole("sales");
      fetchEmployees();
    } catch (err: any) {
      const code = err?.code || "";
      const msgMap: Record<string, string> = {
        "auth/email-already-in-use": "البريد الإلكتروني مستخدم مسبقًا",
        "auth/invalid-email": "البريد الإلكتروني غير صالح",
        "auth/weak-password": "كلمة المرور ضعيفة جدًا",
      };
      showToast("error", msgMap[code] || err?.message || "حدث خطأ، يرجى المحاولة مجددًا");
    } finally {
      setLoading(false);
    }
  };

  /* ── toggle active ── */
  const toggleActive = async (emp: Employee) => {
    try {
      await updateDoc(doc(db, "users", emp.id), { isActive: !emp.isActive });
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, isActive: !e.isActive } : e))
      );
    } catch {
      showToast("error", "تعذّر تحديث الحالة");
    }
  };

  /* ── delete employee ── */
  const deleteEmployee = async (emp: Employee) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${emp.name}"؟`)) return;
    try {
      await deleteDoc(doc(db, "users", emp.id));
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      showToast("success", `تم حذف "${emp.name}"`);
    } catch {
      showToast("error", "تعذّر حذف المستخدم");
    }
  };

  /* ──────────────────────────── render ────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F7F9FC] p-4 md:p-8 lg:p-10" dir="rtl">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold ${
          toast.type === "success" ? "bg-[#16A34A] text-white" : "bg-[#DC2626] text-white"
        }`}>
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-sm shadow-[#2563EB]/30 shrink-0">
            <span className="material-symbols-outlined text-white text-[20px]">manage_accounts</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[#1E293B]">صلاحيات الوصول</h1>
            <p className="text-xs md:text-sm text-[#64748B] mt-0.5">إضافة موظفين جدد ومنحهم صلاحية الدخول إلى التطبيق</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 md:gap-8 items-start">

        {/* ════ FORM card ════ */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-gradient-to-l from-[#EFF6FF] to-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563EB]">person_add</span>
                <h2 className="text-[15px] md:text-[16px] font-bold text-[#1E293B]">إضافة موظف جديد</h2>
              </div>
              <p className="text-xs text-[#64748B] mt-1 mr-7">أدخل بيانات الموظف لمنحه حق الوصول</p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 md:p-6 flex flex-col gap-4 md:gap-5">

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-[#1E293B]">الاسم الكامل <span className="text-[#DC2626]">*</span></label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute top-1/2 -translate-y-1/2 right-3 text-[#94A3B8] text-[20px]">badge</span>
                  <input id="access-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد محمد" required
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[14px] text-[#1E293B] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all" />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-[#1E293B]">البريد الإلكتروني <span className="text-[#DC2626]">*</span></label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute top-1/2 -translate-y-1/2 right-3 text-[#94A3B8] text-[20px]">mail</span>
                  <input id="access-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@company.com" required dir="ltr"
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[14px] text-[#1E293B] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all text-right" />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-[#1E293B]">كلمة المرور <span className="text-[#DC2626]">*</span></label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute top-1/2 -translate-y-1/2 right-3 text-[#94A3B8] text-[20px]">lock</span>
                  <input id="access-password" type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" required dir="ltr"
                    className="w-full pr-10 pl-10 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[14px] text-[#1E293B] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 -translate-y-1/2 left-3 text-[#94A3B8] hover:text-[#2563EB] transition-colors">
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
                {password.length > 0 && password.length < 6 && (
                  <p className="text-xs text-[#DC2626] font-medium">كلمة المرور قصيرة جدًا</p>
                )}
              </div>

              {/* Role */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-[#1E293B]">الدور الوظيفي</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["sales", "admin"] as FormRole[]).map((r) => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className={`flex items-center gap-2 px-3 md:px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold ${
                        role === r ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]" : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:border-[#2563EB]/40"
                      }`}>
                      <span className="material-symbols-outlined text-[18px]">{r === "sales" ? "person" : "admin_panel_settings"}</span>
                      {ROLE_LABELS[r]}
                      {role === r && <span className="material-symbols-outlined text-[16px] mr-auto">check_circle</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-3">
                <span className="material-symbols-outlined text-[#F59E0B] text-[18px] mt-0.5 shrink-0">info</span>
                <p className="text-xs text-[#92400E] leading-relaxed">
                  سيتمكن الموظف من تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور. تأكد من مشاركة البيانات معه بشكل آمن.
                </p>
              </div>

              <button id="access-submit-btn" type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#2563EB] text-white text-[14px] font-bold shadow-sm shadow-[#2563EB]/30 hover:bg-[#1D4ED8] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? (
                  <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />جاري الإنشاء…</>
                ) : (
                  <><span className="material-symbols-outlined text-[18px]">person_add</span>إضافة الموظف</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ════ TABLE card ════ */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-l from-[#EFF6FF] to-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563EB]">group</span>
                <h2 className="text-[15px] md:text-[16px] font-bold text-[#1E293B]">المستخدمون الحاليون</h2>
                <span className="text-xs font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">{employees.length}</span>
              </div>
              <button onClick={fetchEmployees} className="flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                <span className="material-symbols-outlined text-[16px]">refresh</span>تحديث
              </button>
            </div>

            {listLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="animate-spin rounded-full h-8 w-8 border-2 border-[#E2E8F0] border-t-[#2563EB]" />
              </div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#94A3B8]">
                <span className="material-symbols-outlined text-[48px] mb-3">group_off</span>
                <p className="text-sm font-bold">لا يوجد مستخدمون بعد</p>
              </div>
            ) : (
              /* ── Mobile: card list | Desktop: table ── */
              <>
                {/* Mobile cards (< md) */}
                <div className="md:hidden divide-y divide-[#F1F5F9]">
                  {employees.map((emp) => (
                    <div key={emp.id} className="p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] font-bold text-sm border border-[#2563EB]/10 shrink-0">
                          {emp.name?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#1E293B] text-[13px] truncate">{emp.name}</p>
                          <p className="text-[11px] text-[#94A3B8] truncate" dir="ltr">{emp.email}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${
                          emp.role === "superadmin" ? "bg-[#FEF3C7] text-[#92400E]"
                          : emp.role === "admin" ? "bg-[#EDE9FE] text-[#6D28D9]"
                          : "bg-[#DCFCE7] text-[#166534]"
                        }`}>
                          {ROLE_LABELS[emp.role] ?? emp.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActive(emp)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold border transition-all ${
                            emp.isActive ? "bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC]" : "bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]"
                          }`}>
                          <span className="material-symbols-outlined text-[14px]">{emp.isActive ? "check_circle" : "cancel"}</span>
                          {emp.isActive ? "مفعّل" : "معطّل"}
                        </button>
                        <button onClick={() => deleteEmployee(emp)}
                          className="flex items-center justify-center w-10 h-10 rounded-xl text-[#DC2626] border border-[#FCA5A5] bg-[#FEE2E2] hover:bg-[#FECACA] transition-all">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table (≥ md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <th className="text-right px-6 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">الموظف</th>
                        <th className="text-right px-4 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">الدور</th>
                        <th className="text-center px-4 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">الحالة</th>
                        <th className="text-center px-4 py-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-[#F8FAFC] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] font-bold text-sm border border-[#2563EB]/10 shrink-0">
                                {emp.name?.charAt(0) || "?"}
                              </div>
                              <div>
                                <p className="font-bold text-[#1E293B] text-[13px]">{emp.name}</p>
                                <p className="text-[11px] text-[#94A3B8]" dir="ltr">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                              emp.role === "superadmin" ? "bg-[#FEF3C7] text-[#92400E]"
                              : emp.role === "admin" ? "bg-[#EDE9FE] text-[#6D28D9]"
                              : "bg-[#DCFCE7] text-[#166534]"
                            }`}>
                              <span className="material-symbols-outlined text-[13px]">
                                {emp.role === "superadmin" ? "shield" : emp.role === "admin" ? "admin_panel_settings" : "person"}
                              </span>
                              {ROLE_LABELS[emp.role] ?? emp.role}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button onClick={() => toggleActive(emp)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                emp.isActive ? "bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC] hover:bg-[#BBF7D0]" : "bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5] hover:bg-[#FECACA]"
                              }`}>
                              <span className="material-symbols-outlined text-[13px]">{emp.isActive ? "check_circle" : "cancel"}</span>
                              {emp.isActive ? "مفعّل" : "معطّل"}
                            </button>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button onClick={() => deleteEmployee(emp)}
                              className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#DC2626] hover:bg-[#FEE2E2] transition-all">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
