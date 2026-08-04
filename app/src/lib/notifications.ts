import type { Obligation } from '@iaas/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { fmtShort } from '@/lib/format';
import { dueDate } from '@/lib/obligationStatus';

const CHANNEL_ID = 'obligaciones';
const REMINDER_HOUR = 9;
const DAYS_BEFORE = 3;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Pide permiso de notificaciones (una sola vez; no vuelve a preguntar si ya fue denegado). */
export async function ensureNotificationSetup(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Obligaciones',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function atHour(y: number, m: number, d: number, hour: number): Date {
  return new Date(y, m, d, hour, 0, 0, 0);
}

/**
 * Recalcula y reemplaza todos los recordatorios locales de obligaciones del
 * mes actual (próximo a vencer / vence hoy / atrasado). Cancela todo lo
 * programado antes de reprogramar: más simple que llevar identificadores
 * finos y evita duplicados en cada refetch de react-query.
 */
export async function scheduleObligationReminders(
  obligations: Obligation[],
  paidByObligation: Record<string, number>,
  year: number,
  month: number,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const o of obligations) {
    const saldo = o.monto - (paidByObligation[o.id] ?? 0);
    if (saldo <= 0) continue; // ya pagada

    const due = dueDate(o.dia, year, month);
    const hoyAt = atHour(due.getFullYear(), due.getMonth(), due.getDate(), REMINDER_HOUR);
    const proximoAt = atHour(
      due.getFullYear(),
      due.getMonth(),
      due.getDate() - DAYS_BEFORE,
      REMINDER_HOUR,
    );
    const body = `Saldo pendiente: ${fmtShort(saldo, o.moneda)}`;

    if (proximoAt > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `obl-${o.id}-proximo`,
        content: { title: `${o.nombre} vence en ${DAYS_BEFORE} días`, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: proximoAt,
          channelId: CHANNEL_ID,
        },
      });
    }

    if (hoyAt > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `obl-${o.id}-hoy`,
        content: { title: `Hoy vence ${o.nombre}`, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: hoyAt,
          channelId: CHANNEL_ID,
        },
      });
    } else if (due < today) {
      // Atrasada: recordatorio diario hasta que se pague (se cancela y
      // reprograma solo, así que desaparece en cuanto deje de estar impaga).
      await Notifications.scheduleNotificationAsync({
        identifier: `obl-${o.id}-retrasado`,
        content: { title: `${o.nombre} está atrasada`, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: REMINDER_HOUR,
          minute: 0,
          channelId: CHANNEL_ID,
        },
      });
    }
  }
}
