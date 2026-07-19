import {
  MAX_FREE_OBLIGATIONS,
  kindForObligation,
  obligationInput,
  payObligationInput,
  reorderObligationsInput,
  type Expense,
  type Obligation,
} from "@iaas/shared";
import { and, asc, eq, gte, isNull, like, lte, max, or, sql, sum } from "drizzle-orm";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { expenses, obligations, users } from "../db/schema";
import { parseBody } from "../lib/http";
import type { AuthEnv } from "../middleware/auth";

function toObligation(row: typeof obligations.$inferSelect): Obligation {
  return {
    id: row.id,
    nombre: row.nombre,
    dia: row.dia,
    mesInicio: row.mesInicio,
    mesFin: row.mesFin,
    monto: row.monto,
    cat: row.cat,
    tipo: row.tipo as Obligation["tipo"],
    moneda: row.moneda,
    paymentMethodId: row.paymentMethodId,
    sortOrder: row.sortOrder,
  };
}

export const obligationRoutes = new Hono<AuthEnv>();

/**
 * Lista obligaciones; con ?month=YYYY-MM devuelve además `pagos`: cuánto se ha
 * pagado de cada obligación ese mes (suma de gastos ligados). El estado
 * (pendiente / parcial / pagado) se deriva comparando `pagos[id]` con `monto`.
 */
obligationRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const month = c.req.query("month");

  // Con ?month, solo las vigentes ese mes: mesInicio <= month <= mesFin (o sin fin).
  const vigencia = month
    ? and(
        lte(obligations.mesInicio, month),
        or(isNull(obligations.mesFin), gte(obligations.mesFin, month)),
      )
    : undefined;
  const rows = await db
    .select()
    .from(obligations)
    .where(and(eq(obligations.userId, userId), vigencia))
    .orderBy(asc(obligations.sortOrder));

  // Monto pagado por obligación ese mes = SUMA de gastos ligados (no booleano,
  // para soportar pagos parciales).
  const paidByObligation: Record<string, number> = {};
  if (month) {
    const paidRows = await db
      .select({ obligationId: expenses.obligationId, total: sum(expenses.monto).mapWith(Number) })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), like(expenses.fecha, `${month}-%`)))
      .groupBy(expenses.obligationId);
    for (const paidRow of paidRows) {
      if (paidRow.obligationId) paidByObligation[paidRow.obligationId] = paidRow.total ?? 0;
    }
  }

  return c.json({ obligations: rows.map(toObligation), paidByObligation });
});

obligationRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const data = await parseBody(c, obligationInput);

  const [user] = await db.select({ isPro: users.isPro }).from(users).where(eq(users.id, userId));
  if (!user?.isPro) {
    const count = (
      await db.select({ id: obligations.id }).from(obligations).where(eq(obligations.userId, userId))
    ).length;
    if (count >= MAX_FREE_OBLIGATIONS) {
      return c.json({ error: "LIMIT_REACHED", limit: MAX_FREE_OBLIGATIONS }, 403);
    }
  }

  const [maxRow] = await db
    .select({ v: max(obligations.sortOrder) })
    .from(obligations)
    .where(eq(obligations.userId, userId));
  const sortOrder = (maxRow?.v ?? -1) + 1;

  const id = randomUUID();
  await db.insert(obligations).values({ id, userId, ...data, sortOrder });
  const [row] = await db.select().from(obligations).where(eq(obligations.id, id));
  return c.json({ obligation: toObligation(row) }, 201);
});

/**
 * Paga (total o parcialmente) una obligación: crea un gasto snapshot ligado.
 * El tipo/categoría/moneda/nombre se congelan desde la obligación; el monto es
 * el pago real. No permite sobrepago: monto ≤ saldo pendiente del mes.
 */
obligationRoutes.post("/:id/pay", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { monto, paymentMethodId, fecha } = await parseBody(c, payObligationInput);

  const [obligation] = await db
    .select()
    .from(obligations)
    .where(and(eq(obligations.id, id), eq(obligations.userId, userId)));
  if (!obligation) return c.json({ error: "Obligación no encontrada" }, 404);

  const month = fecha.slice(0, 7); // YYYY-MM
  if (month < obligation.mesInicio || (obligation.mesFin && month > obligation.mesFin)) {
    return c.json({ error: "La obligación no está vigente ese mes" }, 400);
  }

  // Saldo pendiente = monto planeado − ya pagado ese mes.
  const [paidRow] = await db
    .select({ total: sum(expenses.monto).mapWith(Number) })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.obligationId, id),
        like(expenses.fecha, `${month}-%`),
      ),
    );
  const alreadyPaid = paidRow?.total ?? 0;

  const remaining = Math.round((obligation.monto - alreadyPaid) * 100) / 100;
  if (remaining <= 0) return c.json({ error: "La obligación ya está pagada este mes" }, 409);
  if (monto > remaining) {
    return c.json({ error: "El pago excede el saldo pendiente", remaining }, 400);
  }

  const expenseId = randomUUID();
  await db.insert(expenses).values({
    id: expenseId,
    userId,
    descripcion: obligation.nombre,
    monto,
    cat: obligation.cat,
    paymentMethodId: paymentMethodId ?? obligation.paymentMethodId,
    obligationId: id,
    tipo: kindForObligation(obligation.tipo as Obligation["tipo"]),
    fecha,
    moneda: obligation.moneda,
  });

  const [row] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  const expense: Expense = {
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
  return c.json({ expense, paid: alreadyPaid + monto, remaining: remaining - monto }, 201);
});

/** Reordena (flechas ↑/↓ del HTML). Debe ir ANTES de PATCH /:id. */
obligationRoutes.patch("/reorder", async (c) => {
  const userId = c.get("userId");
  const { orderedIds } = await parseBody(c, reorderObligationsInput);
  await Promise.all(
    orderedIds.map((id, i) =>
      db
        .update(obligations)
        .set({ sortOrder: i })
        .where(and(eq(obligations.id, id), eq(obligations.userId, userId))),
    ),
  );
  return c.json({ ok: true });
});

obligationRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = await parseBody(c, obligationInput);

  const [owned] = await db
    .select({ id: obligations.id })
    .from(obligations)
    .where(and(eq(obligations.id, id), eq(obligations.userId, userId)));
  if (!owned) return c.json({ error: "No encontrada" }, 404);

  await db.update(obligations).set(data).where(eq(obligations.id, id));
  const [row] = await db.select().from(obligations).where(eq(obligations.id, id));
  return c.json({ obligation: toObligation(row) });
});

obligationRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [found] = await db
    .select({ id: obligations.id })
    .from(obligations)
    .where(and(eq(obligations.id, id), eq(obligations.userId, userId)));
  if (!found) return c.json({ error: "No encontrada" }, 404);
  await db.delete(obligations).where(and(eq(obligations.id, id), eq(obligations.userId, userId)));
  return c.json({ ok: true });
});

