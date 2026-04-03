import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: "sales" | "admin" | "superadmin";
}

const AuthContext = createContext<{
  user: AuthUser | null;
  loading: boolean;
}>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: data.name || "Sales Member",
              role: data.role || "sales",
            });
          } else {
            // Default role if not in firestore yet
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: "أحمد بن محمد",
              role: "admin", // Fallback for debugging, change to sales in production
            });
          }
        } catch (error) {
          console.error("Auth context fetch user error:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
