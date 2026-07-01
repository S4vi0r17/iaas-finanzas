import { z } from "zod";
import { CURRENCY_CODES, OBLIGATION_TYPES, PM_TYPES } from "./constants";

// ─── Primitivos reutilizables ─────────────────────────────────────────
export const monthKey = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato de mes inválido (YYYY-MM)");

export const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)");

/** Fecha de vencimiento: puede ir vacía (se usa `dia` en su lugar). */
export const optionalDateStr = z.union([dateStr, z.literal("")]);

export const currencyCode = z
  .string()
  .refine((v) => (CURRENCY_CODES as readonly string[]).includes(v), "Moneda no soportada");

export const pmType = z.enum(PM_TYPES);
export const obligationType = z.enum(OBLIGATION_TYPES);

const money = z.number().min(0, "El monto no puede ser negativo");
const shortText = z.string().trim().max(120);

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
  slot: z.string(),
  name: shortText.min(1),
  type: pmType,
  active: z.boolean(),
});

/** Actualización masiva desde Ajustes (solo name + active editables). */
export const updatePaymentMethodsInput = z.object({
  items: z
    .array(
      z.object({
        slot: z.string(),
        name: shortText.min(1),
        active: z.boolean(),
      }),
    )
    .max(14),
});

// ─── Obligaciones ─────────────────────────────────────────────────────
export const obligationInput = z.object({
  nombre: shortText.min(1, "Descripción requerida"),
  fechaVenc: optionalDateStr.default(""),
  dia: z.number().int().min(1).max(31),
  monto: money,
  cat: shortText.default("Otro"),
  catCustom: shortText.default(""),
  tipo: obligationType.default("gasto"),
  moneda: currencyCode,
  metodoPago: z.string().default(""),
});

export const obligation = obligationInput.extend({
  id: z.string(),
  sortOrder: z.number().int(),
});

export const reorderObligationsInput = z.object({
  orderedIds: z.array(z.string()),
});

export const setStatusInput = z.object({
  monthKey,
  paid: z.boolean(),
});

// ─── Gastos ───────────────────────────────────────────────────────────
export const expenseInput = z.object({
  descripcion: shortText.min(1, "Descripción requerida"),
  monto: money.gt(0, "Monto inválido"),
  cat: shortText.default("Otro"),
  catCustom: shortText.default(""),
  fuente: z.string().default(""),
  oblRef: z.string().default(""),
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
export type UpdatePaymentMethodsInput = z.infer<typeof updatePaymentMethodsInput>;
export type ObligationInput = z.infer<typeof obligationInput>;
export type Obligation = z.infer<typeof obligation>;
export type ReorderObligationsInput = z.infer<typeof reorderObligationsInput>;
export type SetStatusInput = z.infer<typeof setStatusInput>;
export type ExpenseInput = z.infer<typeof expenseInput>;
export type Expense = z.infer<typeof expense>;
export type IncomeInput = z.infer<typeof incomeInput>;
export type Income = z.infer<typeof income>;
