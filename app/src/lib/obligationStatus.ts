import type { Obligation } from '@iaas/shared';

export type StatusKey = 'Pagado' | 'Pendiente' | 'Proximo' | 'Vence hoy' | 'Retrasado';

export type StatusStyle = {
  label: StatusKey;
  badgeBg: string;
  badgeText: string;
  border: string;
};

const STYLES: Record<StatusKey, StatusStyle> = {
  Pagado: { label: 'Pagado', badgeBg: '#f0fdf4', badgeText: '#16a34a', border: '#16a34a' },
  Pendiente: { label: 'Pendiente', badgeBg: '#f1f5f9', badgeText: '#64748b', border: '#94a3b8' },
  Proximo: { label: 'Proximo', badgeBg: '#fff7ed', badgeText: '#ea580c', border: '#ea580c' },
  'Vence hoy': { label: 'Vence hoy', badgeBg: '#fef2f2', badgeText: '#dc2626', border: '#dc2626' },
  Retrasado: { label: 'Retrasado', badgeBg: '#fef2f2', badgeText: '#dc2626', border: '#dc2626' },
};

/**
 * Fecha de vencimiento concreta para el mes seleccionado, a partir del día
 * recurrente de la obligación. Si el día no existe en el mes (ej. 31 en
 * febrero), se ajusta al último día del mes.
 */
export function dueDate(dia: number, selYear: number, selMonth: number): Date {
  const lastDay = new Date(selYear, selMonth, 0).getDate();
  const d = Math.min(Math.max(dia, 1), lastDay);
  return new Date(selYear, selMonth - 1, d);
}

/** Calcula el estado de una obligación para el mes seleccionado. */
export function computeStatus(
  o: Obligation,
  paid: boolean,
  selYear: number,
  selMonth: number,
): StatusStyle {
  if (paid) return STYLES.Pagado;

  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const due = dueDate(o.dia, selYear, selMonth);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return STYLES.Retrasado;
  if (diff === 0) return STYLES['Vence hoy'];
  if (diff <= 5) return STYLES.Proximo;
  return STYLES.Pendiente;
}
