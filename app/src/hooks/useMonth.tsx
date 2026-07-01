import { MONTHS_ES } from '@iaas/shared';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { monthKeyOf } from '@/lib/format';

type MonthState = {
  year: number;
  month: number; // 1-12
  monthKey: string; // YYYY-MM
  label: string; // "Junio 2026"
  shortLabel: string; // "Jun"
  next: () => void;
  prev: () => void;
};

const MonthContext = createContext<MonthState | undefined>(undefined);

export function MonthProvider({ children }: { children: ReactNode }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const value = useMemo<MonthState>(() => {
    function next() {
      setMonth((m) => {
        if (m === 12) {
          setYear((y) => y + 1);
          return 1;
        }
        return m + 1;
      });
    }
    function prev() {
      setMonth((m) => {
        if (m === 1) {
          setYear((y) => y - 1);
          return 12;
        }
        return m - 1;
      });
    }
    return {
      year,
      month,
      monthKey: monthKeyOf(year, month),
      label: `${MONTHS_ES[month - 1]} ${year}`,
      shortLabel: MONTHS_ES[month - 1].slice(0, 3),
      next,
      prev,
    };
  }, [year, month]);

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth(): MonthState {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useMonth debe usarse dentro de MonthProvider');
  return ctx;
}
