import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

// Each accepted MIME maps to a single canonical extension. This lets us delete
// the previous file when the admin switches formats so we never end up with
// orphaned `logo.png` + `logo.jpg` siblings in Storage.
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

const ALL_EXTENSIONS = Object.values(EXT_BY_TYPE);

export async function uploadCompanyLogo(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("نوع الملف غير مدعوم. الأنواع المسموحة: PNG, JPG, SVG, WebP");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("حجم الملف يتجاوز 2 ميجا بايت");
  }

  const ext = EXT_BY_TYPE[file.type] ?? "png";
  const storageRef = ref(storage, `company/logo.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  // Best-effort cleanup of stale logos from other extensions. Ignored on
  // failure: missing files throw `storage/object-not-found` which is fine here.
  await Promise.all(
    ALL_EXTENSIONS
      .filter((other) => other !== ext)
      .map(async (other) => {
        try {
          await deleteObject(ref(storage, `company/logo.${other}`));
        } catch {
          /* old file likely doesn't exist — ignore */
        }
      })
  );

  // Cache-buster: Firebase Storage download URLs are stable per file metadata
  // generation, but the browser still caches aggressively. Appending `v=` forces
  // every <img> consumer to re-fetch right after a re-upload.
  const cacheBusted = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;

  await setDoc(
    doc(db, "app_config", "settings"),
    { companyLogo: cacheBusted },
    { merge: true },
  );

  return cacheBusted;
}
