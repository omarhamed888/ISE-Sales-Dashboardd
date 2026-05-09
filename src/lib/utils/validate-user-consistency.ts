import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface OrphanUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  reason: string;
}

export async function validateUserConsistency(): Promise<OrphanUser[]> {
  const snap = await getDocs(collection(db, "users"));
  const orphanUsers: OrphanUser[] = [];

  snap.forEach((userDoc) => {
    const data = userDoc.data() as { authUid?: string; name?: string; email?: string; role?: string };
    const hasAuthUid = typeof data.authUid === "string" && data.authUid.length > 0;
    if (!hasAuthUid) {
      orphanUsers.push({
        id: userDoc.id,
        name: data.name,
        email: data.email,
        role: data.role,
        reason: "missing_auth_uid",
      });
      return;
    }

    if (data.authUid !== userDoc.id) {
      orphanUsers.push({
        id: userDoc.id,
        name: data.name,
        email: data.email,
        role: data.role,
        reason: "doc_id_mismatch",
      });
    }
  });

  return orphanUsers;
}
