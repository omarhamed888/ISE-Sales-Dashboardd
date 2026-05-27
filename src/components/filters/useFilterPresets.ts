import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useFilter, FilterState } from "@/lib/filter-context";
import { useToast } from "@/components/ui/Toast";

export type StoredPreset = {
  id: string;
  name: string;
  filter: Omit<FilterState, "customDateFrom" | "customDateTo"> & {
    customDateFrom: string | null;
    customDateTo: string | null;
  };
};

/**
 * Persists per-user named filter combinations in localStorage and exposes
 * the handlers FilterBar (and its mobile sheet) need. Extracted out of
 * FilterBar so the bar can stay focused on layout, and so the preset feature
 * can be unit-tested in isolation later if needed.
 */
export function useFilterPresets() {
  const { user } = useAuth();
  const { filter, updateFilter } = useFilter();
  const { showToast } = useToast();
  const [presets, setPresets] = useState<StoredPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");

  const presetStorageKey = useMemo(
    () => `ise-filter-presets:${user?.uid ?? "guest"}`,
    [user?.uid]
  );

  const serializeFilter = useCallback(
    (value: FilterState): StoredPreset["filter"] => ({
      ...value,
      customDateFrom: value.customDateFrom ? value.customDateFrom.toISOString() : null,
      customDateTo: value.customDateTo ? value.customDateTo.toISOString() : null,
    }),
    []
  );

  const deserializeFilter = useCallback(
    (value: StoredPreset["filter"]): FilterState => ({
      ...value,
      customDateFrom: value.customDateFrom ? new Date(value.customDateFrom) : null,
      customDateTo: value.customDateTo ? new Date(value.customDateTo) : null,
    }),
    []
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(presetStorageKey);
      if (!raw) {
        setPresets([]);
        setSelectedPresetId("");
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setPresets([]);
        setSelectedPresetId("");
        return;
      }
      const valid = parsed.filter(
        (p: unknown): p is StoredPreset =>
          !!p &&
          typeof p === "object" &&
          typeof (p as StoredPreset).id === "string" &&
          typeof (p as StoredPreset).name === "string" &&
          !!(p as StoredPreset).filter
      );
      setPresets(valid);
      setSelectedPresetId("");
    } catch {
      setPresets([]);
      setSelectedPresetId("");
    }
  }, [presetStorageKey]);

  const persistPresets = useCallback(
    (next: StoredPreset[]) => {
      setPresets(next);
      try {
        localStorage.setItem(presetStorageKey, JSON.stringify(next));
      } catch {
        showToast("error", "تعذّر حفظ الفلاتر المفضلة على هذا الجهاز.");
      }
    },
    [presetStorageKey, showToast]
  );

  const applyPreset = useCallback(
    (presetId: string) => {
      setSelectedPresetId(presetId);
      if (!presetId) return;
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) return;
      updateFilter(deserializeFilter(preset.filter));
      showToast("success", `تم تطبيق فلتر "${preset.name}".`);
    },
    [deserializeFilter, presets, showToast, updateFilter]
  );

  const savePreset = useCallback(() => {
    const name = (window.prompt("اسم الفلتر المفضل؟") || "").trim();
    if (!name) return;
    const nextPreset: StoredPreset = {
      id: `preset-${Date.now()}`,
      name,
      filter: serializeFilter(filter),
    };
    const deduped = presets.filter((p) => p.name !== name);
    const next = [nextPreset, ...deduped].slice(0, 10);
    persistPresets(next);
    setSelectedPresetId(nextPreset.id);
    showToast("success", `تم حفظ الفلتر "${name}".`);
  }, [filter, persistPresets, presets, serializeFilter, showToast]);

  const deletePreset = useCallback(() => {
    if (!selectedPresetId) return;
    const current = presets.find((p) => p.id === selectedPresetId);
    if (!current) return;
    const ok = window.confirm(`حذف الفلتر "${current.name}"؟`);
    if (!ok) return;
    const next = presets.filter((p) => p.id !== selectedPresetId);
    persistPresets(next);
    setSelectedPresetId("");
    showToast("success", "تم حذف الفلتر المفضل.");
  }, [persistPresets, presets, selectedPresetId, showToast]);

  return {
    presets,
    selectedPresetId,
    applyPreset,
    savePreset,
    deletePreset,
  };
}
