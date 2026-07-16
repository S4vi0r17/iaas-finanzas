import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

// ─── Categorías (catálogo editable por usuario, por ámbito) ───────────
// scope: obligacion | gasto | ingreso. Soft-delete vía `active` (igual que
// payment_methods): al desactivar sale del selector pero los registros
// históricos conservan su string `cat`, que no es FK.
export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(), // obligacion | gasto | ingreso
    name: text("name").notNull(),
    icon: text("icon").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    byUserScope: index("cat_user_scope").on(t.userId, t.scope),
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
    dia: integer("dia").notNull().default(1), // día de vencimiento (1-31), recurrente cada mes
    mesInicio: text("mes_inicio").notNull(), // YYYY-MM: desde qué mes aplica
    mesFin: text("mes_fin"), // YYYY-MM o null: último mes en que aplica (null = vigente)
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

// Nota: no hay tabla de "estado de pago". Una obligación se considera pagada
// en un mes si tiene ≥1 gasto ligado (expenses.obligation_id) en ese mes.

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
    // Clasificación congelada (snapshot): variable | fijo | inversion.
    // El Resumen agrupa por esta columna, no por el tipo de la obligación viva.
    tipo: text("tipo").notNull().default("variable"),
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
