import {
  MAX_FREE_OBLIGATIONS,
  obligationInput,
  reorderObligationsInput,
  type Obligation,
} from "@iaas/shared";
import { and, asc, eq, gte, isNotNull, isNull, like, lte, max, or } from "drizzle-orm";
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
    catCustom: row.catCustom,
    tipo: row.tipo as Obligation["tipo"],
    moneda: row.moneda,
    paymentMethodId: row.paymentMethodId,
    sortOrder: row.sortOrder,
  };
}

export const obligationRoutes = new Hono<AuthEnv>();

/** Lista obligaciones; con ?month=YYYY-MM incluye los IDs pagados ese mes. */
obligationRoutes.get("/", (c) => {
  const userId = c.get("userId");
  const month = c.req.query("month");

  // Con ?month, solo las vigentes ese mes: mesInicio <= month <= mesFin (o sin fin).
  const vigencia = month
    ? and(
        lte(obligations.mesInicio, month),
        or(isNull(obligations.mesFin), gte(obligations.mesFin, month)),
      )
    : undefined;
  const rows = db
    .select()
    .from(obligations)
    .where(and(eq(obligations.userId, userId), vigencia))
    .orderBy(asc(obligations.sortOrder))
    .all();

  // Una obligación está "pagada" en el mes si tiene ≥1 gasto ligado ese mes.
  let paidIds: string[] = [];
  if (month) {
    const linked = db
      .select({ id: expenses.obligationId })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          like(expenses.fecha, `${month}-%`),
          isNotNull(expenses.obligationId),
        ),
      )
      .all();
    paidIds = [...new Set(linked.map((r) => r.id).filter((id): id is string => id !== null))];
  }

  return c.json({ obligations: rows.map(toObligation), paidIds });
});

obligationRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const data = await parseBody(c, obligationInput);

  const user = db.select({ isPro: users.isPro }).from(users).where(eq(users.id, userId)).get();
  if (!user?.isPro) {
    const count = db.select().from(obligations).where(eq(obligations.userId, userId)).all().length;
    if (count >= MAX_FREE_OBLIGATIONS) {
      return c.json({ error: "LIMIT_REACHED", limit: MAX_FREE_OBLIGATIONS }, 403);
    }
  }

  const maxRow = db
    .select({ v: max(obligations.sortOrder) })
    .from(obligations)
    .where(eq(obligations.userId, userId))
    .get();
  const sortOrder = (maxRow?.v ?? -1) + 1;

  const id = randomUUID();
  db.insert(obligations).values({ id, userId, ...data, sortOrder }).run();
  const row = db.select().from(obligations).where(eq(obligations.id, id)).get()!;
  return c.json({ obligation: toObligation(row) }, 201);
});

/** Reordena (flechas ↑/↓ del HTML). Debe ir ANTES de PATCH /:id. */
obligationRoutes.patch("/reorder", async (c) => {
  const userId = c.get("userId");
  const { orderedIds } = await parseBody(c, reorderObligationsInput);
  orderedIds.forEach((id, i) => {
    db.update(obligations)
      .set({ sortOrder: i })
      .where(and(eq(obligations.id, id), eq(obligations.userId, userId)))
      .run();
  });
  return c.json({ ok: true });
});

obligationRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = await parseBody(c, obligationInput);

  const owned = db
    .select({ id: obligations.id })
    .from(obligations)
    .where(and(eq(obligations.id, id), eq(obligations.userId, userId)))
    .get();
  if (!owned) return c.json({ error: "No encontrada" }, 404);

  db.update(obligations).set(data).where(eq(obligations.id, id)).run();
  const row = db.select().from(obligations).where(eq(obligations.id, id)).get()!;
  return c.json({ obligation: toObligation(row) });
});

obligationRoutes.delete("/:id", (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const found = db
    .select({ id: obligations.id })
    .from(obligations)
    .where(and(eq(obligations.id, id), eq(obligations.userId, userId)))
    .get();
  if (!found) return c.json({ error: "No encontrada" }, 404);
  db.delete(obligations).where(and(eq(obligations.id, id), eq(obligations.userId, userId))).run();
  return c.json({ ok: true });
});

