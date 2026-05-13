import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  collection, getDocs, getDoc, updateDoc, doc, deleteDoc, addDoc, setDoc,
  query, onSnapshot, writeBatch, serverTimestamp, where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCourses } from "@/lib/hooks/useCourses";
import type { AppConfig } from "@/lib/hooks/useAppConfig";
import { ObjectionCategoriesManager } from "@/components/settings/ObjectionCategoriesManager";
import { uploadCompanyLogo } from "@/lib/services/logo-upload";

const AR_DAY_TO_NUM: Record<string, number> = {
  السبت: 6,
  الأحد: 0,
  الإثنين: 1,
  الثلاثاء: 2,
  الأربعاء: 3,
  الخميس: 4,
  الجمعة: 5,
};

const WEEKDAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

function numToArDay(n: number): string | undefined {
  const found = Object.entries(AR_DAY_TO_NUM).find(([, v]) => v === n);
  return found?.[0];
}

function numbersToArabicDays(nums: unknown): string[] {
  if (!Array.isArray(nums) || nums.length === 0) {
    return ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  }
  if (typeof nums[0] !== "number") {
    return ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  }
  const set = new Set(nums as number[]);
  return WEEKDAY_ORDER.filter((d) => set.has(d)).map((d) => numToArDay(d)!);
}

function arabicDaysToNumbers(days: string[]): number[] {
  const nums = days.map((d) => AR_DAY_TO_NUM[d]).filter((n): n is number => n !== undefined);
  const uniq = [...new Set(nums)];
  uniq.sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
  return uniq;
}

function csvEscapeCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadUtf8Csv(filename: string, header: string[], rows: (string | number)[][]) {
  const bom = "\uFEFF";
  const lines = [
    header.map(csvEscapeCell).join(","),
    ...rows.map((row) => row.map(csvEscapeCell).join(",")),
  ];
  const blob = new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDocDate(v: unknown): string {
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    try {
      return (v as { toDate: () => Date }).toDate().toLocaleString("ar-EG");
    } catch {
      return "";
    }
  }
  return "";
}

