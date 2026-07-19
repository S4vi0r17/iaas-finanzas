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
    paymentMethodId: row.paymentMethodId,
    obligationId: row.obligationId,
    tipo: row.tipo as Expense["tipo"],
    fecha: row.fecha,
    moneda: row.moneda,
  };
}

export const expenseRoutes = new Hono<AuthEnv>();

/** Lista gastos de un mes (?month=YYYY-MM, obligatorio). */
expenseRoutes.get("/", async (c) => {
  const month = monthKey.safeParse(c.req.query("month"));
  if (!month.success) return c.json({ error: "Parámetro month inválido" }, 400);

  const rows = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, c.get("userId")), like(expenses.fecha, `${month.data}-%`)))
    .orderBy(desc(expenses.fecha));
  return c.json({ expenses: rows.map(toExpense) });
});

expenseRoutes.post("/", async (c) => {
  const data = await parseBody(c, expenseInput);
  const id = randomUUID();
  await db.insert(expenses).values({ id, userId: c.get("userId"), ...data });
  const [row] = await db.select().from(expenses).where(eq(expenses.id, id));
  return c.json({ expense: toExpense(row) }, 201);
});

expenseRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const data = await parseBody(c, expenseInput);

  const [owned] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  if (!owned) return c.json({ error: "No encontrado" }, 404);

  await db
    .update(expenses)
    .set(data)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  const [row] = await db.select().from(expenses).where(eq(expenses.id, id));
  return c.json({ expense: toExpense(row) });
});

expenseRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const [found] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  if (!found) return c.json({ error: "No encontrado" }, 404);
  await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  return c.json({ ok: true });
});
