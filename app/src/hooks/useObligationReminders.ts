import { useEffect } from 'react';

import { useObligations } from '@/hooks/queries';
import { monthKeyOf } from '@/lib/format';
import { ensureNotificationSetup, scheduleObligationReminders } from '@/lib/notifications';

/**
 * Programa recordatorios locales (vence hoy / próximo / atrasado) para las
 * obligaciones del mes calendario real (hoy), sin importar qué mes esté
 * navegando el usuario en la UI. Se reprograma solo cada vez que cambian los
 * datos de obligaciones de ese mes.
 */
export function useObligationReminders(): void {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthKey = monthKeyOf(year, month);

  const { data } = useObligations(monthKey);

  useEffect(() => {
    ensureNotificationSetup();
  }, []);

  useEffect(() => {
    if (!data) return;
    scheduleObligationReminders(data.obligations, data.paidByObligation, year, month);
  }, [data, year, month]);
}
