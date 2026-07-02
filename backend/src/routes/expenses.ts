import { expenseInput, monthKey, type Expense } from "@iaas/shared";
import { and, desc, eq, like } from "drizzle-orm";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { expenses } from "../db/schema";
import { parseBody } from "../lib/http";
import type { AuthEnv } from "../middleware/auth";

function toExpense(row: typeof expenses.$inferSelect): Expense {
  return {
    id: row.id,
    descripcion: row.descripcion,
    monto: row.monto,
    cat: row.cat,
    catCustom: row.catCustom,
    paymentMethodId: row.paymentMethodId,
    obligationId: row.obligationId,
    fecha: row.fecha,
    moneda: row.moneda,
  };
}

export const expenseRoutes = new Hono<AuthEnv>();

/** Lista gastos de un mes (?month=YYYY-MM, obligatorio). */
expenseRoutes.get("/", (c) => {
  const month = monthKey.safeParse(c.req.query("month"));
  if (!month.success) return c.json({ error: "Parámetro month inválido" }, 400);

  const rows = db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, c.get("userId")), like(expenses.fecha, `${month.data}-%`)))
    .orderBy(desc(expenses.fecha))
    .all();
  return c.json({ expenses: rows.map(toExpense) });
});

expenseRoutes.post("/", async (c) => {
  const data = await parseBody(c, expenseInput);
  const id = randomUUID();
  db.insert(expenses).values({ id, userId: c.get("userId"), ...data }).run();
  const row = db.select().from(expenses).where(eq(expenses.id, id)).get()!;
  return c.json({ expense: toExpense(row) }, 201);
});

expenseRoutes.delete("/:id", (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const found = db
    .select({ id: expenses.id })
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
    .get();
  if (!found) return c.json({ error: "No encontrado" }, 404);
  db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId))).run();
  return c.json({ ok: true });
});
