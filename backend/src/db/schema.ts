import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
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

// ─── Medios de pago (14 slots fijos por usuario) ──────────────────────
export const paymentMethods = sqliteTable(
  "payment_methods",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slot: text("slot").notNull(), // cc1..cc5, dc1..dc5, ef, pr1..pr3
    name: text("name").notNull(),
    type: text("type").notNull(), // credito | debito | efectivo | prestamo
    active: integer("active", { mode: "boolean" }).notNull().default(false),
  },
  (t) => ({
    userSlot: uniqueIndex("pm_user_slot").on(t.userId, t.slot),
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
    metodoPago: text("metodo_pago").notNull().default(""), // slot
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
    fuente: text("fuente").notNull().default(""), // slot
    oblRef: text("obl_ref").notNull().default(""),
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