export default function SettingsPage() {
    const { user } = useAuth();
    const canManageCourses = user?.role === "admin" || user?.role === "superadmin";
    const isSuperAdmin = user?.role === "superadmin";

    // System Settings
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);
    const [exportingCsv, setExportingCsv] = useState(false);
    const [settings, setSettings] = useState({
        companyName: "BDI Sales Intelligence",
        workingDays: ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"],
        reminderTime: "16:00"
    });

    // Logo upload
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoFeedback, setLogoFeedback] = useState<string | null>(null);

    // Users
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    // System Data
    const [systemData, setSystemData] = useState({ reportCount: 0 });
    const [aiMonthlyRequests, setAiMonthlyRequests] = useState(0);

    // Courses (show ALL including inactive in settings)
    const allCourses = useCourses(true);
    const [newCourseName, setNewCourseName] = useState("");
    const [newCourseCode, setNewCourseCode] = useState("");
    const [addingCourse, setAddingCourse] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [editingCourseName, setEditingCourseName] = useState("");
    const [savingCourseName, setSavingCourseName] = useState(false);

    // Data cleanup
    const [cleanupConfirmText, setCleanupConfirmText] = useState("");
    const [cleanupProgress, setCleanupProgress] = useState<string | null>(null);
    const [cleanupLoading, setCleanupLoading] = useState(false);

    useEffect(() => {
        if (!isSuperAdmin) return;

        // Fetch users
        const fetchUsers = async () => {
            try {
                const snap = await getDocs(collection(db, "users"));
                const uList: any[] = [];
                snap.forEach((d) => uList.push({ id: d.id, ...d.data() }));
                setUsers(uList);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();

        // Fetch reports count
        const fetchReports = async () => {
             const snap = await getDocs(collection(db, "reports"));
             setSystemData(prev => ({ ...prev, reportCount: snap.size }));
        };
        fetchReports();
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const aiQ = query(collection(db, "ai_usage"), where("timestamp", ">=", startOfMonth));
        const unsubAi = onSnapshot(
            aiQ,
            (snap) => setAiMonthlyRequests(snap.size),
            (err) => {
                console.error("ai usage listener:", err);
                setAiMonthlyRequests(0);
            }
        );

        return () => unsubAi();

    }, [user, isSuperAdmin]);

    useEffect(() => {
        if (!isSuperAdmin) return;
        (async () => {
            try {
                const settingsSnap = await getDoc(doc(db, "app_config", "settings"));
                if (settingsSnap.exists()) {
                    const d = settingsSnap.data() as Partial<AppConfig>;
                    if (typeof d.companyLogo === "string" && d.companyLogo.trim()) {
                        setLogoPreview(d.companyLogo.trim());
                    }
                    setSettings((prev) => ({
                        companyName:
                            typeof d.companyName === "string" && d.companyName.trim()
                                ? d.companyName.trim()
                                : prev.companyName,
                        workingDays: Array.isArray(d.workingDays) && d.workingDays.length
                            ? numbersToArabicDays(d.workingDays)
                            : prev.workingDays,
                        reminderTime:
                            typeof d.reportDeadlineHour === "number" && !Number.isNaN(d.reportDeadlineHour)
                                ? `${String(d.reportDeadlineHour).padStart(2, "0")}:00`
                                : prev.reminderTime,
                    }));
                }
            } catch (e) {
                console.error(e);
            }
        })();
    }, [isSuperAdmin]);

    useEffect(() => {
        if (!canManageCourses) return;
        const requiredCourses = [
            { id: "bdp_online", name: "BDP Online", shortCode: "BDP-ON", order: 0 },
            { id: "bdp_offline", name: "BDP Offline", shortCode: "BDP-OFF", order: 1 },
            { id: "bdp_recorded", name: "BDP Recorded", shortCode: "BDP-REC", order: 2 },
            { id: "negotiation", name: "Negotiation", shortCode: "NEG", order: 3 },
            { id: "ifp", name: "IFP", shortCode: "IFP", order: 4 },
            { id: "ibn_souq", name: "Ibn Souq", shortCode: "IBN", order: 5 },
            { id: "bds", name: "BDS", shortCode: "BDS", order: 6 },
            { id: "book", name: "Book", shortCode: "BOOK", order: 7 },
            { id: "subscription", name: "Subscription", shortCode: "SUB", order: 8 },
            { id: "workshop", name: "Workshop", shortCode: "WS", order: 9 }
        ];
        const existingIds = new Set(allCourses.map((c) => c.id));
        const existingLower = new Set(allCourses.map((c) => c.name.trim().toLowerCase()));
        const missing = requiredCourses.filter(
            (c) => !existingIds.has(c.id) && !existingLower.has(c.name.toLowerCase())
        );

        const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");
        const duplicatesToDelete: string[] = [];
        const keepByName = new Map<string, string>();
        for (const course of allCourses) {
            const key = normalizeName(course.name || "");
            if (!key) continue;
            const keptId = keepByName.get(key);
            if (!keptId) {
                keepByName.set(key, course.id);
            } else if (keptId !== course.id) {
                duplicatesToDelete.push(course.id);
            }
        }

        if (missing.length === 0 && duplicatesToDelete.length === 0) return;
        (async () => {
            try {
                for (const c of missing) {
                    await setDoc(doc(db, "courses", c.id), {
                        name: c.name,
                        shortCode: c.shortCode,
                        isActive: true,
                        order: c.order,
                        createdAt: serverTimestamp()
                    });
                }
                for (const duplicateId of duplicatesToDelete) {
                    await deleteDoc(doc(db, "courses", duplicateId));
                }
            } catch (e) {
                console.error(e);
            }
        })();
    }, [canManageCourses, allCourses]);

    const handleSaveSystemSettings = async () => {
        if (!isSuperAdmin) return;
        setSavingSettings(true);
        setSettingsFeedback(null);
        try {
            const [hRaw] = settings.reminderTime.split(":");
            const hour = Math.min(23, Math.max(0, parseInt(hRaw || "16", 10) || 16));
            await setDoc(
                doc(db, "app_config", "settings"),
                {
                    companyName: settings.companyName.trim() || "BDI Sales Intelligence",
                    workingDays: arabicDaysToNumbers(settings.workingDays),
                    reportDeadlineHour: hour,
                } satisfies Partial<AppConfig>,
                { merge: true }
            );
            setSettingsFeedback("تم حفظ الإعدادات.");
            window.setTimeout(() => setSettingsFeedback(null), 4000);
        } catch (e) {
            console.error(e);
            setSettingsFeedback(null);
            alert("تعذّر حفظ الإعدادات. تحقق من الاتصال أو الصلاحيات.");
        } finally {
            setSavingSettings(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        setLogoFeedback(null);
        try {
            const url = await uploadCompanyLogo(file);
            setLogoPreview(url);
            setLogoFeedback("تم رفع اللوجو بنجاح.");
            window.setTimeout(() => setLogoFeedback(null), 4000);
        } catch (err: any) {
            setLogoFeedback(err.message || "تعذّر رفع اللوجو.");
        } finally {
            setUploadingLogo(false);
            e.target.value = "";
        }
    };

    const handleExportReportsCsv = async () => {
        if (!isSuperAdmin) return;
        setExportingCsv(true);
        try {
            const snap = await getDocs(collection(db, "reports"));
            const header = [
                "معرّف التقرير",
                "التاريخ",
                "المنصة",
                "المندوب",
                "إجمالي الرسائل",
                "التفاعلات",
                "نسبة التحويل",
                "عدد الصفقات المغلقة",
                "تم التأكيد",
                "تاريخ الإنشاء",
            ];
            const rows: (string | number)[][] = [];
            snap.forEach((d) => {
                const data = d.data() as Record<string, unknown>;
                const pd = (data.parsedData || {}) as Record<string, unknown>;
                const closed = pd.closedDeals;
                rows.push([
                    d.id,
                    String(data.date ?? ""),
                    String(data.platform ?? ""),
                    String(data.salesRepName ?? ""),
                    Number(pd.totalMessages ?? 0),
                    Number(pd.interactions ?? 0),
                    Number(pd.conversionRate ?? 0),
                    Array.isArray(closed) ? closed.length : 0,
                    data.confirmed ? "نعم" : "لا",
                    formatDocDate(data.createdAt),
                ]);
            });
            const stamp = new Date().toISOString().slice(0, 10);
            downloadUtf8Csv(`reports_export_${stamp}.csv`, header, rows);
        } catch (e) {
            console.error(e);
            alert("تعذّر تصدير التقارير.");
        } finally {
            setExportingCsv(false);
        }
    };

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            await updateDoc(doc(db, "users", userId), { role: newRole });
            setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        } catch (e) {
            console.error(e);
            alert("تعذّر تحديث صلاحية المستخدم.");
        }
    };

    const toggleUserActive = async (userId: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "users", userId), { isActive: !currentStatus });
            setUsers(users.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u)));
        } catch (e) {
            console.error(e);
            alert("تعذّر تحديث حالة المستخدم.");
        }
    };

    // Courses management
    const handleAddCourse = async () => {
        if (!newCourseName.trim() || !newCourseCode.trim()) return;
        setAddingCourse(true);
        try {
            await addDoc(collection(db, "courses"), {
                name: newCourseName.trim(),
                shortCode: newCourseCode.trim(),
                isActive: true,
                order: allCourses.length,
                createdAt: serverTimestamp()
            });
            setNewCourseName("");
            setNewCourseCode("");
        } catch (e) {
            console.error(e);
            alert("تعذّر إضافة البرنامج.");
        } finally {
            setAddingCourse(false);
        }
    };

    const handleToggleCourse = async (courseId: string, currentActive: boolean) => {
        try {
            await updateDoc(doc(db, "courses", courseId), { isActive: !currentActive });
        } catch (e) {
            console.error(e);
            alert("تعذّر تحديث حالة البرنامج.");
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        try {
            await deleteDoc(doc(db, "courses", courseId));
        } catch (e) {
            console.error(e);
            alert("تعذّر حذف البرنامج. يتطلب ذلك صلاحية مدير النظام.");
        }
    };

    const startEditCourseName = (courseId: string, currentName: string) => {
        setEditingCourseId(courseId);
        setEditingCourseName(currentName);
    };

    const cancelEditCourseName = () => {
        setEditingCourseId(null);
        setEditingCourseName("");
    };

    const saveCourseName = async () => {
        if (!editingCourseId || !editingCourseName.trim()) return;
        setSavingCourseName(true);
        try {
            await updateDoc(doc(db, "courses", editingCourseId), { name: editingCourseName.trim() });
            cancelEditCourseName();
        } catch (e) {
            console.error(e);
            alert("تعذّر حفظ اسم البرنامج.");
        } finally {
            setSavingCourseName(false);
        }
    };

    // Data cleanup
    const handleCleanupAllData = async () => {
        if (cleanupConfirmText !== "حذف كل البيانات") return;
        setCleanupLoading(true);

        const COLLECTIONS = ["reports", "attendance", "excuses", "notifications", "insights", "deals"];
        const BATCH_SIZE = 400;

        try {
            for (const col of COLLECTIONS) {
                setCleanupProgress(`جاري حذف: ${col}...`);
                const snap = await getDocs(collection(db, col));
                const docs = snap.docs;
                let i = 0;
                while (i < docs.length) {
                    const batch = writeBatch(db);
                    const chunk = docs.slice(i, i + BATCH_SIZE);
                    chunk.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                    i += BATCH_SIZE;
                    setCleanupProgress(`حذف ${col}: ${Math.min(i, docs.length)} / ${docs.length}`);
                }
            }
            setCleanupProgress("تم حذف جميع البيانات بنجاح ✓");
            setCleanupConfirmText("");
        } catch (e: any) {
            setCleanupProgress("فشل الحذف: " + e.message);
        } finally {
            setCleanupLoading(false);
        }
    };

    if (!canManageCourses) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in zoom-in-95">
                <span className="material-symbols-outlined text-[64px] text-error mb-4">gpp_maybe</span>
                <h2 className="text-[24px] font-black font-headline text-[#1E293B]">صلاحيات غير كافية</h2>
                <p className="text-[#64748B] font-bold mt-2">هذه الصفحة مخصصة للمشرفين ومدير النظام فقط.</p>
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

                {isSuperAdmin && (
                <>
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
                            <label className="text-[12px] font-bold text-[#64748B] block mb-2">اسم الشركة</label>
                            <input
                               value={settings.companyName} onChange={e => setSettings({...settings, companyName: e.target.value})}
                               className="w-full md:w-1/2 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-3 font-black text-[#1E293B] focus:border-[#2563EB] outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[12px] font-bold text-[#64748B] block mb-2">لوجو الشركة</label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#E2E8F0] flex items-center justify-center overflow-hidden shrink-0">
                                    <img
                                        src={logoPreview || "/logo.png"}
                                        alt="logo"
                                        className="h-12 w-12 object-contain"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] cursor-pointer transition-colors ${uploadingLogo ? "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed" : "bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] border border-[#2563EB]/20"}`}>
                                        <span className="material-symbols-outlined text-[18px]">
                                            {uploadingLogo ? "progress_activity" : "upload"}
                                        </span>
                                        {uploadingLogo ? "جاري الرفع..." : "تغيير اللوجو"}
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                            className="hidden"
                                            onChange={handleLogoUpload}
                                            disabled={uploadingLogo}
                                        />
                                    </label>
                                    <p className="text-[11px] text-[#94A3B8]">PNG, JPG, SVG, WebP — بحد أقصى 2 ميجا</p>
                                    {logoFeedback && (
                                        <p className={`text-[12px] font-bold ${logoFeedback.includes("بنجاح") ? "text-emerald-600" : "text-red-500"}`}>
                                            {logoFeedback}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[12px] font-bold text-[#64748B] block mb-2">أيام العمل الرسمية</label>
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
                            <label className="text-[12px] font-bold text-[#64748B] block mb-2">وقت إرسال التنبيه اليومي</label>
                            <input type="time" value={settings.reminderTime} onChange={e => setSettings({...settings, reminderTime: e.target.value})} className="w-48 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-3 font-black text-[#1E293B] focus:border-[#2563EB] outline-none" />
                        </div>
                    </div>
                </section>
                </>
                )}

                {isSuperAdmin && (
                <section className="bg-gradient-to-l from-[#EFF6FF] to-white border border-[#BFDBFE] rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0">
                            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-[15px] font-black text-[#1E293B] mb-1">
                                إدارة الإعلانات
                            </h3>
                            <p className="text-[12px] font-bold text-[#64748B] mb-3 leading-relaxed">
                                إدارة الإعلانات انتقلت إلى صفحة مستقلة بإمكانيات أوسع (إضافة بالجملة، حالة، روابط الإعلان).
                            </p>
                            <a
                                href="/ads-management"
                                className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl text-[13px] font-black hover:bg-[#1D4ED8] transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                فتح إدارة الإعلانات
                            </a>
                        </div>
                    </div>
                </section>
                )}

                {isSuperAdmin && <ObjectionCategoriesManager />}

                {/* 3. Courses Management */}
                <section className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[#E2E8F0] bg-[#F7F9FC]">
                        <h3 className="text-[15px] font-black text-[#1E293B] flex items-center gap-2">
                            <span className="text-xl">📚</span>
                            3. المنتجات / الكورسات
                        </h3>
                    </div>
                    <div className="p-6">
                        <p className="text-[12px] font-bold text-[#64748B] mb-4">تُستخدم هذه المنتجات لتصنيف التقارير والصفقات.</p>

                        {/* Course List */}
                        <div className="flex flex-col gap-2 mb-6">
                            {allCourses.length === 0 && (
                                <p className="text-[12px] text-[#64748B] font-bold">لا توجد برامج مضافة بعد.</p>
                            )}
                            {allCourses.map(course => (
                                <div key={course.id} className="flex items-center justify-between bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${course.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                        {editingCourseId === course.id ? (
                                            <input
                                                value={editingCourseName}
                                                onChange={(e) => setEditingCourseName(e.target.value)}
                                                className="font-bold text-[13px] text-[#1E293B] bg-white border border-[#E2E8F0] rounded-md px-2 py-1 min-w-[150px] focus:border-[#2563EB] outline-none"
                                            />
                                        ) : (
                                            <span className="font-bold text-[13px] text-[#1E293B]">{course.name}</span>
                                        )}
                                        <span className="text-[11px] font-bold text-[#64748B] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-md" dir="ltr">{course.shortCode}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {editingCourseId === course.id ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => void saveCourseName()}
                                                    disabled={savingCourseName || !editingCourseName.trim()}
                                                    className="text-[11px] font-bold px-3 py-1 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                                                >
                                                    حفظ
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelEditCourseName}
                                                    className="text-[11px] font-bold px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                >
                                                    إلغاء
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => startEditCourseName(course.id, course.name)}
                                                className="text-[11px] font-bold px-3 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]"
                                            >
                                                تعديل الاسم
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleCourse(course.id, course.isActive)}
                                            className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-colors ${course.isActive ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            {course.isActive ? "نشط" : "معطل"}
                                        </button>
                                        {isSuperAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCourse(course.id)}
                                                title="حذف البرنامج (مدير النظام فقط)"
                                                className="text-error/50 hover:text-error transition-colors p-1"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Course Form */}
                        <div className="flex gap-2 flex-wrap">
                            <input
                               value={newCourseName} onChange={e => setNewCourseName(e.target.value)}
                               placeholder="اسم المنتج..."
                               className="flex-1 min-w-[180px] bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-2 font-bold text-[13px] text-[#1E293B] focus:border-[#2563EB] outline-none"
                            />
                            <input
                               value={newCourseCode} onChange={e => setNewCourseCode(e.target.value)}
                               placeholder="الرمز المختصر..."
                               className="w-32 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-4 py-2 font-bold text-[13px] text-[#1E293B] focus:border-[#2563EB] outline-none"
                               dir="ltr"
                            />
                            <button
                               type="button"
                               onClick={() => void handleAddCourse()}
                               disabled={addingCourse || !newCourseName.trim() || !newCourseCode.trim()}
                               className="bg-[#2563EB] text-white px-5 py-2 rounded-xl font-bold text-[13px] hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                               {addingCourse && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                               إضافة
                            </button>
                        </div>
                    </div>
                </section>

                {isSuperAdmin && (
                <>
                {/* 4. User Role & Auth */}
                <section className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[#E2E8F0] bg-[#F7F9FC] flex justify-between items-center">
                        <h3 className="text-[15px] font-black text-[#1E293B] flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-500">admin_panel_settings</span>
                            4. الصلاحيات وإدارة المستخدمين
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
                                                    disabled={u.id === user?.uid}
                                                    className="bg-[#F7F9FC] border border-[#E2E8F0] outline-none text-[12px] font-bold w-full p-2 rounded-lg"
                                                >
                                                    <option value="sales">مبيعات</option>
                                                    <option value="admin">مشرف</option>
                                                    <option value="superadmin">مدير النظام</option>
                                                </select>
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    type="button"
                                                    disabled={u.id === user?.uid}
                                                    onClick={() => void toggleUserActive(u.id, u.isActive)}
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
                </>
                )}

                {isSuperAdmin && (
                <>
                {/* 5. System Data */}
                <section className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[#E2E8F0] bg-[#F7F9FC]">
                        <h3 className="text-[15px] font-black text-[#1E293B] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#64748B]">storage</span>
                            5. بيانات النظام
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
                                <p className="text-[11px] font-bold text-[#64748B]">عدد المستخدمين</p>
                                <p className="text-[24px] font-black text-[#1E293B]">{users.length}</p>
                            </div>
                            <span className="material-symbols-outlined text-[#2563EB] text-[32px] opacity-20">group</span>
                        </div>
                        <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F7F9FC] flex justify-between items-center">
                            <div>
                                <p className="text-[11px] font-bold text-[#64748B]">عدد طلبات الذكاء الاصطناعي هذا الشهر</p>
                                <p className="text-[24px] font-black text-[#1E293B]">{aiMonthlyRequests}</p>
                            </div>
                            <span className="material-symbols-outlined text-[#2563EB] text-[32px] opacity-20">auto_awesome</span>
                        </div>
                    </div>
                    <div className="p-6 border-t border-[#E2E8F0] bg-white text-left">
                        <button
                            type="button"
                            onClick={() => void handleExportReportsCsv()}
                            disabled={exportingCsv}
                            className="bg-[#1E293B] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] hover:bg-black transition-colors flex items-center gap-2 inline-flex mr-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {exportingCsv ? (
                                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-[18px]">download</span>
                            )}
                            تصدير التقارير CSV
                        </button>
                    </div>
                </section>
                </>
                )}

                {isSuperAdmin && (
                <>
                {/* 6. Data Cleanup (superadmin only) */}
                <section className="bg-white border border-red-200 rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-red-100 bg-red-50">
                        <h3 className="text-[15px] font-black text-red-700 flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500">warning</span>
                            6. منطقة الخطر
                        </h3>
                    </div>
                    <div className="p-6">
                        <p className="text-[12px] font-bold text-[#64748B] mb-4">
                            سيُحذف كل شيء: <span className="text-error font-black">التقارير، الحضور، الأعذار، الإشعارات، الرؤى، الصفقات</span>. لا يمكن التراجع عن هذا الإجراء.
                        </p>

                        <div className="mb-4">
                            <label className="text-[12px] font-bold text-[#64748B] block mb-2">اكتب لتأكيد: <span className="text-error font-black">حذف كل البيانات</span></label>
                            <input
                               value={cleanupConfirmText}
                               onChange={e => setCleanupConfirmText(e.target.value)}
                               placeholder="حذف كل البيانات"
                               className="w-full md:w-96 bg-[#F7F9FC] border border-red-200 rounded-xl px-4 py-3 font-black text-[#1E293B] focus:border-red-400 outline-none"
                            />
                        </div>

                        {cleanupProgress && (
                            <div className={`mb-4 p-3 rounded-xl text-[12px] font-bold border ${cleanupProgress.includes('بنجاح') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {cleanupProgress}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => void handleCleanupAllData()}
                            disabled={cleanupConfirmText !== "حذف كل البيانات" || cleanupLoading}
                            className="bg-error text-white px-6 py-3 rounded-xl font-bold text-[13px] hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {cleanupLoading
                                ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> جاري الحذف...</>
                                : <><span className="material-symbols-outlined text-[18px]">delete_forever</span> حذف جميع البيانات نهائياً</>
                            }
                        </button>
                    </div>
                </section>
                </>
                )}

            </div>

            {isSuperAdmin && (
            <div className="fixed bottom-0 left-0 right-0 lg:right-64 bg-white/90 backdrop-blur-xl border-t border-[#E2E8F0] p-4 lg:p-6 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                 <div className="max-w-[720px] mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                     <div className="flex flex-col gap-1">
                         <p className="text-[12px] font-bold text-[#64748B]">يُحفظ اسم الشركة، أيام العمل، وقت التنبيه، وقائمة الإعلانات المعرّفة.</p>
                         {settingsFeedback && (
                             <p className="text-[12px] font-black text-emerald-600">{settingsFeedback}</p>
                         )}
                     </div>
                     <button
                         type="button"
                         onClick={() => void handleSaveSystemSettings()}
                         disabled={savingSettings}
                         className="bg-[#2563EB] text-white px-8 py-3.5 rounded-xl text-[13px] font-black transition-colors disabled:opacity-50 hover:bg-[#1D4ED8] flex items-center justify-center gap-2 shadow-lg shadow-[#2563EB]/20 shrink-0"
                     >
                         {savingSettings ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : <span className="material-symbols-outlined text-[20px]">save</span>}
                         تأكيد وحفظ الإعدادات
                     </button>
                 </div>
            </div>
            )}

        </div>
    );
}
