import { bigint, boolean, double, index, int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

// ─── Usuarios ─────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull().default(""),
  currency: varchar("currency", { length: 10 }).notNull().default("PEN"),
  waPhone: varchar("wa_phone", { length: 32 }).notNull().default(""),
  waKey: varchar("wa_key", { length: 255 }).notNull().default(""),
  isPro: boolean("is_pro").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
});

// ─── Medios de pago (lista libre por usuario) ─────────────────────────
export const paymentMethods = mysqlTable(
  "payment_methods",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(), // credito | debito | efectivo | prestamo
    active: boolean("active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (t) => ({
    byUser: index("pm_user").on(t.userId),
  }),
);

// ─── Categorías (catálogo editable por usuario, por ámbito) ───────────
// scope: obligacion | gasto | ingreso. Soft-delete vía `active` (igual que
// payment_methods): al desactivar sale del selector pero los registros
// históricos conservan su string `cat`, que no es FK.
export const categories = mysqlTable(
  "categories",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 20 }).notNull(), // obligacion | gasto | ingreso
    name: varchar("name", { length: 255 }).notNull(),
    icon: varchar("icon", { length: 32 }).notNull().default(""),
    active: boolean("active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (t) => ({
    byUserScope: index("cat_user_scope").on(t.userId, t.scope),
  }),
);

// ─── Obligaciones (pagos recurrentes) ─────────────────────────────────
export const obligations = mysqlTable(
  "obligations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nombre: varchar("nombre", { length: 255 }).notNull(),
    dia: int("dia").notNull().default(1), // día de vencimiento (1-31), recurrente cada mes
    mesInicio: varchar("mes_inicio", { length: 7 }).notNull(), // YYYY-MM: desde qué mes aplica
    mesFin: varchar("mes_fin", { length: 7 }), // YYYY-MM o null: último mes en que aplica (null = vigente)
    monto: double("monto").notNull().default(0),
    cat: varchar("cat", { length: 100 }).notNull().default("Otro"),
    tipo: varchar("tipo", { length: 20 }).notNull().default("gasto"), // gasto | inversion
    moneda: varchar("moneda", { length: 10 }).notNull().default("PEN"),
    paymentMethodId: varchar("payment_method_id", { length: 36 }).references(
      () => paymentMethods.id,
      { onDelete: "set null" },
    ),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (t) => ({
    byUser: index("obl_user").on(t.userId),
  }),
);

// Nota: no hay tabla de "estado de pago". Una obligación se considera pagada
// en un mes si tiene ≥1 gasto ligado (expenses.obligation_id) en ese mes.

// ─── Gastos variables ─────────────────────────────────────────────────
export const expenses = mysqlTable(
  "expenses",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    descripcion: varchar("descripcion", { length: 255 }).notNull(),
    monto: double("monto").notNull(),
    cat: varchar("cat", { length: 100 }).notNull().default("Otro"),
    paymentMethodId: varchar("payment_method_id", { length: 36 }).references(
      () => paymentMethods.id,
      { onDelete: "set null" },
    ),
    obligationId: varchar("obligation_id", { length: 36 }).references(() => obligations.id, {
      onDelete: "set null",
    }),
    // Clasificación congelada (snapshot): variable | fijo | inversion.
    // El Resumen agrupa por esta columna, no por el tipo de la obligación viva.
    tipo: varchar("tipo", { length: 20 }).notNull().default("variable"),
    fecha: varchar("fecha", { length: 10 }).notNull(), // YYYY-MM-DD
    moneda: varchar("moneda", { length: 10 }).notNull().default("PEN"),
  },
  (t) => ({
    byUserFecha: index("exp_user_fecha").on(t.userId, t.fecha),
  }),
);

// ─── Ingresos ─────────────────────────────────────────────────────────
export const incomes = mysqlTable(
  "incomes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    descripcion: varchar("descripcion", { length: 255 }).notNull(),
    monto: double("monto").notNull(),
    cat: varchar("cat", { length: 100 }).notNull().default("Otro"),
    fecha: varchar("fecha", { length: 10 }).notNull(), // YYYY-MM-DD
    moneda: varchar("moneda", { length: 10 }).notNull().default("PEN"),
  },
  (t) => ({
    byUserFecha: index("inc_user_fecha").on(t.userId, t.fecha),
  }),
);
