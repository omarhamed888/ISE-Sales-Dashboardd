import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function uploadCompanyLogo(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("نوع الملف غير مدعوم. الأنواع المسموحة: PNG, JPG, SVG, WebP");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("حجم الملف يتجاوز 2 ميجا بايت");
  }

  const ext = file.name.split(".").pop() || "png";
  const storageRef = ref(storage, `company/logo.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  await setDoc(
    doc(db, "app_config", "settings"),
    { companyLogo: url },
    { merge: true },
  );

  return url;
}
