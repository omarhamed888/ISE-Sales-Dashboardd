import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      console.error("Login error:", err);
      setError("بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#f7f9fc] text-on-surface">
      <div className="flex-grow flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Abstract Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 bg-secondary-container/20 rounded-full blur-3xl"></div>
        
        {/* Login Card */}
        <div className="w-full max-w-md z-10 transition-all duration-500 animate-in fade-in zoom-in-95">
          <div className="bg-surface-container-lowest rounded-xl shadow-[0_12px_32px_-4px_rgba(17,28,45,0.04)] overflow-hidden">
            <div className="p-8 md:p-10">
              {/* Brand Anchor */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 editorial-gradient rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-white text-3xl">analytics</span>
                </div>
                <h1 className="font-headline text-2xl font-extrabold text-on-surface mb-2 tracking-tight">تسجيل الدخول</h1>
                <p className="font-body text-on-surface-variant text-sm text-center">مرحبًا بك مجددًا في نظام تتبع المبيعات</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-lg text-center animate-shake">
                    {error}
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <label className="font-label text-sm font-medium text-on-surface-variant mr-1" htmlFor="email">
                    البريد الإلكتروني
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">mail</span>
                    </div>
                    <input
                      className="block w-full pr-11 pl-4 py-3 bg-surface-container-low border-0 rounded-xl text-on-surface placeholder-outline focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                      id="email"
                      name="email"
                      placeholder="name@company.com"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="font-label text-sm font-medium text-on-surface-variant" htmlFor="password">
                      كلمة المرور
                    </label>
                    <Link to="#" className="text-xs font-medium text-primary hover:text-primary-container transition-colors">
                      نسيت كلمة المرور؟
                    </Link>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">lock</span>
                    </div>
                    <input
                      className="block w-full pr-11 pl-4 py-3 bg-surface-container-low border-0 rounded-xl text-on-surface placeholder-outline focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* Keep Logged In */}
                <div className="flex items-center px-1">
                  <input
                    className="h-4 w-4 text-primary focus:ring-primary border-outline-variant rounded cursor-pointer"
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                  />
                  <label className="mr-3 block text-sm text-on-surface-variant font-body cursor-pointer" htmlFor="remember-me">
                    تذكرني على هذا الجهاز
                  </label>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    className="w-full editorial-gradient text-on-primary font-headline font-bold py-4 px-6 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isLoading}
                  >
                    <span>{isLoading ? "جاري الدخول..." : "الدخول إلى النظام"}</span>
                    {!isLoading && <span className="material-symbols-outlined text-sm">login</span>}
                  </button>
                </div>
              </form>

              {/* Footer Info */}
              <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
                <p className="text-xs text-on-surface-variant font-body">
                  ليس لديك حساب؟{" "}
                  <Link to="#" className="text-primary font-semibold hover:underline mr-1">
                    تواصل مع الإدارة العليا
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Contextual Branding Image */}
          <div className="mt-8 relative hidden md:block">
            <div className="rounded-xl overflow-hidden shadow-sm h-32 relative">
              <img
                className="w-full h-full object-cover grayscale opacity-40"
                alt="abstract architectural curves"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAl0rBNp6IZBQMcqQOy3tq_C2FLZiMdr8Ko7kMxrJwzryW8TXDGzTeLiYk3BiL67JbyZezt0WWeaCCjpgZ5Kpc7nIij-NrJzUdEopucp9E-oJS6faNlYXlZwPWeZNQGnsHEqMdI34c7dQoHjS4Aqa1wUKhEH2I_lIYfcyyH4Q59LHIEvyZUvVGfpf2UUZxc-TveMEu-k2qT4Ck86HX45U00euaPCyuMQguNr3KKF5-6eYN_cb02kSoo1w4WU715ink3qGafShZLa1TQ"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent flex items-center px-8">
                <div className="bg-white/40 backdrop-blur-md p-4 rounded-lg border border-white/30">
                  <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Sales Evolution v2.4</p>
                  <p className="text-xs text-on-surface font-medium italic">"البيانات هي لغة النجاح في عالم الأعمال المعاصر"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="py-6 px-12 flex justify-between items-center text-[10px] text-outline font-body mt-auto">
        <div>© 2024 نظام المبيعات. جميع الحقوق محفوظة.</div>
        <div className="flex gap-4">
          <Link to="#" className="hover:text-on-surface-variant">سياسة الخصوصية</Link>
          <Link to="#" className="hover:text-on-surface-variant">شروط الاستخدام</Link>
        </div>
      </footer>
    </main>
  );
}
