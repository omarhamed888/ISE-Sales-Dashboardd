import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export interface MissingDay {
  dateObj: Date;
  str: string;     // YYYY-MM-DD
  arText: string;  // Arabic formatted date
}

export function useAttendance() {
  const { user } = useAuth();
  const [missingDays, setMissingDays] = useState<MissingDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAttendance() {
        if (!user || user.role !== 'sales') {
            setLoading(false);
            return;
        }

        try {
            // 1. Get user's start date (addedAt from users doc context)
            const u = user as any;
            let startDate = u.createdAt?.toDate ? u.createdAt.toDate() : new Date();
            if (!u.createdAt?.toDate) {
                // fallback to 7 days if mocking
                startDate.setDate(startDate.getDate() - 7);
            }
            startDate.setHours(0,0,0,0);

            // 3. Fetch all reports + excuses for this user
            const [reportsSnap, excusesSnap] = await Promise.all([
                getDocs(query(collection(db, "reports"), where("salesRepId", "==", user.uid))),
                getDocs(query(collection(db, "excuses"), where("userId", "==", user.uid)))
            ]);

            const submittedDates = new Set<string>();
            reportsSnap.forEach(doc => {
                const dateRaw = doc.data().date;
                if (dateRaw) submittedDates.add(dateRaw.replace(/\//g, '-'));
            });
            excusesSnap.forEach(doc => {
                const dateRaw = doc.data().date;
                if (dateRaw) submittedDates.add(dateRaw);
            });

            const missing: MissingDay[] = [];
            const today = new Date();
            today.setHours(0,0,0,0);

            // 2. Generate list of all working days since start (to yesterday)
            // Note: We check up to yesterday since today is still ongoing!
            // Wait, does "not in future dates" mean today is included? 
            // Usually we require report at the END of the day. If I block today, they can't login!
            // So we loop up to yesterday (getTime() < today.getTime())
            for (let d = new Date(startDate); d.getTime() < today.getTime(); d.setDate(d.getDate() + 1)) {
                
                // Working day check function: getDayOfWeek(date) !== 'friday'
                if (d.getDay() === 5) continue; // 5 is Friday

                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dStr = `${year}-${month}-${day}`;

                // 4. Find missing days
                if (!submittedDates.has(dStr)) {
                    missing.push({
                        dateObj: new Date(d),
                        str: dStr,
                        arText: d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    });
                }
            }

            // 5. Return array of missing dates sorted oldest first
            missing.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

            setMissingDays(missing);
        } catch (error) {
            console.error("Failed to fetch attendance:", error);
        } finally {
            setLoading(false);
        }
    }
    
    checkAttendance();
  }, [user]);

  return { missingDays, loading };
}
