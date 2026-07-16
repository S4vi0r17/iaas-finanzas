import { incomeInput, monthKey, type Income } from "@iaas/shared";
import { and, desc, eq, like } from "drizzle-orm";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { incomes } from "../db/schema";
import { parseBody } from "../lib/http";
import type { AuthEnv } from "../middleware/auth";

function toIncome(row: typeof incomes.$inferSelect): Income {
  return {
    id: row.id,
    descripcion: row.descripcion,
    monto: row.monto,
    cat: row.cat,
    fecha: row.fecha,
    moneda: row.moneda,
  };
}

export const incomeRoutes = new Hono<AuthEnv>();

/** Lista ingresos de un mes (?month=YYYY-MM, obligatorio). */
incomeRoutes.get("/", (c) => {
  const month = monthKey.safeParse(c.req.query("month"));
  if (!month.success) return c.json({ error: "Parámetro month inválido" }, 400);

  const rows = db
    .select()
    .from(incomes)
    .where(and(eq(incomes.userId, c.get("userId")), like(incomes.fecha, `${month.data}-%`)))
    .orderBy(desc(incomes.fecha))
    .all();
  return c.json({ incomes: rows.map(toIncome) });
});

incomeRoutes.post("/", async (c) => {
  const data = await parseBody(c, incomeInput);
  const id = randomUUID();
  db.insert(incomes).values({ id, userId: c.get("userId"), ...data }).run();
  const row = db.select().from(incomes).where(eq(incomes.id, id)).get()!;
  return c.json({ income: toIncome(row) }, 201);
});

incomeRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const data = await parseBody(c, incomeInput);

  const owned = db
    .select({ id: incomes.id })
    .from(incomes)
    .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
    .get();
  if (!owned) return c.json({ error: "No encontrado" }, 404);

  db.update(incomes).set(data).where(and(eq(incomes.id, id), eq(incomes.userId, userId))).run();
  const row = db.select().from(incomes).where(eq(incomes.id, id)).get()!;
  return c.json({ income: toIncome(row) });
});

incomeRoutes.delete("/:id", (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const found = db
    .select({ id: incomes.id })
    .from(incomes)
    .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
    .get();
  if (!found) return c.json({ error: "No encontrado" }, 404);
  db.delete(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, userId))).run();
  return c.json({ ok: true });
});
