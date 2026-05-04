import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AppConfig {
  companyName: string;
  companyLogo: string;
  companyColors: { primary: string; secondary: string; accent: string };
  currency: string;
  currencyLabel: string;
  language: string;
  timezone: string;
  workingDays: number[];
  reportDeadlineHour: number;
  dataQualityFromDate: string;
  ignoredAdNames: string[];
  conversionGreenThreshold: number;
  conversionAmberThreshold: number;
  features: Record<string, boolean>;
}

const defaultConfig: AppConfig = {
  companyName: "Sales Intelligence",
  companyLogo: "/logo.png",
  companyColors: { primary: "#1E40AF", secondary: "#3B82F6", accent: "#10B981" },
  currency: "EGP",
  currencyLabel: "جنيه",
  language: "ar",
  timezone: "Africa/Cairo",
  workingDays: [0, 1, 2, 3, 4, 6],
  reportDeadlineHour: 16,
  dataQualityFromDate: new Date().toISOString().slice(0, 10),
  ignoredAdNames: [],
  conversionGreenThreshold: 15,
  conversionAmberThreshold: 5,
  features: {
    adsAnalysis: true,
    aiInsights: true,
    dealsTracking: true,
    attendance: true,
    excuses: true,
    targets: true,
  },
};

let cachedConfig: AppConfig | null = null;

type ConfigListener = (config: AppConfig) => void;
const configListeners = new Set<ConfigListener>();
let appConfigUnsub: (() => void) | null = null;

function mergeRemote(data: Partial<AppConfig> | undefined): AppConfig {
  return data ? { ...defaultConfig, ...data } : defaultConfig;
}

function subscribeAppConfigFromFirestore() {
  if (appConfigUnsub) return;
  const ref = doc(db, "app_config", "settings");
  appConfigUnsub = onSnapshot(
    ref,
    (snap) => {
      const next = snap.exists() ? mergeRemote(snap.data() as Partial<AppConfig>) : defaultConfig;
      cachedConfig = next;
      configListeners.forEach((fn) => {
        try {
          fn(next);
        } catch {
          /* ignore subscriber errors */
        }
      });
    },
    (err) => {
      console.error("app_config/settings:", err);
      const fallback = cachedConfig ?? defaultConfig;
      configListeners.forEach((fn) => {
        try {
          fn(fallback);
        } catch {
          /* ignore */
        }
      });
    }
  );
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(() => cachedConfig ?? defaultConfig);
  const [loading, setLoading] = useState(() => cachedConfig === null);

  useEffect(() => {
    subscribeAppConfigFromFirestore();
    const listener: ConfigListener = (next) => {
      setConfig(next);
      setLoading(false);
    };
    configListeners.add(listener);
    if (cachedConfig) {
      setConfig(cachedConfig);
      setLoading(false);
    }
    return () => {
      configListeners.delete(listener);
      if (configListeners.size === 0 && appConfigUnsub) {
        appConfigUnsub();
        appConfigUnsub = null;
      }
    };
  }, []);

  return { config, loading };
}
