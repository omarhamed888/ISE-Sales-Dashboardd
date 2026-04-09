import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [errorStatus, setErrorStatus] = useState<"none" | "unregistered" | "wrong-credentials" | "other">("none");
  const [isLoading, setIsLoading] = useState(false);

  // Email/password form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorStatus("none");
    try {
      await signInWithEmail(email, password);
      navigate("/");
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.message === "unregistered") {
        setErrorStatus("unregistered");
      } else if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential" ||
        err.code === "auth/invalid-email"
      ) {
        setErrorStatus("wrong-credentials");
      } else {
        setErrorStatus("other");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorStatus("none");
    try {
      await signInWithGoogle();
      navigate("/");
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.message === "unregistered") {
        setErrorStatus("unregistered");
      } else {
        setErrorStatus("other");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col bg-gradient-to-br from-[#EFF6FF] via-white to-[#F0FDF4] text-[#0F172A] relative font-body"
      dir="rtl"
    >
      <div className="flex-grow flex items-center justify-center p-6 relative overflow-hidden">
        {/* Soft decorative blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2563EB]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#10B981]/8 rounded-full blur-[120px] pointer-events-none" />

        {/* Login Card */}
        <div className="w-full max-w-[440px] z-10 transition-all duration-500 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-[32px] shadow-[0_12px_48px_-8px_rgba(37,99,235,0.10)] border border-[#E2E8F0] overflow-hidden text-center">
            <div className="p-10 flex flex-col items-center">

              {/* Unregistered Error State */}
              {errorStatus === "unregistered" ? (
                <div className="flex flex-col items-center w-full animate-in fade-in zoom-in-95 pb-4">
                  <div className="w-24 h-24 bg-[#EF4444]/10 rounded-[24px] flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[48px] text-[#EF4444]">cancel</span>
                  </div>
                  <h2 className="text-2xl font-black text-[#0F172A] mb-3 tracking-tight">
                    هذا الحساب غير مسجل في النظام
                  </h2>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    تواصل مع الإدارة لتفعيل حسابك
                  </p>
                  <button
                    onClick={() => setErrorStatus("none")}
                    className="mt-6 text-[#2563EB] text-sm font-bold underline"
                  >
                    العودة لتسجيل الدخول
                  </button>
                </div>
              ) : (
                <>
                  {/* Brand Elements */}
                  <div className="w-20 h-20 bg-[#2563EB] rounded-3xl flex items-center justify-center mb-6 text-white shadow-lg shadow-[#2563EB]/30">
                    <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>query_stats</span>
                  </div>

                  <h1 className="text-3xl font-black text-[#0F172A] mb-1 tracking-tight" dir="ltr">
                    BDI Sales Intelligence
                  </h1>
                  <p className="text-sm text-[#64748B] font-medium mb-8">
                    منصة تحليل أداء المبيعات
                  </p>

                  {/* Error States */}
                  {errorStatus === "wrong-credentials" && (
                    <div className="w-full p-4 mb-4 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm rounded-2xl font-bold animate-in fade-in flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                      البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.
                    </div>
                  )}
                  {errorStatus === "other" && (
                    <div className="w-full p-4 mb-4 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm rounded-2xl font-bold animate-in fade-in flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                      حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.
                    </div>
                  )}

                  {/* Email / Password Form */}
                  <form onSubmit={handleEmailLogin} className="w-full flex flex-col gap-3 mb-5">
                    {/* Email field with icon */}
                    <div className="relative">
                      <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[20px] pointer-events-none">
                        mail
                      </span>
                      <input
                        type="email"
                        dir="ltr"
                        placeholder="team@bdi-sales.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="w-full bg-white border border-[#E2E8F0] rounded-xl pr-11 pl-4 py-3.5 text-[14px] font-bold text-[#0F172A] focus:border-[#2563EB] focus:outline-none transition-colors placeholder:text-[#94A3B8] placeholder:font-normal"
                      />
                    </div>
                    {/* Password field with icon */}
                    <div className="relative">
                      <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[20px] pointer-events-none">
                        lock
                      </span>
                      <input
                        type="password"
                        placeholder="كلمة المرور"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="w-full bg-white border border-[#E2E8F0] rounded-xl pr-11 pl-4 py-3.5 text-[14px] font-bold text-[#0F172A] focus:border-[#2563EB] focus:outline-none transition-colors placeholder:text-[#94A3B8] placeholder:font-normal"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#2563EB] text-white font-bold py-4 px-6 rounded-xl hover:bg-[#1D4ED8] hover:shadow-lg hover:shadow-[#2563EB]/20 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0 disabled:hover:shadow-none"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="text-[16px] tracking-wide">تسجيل الدخول</span>
                          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="w-full flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-[#E2E8F0]" />
                    <span className="text-[#94A3B8] text-sm font-bold">أو</span>
                    <div className="flex-1 h-px bg-[#E2E8F0]" />
                  </div>

                  {/* Google Button */}
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full bg-white text-[#374151] font-semibold py-3 px-6 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-[14px]"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    تسجيل الدخول بـ Google
                  </button>

                  {/* Bottom Helper Text */}
                  <p className="mt-6 text-xs text-[#94A3B8] font-medium">
                    للوصول للنظام تواصل مع الإدارة
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
