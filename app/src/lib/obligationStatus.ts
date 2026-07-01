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
 * Calcula el estado de una obligación para el mes seleccionado.
 * Réplica de la función gst() del HTML original.
 */
export function computeStatus(
  o: Obligation,
  paid: boolean,
  selYear: number,
  selMonth: number,
): StatusStyle {
  if (paid) return STYLES.Pagado;

  const t = new Date();
  const ty = t.getFullYear();
  const tm = t.getMonth() + 1;
  const td = t.getDate();

  if (o.fechaVenc) {
    const [y, m, d] = o.fechaVenc.split('-').map(Number);
    const diff = Math.round(
      (new Date(y, m - 1, d).getTime() - new Date(ty, tm - 1, td).getTime()) / 86400000,
    );
    if (diff < 0) return STYLES.Retrasado;
    if (diff === 0) return STYLES['Vence hoy'];
    if (diff <= 5) return STYLES.Proximo;
    return STYLES.Pendiente;
  }

  // Sin fecha exacta: se usa el día del mes seleccionado
  if (selYear > ty || (selYear === ty && selMonth > tm)) return STYLES.Pendiente;
  if (selYear < ty || (selYear === ty && selMonth < tm)) return STYLES.Retrasado;

  const d = o.dia - td;
  if (d < 0) return STYLES.Retrasado;
  if (d === 0) return STYLES['Vence hoy'];
  if (d <= 5) return STYLES.Proximo;
  return STYLES.Pendiente;
}
