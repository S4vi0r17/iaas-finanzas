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

export const PM_TYPE_LABELS: Record<PmType, string> = {
  credito: "Crédito",
  debito: "Débito",
  efectivo: "Efectivo",
  prestamo: "Préstamo",
};

/** Opciones para el selector de tipo al crear/editar un medio de pago. */
export const PM_TYPE_OPTIONS = PM_TYPES.map((t) => ({
  value: t,
  label: `${PM_ICONS[t]} ${PM_TYPE_LABELS[t]}`,
}));

/**
 * Medios de pago iniciales que se crean al registrarse. El usuario puede
 * editarlos, desactivarlos y agregar los suyos. `key` es un identificador
 * interno usado solo por el seed para enlazar las obligaciones semilla; no
 * se guarda en la DB (allí cada medio tiene su propio `id`).
 */
export const DEFAULT_PAYMENT_METHODS = [
  { key: "ef", name: "Efectivo", type: "efectivo", active: true },
  { key: "cc1", name: "Tarjeta de Crédito", type: "credito", active: true },
  { key: "dc1", name: "Tarjeta de Débito", type: "debito", active: true },
  { key: "pr1", name: "Préstamo Personal", type: "prestamo", active: true },
] as const satisfies ReadonlyArray<{
  key: string;
  name: string;
  type: PmType;
  active: boolean;
}>;

// ─── Obligaciones por defecto (seed al registrarse) ───────────────────
export const SEED_OBLIGATIONS = [
  { nombre: "Alquiler/Hipoteca", dia: 5, monto: 1500, cat: "Credito", tipo: "inversion", moneda: "PEN", paymentMethodId: "pr1" },
  { nombre: "Seguro de salud", dia: 1, monto: 100, cat: "Salud", tipo: "gasto", moneda: "PEN", paymentMethodId: "cc1" },
  { nombre: "Celular", dia: 1, monto: 60, cat: "Servicio", tipo: "gasto", moneda: "PEN", paymentMethodId: "dc1" },
  { nombre: "Internet", dia: 10, monto: 89, cat: "Servicio", tipo: "gasto", moneda: "PEN", paymentMethodId: "dc1" },
  { nombre: "Tarjeta de credito", dia: 25, monto: 300, cat: "Tarjeta", tipo: "gasto", moneda: "PEN", paymentMethodId: "cc1" },
  { nombre: "Prestamo personal", dia: 15, monto: 200, cat: "Prestamo", tipo: "gasto", moneda: "PEN", paymentMethodId: "pr1" },
  { nombre: "Seguro de vida", dia: 1, monto: 80, cat: "Seguro", tipo: "gasto", moneda: "PEN", paymentMethodId: "ef" },
  { nombre: "Ahorro mensual", dia: 1, monto: 200, cat: "Ahorro", tipo: "inversion", moneda: "PEN", paymentMethodId: "dc1" },
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

// ─── Categorías gestionables (CRUD por usuario) ───────────────────────
// Ámbito de una categoría: cada formulario ofrece solo las de su scope.
export const CATEGORY_SCOPES = ["obligacion", "gasto", "ingreso"] as const;
export type CategoryScope = (typeof CATEGORY_SCOPES)[number];

export const CATEGORY_SCOPE_LABELS: Record<CategoryScope, string> = {
  obligacion: "Obligaciones",
  gasto: "Gastos",
  ingreso: "Ingresos",
};

/** Icono por defecto cuando una categoría no define uno propio. */
export const DEFAULT_CATEGORY_ICON = "📋";

/**
 * Semilla minimalista de categorías al registrarse: solo lo esencial para que
 * los selectores funcionen. El usuario agrega las suyas desde el gestor.
 */
export const DEFAULT_CATEGORIES: ReadonlyArray<{
  scope: CategoryScope;
  name: string;
  icon: string;
}> = [
  { scope: "obligacion", name: "Servicio", icon: "⚡" },
  { scope: "obligacion", name: "Tarjeta", icon: "💳" },
  { scope: "obligacion", name: "Prestamo", icon: "💰" },
  { scope: "obligacion", name: "Otro", icon: DEFAULT_CATEGORY_ICON },
  { scope: "gasto", name: "Alimentacion", icon: "🍽" },
  { scope: "gasto", name: "Transporte", icon: "🚗" },
  { scope: "gasto", name: "Hogar", icon: "🏠" },
  { scope: "gasto", name: "Otro", icon: DEFAULT_CATEGORY_ICON },
  { scope: "ingreso", name: "Sueldo", icon: "💵" },
  { scope: "ingreso", name: "Otro ingreso", icon: DEFAULT_CATEGORY_ICON },
];

export const OBLIGATION_TYPES = ["gasto", "inversion"] as const;
export type ObligationType = (typeof OBLIGATION_TYPES)[number];

/**
 * Clasificación de un gasto (snapshot). Un gasto suelto es "variable"; un pago
 * de obligación congela "fijo" o "inversion" según el tipo de la obligación en
 * el momento del pago. El Resumen clasifica por este campo, sin mirar la
 * obligación viva (así editar la obligación no reclasifica pagos pasados).
 */
export const EXPENSE_KINDS = ["variable", "fijo", "inversion"] as const;
export type ExpenseKind = (typeof EXPENSE_KINDS)[number];

/** Tipo de obligación → clasificación congelada en el gasto al pagar. */
export function kindForObligation(tipo: ObligationType): ExpenseKind {
  return tipo === "inversion" ? "inversion" : "fijo";
}

export const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

// ─── Límites de plan ──────────────────────────────────────────────────
export const MAX_FREE_OBLIGATIONS = 10;
