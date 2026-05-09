import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { collection, query, where, getDocs, limit, doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: 'sales' | 'admin' | 'superadmin';
  isActive: boolean;
  teamName?: string;
  programTrack?: string;
  addedAt?: any;
  lastLogin?: any;
}

// Keep AuthUser as alias for compatibility
export type AuthUser = AppUser;

const AuthContext = createContext<{
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signOut: async () => {}
});

const AUTH_CACHE_KEY = "auth_user_cache_v1";

function readCachedUser(email: string | null): AppUser | null {
  if (!email) return null;
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser;
    if (!parsed?.email || parsed.email !== email) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AppUser | null) {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return;
    }
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
  } catch {
    // ignore cache errors
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const findUserByEmail = async (email: string | null): Promise<any | null> => {
    if (!email) return null;
    try {
      const q = query(collection(db, "users"), where("email", "==", email), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    } catch (error: any) {
      const code = error?.code || "";
      if (code.includes("permission-denied")) {
        console.warn("Users lookup blocked by Firestore rules.");
        return null;
      }
      throw error;
    }
  };

  // Authenticate user via Google and verify against Firestore
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Step 2: Firebase Google popup opens
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;

    const appUser = await findUserByEmail(firebaseUser.email);
    if (!appUser) {
      await firebaseSignOut(auth);
      throw new Error("unregistered");
    }
    if (appUser.isActive === false) {
      await firebaseSignOut(auth);
      throw new Error("disabled");
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;

    const appUser = await findUserByEmail(firebaseUser.email);
    if (!appUser) {
      await firebaseSignOut(auth);
      throw new Error("unregistered");
    }
    if (appUser.isActive === false) {
      await firebaseSignOut(auth);
      throw new Error("disabled");
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    writeCachedUser(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      setLoading(true);
      if (firebaseUser) {
        const cached = readCachedUser(firebaseUser.email);
        if (cached) {
          setUser({ ...cached, uid: firebaseUser.uid, email: firebaseUser.email || cached.email });
          setLoading(false);
        }
        try {
          const appUser = await findUserByEmail(firebaseUser.email);
          if (appUser && appUser.isActive !== false) {
            // Auto-migrate legacy doc: if doc ID ≠ auth UID, Firestore rules' getRole() fails.
            // Write a new doc at users/{auth.uid} so all rule checks work going forward.
            if (appUser.id !== firebaseUser.uid) {
              try {
                const { id: _oldId, ...userData } = appUser;
                await setDoc(doc(db, "users", firebaseUser.uid), {
                  ...userData,
                  authUid: firebaseUser.uid,
                }, { merge: true });
              } catch (migErr) {
                console.warn("Legacy user doc migration failed:", migErr);
              }
            }
            const data = appUser;
            const nextUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: data.name || "Sales Member",
              role: data.role || "sales",
              isActive: data.isActive !== false,
              teamName: data.teamName,
              programTrack: data.programTrack,
              addedAt: data.addedAt,
              lastLogin: data.lastLogin,
            };
            setUser(nextUser);
            writeCachedUser(nextUser);
          } else {
            // Not found or not active
            await firebaseSignOut(auth);
            setUser(null);
            writeCachedUser(null);
          }
        } catch (error) {
          console.error("Auth context fetch user error:", error);
          if (!cached) setUser(null);
        }
      } else {
        setUser(null);
        writeCachedUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
