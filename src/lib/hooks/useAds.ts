import { useEffect, useState } from "react";
import { subscribeToActiveAds, subscribeToAllAds } from "@/lib/services/ads-service";
import { useAuth } from "@/lib/auth-context";
import type { Ad } from "@/lib/types";

export function useActiveAds(): { ads: Ad[]; loading: boolean } {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setAds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeToActiveAds(
      data => {
        setAds(data);
        setLoading(false);
      },
      () => {
        setAds([]);
        setLoading(false);
      }
    );
  }, [user?.uid]);

  return { ads, loading };
}

export function useAllAds(): { ads: Ad[]; loading: boolean } {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setAds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeToAllAds(
      data => {
        setAds(data);
        setLoading(false);
      },
      () => {
        setAds([]);
        setLoading(false);
      }
    );
  }, [user?.uid]);

  return { ads, loading };
}
