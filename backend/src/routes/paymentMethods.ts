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

function listForUser(userId: string): PaymentMethod[] {
  return db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .orderBy(asc(paymentMethods.sortOrder), asc(paymentMethods.name))
    .all()
    .map(toPm);
}

export const paymentMethodRoutes = new Hono<AuthEnv>();

paymentMethodRoutes.get("/", (c) => {
  return c.json({ paymentMethods: listForUser(c.get("userId")) });
});

// Crear un medio de pago nuevo.
paymentMethodRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const input = await parseBody(c, createPaymentMethodInput);

  const nextOrder =
    (db
      .select({ v: max(paymentMethods.sortOrder) })
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, userId))
      .get()?.v ?? -1) + 1;

  const row = db
    .insert(paymentMethods)
    .values({
      id: randomUUID(),
      userId,
      name: input.name,
      type: input.type,
      active: input.active,
      sortOrder: nextOrder,
    })
    .returning()
    .get();

  return c.json({ paymentMethod: toPm(row) }, 201);
});

// Editar un medio de pago (nombre, tipo y/o active). Desactivar = active:false.
paymentMethodRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const patch = await parseBody(c, updatePaymentMethodInput);

  const row = db
    .update(paymentMethods)
    .set(patch)
    .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.id, id)))
    .returning()
    .get();

  if (!row) return c.json({ error: "Medio de pago no encontrado" }, 404);
  return c.json({ paymentMethod: toPm(row) });
});
