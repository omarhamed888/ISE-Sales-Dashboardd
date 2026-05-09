import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeToActiveObjectionCategories,
  subscribeToObjectionCategories,
  type ObjectionCategory,
} from "@/lib/services/objection-categories-service";

export function useObjectionCategories(includeInactive = false): {
  categories: ObjectionCategory[];
  loading: boolean;
} {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ObjectionCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = (includeInactive
      ? subscribeToObjectionCategories
      : subscribeToActiveObjectionCategories)(
      (rows) => {
        setCategories(rows);
        setLoading(false);
      },
      () => {
        setCategories([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [includeInactive, user?.uid]);

  const sorted = useMemo(
    () => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories]
  );

  return { categories: sorted, loading };
}
