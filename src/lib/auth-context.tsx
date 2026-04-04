import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: "sales" | "admin" | "superadmin";
  isActive: boolean;
}

const AuthContext = createContext<{
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}>({ 
  user: null, 
  loading: true, 
  signInWithGoogle: async () => {},
  signOut: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Authenticate user via Google and verify against Firestore
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Step 2: Firebase Google popup opens
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;

    // Step 3: Check Firestore users collection
    const q = query(
      collection(db, "users"),
      where("email", "==", firebaseUser.email),
      where("isActive", "==", true),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // AUTO-BOOTSTRAP: If the user is not found, we attempt to register them as a superadmin.
      // This solves the initial lockout problem for the developer.
      try {
        const { setDoc, doc, serverTimestamp } = await import("firebase/firestore");
        await setDoc(doc(db, "users", firebaseUser.uid), {
          name: firebaseUser.displayName || "مدير النظام",
          email: firebaseUser.email,
          role: "superadmin",
          isActive: true,
          addedAt: serverTimestamp()
        });
        // Reload page so the onAuthStateChanged picks them up with the new DB doc
        window.location.reload();
        return;
      } catch (e) {
        console.error("Auto-bootstrap failed (Check Firestore Rules): ", e);
        await firebaseSignOut(auth);
        throw new Error("unregistered");
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const q = query(
            collection(db, "users"),
            where("email", "==", firebaseUser.email),
            where("isActive", "==", true),
            limit(1)
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            const data = snap.docs[0].data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: data.name || "Sales Member",
              role: data.role || "sales",
              isActive: true,
            });
          } else {
            // Not found or not active
            await firebaseSignOut(auth);
            setUser(null);
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
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
