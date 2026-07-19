import { randomUUID } from "node:crypto";
import {
  createPaymentMethodInput,
  updatePaymentMethodInput,
  type PaymentMethod,
  type PmType,
} from "@iaas/shared";
import { and, asc, eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client";
import { paymentMethods } from "../db/schema";
import { parseBody } from "../lib/http";
import type { AuthEnv } from "../middleware/auth";

function toPm(row: typeof paymentMethods.$inferSelect): PaymentMethod {
  return {
    id: row.id,
    name: row.name,
    type: row.type as PmType,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

async function listForUser(userId: string): Promise<PaymentMethod[]> {
  const rows = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .orderBy(asc(paymentMethods.sortOrder), asc(paymentMethods.name));
  return rows.map(toPm);
}

export const paymentMethodRoutes = new Hono<AuthEnv>();

paymentMethodRoutes.get("/", async (c) => {
  return c.json({ paymentMethods: await listForUser(c.get("userId")) });
});

// Crear un medio de pago nuevo.
paymentMethodRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const input = await parseBody(c, createPaymentMethodInput);

  const [maxRow] = await db
    .select({ v: max(paymentMethods.sortOrder) })
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId));
  const nextOrder = (maxRow?.v ?? -1) + 1;

  const id = randomUUID();
  await db.insert(paymentMethods).values({
    id,
    userId,
    name: input.name,
    type: input.type,
    active: input.active,
    sortOrder: nextOrder,
  });
  const [row] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id));

  return c.json({ paymentMethod: toPm(row) }, 201);
});

// Editar un medio de pago (nombre, tipo y/o active). Desactivar = active:false.
paymentMethodRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const patch = await parseBody(c, updatePaymentMethodInput);

  const [owned] = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.id, id)));
  if (!owned) return c.json({ error: "Medio de pago no encontrado" }, 404);

  await db
    .update(paymentMethods)
    .set(patch)
    .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.id, id)));
  const [row] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
  return c.json({ paymentMethod: toPm(row) });
});
