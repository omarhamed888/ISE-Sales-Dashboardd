import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAppConfig } from "@/lib/hooks/useAppConfig";
import { runScheduledChecks } from "@/lib/services/notification-trigger-service";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function useScheduledNotifications() {
  const { user } = useAuth();
  const { config } = useAppConfig();

  useEffect(() => {
    if (!user?.uid || !config || user.role !== "sales") return;

    let cancelled = false;
    const execute = async () => {
      if (cancelled) return;
      try {
        await runScheduledChecks({ user, config });
      } catch (error) {
        console.error("useScheduledNotifications:", error);
      }
    };

    void execute();
    const timer = window.setInterval(() => {
      void execute();
    }, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [config, user]);
}
