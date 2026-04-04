import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const [errorStatus, setErrorStatus] = useState<"none" | "unregistered" | "other">("none");
  const [isLoading, setIsLoading] = useState(false);

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
    <main className="min-h-screen flex flex-col bg-background text-on-surface relative font-body" dir="rtl">
      <div className="flex-grow flex items-center justify-center p-6 relative overflow-hidden">
        {/* Abstract Background Effect */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        {/* Login Card */}
        <div className="w-full max-w-[420px] z-10 transition-all duration-500 animate-in fade-in zoom-in-95">
          <div className="bg-surface-container-lowest rounded-[32px] shadow-[0_12px_48px_-8px_rgba(37,99,235,0.08)] border border-outline-variant/10 overflow-hidden text-center">
            <div className="p-10 flex flex-col items-center">
              
              {/* Unregistered Error State */}
              {errorStatus === "unregistered" ? (
                <div className="flex flex-col items-center w-full animate-in fade-in zoom-in-95 pb-4">
                  <div className="w-24 h-24 bg-error/10 rounded-[24px] flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[48px] text-error font-extralight">cancel</span>
                  </div>
                  <h2 className="font-headline text-2xl font-bold text-on-surface mb-3 tracking-tight">
                    هذا الحساب غير مسجل في النظام
                  </h2>
                  <p className="font-body text-on-surface-variant text-[15px] leading-relaxed">
                    تواصل مع الإدارة لتفعيل حسابك
                  </p>
                </div>
              ) : (
                <>
                  {/* Brand Elements */}
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 text-primary border border-primary/10 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <span className="material-symbols-outlined text-[40px] font-extralight">query_stats</span>
                  </div>
                  
                  <h1 className="font-headline text-3xl font-extrabold text-on-surface mb-2 tracking-tight" dir="ltr">
                    ISE Sales Intelligence
                  </h1>
                  <p className="font-body text-on-surface-variant font-medium text-base mb-10">
                    منصة تحليل أداء المبيعات
                  </p>
  
                  {/* General Error State */}
                  {errorStatus === "other" && (
                    <div className="w-full p-4 mb-6 bg-error/10 border border-error/20 text-error text-sm rounded-2xl font-bold animate-in fade-in">
                      حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.
                    </div>
                  )}

                  {/* Primary Action Button */}
                  <div className="w-full">
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full bg-primary text-white font-bold py-4 px-6 rounded-2xl hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0 disabled:hover:shadow-none"
                      disabled={isLoading}
                    >
                      {!isLoading && (
                        <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px] bg-white rounded-full p-0.5" aria-hidden="true">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="none"/>
                        </svg>
                      )}
                      {isLoading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                      <span className="text-[16px] tracking-wide mt-0.5">{isLoading ? "جاري الاتصال..." : "تسجيل الدخول بـ Google"}</span>
                    </button>
                    
                    {/* Bottom Helper Text */}
                    <p className="mt-8 text-[13px] font-bold text-on-surface-variant font-body">
                      للوصول للنظام تواصل مع الإدارة
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
