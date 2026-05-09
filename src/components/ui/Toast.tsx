import { createContext, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "warning" | "info";
type ToastItem = { id: string; type: ToastType; message: string };

const ToastContext = createContext<{
  showToast: (type: ToastType, message: string) => void;
}>({
  showToast: () => {},
});

const BG_BY_TYPE: Record<ToastType, string> = {
  success: "bg-emerald-600",
  error: "bg-red-600",
  warning: "bg-amber-500",
  info: "bg-blue-600",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (type: ToastType, message: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-4 z-[999] space-y-2" dir="rtl">
        {toasts.map((toast) => (
          <div key={toast.id} className={`text-white px-4 py-3 rounded-xl text-[13px] font-bold shadow-lg ${BG_BY_TYPE[toast.type]}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
