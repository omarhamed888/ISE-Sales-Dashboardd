import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth-context';

export type DateRange =
  | "اليوم"
  | "الأسبوع"
  | "الشهر"
  | "شهر محدد"
  | "الإجمالي"
  | "مخصص";
export type Platform = "all" | "whatsapp" | "messenger" | "tiktok";

export interface FilterState {
  dateRange: DateRange;
  platform: Platform;
  salesRep: string;
  adName: string;
  bookingType: "all" | "self_booking" | "call_booking";
  dealCategory: "all" | "core" | "side";
  customDateFrom: Date | null;
  customDateTo: Date | null;
  /** YYYY-MM, used when dateRange === "شهر محدد". */
  selectedMonth: string | null;
  /** Firestore course id, or "all". */
  courseId: string;
}

const DEFAULT_FILTER_STATE: FilterState = {
  dateRange: "اليوم",
  platform: "all",
  salesRep: "all",
  adName: "all",
  bookingType: "all",
  dealCategory: "all",
  customDateFrom: null,
  customDateTo: null,
  selectedMonth: null,
  courseId: "all",
};

interface FilterContextType {
  filter: FilterState;
  updateFilter: (updates: Partial<FilterState>) => void;
  resetFilter: () => void;
}

const FilterContext = createContext<FilterContextType>({
  filter: DEFAULT_FILTER_STATE,
  updateFilter: () => {},
  resetFilter: () => {},
});

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const { user } = useAuth();

  useEffect(() => {
    // Reset filters on logout
    if (!user) setFilter(DEFAULT_FILTER_STATE);
  }, [user]);

  const updateFilter = (updates: Partial<FilterState>) => {
    setFilter(prev => ({ ...prev, ...updates }));
  };

  const resetFilter = () => {
    setFilter(DEFAULT_FILTER_STATE);
  };

  return (
    <FilterContext.Provider value={{ filter, updateFilter, resetFilter }}>
      {children}
    </FilterContext.Provider>
  );
}

export const useFilter = () => useContext(FilterContext);
