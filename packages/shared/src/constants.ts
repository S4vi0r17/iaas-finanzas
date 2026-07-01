// ─── Constantes compartidas (backend + app) ──────────────────────────
// Migradas 1:1 desde el HTML original (MiTablero_Financiero_Personal.html)

/** Monedas soportadas. `c` = código ISO, `s` = símbolo, `n` = nombre. */
export const CURRENCIES = [
  { c: "PEN", s: "S/", n: "Sol peruano" },
  { c: "USD", s: "$", n: "US Dollar" },
  { c: "EUR", s: "€", n: "Euro" },
  { c: "GBP", s: "£", n: "British Pound" },
  { c: "MXN", s: "MX$", n: "Peso mexicano" },
  { c: "COP", s: "COP$", n: "Peso colombiano" },
  { c: "CLP", s: "CLP$", n: "Peso chileno" },
  { c: "ARS", s: "AR$", n: "Peso argentino" },
  { c: "BRL", s: "R$", n: "Real brasileiro" },
  { c: "BOB", s: "Bs.", n: "Boliviano" },
  { c: "CAD", s: "CA$", n: "Canadian Dollar" },
  { c: "AUD", s: "A$", n: "Australian Dollar" },
  { c: "JPY", s: "¥", n: "Yen japones" },
  { c: "INR", s: "₹", n: "Rupia india" },
  { c: "CHF", s: "CHF", n: "Swiss Franc" },
] as const;

export const CURRENCY_CODES = CURRENCIES.map((c) => c.c);
export type CurrencyCode = (typeof CURRENCIES)[number]["c"];

/** Símbolo de una moneda por código (fallback S/). */
export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.c === code)?.s ?? "S/";
}

// ─── Medios de pago ───────────────────────────────────────────────────
export const PM_TYPES = ["credito", "debito", "efectivo", "prestamo"] as const;
export type PmType = (typeof PM_TYPES)[number];

export const PM_ICONS: Record<PmType, string> = {
  credito: "💳",
  debito: "🏧",
  efectivo: "💵",
  prestamo: "🏦",
};

/** Slots fijos por usuario (5 crédito, 5 débito, 1 efectivo, 3 préstamos). */
export const DEFAULT_PAYMENT_METHODS = [
  { slot: "cc1", name: "Tarjeta Credito 1", type: "credito", active: true },
  { slot: "cc2", name: "Tarjeta Credito 2", type: "credito", active: false },
  { slot: "cc3", name: "Tarjeta Credito 3", type: "credito", active: false },
  { slot: "cc4", name: "Tarjeta Credito 4", type: "credito", active: false },
  { slot: "cc5", name: "Tarjeta Credito 5", type: "credito", active: false },
  { slot: "dc1", name: "Tarjeta Debito 1", type: "debito", active: true },
  { slot: "dc2", name: "Tarjeta Debito 2", type: "debito", active: false },
  { slot: "dc3", name: "Tarjeta Debito 3", type: "debito", active: false },
  { slot: "dc4", name: "Tarjeta Debito 4", type: "debito", active: false },
  { slot: "dc5", name: "Tarjeta Debito 5", type: "debito", active: false },
  { slot: "ef", name: "Efectivo", type: "efectivo", active: true },
  { slot: "pr1", name: "Prestamo Personal", type: "prestamo", active: true },
  { slot: "pr2", name: "Prestamo 2", type: "prestamo", active: false },
  { slot: "pr3", name: "Prestamo 3", type: "prestamo", active: false },
] as const satisfies ReadonlyArray<{
  slot: string;
  name: string;
  type: PmType;
  active: boolean;
}>;

/** Agrupación usada por la pantalla de Ajustes. */
export const PM_GROUPS = [
  { label: "💳 Tarjetas de Credito (max 5)", slots: ["cc1", "cc2", "cc3", "cc4", "cc5"] },
  { label: "🏧 Tarjetas de Debito (max 5)", slots: ["dc1", "dc2", "dc3", "dc4", "dc5"] },
  { label: "💵 Efectivo", slots: ["ef"] },
  { label: "🏦 Prestamos (max 3)", slots: ["pr1", "pr2", "pr3"] },
] as const;

// ─── Obligaciones por defecto (seed al registrarse) ───────────────────
export const SEED_OBLIGATIONS = [
  { nombre: "Alquiler/Hipoteca", fechaVenc: "", dia: 5, monto: 1500, cat: "Credito", catCustom: "", tipo: "inversion", moneda: "PEN", metodoPago: "pr1" },
  { nombre: "Seguro de salud", fechaVenc: "", dia: 1, monto: 100, cat: "Salud", catCustom: "", tipo: "gasto", moneda: "PEN", metodoPago: "cc1" },
  { nombre: "Celular", fechaVenc: "", dia: 1, monto: 60, cat: "Servicio", catCustom: "", tipo: "gasto", moneda: "PEN", metodoPago: "dc1" },
  { nombre: "Internet", fechaVenc: "", dia: 10, monto: 89, cat: "Servicio", catCustom: "", tipo: "gasto", moneda: "PEN", metodoPago: "dc1" },
  { nombre: "Tarjeta de credito", fechaVenc: "", dia: 25, monto: 300, cat: "Tarjeta", catCustom: "", tipo: "gasto", moneda: "PEN", metodoPago: "cc1" },
  { nombre: "Prestamo personal", fechaVenc: "", dia: 15, monto: 200, cat: "Prestamo", catCustom: "", tipo: "gasto", moneda: "PEN", metodoPago: "pr1" },
  { nombre: "Seguro de vida", fechaVenc: "", dia: 1, monto: 80, cat: "Seguro", catCustom: "", tipo: "gasto", moneda: "PEN", metodoPago: "ef" },
  { nombre: "Ahorro mensual", fechaVenc: "", dia: 1, monto: 200, cat: "Ahorro", catCustom: "", tipo: "inversion", moneda: "PEN", metodoPago: "dc1" },
] as const;

// ─── Categorías ───────────────────────────────────────────────────────
export const OBLIGATION_CATEGORIES = [
  "Credito", "Servicio", "Salud", "Tarjeta", "Prestamo", "Seguro", "Ahorro", "Inversion", "Otro",
] as const;

export const OBLIGATION_CATEGORY_ICONS: Record<string, string> = {
  Credito: "🏦", Servicio: "⚡", Salud: "💊", Tarjeta: "💳", Prestamo: "💰",
  Seguro: "🛡", Ahorro: "🐖", Inversion: "📈", Otro: "📋",
};

export const EXPENSE_CATEGORIES = [
  "Alimentacion", "Cafe y snacks", "Restaurante", "Transporte", "Supermercado",
  "Social y eventos", "Viajes", "Salud", "Tecnologia", "Educacion", "Hogar",
  "Trabajo", "Mascotas", "Otro",
] as const;

export const INCOME_CATEGORIES = [
  "Sueldo", "Alquiler", "Consultoria", "Freelance", "Dividendos", "Bono", "Otro ingreso",
] as const;

export const OBLIGATION_TYPES = ["gasto", "inversion"] as const;
export type ObligationType = (typeof OBLIGATION_TYPES)[number];

export const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

// ─── Límites de plan ──────────────────────────────────────────────────
export const MAX_FREE_OBLIGATIONS = 10;
