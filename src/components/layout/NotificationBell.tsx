import { useState, useEffect, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";

export interface SystemNotification {
  id: string;
  uid: string;
  type: "new_excuse" | "missed_report" | "team_milestone" | "excuse_approved" | "excuse_rejected" | "reminder";
  message: string;
  read: boolean;
  createdAt: any;
  link: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("uid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: SystemNotification[] = [];
      snapshot.forEach((docSnap) => {
        notifs.push({ id: docSnap.id, ...docSnap.data() } as SystemNotification);
      });
      
      // Sort client-side to bypass Firestore compound index requirement
      notifs.sort((a, b) => {
         const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
         const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
         return tB - tA;
      });
      
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notification: SystemNotification) => {
    if (!notification.read) {
      try {
        await updateDoc(doc(db, "notifications", notification.id), { read: true });
      } catch (e) {
        console.error("Error marking read", e);
      }
    }
    setIsOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter((n) => !n.read);
    if (unreadNotifs.length === 0) return;
    
    const batch = writeBatch(db);
    unreadNotifs.forEach((n) => {
      batch.update(doc(db, "notifications", n.id), { read: true });
    });
    await batch.commit();
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "new_excuse": return { icon: "assignment_late", color: "text-amber-500", bg: "bg-amber-50" };
      case "missed_report": return { icon: "event_busy", color: "text-error", bg: "bg-red-50" };
      case "team_milestone": return { icon: "workspace_premium", color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" };
      case "excuse_approved": return { icon: "check_circle", color: "text-emerald-500", bg: "bg-emerald-50" };
      case "excuse_rejected": return { icon: "cancel", color: "text-error", bg: "bg-red-50" };
      case "reminder": return { icon: "notifications_active", color: "text-amber-500", bg: "bg-amber-50" };
      default: return { icon: "notifications", color: "text-[#64748B]", bg: "bg-[#F7F9FC]" };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 flex items-center justify-center text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded-full transition-colors group"
      >
        <span className="material-symbols-outlined text-[24px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex items-center justify-center min-w-[14px] h-[14px] px-1 bg-[#DC2626] text-white text-[9px] font-bold rounded-full border-2 border-white group-hover:border-[#EFF6FF] transition-colors leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-12 left-0 w-[340px] bg-white border border-[#E2E8F0] shadow-2xl rounded-2xl overflow-hidden z-50 transform origin-top-left animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center p-4 border-b border-[#E2E8F0] bg-[#F7F9FC]">
            <h3 className="font-black text-[#1E293B] text-[15px]">الإشعارات</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead} 
                className="text-[11px] font-bold text-[#2563EB] hover:underline"
              >
                تعليم الكل كمقروء
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[#64748B] flex flex-col items-center">
                <span className="material-symbols-outlined text-[32px] opacity-50 mb-2">notifications_paused</span>
                <p className="text-[12px] font-bold">لا يوجد إشعارات جديدة</p>
              </div>
            ) : (
              notifications.map((n) => {
                const style = getIconForType(n.type);
                return (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className={`flex items-start gap-3 p-4 border-b border-[#E2E8F0] last:border-0 cursor-pointer transition-colors hover:bg-[#F7F9FC] ${n.read ? 'opacity-60' : 'bg-white'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${style.bg} ${style.color}`}>
                       <span className="material-symbols-outlined text-[16px]">{style.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className={`text-[13px] ${n.read ? 'font-medium' : 'font-bold'} text-[#1E293B]`}>{n.message}</p>
                      <p className="text-[10px] text-[#64748B] mt-1 font-bold">
                        {n.createdAt?.toDate ? new Date(n.createdAt.toDate()).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'الآن'}
                      </p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-[#2563EB] mt-1.5 flex-shrink-0 shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
