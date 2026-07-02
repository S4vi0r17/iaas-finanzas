import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ─── Usuarios ─────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  currency: text("currency").notNull().default("PEN"),
  waPhone: text("wa_phone").notNull().default(""),
  waKey: text("wa_key").notNull().default(""),
  isPro: integer("is_pro", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
});

// ─── Medios de pago (lista libre por usuario) ─────────────────────────
export const paymentMethods = sqliteTable(
  "payment_methods",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // credito | debito | efectivo | prestamo
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    byUser: index("pm_user").on(t.userId),
  }),
);

// ─── Obligaciones (pagos recurrentes) ─────────────────────────────────
export const obligations = sqliteTable(
  "obligations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    fechaVenc: text("fecha_venc").notNull().default(""), // YYYY-MM-DD o ""
    dia: integer("dia").notNull().default(1),
    monto: real("monto").notNull().default(0),
    cat: text("cat").notNull().default("Otro"),
    catCustom: text("cat_custom").notNull().default(""),
    tipo: text("tipo").notNull().default("gasto"), // gasto | inversion
    moneda: text("moneda").notNull().default("PEN"),
    paymentMethodId: text("payment_method_id").references(() => paymentMethods.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    byUser: index("obl_user").on(t.userId),
  }),
);

// ─── Estado de pago por mes ───────────────────────────────────────────
export const obligationStatus = sqliteTable(
  "obligation_status",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    obligationId: text("obligation_id")
      .notNull()
      .references(() => obligations.id, { onDelete: "cascade" }),
    monthKey: text("month_key").notNull(), // YYYY-MM
    status: text("status").notNull().default("pagado"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.obligationId, t.monthKey] }),
  }),
);

// ─── Gastos variables ─────────────────────────────────────────────────
export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    descripcion: text("descripcion").notNull(),
    monto: real("monto").notNull(),
    cat: text("cat").notNull().default("Otro"),
    catCustom: text("cat_custom").notNull().default(""),
    paymentMethodId: text("payment_method_id").references(() => paymentMethods.id, {
      onDelete: "set null",
    }),
    obligationId: text("obligation_id").references(() => obligations.id, {
      onDelete: "set null",
    }),
    fecha: text("fecha").notNull(), // YYYY-MM-DD
    moneda: text("moneda").notNull().default("PEN"),
  },
  (t) => ({
    byUserFecha: index("exp_user_fecha").on(t.userId, t.fecha),
  }),
);

// ─── Ingresos ─────────────────────────────────────────────────────────
export const incomes = sqliteTable(
  "incomes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    descripcion: text("descripcion").notNull(),
    monto: real("monto").notNull(),
    cat: text("cat").notNull().default("Otro"),
    catCustom: text("cat_custom").notNull().default(""),
    fecha: text("fecha").notNull(), // YYYY-MM-DD
    moneda: text("moneda").notNull().default("PEN"),
  },
  (t) => ({
    byUserFecha: index("inc_user_fecha").on(t.userId, t.fecha),
  }),
);
