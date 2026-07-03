import { z } from "zod";
import { CURRENCY_CODES, OBLIGATION_TYPES, PM_TYPES } from "./constants";

// ─── Primitivos reutilizables ─────────────────────────────────────────
export const monthKey = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato de mes inválido (YYYY-MM)");

export const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)");

export const currencyCode = z
  .string()
  .refine((v) => (CURRENCY_CODES as readonly string[]).includes(v), "Moneda no soportada");

export const pmType = z.enum(PM_TYPES);
export const obligationType = z.enum(OBLIGATION_TYPES);

const money = z.number().min(0, "El monto no puede ser negativo");
const shortText = z.string().trim().max(120);

/** Referencia opcional a otra entidad (FK). "" o ausente → null. */
const optionalRef = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : null));

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Mes opcional (vigencia). "" o ausente → null; si viene, debe ser YYYY-MM. */
const optionalMonth = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .refine((v) => v === null || MONTH_RE.test(v), "Formato de mes inválido (YYYY-MM)");

// ─── Auth ─────────────────────────────────────────────────────────────
export const registerInput = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  name: shortText.optional().default(""),
});

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

// ─── Usuario ──────────────────────────────────────────────────────────
export const userProfile = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  currency: currencyCode,
  waPhone: z.string(),
  waKey: z.string(),
  isPro: z.boolean(),
});

export const updateUserInput = z
  .object({
    name: shortText,
    currency: currencyCode,
    waPhone: z.string().trim().max(20),
    waKey: z.string().trim().max(64),
  })
  .partial();

// ─── Medios de pago ───────────────────────────────────────────────────
export const paymentMethod = z.object({
  id: z.string(),
  name: shortText.min(1),
  type: pmType,
  active: z.boolean(),
  sortOrder: z.number().int(),
});

/** Crear un medio de pago desde Ajustes. */
export const createPaymentMethodInput = z.object({
  name: shortText.min(1),
  type: pmType,
  active: z.boolean().default(true),
});

/** Editar un medio de pago existente (todos los campos opcionales). */
export const updatePaymentMethodInput = z
  .object({
    name: shortText.min(1),
    type: pmType,
    active: z.boolean(),
  })
  .partial();

// ─── Obligaciones ─────────────────────────────────────────────────────
const obligationBase = z.object({
  nombre: shortText.min(1, "Descripción requerida"),
  dia: z.number().int().min(1).max(31), // día de vencimiento, recurrente cada mes
  mesInicio: monthKey, // desde qué mes aplica (YYYY-MM)
  mesFin: optionalMonth, // último mes en que aplica, o null = vigente
  monto: money,
  cat: shortText.default("Otro"),
  catCustom: shortText.default(""),
  tipo: obligationType.default("gasto"),
  moneda: currencyCode,
  paymentMethodId: optionalRef,
});

/** Validación de entrada: el mes de fin no puede ser anterior al de inicio. */
export const obligationInput = obligationBase.refine(
  (o) => !o.mesFin || o.mesFin >= o.mesInicio,
  { message: "El mes de fin no puede ser anterior al de inicio", path: ["mesFin"] },
);

export const obligation = obligationBase.extend({
  id: z.string(),
  sortOrder: z.number().int(),
});

export const reorderObligationsInput = z.object({
  orderedIds: z.array(z.string()),
});

// ─── Gastos ───────────────────────────────────────────────────────────
export const expenseInput = z.object({
  descripcion: shortText.min(1, "Descripción requerida"),
  monto: money.gt(0, "Monto inválido"),
  cat: shortText.default("Otro"),
  catCustom: shortText.default(""),
  paymentMethodId: optionalRef,
  obligationId: optionalRef,
  fecha: dateStr,
  moneda: currencyCode,
});

export const expense = expenseInput.extend({ id: z.string() });

// ─── Ingresos ─────────────────────────────────────────────────────────
export const incomeInput = z.object({
  descripcion: shortText.min(1, "Descripción requerida"),
  monto: money.gt(0, "Monto inválido"),
  cat: shortText.default("Otro"),
  catCustom: shortText.default(""),
  fecha: dateStr,
  moneda: currencyCode,
});

export const income = incomeInput.extend({ id: z.string() });

// ─── Tipos inferidos ──────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof registerInput>;
export type LoginInput = z.infer<typeof loginInput>;
export type UserProfile = z.infer<typeof userProfile>;
export type UpdateUserInput = z.infer<typeof updateUserInput>;
export type PaymentMethod = z.infer<typeof paymentMethod>;
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodInput>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodInput>;
export type ObligationInput = z.infer<typeof obligationInput>;
export type Obligation = z.infer<typeof obligation>;
export type ReorderObligationsInput = z.infer<typeof reorderObligationsInput>;
export type ExpenseInput = z.infer<typeof expenseInput>;
export type Expense = z.infer<typeof expense>;
export type IncomeInput = z.infer<typeof incomeInput>;
export type Income = z.infer<typeof income>;
