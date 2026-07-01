import { currencySymbol } from "@iaas/shared";

/** Formatea un monto con el símbolo de su moneda (2 decimales). */
export function fmt(amount: number, currency: string): string {
  return `${currencySymbol(currency)} ${Number(amount).toFixed(2)}`;
}

/** Igual que fmt pero sin decimales (para métricas). */
export function fmtShort(amount: number, currency: string): string {
  return `${currencySymbol(currency)} ${Number(amount).toFixed(0)}`;
}

/** YYYY-MM-DD → DD/MM/YYYY */
export function formatDate(s: string): string {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

/** Fecha de hoy como YYYY-MM-DD */
export function today(): string {
  const t = new Date();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${m}-${d}`;
}

/** Clave de mes YYYY-MM a partir de año y mes (1-12). */
export function monthKeyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
